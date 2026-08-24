import { Navigate, Route, Routes, useLocation, Link } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import WhoAmI from './pages/WhoAmI'
import Checkin from './pages/Checkin'
import Me from './pages/Me'
import { useIdentity } from './hooks/useIdentity'

/** 尚未選定身分時，一律先導到身分選擇頁 */
function RequireIdentity({ children }) {
  const { identity } = useIdentity()
  const location = useLocation()
  if (!identity) return <Navigate to="/who" replace state={{ from: location }} />
  return children
}

export default function App() {
  const { identity } = useIdentity()
  const location = useLocation()
  const showNav = identity && location.pathname !== '/who'

  return (
    <div className="mx-auto min-h-full w-full max-w-[430px] px-5 pb-6 pt-5">
      <Routes>
        <Route path="/who" element={<WhoAmI />} />
        <Route path="/" element={<RequireIdentity><Dashboard /></RequireIdentity>} />
        <Route path="/checkin" element={<RequireIdentity><Checkin /></RequireIdentity>} />
        <Route path="/me" element={<RequireIdentity><Me /></RequireIdentity>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {showNav && <TabBar pathname={location.pathname} />}
    </div>
  )
}

function TabBar({ pathname }) {
  const tabs = [
    { to: '/', label: '排行' },
    { to: '/checkin', label: '打卡' },
    { to: '/me', label: '我的' }
  ]
  return (
    <nav className="mt-10 flex justify-center gap-1 border-t border-white/5 pt-4">
      {tabs.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          className={`rounded-lg px-5 py-2 font-mono text-[10px] uppercase tracking-[0.16em] ${
            pathname === t.to ? 'bg-ink-800 text-ink_text' : 'text-muted'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
