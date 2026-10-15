import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { factorColors, initials, scoreHex, statusTone, prettyStatus } from '../lib/format'
import type { FactorScore } from '../lib/types'

export function Card({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode
  className?: string
  padded?: boolean
}) {
  return <div className={`card ${padded ? 'p-5 sm:p-6' : ''} ${className}`}>{children}</div>
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-bold tracking-tight text-ink-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  const palette: Record<string, string> = {
    neutral: 'bg-ink-100 text-ink-700',
    brand: 'bg-brand-50 text-brand-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-sky-50 text-sky-700',
    rose: 'bg-rose-50 text-rose-700',
    violet: 'bg-violet-50 text-violet-700',
  }
  return <span className={`chip ${palette[tone] ?? palette.neutral}`}>{children}</span>
}

export function StatusBadge({ status, label }: { status?: string | null; label?: string }) {
  const tone = statusTone(status)
  return (
    <span className={`chip ${tone.bg} ${tone.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {label ?? prettyStatus(status)}
    </span>
  )
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'brand',
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  tone?: 'brand' | 'amber' | 'sky' | 'rose' | 'violet'
}) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-700',
    amber: 'bg-amber-50 text-amber-700',
    sky: 'bg-sky-50 text-sky-700',
    rose: 'bg-rose-50 text-rose-700',
    violet: 'bg-violet-50 text-violet-700',
  }
  return (
    <div className="card card-hover p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-ink-500">{label}</p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-ink-900 tabular-nums">{value}</p>
        </div>
        {icon && <div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>{icon}</div>}
      </div>
      {hint && <p className="mt-2 text-xs font-medium text-ink-500">{hint}</p>}
    </div>
  )
}

/**
 * A single card that groups several related numbers together, so a page does
 * not turn into a row of disconnected boxes.
 */
export function StatStrip({
  items,
  className = '',
}: {
  items: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode }[]
  className?: string
}) {
  return (
    <div className={`card overflow-hidden ${className}`}>
      <div className="grid grid-cols-2 gap-px bg-ink-100 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="bg-white p-5">
            <div className="flex items-center gap-2">
              {item.icon && <span className="text-brand-600">{item.icon}</span>}
              <p className="text-[12px] font-semibold text-ink-500">{item.label}</p>
            </div>
            <p className="mt-1.5 text-2xl font-extrabold tracking-tight tabular-nums text-ink-900">{item.value}</p>
            {item.hint && <p className="mt-1 text-[11.5px] font-medium text-ink-400">{item.hint}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ScoreRing({
  score,
  size = 92,
  label = 'score',
}: {
  score?: number | null
  size?: number
  label?: string
}) {
  const value = score ?? 0
  const stroke = size >= 80 ? 8 : 6
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(value, 100) / 100)
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#eceef1" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={scoreHex(value)}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-lg font-extrabold tabular-nums text-ink-900">
          {value ? value.toFixed(1) : '—'}
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{label}</div>
      </div>
    </div>
  )
}

export function FactorBar({ factor, compact = false }: { factor: FactorScore; compact?: boolean }) {
  const color = factorColors[factor.key] ?? '#0e7c57'
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <span className="flex items-center gap-2 font-semibold text-ink-800">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
          {factor.label}
          <span className="text-[11px] font-medium text-ink-400">· {factor.weight}% weight</span>
        </span>
        <span className="font-bold tabular-nums text-ink-900">{factor.score.toFixed(1)}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(factor.score, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      {!compact && <p className="mt-1 text-xs leading-relaxed text-ink-500">{factor.detail}</p>}
    </div>
  )
}

export function ProgressBar({ value, tone = 'brand' }: { value: number; tone?: string }) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-600',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    sky: 'bg-sky-500',
  }
  return (
    <div className="h-2 overflow-hidden rounded-full bg-ink-100">
      <motion.div
        className={`h-full rounded-full ${tones[tone] ?? tones.brand}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />
    </div>
  )
}

export function Avatar({ name, size = 40 }: { name?: string | null; size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode
  title: string
  message?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 px-6 py-12 text-center">
      {icon && <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand-600 ring-1 ring-ink-900/5">{icon}</div>}
      <p className="text-sm font-semibold text-ink-800">{title}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-ink-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = 'max-w-2xl',
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  width?: string
}) {
  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-ink-950/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={`relative z-10 w-full ${width} max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white shadow-lift sm:rounded-3xl`}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.12 }}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-ink-100 bg-white/95 px-6 py-4 backdrop-blur">
              <div>
                <h3 className="text-base font-bold tracking-tight text-ink-900">{title}</h3>
                {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
              </div>
              <button className="btn-ghost -mr-2 rounded-full p-2" onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[]
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-ink-100/80 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative rounded-lg px-3.5 py-2 text-[13px] font-semibold transition ${
            active === tab.id ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-600">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink-800">{value}</p>
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
