import { motion } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  HeartHandshake,
  Leaf,
  Loader2,
  Lock,
  Mail,
  Route,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api, errorMessage } from '../lib/api'
import type { PlatformStats } from '../lib/types'
import { homeRouteFor, useAuth } from '../store/auth'

const demoAccounts = [
  { label: 'Administrator', email: 'admin@foodbridge.org', password: 'Admin@123', hint: 'Monitor, verify, analyse' },
  { label: 'Donor', email: 'donor@foodbridge.org', password: 'Donor@123', hint: 'Spice Route Restaurant' },
  { label: 'Recipient NGO', email: 'recipient@foodbridge.org', password: 'Recipient@123', hint: 'Akshaya Patra Kitchen' },
  { label: 'Volunteer', email: 'volunteer@foodbridge.org', password: 'Volunteer@123', hint: 'Ravi Kumar · Bike' },
]

const features = [
  { icon: <BrainCircuit size={15} />, text: 'Intelligent allocation engine' },
  { icon: <BarChart3 size={15} />, text: 'Priority-based decision scoring' },
  { icon: <HeartHandshake size={15} />, text: 'Fair resource distribution' },
  { icon: <Truck size={15} />, text: 'Smart volunteer coordination' },
  { icon: <Route size={15} />, text: 'Decision explanation' },
  { icon: <Sparkles size={15} />, text: 'Real-time analytics' },
]

export function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@foodbridge.org')
  const [password, setPassword] = useState('Admin@123')
  const [busy, setBusy] = useState(false)
  const [stats, setStats] = useState<PlatformStats | null>(null)

  useEffect(() => {
    if (user) {
      navigate(homeRouteFor(user.role), { replace: true })
    }
  }, [user, navigate])

  useEffect(() => {
    api
      .get<PlatformStats>('/public/platform-stats')
      .then((res) => setStats(res.data))
      .catch(() => undefined)
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      const profile = await login(email.trim(), password)
      toast.success(`Welcome back, ${profile.fullName.split(' ')[0]}`)
      navigate(homeRouteFor(profile.role), { replace: true })
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      <div className="relative hidden overflow-hidden bg-ink-950 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-ink-950 to-ink-950" />
        <div className="grid-noise absolute inset-0 opacity-60" />
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-brand-600/25 blur-3xl" />
        <div className="absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-warm-500/10 blur-3xl" />

        <div className="relative z-10 flex h-full flex-col justify-between p-12 xl:p-16">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-xl shadow-brand-950/50">
              <svg viewBox="0 0 100 100" className="h-6 w-6">
                <path d="M18 60c16 0 22-9 32-9s16 9 32 9" stroke="white" strokeWidth={9} fill="none" strokeLinecap="round" />
                <circle cx="34" cy="37" r="7" fill="#FBBF24" />
                <circle cx="66" cy="37" r="7" fill="#FBBF24" />
              </svg>
            </div>
            <div>
              <p className="text-[17px] font-extrabold tracking-tight text-white">FoodBridge</p>
              <p className="text-[11.5px] font-medium text-brand-300/80">
                Intelligent Food Rescue Coordination &amp; Resource Allocation Platform
              </p>
            </div>
          </div>

          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="chip bg-white/10 text-brand-200 ring-1 ring-white/10">
                <Leaf size={13} /> Less food wasted, more people fed
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-white xl:text-[44px]">
                Surplus food, <span className="text-brand-300">sent where it is needed most</span>.
              </h1>
              <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-ink-300">
                FoodBridge connects restaurants, hotels and supermarkets with NGOs, food banks and shelters — and uses an
                allocation engine to decide which organisation should receive each donation.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-8 grid grid-cols-3 gap-3"
            >
              {[
                { label: 'Donations tracked', value: stats ? stats.donations : '—' },
                { label: 'Kg rescued', value: stats ? Math.round(stats.kgRescued) : '—' },
                { label: 'Partner NGOs', value: stats ? stats.recipientOrganizations : '—' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur-sm">
                  <p className="text-2xl font-extrabold tabular-nums text-white">{stat.value}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{stat.label}</p>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 grid grid-cols-2 gap-2.5"
            >
              {features.map((feature) => (
                <div key={feature.text} className="flex items-center gap-2.5 text-[13px] font-medium text-ink-200">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-500/20 text-brand-300">
                    {feature.icon}
                  </span>
                  {feature.text}
                </div>
              ))}
            </motion.div>
          </div>

          <div className="flex items-center gap-6 text-[12px] font-medium text-ink-400">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-brand-400" /> JWT-secured role-based access
            </span>
            <span>© {new Date().getFullYear()} FoodBridge</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-ink-50 px-5 py-10 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[440px]"
        >
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700">
              <svg viewBox="0 0 100 100" className="h-5 w-5">
                <path d="M18 60c16 0 22-9 32-9s16 9 32 9" stroke="white" strokeWidth={9} fill="none" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-lg font-extrabold tracking-tight text-ink-900">FoodBridge</p>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">Sign in to your workspace</h2>
          <p className="mt-1.5 text-sm text-ink-500">
            Donors, recipient organizations, volunteers and administrators — one platform.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <label className="label" htmlFor="email">
                Email address
              </label>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  id="email"
                  type="email"
                  required
                  className="input pl-10"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@organization.org"
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  id="password"
                  type="password"
                  required
                  className="input pl-10"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-5 text-center text-[12.5px] text-ink-500">
            New to FoodBridge?{' '}
            <Link to="/signup" className="font-semibold text-brand-700 hover:underline">
              Create an account
            </Link>
          </p>

          <div className="mt-7">
            <div className="mb-3 flex items-center gap-3">
              <div className="h-px flex-1 bg-ink-200" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Sample accounts · one tap</span>
              <div className="h-px flex-1 bg-ink-200" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setEmail(account.email)
                    setPassword(account.password)
                    toast.info(`${account.label} credentials filled — press Sign in`)
                  }}
                  className="group rounded-xl bg-white p-3 text-left ring-1 ring-ink-900/5 transition hover:ring-brand-600/40 hover:shadow-card"
                >
                  <p className="text-[13px] font-bold text-ink-900 group-hover:text-brand-700">{account.label}</p>
                  <p className="mt-0.5 truncate text-[11.5px] text-ink-500">{account.hint}</p>
                </button>
              ))}
            </div>
            <p className="mt-4 text-center text-[11.5px] text-ink-400">
              Passwords follow the pattern <span className="font-semibold text-ink-600">Role@123</span> — sample dataset preloaded.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
