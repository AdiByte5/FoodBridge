import {
  Activity,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  Inbox,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Truck,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Card, PageHeader, ProgressBar, SectionTitle, Skeleton } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { compactNumber, expiryLabel, kg, prettyStatus, relativeTime } from '../lib/format'
import type { AdminUser, AllocationView, Analytics, Donation } from '../lib/types'
import { useAuth } from '../store/auth'

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
  const pendingVerification = users.filter(
    (entry) => (entry.role === 'DONOR' || entry.role === 'RECIPIENT') && entry.verified === false,
  )
  const awaitingAcceptance = allocations.filter((entry) => entry.allocationStatus === 'PROPOSED')
  const movingNow = allocations.filter(
    (entry) => entry.deliveryStatus === 'PICKED_UP' || entry.deliveryStatus === 'IN_TRANSIT',
  )

  const attention = [
    {
      id: 'verify',
      label: 'Organizations waiting for verification',
      count: pendingVerification.length,
      icon: <ShieldCheck size={18} />,
      to: '/admin/users',
      tone: 'amber',
    },
    {
      id: 'accept',
      label: 'Allocations awaiting a recipient reply',
      count: awaitingAcceptance.length,
      icon: <Inbox size={18} />,
      to: '/engine',
      tone: 'violet',
    },
    {
      id: 'expiry',
      label: 'Donations expiring within 8 hours',
      count: expiring.length,
      icon: <TriangleAlert size={18} />,
      to: '/engine',
      tone: 'rose',
    },
    {
      id: 'moving',
      label: 'Deliveries currently on the road',
      count: movingNow.length,
      icon: <Truck size={18} />,
      to: '/analytics',
      tone: 'sky',
    },
  ] as const

  const attentionTones: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
    rose: 'bg-rose-50 text-rose-700',
    sky: 'bg-sky-50 text-sky-700',
  }

  const pipeline = analytics.statusFunnel.filter((slice) => slice.value > 0)
  const pipelineMax = Math.max(...pipeline.map((slice) => slice.value), 1)
  const pipelineTones: Record<string, string> = {
    PENDING: 'amber',
    ALLOCATED: 'sky',
    PICKED_UP: 'sky',
    DELIVERED: 'brand',
    COMPLETED: 'brand',
    CANCELLED: 'rose',
    EXPIRED: 'rose',
  }

  return (
    <div>
      <PageHeader
        title="Command center"
        subtitle={`Welcome back, ${user?.fullName?.split(' ')[0] ?? 'administrator'}. Start with what needs a decision, then review the network.`}
        actions={
          <>
            <Link to="/engine" className="btn-secondary">
              <BrainCircuit size={15} /> Allocation engine
            </Link>
            <Link to="/scenario" className="btn-primary">
              <Sparkles size={15} /> Run scenario
            </Link>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-3">
        {/* main column */}
        <div className="space-y-5 xl:col-span-2">
          <Card>
            <SectionTitle
              title="Needs your attention"
              subtitle="Everything that is waiting on a decision right now"
            />
            <div className="space-y-2">
              {attention.map((item) => (
                <Link
                  key={item.id}
                  to={item.to}
                  className={`flex items-center gap-4 rounded-xl px-4 py-3.5 ring-1 transition ${
                    item.count > 0
                      ? 'bg-ink-50 ring-transparent hover:bg-brand-50 hover:ring-brand-200'
                      : 'bg-white ring-ink-100'
                  }`}
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${attentionTones[item.tone]}`}>
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1 text-[13.5px] font-semibold text-ink-700">{item.label}</span>
                  {item.count > 0 ? (
                    <>
                      <span className="text-lg font-extrabold tabular-nums text-ink-900">{item.count}</span>
                      <ArrowUpRight size={15} className="shrink-0 text-ink-400" />
                    </>
                  ) : (
                    <span className="chip bg-emerald-50 text-emerald-700">
                      <CheckCircle2 size={12} /> clear
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle title="Where the food is right now" subtitle="Live status of every donation in the pipeline" />
            <div className="space-y-4">
              {pipeline.map((slice) => (
                <div key={slice.name}>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-semibold text-ink-700">{prettyStatus(slice.name)}</span>
                    <span className="font-bold tabular-nums text-ink-900">
                      {slice.value}
                      <span className="ml-2 font-medium text-ink-400">{kg(slice.kg)}</span>
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar value={(slice.value / pipelineMax) * 100} tone={pipelineTones[slice.name] ?? 'brand'} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-ink-100 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[13.5px] font-bold text-ink-900">Expiring soon</p>
                <Link to="/engine" className="text-[12.5px] font-semibold text-brand-700 hover:underline">
                  Open allocation engine
                </Link>
              </div>
              {expiring.length === 0 ? (
                <p className="rounded-xl bg-emerald-50/70 px-4 py-3 text-[12.5px] font-medium text-emerald-800">
                  Nothing urgent — every donation has a healthy expiry window.
                </p>
              ) : (
                <div className="space-y-2">
                  {expiring.slice(0, 3).map((donation) => {
                    const expiry = expiryLabel(donation.hoursToExpiry)
                    return (
                      <div key={donation.donationId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink-50 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-ink-900">{donation.foodName}</p>
                          <p className="text-[11.5px] text-ink-500">
                            {donation.donorName} · {kg(donation.quantity, donation.unit)}
                          </p>
                        </div>
                        <span className={`chip ${expiry.tone.bg} ${expiry.tone.text}`}>
                          <TriangleAlert size={12} /> {expiry.text}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* side column */}
        <div className="space-y-5">
          <Card>
            <SectionTitle title="Rescue summary" subtitle="Since the platform started" />
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-extrabold tracking-tight tabular-nums text-ink-900">
                {overview.totalKgRescued}
              </p>
              <span className="text-sm font-bold text-ink-500">kg rescued</span>
            </div>
            <p className="mt-1 text-[12.5px] text-ink-500">≈ {compactNumber(overview.estimatedMeals)} meals served</p>

            <div className="mt-5 space-y-3.5 border-t border-ink-100 pt-4">
              {[
                { label: 'Donations registered', value: `${overview.totalDonations}`, hint: `${overview.activeDonations} still moving` },
                { label: 'Verified organizations', value: `${overview.verifiedOrganizations}/${overview.totalRecipients}`, hint: 'receiving food' },
                { label: 'Allocation acceptance', value: `${overview.allocationAcceptanceRate}%`, hint: `avg score ${overview.avgPriorityScore}/100` },
                { label: 'Average delivery time', value: `${overview.avgDeliveryHours} h`, hint: 'pickup to confirmed' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[12.5px] font-semibold text-ink-600">{row.label}</p>
                    <p className="text-[11px] text-ink-400">{row.hint}</p>
                  </div>
                  <p className="text-[15px] font-extrabold tabular-nums text-ink-900">{row.value}</p>
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
