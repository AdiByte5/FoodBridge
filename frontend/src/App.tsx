import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AccountPage } from './pages/AccountPage'
import { AdminDashboard } from './pages/AdminDashboard'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { DonorDashboard } from './pages/DonorDashboard'
import { EnginePage } from './pages/EnginePage'
import { LoginPage } from './pages/Login'
import { NotificationsPage } from './pages/NotificationsPage'
import { RecipientDashboard } from './pages/RecipientDashboard'
import { SignupPage } from './pages/SignupPage'
import { SystemPage } from './pages/SystemPage'
import { UsersPage } from './pages/UsersPage'
import { VolunteerDashboard } from './pages/VolunteerDashboard'
import type { Role } from './lib/types'
import { homeRouteFor, useAuth } from './store/auth'

function FullPageLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-50">
      <div className="flex flex-col items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700">
          <svg viewBox="0 0 100 100" className="h-6 w-6">
            <path d="M18 60c16 0 22-9 32-9s16 9 32 9" stroke="white" strokeWidth={9} fill="none" strokeLinecap="round" />
          </svg>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-500">
          <Loader2 size={15} className="animate-spin" /> Loading FoodBridge…
        </div>
      </div>
    </div>
  )
}

function Protected({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to={homeRouteFor(user.role)} replace />
  return <AppShell>{children}</AppShell>
}

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <FullPageLoader />
  return <Navigate to={user ? homeRouteFor(user.role) : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/" element={<RootRedirect />} />
      <Route
        path="/donor"
        element={
          <Protected roles={['DONOR']}>
            <DonorDashboard />
          </Protected>
        }
      />
      <Route
        path="/recipient"
        element={
          <Protected roles={['RECIPIENT']}>
            <RecipientDashboard />
          </Protected>
        }
      />
      <Route
        path="/volunteer"
        element={
          <Protected roles={['VOLUNTEER']}>
            <VolunteerDashboard />
          </Protected>
        }
      />
      <Route
        path="/admin"
        element={
          <Protected roles={['ADMIN']}>
            <AdminDashboard />
          </Protected>
        }
      />
      <Route
        path="/engine"
        element={
          <Protected roles={['ADMIN']}>
            <EnginePage />
          </Protected>
        }
      />
      <Route
        path="/analytics"
        element={
          <Protected roles={['ADMIN']}>
            <AnalyticsPage />
          </Protected>
        }
      />
      <Route
        path="/admin/users"
        element={
          <Protected roles={['ADMIN']}>
            <UsersPage />
          </Protected>
        }
      />
      <Route
        path="/admin/system"
        element={
          <Protected roles={['ADMIN']}>
            <SystemPage />
          </Protected>
        }
      />
      <Route
        path="/account"
        element={
          <Protected roles={['ADMIN', 'DONOR', 'RECIPIENT', 'VOLUNTEER']}>
            <AccountPage />
          </Protected>
        }
      />
      <Route
        path="/notifications"
        element={
          <Protected roles={['ADMIN', 'DONOR', 'RECIPIENT', 'VOLUNTEER']}>
            <NotificationsPage />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
