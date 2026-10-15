import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  Bell,
  BrainCircuit,
  ChevronRight,
  Cpu,
  LayoutDashboard,
  LogOut,
  PlayCircle,
  UserRound,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { relativeTime, roleLabel } from '../lib/format'
import type { NotificationItem, Role } from '../lib/types'
import { useAuth } from '../store/auth'
import { Avatar } from './ui'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  roles: Role[]
  end?: boolean
}

const navItems: NavItem[] = [
  { to: '/admin', label: 'Command Center', icon: <LayoutDashboard size={18} />, roles: ['ADMIN'], end: true },
  { to: '/donor', label: 'Donor Dashboard', icon: <LayoutDashboard size={18} />, roles: ['DONOR'], end: true },
  { to: '/recipient', label: 'Recipient Dashboard', icon: <LayoutDashboard size={18} />, roles: ['RECIPIENT'], end: true },
  { to: '/volunteer', label: 'Volunteer Hub', icon: <LayoutDashboard size={18} />, roles: ['VOLUNTEER'], end: true },
  { to: '/engine', label: 'Allocation Engine', icon: <BrainCircuit size={18} />, roles: ['ADMIN'] },
  { to: '/scenario', label: 'Scenario Runner', icon: <PlayCircle size={18} />, roles: ['ADMIN'] },
  { to: '/analytics', label: 'Reports & Analytics', icon: <Activity size={18} />, roles: ['ADMIN'] },
  { to: '/admin/users', label: 'Users & Verification', icon: <Users size={18} />, roles: ['ADMIN'] },
  { to: '/admin/system', label: 'Audit & System', icon: <Cpu size={18} />, roles: ['ADMIN'] },
  { to: '/notifications', label: 'Notifications', icon: <Bell size={18} />, roles: ['ADMIN', 'DONOR', 'RECIPIENT', 'VOLUNTEER'] },
  { to: '/account', label: 'Your account', icon: <UserRound size={18} />, roles: ['ADMIN', 'DONOR', 'RECIPIENT', 'VOLUNTEER'] },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  const role = (user?.role ?? 'DONOR') as Role
  const items = useMemo(() => navItems.filter((item) => item.roles.includes(role)), [role])
  const current = useMemo(
    () => [...items].reverse().find((item) => location.pathname.startsWith(item.to)),
    [items, location.pathname],
  )

  const loadNotifications = async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        api.get<NotificationItem[]>('/notifications'),
        api.get<{ unread: number }>('/notifications/unread-count'),
      ])
      setNotifications(listRes.data.slice(0, 8))
      setUnread(countRes.data.unread)
    } catch {
      /* notification fetch is best-effort */
    }
  }

  useEffect(() => {
    void loadNotifications()
    const interval = setInterval(() => void loadNotifications(), 30000)
    return () => clearInterval(interval)
  }, [location.pathname])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const markAllRead = async () => {
    await api.post('/notifications/read-all')
    void loadNotifications()
  }

  const markRead = async (id: number) => {
    await api.post(`/notifications/${id}/read`)
    void loadNotifications()
  }

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col bg-ink-950 lg:flex">
        <div className="grid-noise flex items-center gap-3 px-6 pb-6 pt-7">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-900/40">
            <svg viewBox="0 0 100 100" className="h-6 w-6">
              <path d="M18 60c16 0 22-9 32-9s16 9 32 9" stroke="white" strokeWidth={9} fill="none" strokeLinecap="round" />
              <circle cx="34" cy="37" r="7" fill="#FBBF24" />
              <circle cx="66" cy="37" r="7" fill="#FBBF24" />
            </svg>
          </div>
          <div>
            <p className="text-[15px] font-extrabold tracking-tight text-white">FoodBridge</p>
            <p className="text-[11px] font-medium text-ink-400">Intelligent Food Rescue</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition ${
                  isActive
                    ? 'bg-white/10 text-white shadow-inner ring-1 ring-white/10'
                    : 'text-ink-400 hover:bg-white/5 hover:text-ink-100'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-brand-300' : 'text-ink-500 group-hover:text-ink-300'}>
                    {item.icon}
                  </span>
                  {item.label}
                  {isActive && <ChevronRight size={14} className="ml-auto text-brand-300" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <Link to="/account" className="flex min-w-0 flex-1 items-center gap-3" title="Open your account">
              <Avatar name={user?.fullName} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold text-white">{user?.fullName}</span>
                <span className="block truncate text-[11px] font-medium text-ink-400">
                  {user?.organizationName ?? roleLabel[role]}
                </span>
              </span>
            </Link>
            <button
              onClick={logout}
              className="rounded-lg p-2 text-ink-400 transition hover:bg-white/10 hover:text-white"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen w-full flex-col lg:pl-[264px]">
        <header className="sticky top-0 z-30 border-b border-ink-900/5 bg-white/80 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 lg:hidden">
                <svg viewBox="0 0 100 100" className="h-5 w-5">
                  <path d="M18 60c16 0 22-9 32-9s16 9 32 9" stroke="white" strokeWidth={9} fill="none" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p className="text-[15px] font-extrabold tracking-tight text-ink-900">
                  {current?.label ?? 'FoodBridge'}
                </p>
                <p className="hidden text-[11.5px] font-medium text-ink-500 sm:block">
                  {roleLabel[role]} workspace · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden rounded-full bg-brand-50 px-3 py-1.5 text-[11.5px] font-bold text-brand-700 sm:inline-flex">
                {roleLabel[role]}
              </span>
              <div className="relative" ref={bellRef}>
                <button
                  onClick={() => setBellOpen((open) => !open)}
                  className="relative rounded-xl p-2.5 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                  {unread > 0 && (
                    <span className="pulse-ring absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {bellOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-ink-900/5"
                    >
                      <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
                        <p className="text-sm font-bold text-ink-900">Notifications</p>
                        <button className="text-[12px] font-semibold text-brand-700 hover:underline" onClick={markAllRead}>
                          Mark all read
                        </button>
                      </div>
                      <div className="max-h-[340px] overflow-y-auto">
                        {notifications.length === 0 && (
                          <p className="px-4 py-8 text-center text-sm text-ink-500">You're all caught up.</p>
                        )}
                        {notifications.map((item) => (
                          <button
                            key={item.notificationId}
                            onClick={() => void markRead(item.notificationId)}
                            className={`flex w-full gap-3 border-b border-ink-50 px-4 py-3 text-left transition hover:bg-ink-50 ${
                              item.isRead ? 'opacity-70' : ''
                            }`}
                          >
                            <span
                              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                item.isRead ? 'bg-ink-200' : 'bg-brand-500'
                              }`}
                            />
                            <span className="min-w-0">
                              <span className="block text-[13px] font-bold text-ink-900">{item.title}</span>
                              <span className="mt-0.5 line-clamp-2 block text-[12px] leading-relaxed text-ink-500">
                                {item.message}
                              </span>
                              <span className="mt-1 block text-[11px] font-medium text-ink-400">
                                {relativeTime(item.createdAt)}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                      <Link
                        to="/notifications"
                        onClick={() => setBellOpen(false)}
                        className="block bg-ink-50/70 px-4 py-3 text-center text-[12.5px] font-semibold text-brand-700 hover:bg-ink-100"
                      >
                        View all notifications
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto w-full max-w-[1320px]">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </div>
        </main>

        <footer className="border-t border-ink-900/5 px-6 py-4">
          <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-2 text-[11.5px] font-medium text-ink-400">
            <span>© {new Date().getFullYear()} FoodBridge · Intelligent Food Rescue Coordination Platform</span>
            <span>Built by Adithyan S Nair</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
