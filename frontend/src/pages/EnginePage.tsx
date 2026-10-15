import { motion } from 'framer-motion'
import {
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Play,
  Sparkles,
  Truck,
  UserCheck,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RecommendationPanel } from '../components/RecommendationPanel'
import {
  Card,
  EmptyState,
  Modal,
  PageHeader,
  ScoreRing,
  SectionTitle,
  Skeleton,
} from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { expiryLabel, kg } from '../lib/format'
import type { AllocationView, Donation, Recommendation, VolunteerCandidate } from '../lib/types'

export function EnginePage() {
  const [donations, setDonations] = useState<Donation[]>([])
  const [allocations, setAllocations] = useState<AllocationView[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [matchOpen, setMatchOpen] = useState<AllocationView | null>(null)
  const [candidates, setCandidates] = useState<VolunteerCandidate[]>([])
  const [matchLoading, setMatchLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      const [donationRes, allocationRes] = await Promise.all([
        api.get<Donation[]>('/donations'),
        api.get<AllocationView[]>('/allocations'),
      ])
      setDonations(donationRes.data)
      setAllocations(allocationRes.data)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const pending = useMemo(() => donations.filter((d) => d.status === 'PENDING'), [donations])
  const proposed = useMemo(() => allocations.filter((a) => a.allocationStatus === 'PROPOSED'), [allocations])
  const accepted = useMemo(() => allocations.filter((a) => a.allocationStatus === 'ACCEPTED' && !a.assignmentId), [allocations])

  useEffect(() => {
    if (selectedId === null && pending.length > 0) {
      setSelectedId(pending[0].donationId)
    }
  }, [pending, selectedId])

  const run = async (mode: 'preview' | 'run') => {
    if (!selectedId) {
      toast.error('Select a donation first')
      return
    }
    setRunning(true)
    try {
      const { data } = await api.post<Recommendation>(`/allocations/engine/${selectedId}/${mode}`)
      setRecommendation(data)
      if (mode === 'run') {
        toast.success('Allocation created — recipient notified')
        await load()
      }
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setRunning(false)
    }
  }

  const openMatches = async (allocation: AllocationView) => {
    setMatchOpen(allocation)
    setMatchLoading(true)
    try {
      const { data } = await api.get<{ ranked: VolunteerCandidate[] }>(`/allocations/${allocation.allocationId}/volunteer-matches`)
      setCandidates(data.ranked)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setMatchLoading(false)
    }
  }

  const assign = async (allocation: AllocationView, volunteerId?: number) => {
    try {
      await api.post(`/allocations/${allocation.allocationId}/assign-volunteer`, volunteerId ? { volunteerId } : {})
      toast.success('Volunteer assigned and notified')
      setMatchOpen(null)
      await load()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const selected = donations.find((d) => d.donationId === selectedId) ?? null

  return (
    <div>
      <PageHeader
        title="Intelligent Allocation & Decision Engine"
        subtitle="Six weighted factors, transparent scoring, and a full explanation for every recommendation."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(320px,420px)_1fr]">
        <div className="space-y-5">
          <Card>
            <SectionTitle title="Select a pending donation" subtitle={`${pending.length} donation${pending.length === 1 ? '' : 's'} awaiting allocation`} />
            {loading && <Skeleton className="h-40" />}
            {!loading && pending.length === 0 && (
              <EmptyState
                icon={<CheckCircle2 size={18} />}
                title="No pending donations"
                message="Every donation has already been allocated. New donations appear here instantly."
              />
            )}
            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {pending.map((donation) => {
                const expiry = expiryLabel(donation.hoursToExpiry)
                const active = donation.donationId === selectedId
                return (
                  <button
                    key={donation.donationId}
                    onClick={() => setSelectedId(donation.donationId)}
                    className={`w-full rounded-xl p-3.5 text-left ring-1 transition ${
                      active ? 'bg-brand-50 ring-brand-300' : 'bg-white ring-ink-900/5 hover:ring-brand-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13.5px] font-bold text-ink-900">{donation.foodName}</p>
                      <span className={`chip ${expiry.tone.bg} ${expiry.tone.text}`}>{expiry.text}</span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-ink-500">
                      {donation.donorName} · {kg(donation.quantity, donation.unit)} · {donation.categoryName}
                    </p>
                  </button>
                )
              })}
            </div>
            <div className="mt-4 flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => void run('preview')} disabled={running || !selectedId}>
                {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />} Preview decision
              </button>
              <button className="btn-primary flex-1" onClick={() => void run('run')} disabled={running || !selectedId}>
                <Sparkles size={15} /> Run & allocate
              </button>
            </div>
            {selected && (
              <p className="mt-3 rounded-xl bg-ink-50 p-3 text-[12px] leading-relaxed text-ink-500">
                Evaluating <span className="font-semibold text-ink-700">{selected.foodName}</span> ·{' '}
                {kg(selected.quantity, selected.unit)} from {selected.donorName}, expiring{' '}
                {expiryLabel(selected.hoursToExpiry).text.toLowerCase()}.
              </p>
            )}
          </Card>

          <Card>
            <SectionTitle title="Awaiting recipient acceptance" subtitle={`${proposed.length} proposed allocation${proposed.length === 1 ? '' : 's'}`} />
            <div className="space-y-2.5">
              {proposed.length === 0 && (
                <p className="rounded-xl bg-ink-50 p-3 text-[12.5px] text-ink-500">
                  No allocations are waiting on recipient decisions right now.
                </p>
              )}
              {proposed.map((allocation) => (
                <div key={allocation.allocationId} className="rounded-xl bg-ink-50 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-ink-900">{allocation.foodName}</p>
                      <p className="truncate text-[11.5px] text-ink-500">
                        → {allocation.recipientName} · {allocation.priorityScore?.toFixed(1)}/100
                      </p>
                    </div>
                    <button className="btn-secondary shrink-0 px-3 py-1.5 text-[12px]" onClick={() => void openMatches(allocation)}>
                      <Truck size={13} /> Volunteers
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {accepted.length > 0 && (
            <Card>
              <SectionTitle title="Accepted — needs a volunteer" subtitle="Assign the best match manually if auto-matching was skipped" />
              <div className="space-y-2.5">
                {accepted.map((allocation) => (
                  <div key={allocation.allocationId} className="flex items-center justify-between gap-3 rounded-xl bg-amber-50/70 p-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-ink-900">{allocation.foodName}</p>
                      <p className="truncate text-[11.5px] text-ink-500">{allocation.recipientName}</p>
                    </div>
                    <button className="btn-primary shrink-0 px-3 py-1.5 text-[12px]" onClick={() => void openMatches(allocation)}>
                      <UserCheck size={13} /> Assign
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div>
          {recommendation ? (
            <Card>
              <RecommendationPanel recommendation={recommendation} />
              {recommendation.recommended && (
                <div className="mt-5 flex justify-end">
                  <button className="btn-primary" onClick={() => void run('run')} disabled={running}>
                    {running ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    Confirm & create allocation
                  </button>
                </div>
              )}
            </Card>
          ) : (
            <Card className="flex h-full min-h-[420px] flex-col items-center justify-center text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                <BrainCircuit size={28} />
              </div>
              <h3 className="mt-4 text-base font-extrabold text-ink-900">Run the engine to see the decision</h3>
              <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-ink-500">
                Select a pending donation on the left, then preview the recommendation. You'll see the ranked recipients,
                the per-factor scores behind the winner, and the plain-English explanation the engine produces.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {['Expiry urgency 25%', 'Demand match 20%', 'Storage fit 15%', 'Proximity 15%', 'Preference 15%', 'Fairness 10%'].map(
                  (chip) => (
                    <span key={chip} className="chip bg-ink-100 text-ink-600">
                      {chip}
                    </span>
                  ),
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(matchOpen)}
        onClose={() => setMatchOpen(null)}
        title="Smart volunteer coordination"
        subtitle={matchOpen ? `${matchOpen.foodName} · pickup at ${matchOpen.pickupAddress}` : undefined}
      >
        {matchLoading ? (
          <Skeleton className="h-48" />
        ) : (
          <div className="space-y-3">
            {candidates.length === 0 && (
              <EmptyState
                icon={<Truck size={18} />}
                title="No available volunteers"
                message="All volunteers are busy or offline. Ask someone to go available, then retry."
              />
            )}
            {candidates.map((candidate, index) => (
              <motion.div
                key={candidate.volunteerId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                className="flex items-center justify-between gap-4 rounded-2xl bg-ink-50 p-4"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <ScoreRing score={candidate.matchScore} size={56} label="match" />
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-ink-900">
                      {candidate.name}
                      {index === 0 && <span className="chip ml-2 bg-brand-100 text-brand-800">Best match</span>}
                    </p>
                    <p className="text-[12px] text-ink-500">
                      {candidate.vehicleType} · {candidate.distanceKm ?? '—'} km from pickup · {candidate.activeDeliveries} active ·{' '}
                      {candidate.completedDeliveries} completed
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-ink-500">{candidate.explanation}</p>
                  </div>
                </div>
                {matchOpen && (
                  <button className="btn-primary shrink-0 px-3 py-1.5 text-[12px]" onClick={() => void assign(matchOpen, candidate.volunteerId)}>
                    Assign
                  </button>
                )}
              </motion.div>
            ))}
            {candidates.length > 0 && matchOpen && (
              <div className="flex justify-end pt-1">
                <button className="btn-secondary" onClick={() => void assign(matchOpen)}>
                  <ChevronDown size={14} className="rotate-[-90deg]" /> Auto-assign best match
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
