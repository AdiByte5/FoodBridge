import {
  Activity,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  ShieldCheck,
  TriangleAlert,
  Truck,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { statusColors } from '../components/charts'
import { Card, PageHeader, SectionTitle, Skeleton } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { expiryLabel, formatCount, formatDuration, kg, prettyStatus, relativeTime } from '../lib/format'
import type { AdminUser, AllocationView, Analytics, Donation } from '../lib/types'
import { useAuth } from '../store/auth'

/** Plain-language meaning of every donation status. */
const statusNotes: Record<string, string> = {
  PENDING: 'no recipient matched yet',
  ALLOCATED: 'proposed to a recipient',
  PICKED_UP: 'with the volunteer',
  DELIVERED: 'waiting for confirmation',
  COMPLETED: 'confirmed and closed',
  CANCELLED: 'withdrawn by the donor',
  EXPIRED: 'unsafe to distribute',
}

export function AdminDashboard() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [allocations, setAllocations] = useState<AllocationView[]>([])
  const [expiring, setExpiring] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [analyticsRes, userRes, allocationRes, expiringRes] = await Promise.all([
        api.get<Analytics>('/analytics/overview'),
        api.get<AdminUser[]>('/admin/users'),
        api.get<AllocationView[]>('/allocations'),
        api.get<Donation[]>('/donations/expiring?hours=8'),
      ])
      setAnalytics(analyticsRes.data)
      setUsers(userRes.data)
      setAllocations(allocationRes.data)
      setExpiring(expiringRes.data)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading || !analytics) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-5 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-72" />
          </div>
          <div className="space-y-5">
            <Skeleton className="h-56" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    )
  }

  const { overview } = analytics

  // 1 · things a human has to decide
  const pendingVerification = users.filter(
    (entry) => (entry.role === 'DONOR' || entry.role === 'RECIPIENT') && entry.verified === false,
  )
  const expiringSorted = [...expiring].sort((a, b) => (a.hoursToExpiry ?? 0) - (b.hoursToExpiry ?? 0))
  const noVolunteer = allocations.filter((entry) => entry.allocationStatus === 'ACCEPTED' && !entry.assignmentId)

  const actions = [
    {
      id: 'verify',
      label: 'Organizations waiting for verification',
      detail: pendingVerification.length
        ? pendingVerification.slice(0, 2).map((entry) => entry.organizationName ?? entry.fullName).join('  ·  ')
        : 'No new registrations to review',
      count: pendingVerification.length,
      icon: <ShieldCheck size={18} />,
      to: '/admin/users',
      tone: 'bg-amber-50 text-amber-700',
    },
    {
      id: 'expiry',
      label: 'Donations expiring within 8 hours',
      detail: expiringSorted.length
        ? expiringSorted.slice(0, 2).map((donation) => `${donation.foodName} · ${expiryLabel(donation.hoursToExpiry).text}`).join('  ·  ')
        : 'Every donation has a healthy window',
      count: expiringSorted.length,
      icon: <TriangleAlert size={18} />,
      to: '/engine',
      tone: 'bg-rose-50 text-rose-700',
    },
    {
      id: 'volunteer',
      label: 'Accepted allocations with no volunteer',
      detail: noVolunteer.length
        ? noVolunteer.slice(0, 2).map((entry) => entry.foodName).join('  ·  ')
        : 'Every accepted allocation has a volunteer',
      count: noVolunteer.length,
      icon: <Truck size={18} />,
      to: '/engine',
      tone: 'bg-sky-50 text-sky-700',
    },
  ]

  // 2 · where every donation currently sits
  const pipeline = analytics.statusFunnel.filter((slice) => slice.value > 0)
  const pipelineTotal = pipeline.reduce((sum, slice) => sum + slice.value, 0) || 1

  return (
    <div>
      <PageHeader
        title="Command center"
        subtitle={`Welcome back, ${user?.fullName?.split(' ')[0] ?? 'administrator'}. What needs a decision, where the food is, and what the network has achieved so far.`}
        actions={
          <Link to="/engine" className="btn-primary">
            <BrainCircuit size={15} /> Open allocation engine
          </Link>
        }
      />

      <div className="grid gap-5 xl:grid-cols-3">
        {/* main column */}
        <div className="space-y-5 xl:col-span-2">
          {/* 1 · actions */}
          <Card>
            <SectionTitle
              title="Waiting on you"
              subtitle="These are the only things that need an administrator decision"
            />
            <div className="space-y-2.5">
              {actions.map((item) => (
                <Link
                  key={item.id}
                  to={item.to}
                  className={`flex items-start gap-4 rounded-xl px-4 py-3.5 ring-1 transition ${
                    item.count > 0
                      ? 'bg-ink-50 ring-transparent hover:bg-brand-50 hover:ring-brand-200'
                      : 'bg-white ring-ink-100'
                  }`}
                >
                  <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${item.tone}`}>
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-semibold text-ink-800">{item.label}</span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-ink-500">{item.detail}</span>
                  </span>
                  {item.count > 0 ? (
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-lg font-extrabold tabular-nums text-ink-900">{item.count}</span>
                      <ArrowUpRight size={15} className="text-ink-400" />
                    </span>
                  ) : (
                    <span className="chip shrink-0 bg-emerald-50 text-emerald-700">
                      <CheckCircle2 size={12} /> clear
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </Card>

          {/* 2 · distribution */}
          <Card>
            <SectionTitle
              title="Donation pipeline"
              subtitle={`All ${pipelineTotal} donations and where each one currently stands`}
            />

            <div className="flex h-3 overflow-hidden rounded-full bg-ink-100">
              {pipeline.map((slice) => (
                <div
                  key={slice.name}
                  title={`${prettyStatus(slice.name)}: ${slice.value}`}
                  style={{ width: `${(slice.value / pipelineTotal) * 100}%`, background: statusColors[slice.name] ?? '#0e7c57' }}
                />
              ))}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {pipeline.map((slice) => (
                <div key={slice.name} className="flex items-center justify-between gap-3 rounded-xl bg-ink-50 px-3.5 py-2.5">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: statusColors[slice.name] ?? '#0e7c57' }}
                    />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-ink-800">{prettyStatus(slice.name)}</span>
                      <span className="block truncate text-[11px] text-ink-500">
                        {statusNotes[slice.name] ?? ''}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[13px] font-bold tabular-nums text-ink-900">{slice.value}</span>
                    {slice.kg > 0 && <span className="block text-[11px] font-medium text-ink-400">{kg(slice.kg)}</span>}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* side column */}
        <div className="space-y-5">
          {/* 3 · outcomes */}
          <Card>
            <SectionTitle title="Rescued so far" subtitle="Totals since the platform started" />
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-extrabold tracking-tight tabular-nums text-ink-900">
                {overview.totalKgRescued}
              </p>
              <span className="text-sm font-bold text-ink-500">kg rescued</span>
            </div>
            <p className="mt-1 text-[12.5px] text-ink-500">≈ {formatCount(overview.estimatedMeals)} meals served</p>

            <div className="mt-5 space-y-3.5 border-t border-ink-100 pt-4">
              {[
                {
                  label: 'Allocations accepted',
                  value: `${overview.allocationAcceptanceRate}%`,
                  hint: `engine score ${overview.avgPriorityScore}/100 on average`,
                },
                {
                  label: 'Average delivery time',
                  value: formatDuration(overview.avgDeliveryHours),
                  hint: 'from volunteer pickup to recipient confirmation',
                },
                {
                  label: 'Volunteers available',
                  value: `${overview.activeVolunteers}/${overview.totalVolunteers}`,
                  hint: 'ready to take a pickup right now',
                },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[12.5px] font-semibold text-ink-600">{row.label}</p>
                    <p className="text-[11px] text-ink-400">{row.hint}</p>
                  </div>
                  <p className="shrink-0 text-[15px] font-extrabold tabular-nums text-ink-900">{row.value}</p>
                </div>
              ))}
            </div>

            <Link to="/analytics" className="btn-secondary mt-5 w-full">
              <Activity size={15} /> Open full reports
            </Link>
          </Card>

          <Card>
            <SectionTitle
              title="Latest activity"
              subtitle="From the audit trail"
              action={
                <Link to="/admin/system" className="text-[12.5px] font-semibold text-brand-700 hover:underline">
                  View all
                </Link>
              }
            />
            <ol className="relative space-y-3 border-l border-ink-150 pl-4">
              {analytics.recentActivity.slice(0, 4).map((item, index) => (
                <li key={`${item.timestamp}-${index}`} className="relative">
                  <span className="absolute -left-[22px] top-1.5 h-2 w-2 rounded-full bg-brand-500" />
                  <p className="text-[12.5px] font-semibold leading-snug text-ink-800">{item.description}</p>
                  <p className="mt-0.5 text-[11px] text-ink-400">
                    {item.actor} · {relativeTime(item.timestamp)}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  )
}
