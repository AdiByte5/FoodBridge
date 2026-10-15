import { motion } from 'framer-motion'
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  Route,
  Sparkles,
  Star,
  Truck,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Card,
  EmptyState,
  KeyValue,
  PageHeader,
  ProgressBar,
  SectionTitle,
  Skeleton,
  StatStrip,
  StatusBadge,
} from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { formatDateTime, kg, prettyStatus } from '../lib/format'
import type { Assignment, Volunteer } from '../lib/types'
import { useAuth } from '../store/auth'

export function VolunteerDashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Volunteer | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const load = useCallback(async () => {
    try {
      const [profileRes, assignmentRes] = await Promise.all([
        api.get<Volunteer>('/volunteers/me'),
        api.get<Assignment[]>('/volunteers/me/assignments'),
      ])
      setProfile(profileRes.data)
      setAssignments(assignmentRes.data)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const setAvailability = async (status: 'AVAILABLE' | 'BUSY' | 'OFFLINE') => {
    setUpdatingStatus(true)
    try {
      const { data } = await api.patch<Volunteer>('/volunteers/me/availability', { availabilityStatus: status })
      setProfile(data)
      toast.success(`You are now ${prettyStatus(status).toLowerCase()}`)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setUpdatingStatus(false)
    }
  }

  const act = async (assignment: Assignment, action: 'accept' | 'decline' | 'start' | 'in-transit' | 'delivered') => {
    setBusyId(assignment.assignmentId)
    try {
      const { data } = await api.post<Assignment>(`/volunteers/assignments/${assignment.assignmentId}/${action}`,
        action === 'decline' ? { reason: 'Currently unavailable' } : undefined)
      const messages: Record<string, string> = {
        accept: 'Assignment accepted — the donor has been notified',
        decline: 'Assignment declined — the coordinator will re-match',
        start: 'Pickup confirmed. Food is in your hands!',
        'in-transit': 'Marked in transit — recipient notified',
        delivered: 'Delivered! Awaiting recipient confirmation',
      }
      toast.success(messages[action])
      setAssignments((prev) => prev.map((item) => (item.assignmentId === data.assignmentId ? data : item)))
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusyId(null)
    }
  }

  if (loading || !profile) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  const pending = assignments.filter((a) => a.assignmentStatus === 'PENDING')
  const activeAssignments = assignments.filter((a) => a.assignmentStatus === 'ACCEPTED')
  const completedAssignments = assignments.filter((a) => a.assignmentStatus === 'COMPLETED')
  const avgMatch = assignments.length
    ? Math.round(assignments.reduce((sum, a) => sum + (a.matchScore ?? 0), 0) / assignments.length)
    : 0

  return (
    <div>
      <PageHeader
        title={`Hello, ${user?.fullName?.split(' ')[0] ?? 'Volunteer'}`}
        subtitle="Your availability and location feed directly into the smart volunteer coordination engine."
        actions={
          <div className="flex items-center gap-2 rounded-2xl bg-white p-1.5 ring-1 ring-ink-900/5">
            {(['AVAILABLE', 'BUSY', 'OFFLINE'] as const).map((status) => (
              <button
                key={status}
                onClick={() => void setAvailability(status)}
                disabled={updatingStatus}
                className={`rounded-xl px-3.5 py-2 text-[12.5px] font-bold transition ${
                  profile.availabilityStatus === status
                    ? status === 'AVAILABLE'
                      ? 'bg-brand-600 text-white'
                      : status === 'BUSY'
                        ? 'bg-amber-500 text-white'
                        : 'bg-ink-800 text-white'
                    : 'text-ink-500 hover:bg-ink-100'
                }`}
              >
                {prettyStatus(status)}
              </button>
            ))}
          </div>
        }
      />

      <StatStrip
        items={[
          { label: 'Awaiting your reply', value: pending.length, hint: 'accept or decline', icon: <Clock size={15} /> },
          { label: 'Active deliveries', value: activeAssignments.length, hint: 'in your hands now', icon: <Truck size={15} /> },
          { label: 'Completed', value: profile.completedDeliveries ?? 0, hint: 'deliveries lifetime', icon: <PackageCheck size={15} /> },
          { label: 'Avg match score', value: `${avgMatch}/100`, hint: 'how well you fit pickups', icon: <Sparkles size={15} /> },
        ]}
      />

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-3">
          <SectionTitle
            title="Your assignments"
            subtitle="Accept a task, then move it through pickup → transit → delivered."
          />
          {assignments.length === 0 && (
            <EmptyState
              icon={<Route size={20} />}
              title="No assignments yet"
              message="Stay marked as available — the engine matches the closest, least-loaded volunteer first."
            />
          )}
          {[...pending, ...activeAssignments, ...completedAssignments].map((assignment) => {
            const isActive = assignment.assignmentStatus === 'ACCEPTED'
            const delivery = assignment.deliveryStatus ?? 'PENDING'
            return (
              <motion.div key={assignment.assignmentId} layout className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-bold text-ink-900">{assignment.foodName}</p>
                      <StatusBadge status={assignment.assignmentStatus} />
                      {isActive && <StatusBadge status={delivery} />}
                      {isActive && (assignment.hoursToExpiry ?? 99) > 0 && (assignment.hoursToExpiry ?? 99) < 4 && (
                        <span className="chip bg-rose-50 text-rose-700">
                          <Zap size={12} /> expires in {assignment.hoursToExpiry?.toFixed(1)}h
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[12.5px] text-ink-500">
                      {kg(assignment.quantity, assignment.unit)} · {assignment.categoryName} ·{' '}
                      {prettyStatus(assignment.storageRequirement)} · matched {assignment.matchScore?.toFixed(1)}/100
                    </p>

                    <div className="mt-3 flex flex-col gap-2 rounded-xl bg-ink-50 p-3.5 sm:flex-row sm:items-center sm:gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Pickup</p>
                        <p className="truncate text-[13px] font-semibold text-ink-800">{assignment.donorName}</p>
                        <p className="truncate text-[12px] text-ink-500">{assignment.pickupAddress}</p>
                      </div>
                      <ArrowRight size={16} className="hidden shrink-0 text-ink-300 sm:block" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Deliver to</p>
                        <p className="truncate text-[13px] font-semibold text-ink-800">{assignment.recipientName}</p>
                        <p className="truncate text-[12px] text-ink-500">{assignment.recipientAddress}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[16px] font-extrabold tabular-nums text-ink-900">{assignment.distanceKm ?? '—'} km</p>
                        <p className="text-[11px] font-medium text-ink-500">route distance</p>
                      </div>
                    </div>

                    <p className="mt-2 flex items-center gap-2 text-[12px] text-ink-500">
                      <Phone size={12} /> Recipient contact shared after acceptance · pickup window {assignment.pickupWindow}
                    </p>
                  </div>

                  <div className="flex flex-col items-stretch gap-2">
                    {assignment.assignmentStatus === 'PENDING' && (
                      <>
                        <button
                          className="btn-primary py-2 text-[13px]"
                          onClick={() => void act(assignment, 'accept')}
                          disabled={busyId === assignment.assignmentId}
                        >
                          {busyId === assignment.assignmentId ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                          Accept task
                        </button>
                        <button
                          className="btn-ghost py-2 text-[13px] text-rose-600 hover:bg-rose-50"
                          onClick={() => void act(assignment, 'decline')}
                          disabled={busyId === assignment.assignmentId}
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {assignment.assignmentStatus === 'ACCEPTED' && delivery === 'PENDING' && (
                      <button className="btn-primary py-2 text-[13px]" onClick={() => void act(assignment, 'start')} disabled={busyId === assignment.assignmentId}>
                        <Navigation size={14} /> Start pickup
                      </button>
                    )}
                    {delivery === 'PICKED_UP' && (
                      <button className="btn-primary py-2 text-[13px]" onClick={() => void act(assignment, 'in-transit')} disabled={busyId === assignment.assignmentId}>
                        <Truck size={14} /> Mark in transit
                      </button>
                    )}
                    {delivery === 'IN_TRANSIT' && (
                      <button className="btn-primary py-2 text-[13px]" onClick={() => void act(assignment, 'delivered')} disabled={busyId === assignment.assignmentId}>
                        <PackageCheck size={14} /> Mark delivered
                      </button>
                    )}
                    {assignment.assignmentStatus === 'COMPLETED' && (
                      <span className="chip justify-center bg-emerald-50 py-2 text-emerald-700">
                        <CheckCircle2 size={13} /> Completed
                      </span>
                    )}
                  </div>
                </div>

                {isActive && (
                  <div className="mt-4">
                    <ProgressBar
                      value={delivery === 'PENDING' ? 15 : delivery === 'PICKED_UP' ? 45 : delivery === 'IN_TRANSIT' ? 75 : 100}
                    />
                    <div className="mt-2 flex justify-between text-[11px] font-semibold text-ink-500">
                      <span>Assigned</span>
                      <span>Picked up</span>
                      <span>In transit</span>
                      <span>Delivered</span>
                    </div>
                  </div>
                )}

                {assignment.matchExplanation && (
                  <p className="mt-3 flex items-start gap-2 rounded-xl bg-brand-50/60 p-3 text-[12px] leading-relaxed text-brand-900/80">
                    <Sparkles size={13} className="mt-0.5 shrink-0 text-brand-600" />
                    {assignment.matchExplanation}
                  </p>
                )}
              </motion.div>
            )
          })}
        </div>

        <div className="space-y-5">
          <Card>
            <SectionTitle title="Volunteer profile" subtitle="Used by the coordination engine" />
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                <Bike size={24} />
              </div>
              <div>
                <p className="text-[15px] font-extrabold text-ink-900">{profile.name}</p>
                <p className="text-[12.5px] text-ink-500">
                  {profile.vehicleType} · {profile.currentLocation}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <KeyValue label="Status" value={<StatusBadge status={profile.availabilityStatus} />} />
              <KeyValue label="Active" value={profile.activeDeliveries ?? 0} />
              <KeyValue label="Completed" value={profile.completedDeliveries ?? 0} />
              <KeyValue label="Phone" value={profile.phoneNumber ?? '—'} />
            </div>
          </Card>

          <Card>
            <SectionTitle title="How matching works" subtitle="Smart volunteer coordination" />
            <div className="space-y-3 text-[12.5px] leading-relaxed text-ink-600">
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <MapPin size={14} />
                </span>
                <p>
                  <span className="font-bold text-ink-800">55% proximity</span> — the volunteer closest to the pickup point wins.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700">
                  <Zap size={14} />
                </span>
                <p>
                  <span className="font-bold text-ink-800">25% current load</span> — fewer active deliveries means a higher score.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-700">
                  <Star size={14} />
                </span>
                <p>
                  <span className="font-bold text-ink-800">20% experience</span> — completed deliveries build your reliability score.
                </p>
              </div>
              <p className="rounded-xl bg-ink-50 p-3 text-[12px] text-ink-500">
                Last matched: {formatDateTime(assignments[0]?.assignedTime)} · {assignments.length} total assignments on record.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
