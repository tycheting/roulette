/**
 * 一次性初始化：建立三個分頁、標題列與預設設定。
 * 在 Apps Script 編輯器選擇 setupSpreadsheet 後按執行即可。
 * 已存在的分頁不會被覆蓋。
 */
function setupSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  ensureSheet(ss, 'Users',
    ['用戶名', '證券戶清單', '啟用', '顯示順序', '頭像網址'],
    [
      ['婷婷', '台新,國泰', true, 1, ''],
      ['綺綺', '國泰', true, 2, '']
    ]);

  ensureSheet(ss, 'Records',
    ['時間戳記', '打卡月份', '用戶名', '證券戶名稱', '總本金', '總市值', '來源'],
    []);

  ensureSheet(ss, 'Settings',
    ['設定鍵', '設定值', '說明'],
    [
      ['競賽名稱', '2026 韭菜盃', '顯示在首頁標題'],
      ['競賽結束日期', '2026-12-31', 'YYYY-MM-DD，倒數計時的目標'],
      ['是否開放打卡', 'TRUE', 'TRUE 或 FALSE'],
      ['當前打卡月份', Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM'), 'YYYY-MM，決定這期收哪個月的資料'],
      ['獎金池比例', '0.5', '損益絕對值乘上這個比例作為出資'],
      ['首頁橫幅圖網址', '', '選填，留空則不顯示橫幅圖']
    ]);

  var records = ss.getSheetByName('Records');
  records.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  records.getRange('B:B').setNumberFormat('@');
  records.getRange('E:F').setNumberFormat('#,##0');

  SpreadsheetApp.getUi().alert('分頁建立完成，可以開始使用了。');
}

function ensureSheet(ss, name, header, seed) {
  var sheet = ss.getSheetByName(name);
  if (sheet) return sheet;
  sheet = ss.insertSheet(name);
  sheet.getRange(1, 1, 1, header.length).setValues([header])
    .setFontWeight('bold').setBackground('#1e1e24').setFontColor('#f8fafc');
  if (seed.length) sheet.getRange(2, 1, seed.length, header.length).setValues(seed);
  sheet.setFrozenRows(1);
  return sheet;
}
