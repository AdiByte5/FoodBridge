import type { AllocationStatus, AssignmentStatus, DeliveryStatus, DonationStatus, Role } from './types'

export const roleLabel: Record<Role, string> = {
  DONOR: 'Donor',
  RECIPIENT: 'Recipient Organization',
  VOLUNTEER: 'Volunteer',
  ADMIN: 'Administrator',
}

type Tone = { bg: string; text: string; dot: string }

const tones: Record<string, Tone> = {
  neutral: { bg: 'bg-ink-100', text: 'text-ink-700', dot: 'bg-ink-400' },
  green: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  blue: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  brand: { bg: 'bg-brand-50', text: 'text-brand-700', dot: 'bg-brand-500' },
}

export function statusTone(status?: string | null): Tone {
  switch (status) {
    case 'COMPLETED':
    case 'DELIVERED':
    case 'ACCEPTED':
    case 'ACTIVE':
    case 'AVAILABLE':
      return tones.green
    case 'PENDING':
    case 'PROPOSED':
    case 'PENDING_VERIFICATION':
      return tones.amber
    case 'ALLOCATED':
    case 'PICKED_UP':
    case 'IN_TRANSIT':
    case 'BUSY':
      return tones.blue
    case 'REJECTED':
    case 'CANCELLED':
    case 'EXPIRED':
    case 'FAILED':
    case 'SUSPENDED':
    case 'DECLINED':
      return tones.rose
    case 'SUPERSEDED':
      return tones.violet
    default:
      return tones.neutral
  }
}

export function prettyStatus(status?: string | null): string {
  if (!status) return '—'
  return status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function statusToneForDonation(status: DonationStatus) {
  return statusTone(status)
}

export type { AllocationStatus, AssignmentStatus, DeliveryStatus }

export function initials(name?: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function relativeTime(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value).getTime()
  if (Number.isNaN(date)) return '—'
  const diff = Date.now() - date
  const minutes = Math.round(diff / 60000)
  if (Math.abs(minutes) < 1) return 'just now'
  if (Math.abs(minutes) < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export function expiryLabel(hours?: number | null): { text: string; tone: Tone } {
  if (hours === null || hours === undefined) return { text: 'No expiry', tone: tones.neutral }
  if (hours <= 0) return { text: 'Expired', tone: tones.rose }
  const text = `${durationWords(hours)} left`
  if (hours < 3) return { text, tone: tones.rose }
  if (hours < 8) return { text, tone: tones.amber }
  return { text, tone: tones.green }
}

/** 0.94 -> "56 min", 2.5 -> "2 h 30 m", 26 -> "1 day 2 h" */
export function formatDuration(hours?: number | null): string {
  if (hours === null || hours === undefined) return '—'
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`
  if (hours < 24) return durationWords(hours)
  const days = Math.floor(hours / 24)
  const rest = Math.round(hours - days * 24)
  return rest === 0 ? `${days} day${days === 1 ? '' : 's'}` : `${days} day${days === 1 ? '' : 's'} ${rest} h`
}

function durationWords(hours: number): string {
  const wholeHours = Math.floor(hours)
  let minutes = Math.round((hours - wholeHours) * 60)
  let carry = wholeHours
  if (minutes === 60) {
    carry += 1
    minutes = 0
  }
  if (carry === 0) return `${minutes} min`
  return minutes === 0 ? `${carry} h` : `${carry} h ${minutes} m`
}

/** 1035 -> "1,035" (readable counts, no "1.0k") */
export function formatCount(value?: number | null): string {
  if (value === null || value === undefined) return '0'
  return Math.round(value).toLocaleString('en-IN')
}

export function kg(value?: number | null, unit = 'kg'): string {
  if (value === null || value === undefined) return '—'
  return `${value % 1 === 0 ? value : value.toFixed(1)} ${unit}`
}

export function scoreTone(score?: number | null): string {
  if (score === null || score === undefined) return 'text-ink-400'
  if (score >= 80) return 'text-emerald-600'
  if (score >= 65) return 'text-brand-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-rose-600'
}

export function scoreHex(score?: number | null): string {
  if (score === null || score === undefined) return '#8792a2'
  if (score >= 80) return '#059669'
  if (score >= 65) return '#0e7c57'
  if (score >= 50) return '#d97706'
  return '#e11d48'
}

export const factorColors: Record<string, string> = {
  expiry: '#f59e0b',
  demand: '#0e7c57',
  storage: '#0ea5e9',
  proximity: '#8b5cf6',
  preference: '#10b981',
  fairness: '#ec4899',
}
