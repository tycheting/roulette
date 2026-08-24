/**
 * 證券投資損益打卡與競賽系統 — 後端 API
 *
 * 部署：發佈 > 部署為網頁應用程式
 *   執行身分：我
 *   具有應用程式存取權的使用者：任何人
 *
 * 端點
 *   GET  ?action=bootstrap            首頁所需全部資料
 *   GET  ?action=detail&user=小明      個人歷史（含金額明細）
 *   POST {action:'checkin', ...}      新增一期打卡紀錄
 */

var SHEET_USERS = 'Users';
var SHEET_RECORDS = 'Records';
var SHEET_SETTINGS = 'Settings';
var CACHE_KEY = 'bootstrap_v1';
var CACHE_TTL = 60;

/* ==========================================================
 * 進入點
 * ========================================================== */

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'bootstrap';
    if (action === 'bootstrap') return jsonOk(buildBootstrap());
    if (action === 'detail') {
      var user = e.parameter.user;
      if (!user) return jsonErr('USER_REQUIRED', '缺少 user 參數');
      return jsonOk(buildDetail(user));
    }
    return jsonErr('UNKNOWN_ACTION', '不支援的 action：' + action);
  } catch (err) {
    return jsonErr('SERVER_ERROR', String(err && err.message ? err.message : err));
  }
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    if (body.action !== 'checkin') {
      return jsonErr('UNKNOWN_ACTION', '不支援的 action');
    }
    return handleCheckin(body);
  } catch (err) {
    return jsonErr('SERVER_ERROR', String(err && err.message ? err.message : err));
  }
}

/* GAS 網頁應用程式不支援自訂回應標頭，前端請以 text/plain 送出 JSON 字串避開 preflight。 */
function jsonOk(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data: data, serverTime: nowIso() }))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonErr(code, message) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: { code: code, message: message } }))
    .setMimeType(ContentService.MimeType.JSON);
}

function nowIso() {
  return Utilities.formatDate(new Date(), 'Asia/Taipei', "yyyy-MM-dd'T'HH:mm:ssXXX");
}

/* ==========================================================
 * 讀取試算表
 * ========================================================== */

function ss() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function readSheet(name) {
  var sheet = ss().getSheetByName(name);
  if (!sheet) throw new Error('找不到分頁：' + name);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var header = values[0].map(function (h) { return String(h).trim(); });
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var raw = values[i];
    if (raw.join('') === '') continue;
    var obj = {};
    for (var c = 0; c < header.length; c++) obj[header[c]] = raw[c];
    rows.push(obj);
  }
  return rows;
}

function readSettings() {
  var rows = readSheet(SHEET_SETTINGS);
  var map = {};
  rows.forEach(function (r) {
    map[String(r['設定鍵']).trim()] = r['設定值'];
  });
  return {
    competitionName: String(map['競賽名稱'] || '投資打卡競賽'),
    endDate: toDateString(map['競賽結束日期']),
    checkinOpen: String(map['是否開放打卡']).toUpperCase() === 'TRUE',
    currentMonth: toMonthString(map['當前打卡月份']),
    prizeRatio: Number(map['獎金池比例'] || 0.5),
    bannerImage: String(map['首頁橫幅圖網址'] || '')
  };
}

function readUsers() {
  return readSheet(SHEET_USERS)
    .filter(function (r) { return String(r['用戶名']).trim() !== ''; })
    .filter(function (r) { return String(r['啟用']).toUpperCase() !== 'FALSE'; })
    .map(function (r, i) {
      return {
        name: String(r['用戶名']).trim(),
        accounts: String(r['證券戶清單'] || '')
          .split(/[,，]/)
          .map(function (s) { return s.trim(); })
          .filter(function (s) { return s !== ''; }),
        order: r['顯示順序'] === '' || r['顯示順序'] == null ? i : Number(r['顯示順序']),
        avatarUrl: String(r['頭像網址'] || '').trim()
      };
    })
    .sort(function (a, b) { return a.order - b.order; });
}

function readRecords() {
  return readSheet(SHEET_RECORDS)
    .filter(function (r) { return String(r['用戶名']).trim() !== ''; })
    .map(function (r) {
      return {
        ts: r['時間戳記'] instanceof Date ? r['時間戳記'].getTime() : new Date(r['時間戳記']).getTime(),
        month: toMonthString(r['打卡月份']),
        user: String(r['用戶名']).trim(),
        account: String(r['證券戶名稱']).trim(),
        capital: Number(r['總本金']) || 0,
        value: Number(r['總市值']) || 0
      };
    })
    .filter(function (r) { return r.month !== ''; });
}

function toMonthString(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Taipei', 'yyyy-MM');
  var s = String(v || '').trim();
  var m = s.match(/^(\d{4})[-/](\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2);
  return s;
}

function toDateString(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Taipei', 'yyyy-MM-dd');
  return String(v || '').trim();
}

/* ==========================================================
 * 核心計算
 * ========================================================== */

/**
 * 將原始紀錄整理成 user -> month -> { capital, value, accounts }
 * 同一用戶 / 月份 / 證券戶取時間戳記最新的一筆。
 */
function buildMonthlyIndex(records) {
  var latest = {};
  records.forEach(function (r) {
    var key = r.user + '|' + r.month + '|' + r.account;
    if (!latest[key] || r.ts > latest[key].ts) latest[key] = r;
  });

  var byUser = {};
  Object.keys(latest).forEach(function (key) {
    var r = latest[key];
    if (!byUser[r.user]) byUser[r.user] = {};
    if (!byUser[r.user][r.month]) {
      byUser[r.user][r.month] = { month: r.month, capital: 0, value: 0, accounts: {} };
    }
    var slot = byUser[r.user][r.month];
    slot.capital += r.capital;
    slot.value += r.value;
    slot.accounts[r.account] = { capital: r.capital, value: r.value };
  });
  return byUser;
}

/** 取得某用戶依月份升冪排列的績效序列 */
function buildUserSeries(monthMap) {
  var months = Object.keys(monthMap).sort();
  var series = [];
  for (var i = 0; i < months.length; i++) {
    var cur = monthMap[months[i]];
    var prev = i > 0 ? monthMap[months[i - 1]] : null;

    var cumPnl = cur.value - cur.capital;
    var cumRate = cur.capital > 0 ? (cumPnl / cur.capital) * 100 : null;

    var newCapital, monthlyPnl, denom;
    if (prev) {
      newCapital = cur.capital - prev.capital;
      monthlyPnl = cumPnl - (prev.value - prev.capital);
      denom = prev.value + newCapital;
    } else {
      newCapital = 0;
      monthlyPnl = cumPnl;
      denom = cur.capital;
    }
    var monthlyRate = denom > 0 ? (monthlyPnl / denom) * 100 : null;

    series.push({
      month: cur.month,
      capital: cur.capital,
      value: cur.value,
      accounts: cur.accounts,
      newCapital: newCapital,
      cumPnl: cumPnl,
      cumRate: cumRate === null ? null : round2(cumRate),
      monthlyPnl: monthlyPnl,
      monthlyRate: monthlyRate === null ? null : round2(monthlyRate)
    });
  }
  return series;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/** 排行榜 + 獎金池 */
function buildLeaderboard(users, byUser, settings) {
  var entries = [];
  var notCheckedIn = [];

  users.forEach(function (u) {
    var monthMap = byUser[u.name];
    if (!monthMap || Object.keys(monthMap).length === 0) {
      notCheckedIn.push(u.name);
      return;
    }
    var series = buildUserSeries(monthMap);
    var last = series[series.length - 1];
    entries.push({
      name: u.name,
      avatarUrl: u.avatarUrl,
      dataMonth: last.month,
      isStale: last.month !== settings.currentMonth,
      monthlyRate: last.monthlyRate,
      monthlyPnl: last.monthlyPnl,
      cumRate: last.cumRate,
      cumPnl: last.cumPnl,
      history: series.map(function (s) {
        return { month: s.month, monthlyRate: s.monthlyRate, monthlyPnl: s.monthlyPnl };
      })
    });
  });

  entries.sort(function (a, b) {
    var ar = a.monthlyRate, br = b.monthlyRate;
    if (ar === null && br !== null) return 1;
    if (br === null && ar !== null) return -1;
    if (ar !== br) return br - ar;
    if (a.monthlyPnl !== b.monthlyPnl) return b.monthlyPnl - a.monthlyPnl;
    if (a.dataMonth !== b.dataMonth) return a.dataMonth < b.dataMonth ? 1 : -1;
    return a.name < b.name ? -1 : 1;
  });

  var ratio = settings.prizeRatio;
  var total = 0;
  entries.forEach(function (en) {
    en.poolContribution = Math.round(Math.abs(en.monthlyPnl) * ratio);
    total += en.poolContribution;
  });

  entries.forEach(function (en, i) {
    en.rank = i + 1;
    en.poolNet = i === 0 ? total - en.poolContribution : -en.poolContribution;
  });

  return {
    leaderboard: entries,
    notCheckedIn: notCheckedIn,
    prizePool: {
      total: total,
      participants: entries.length,
      winner: entries.length ? entries[0].name : null,
      ratio: ratio
    }
  };
}

/* ==========================================================
 * bootstrap / detail
 * ========================================================== */

function buildBootstrap() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get(CACHE_KEY);
  if (hit) return JSON.parse(hit);

  var settings = readSettings();
  var users = readUsers();
  var byUser = buildMonthlyIndex(readRecords());
  var board = buildLeaderboard(users, byUser, settings);

  var payload = {
    settings: settings,
    users: users.map(function (u) {
      return { name: u.name, accounts: u.accounts, avatarUrl: u.avatarUrl };
    }),
    leaderboard: board.leaderboard,
    notCheckedIn: board.notCheckedIn,
    prizePool: board.prizePool
  };
  cache.put(CACHE_KEY, JSON.stringify(payload), CACHE_TTL);
  return payload;
}

function buildDetail(userName) {
  var settings = readSettings();
  var users = readUsers();
  var me = null;
  users.forEach(function (u) { if (u.name === userName) me = u; });
  if (!me) throw new Error('查無此用戶：' + userName);

  var byUser = buildMonthlyIndex(readRecords());
  var monthMap = byUser[userName] || {};
  var series = buildUserSeries(monthMap);

  var current = null, prev = null;
  series.forEach(function (s) {
    if (s.month === settings.currentMonth) current = s;
    else if (s.month < settings.currentMonth && (!prev || s.month > prev.month)) prev = s;
  });

  return {
    user: { name: me.name, accounts: me.accounts, avatarUrl: me.avatarUrl },
    settings: settings,
    series: series,
    current: current,
    previous: prev
  };
}

/* ==========================================================
 * 打卡寫入
 * ========================================================== */

function handleCheckin(body) {
  var settings = readSettings();

  if (!settings.checkinOpen) return jsonErr('CLOSED', '目前非打卡時間');
  if (settings.endDate) {
    var end = new Date(settings.endDate + 'T23:59:59+08:00');
    if (new Date().getTime() > end.getTime()) return jsonErr('COMPETITION_ENDED', '競賽已結束');
  }
  if (toMonthString(body.month) !== settings.currentMonth) {
    return jsonErr('MONTH_MISMATCH', '目前開放的是 ' + settings.currentMonth + ' 的紀錄');
  }

  var users = readUsers();
  var me = null;
  users.forEach(function (u) { if (u.name === body.user) me = u; });
  if (!me) return jsonErr('USER_NOT_FOUND', '查無此用戶或已停用');

  var entries = body.entries || [];
  var given = entries.map(function (x) { return String(x.account).trim(); }).sort().join('|');
  var expect = me.accounts.slice().sort().join('|');
  if (given !== expect) {
    return jsonErr('ACCOUNT_MISMATCH', '證券戶不符，應填寫：' + me.accounts.join('、'));
  }

  for (var i = 0; i < entries.length; i++) {
    var cap = Number(entries[i].capital);
    var val = Number(entries[i].marketValue);
    if (!isFinite(cap) || !isFinite(val) || cap < 0 || val < 0 ||
        Math.floor(cap) !== cap || Math.floor(val) !== val) {
      return jsonErr('INVALID_NUMBER', entries[i].account + '：金額必須是 0 以上的整數');
    }
  }

  var byUser = buildMonthlyIndex(readRecords());
  var monthMap = byUser[body.user] || {};
  var prevMonth = null;
  Object.keys(monthMap).forEach(function (m) {
    if (m < settings.currentMonth && (prevMonth === null || m > prevMonth)) prevMonth = m;
  });
  if (prevMonth) {
    var prevAccounts = monthMap[prevMonth].accounts;
    for (var j = 0; j < entries.length; j++) {
      var name = String(entries[j].account).trim();
      var before = prevAccounts[name];
      if (before && Number(entries[j].capital) < before.capital) {
        return jsonErr('CAPITAL_DECREASED',
          name + ' 的本金不得低於上期的 ' + before.capital.toLocaleString() + '（本金只允許加碼）');
      }
    }
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return jsonErr('BUSY', '系統忙碌中，請稍後再送出一次');
  }

  try {
    var sheet = ss().getSheetByName(SHEET_RECORDS);
    var now = new Date();
    var rows = entries.map(function (x) {
      return [now, settings.currentMonth, body.user, String(x.account).trim(),
              Number(x.capital), Number(x.marketValue), body.source || 'web'];
    });
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
    SpreadsheetApp.flush();
    CacheService.getScriptCache().remove(CACHE_KEY);
  } finally {
    lock.releaseLock();
  }

  return jsonOk({ saved: true, detail: buildDetail(body.user) });
}
