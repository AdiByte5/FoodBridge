import { motion } from 'framer-motion'
import {
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  FileSearch,
  Loader2,
  Play,
  Repeat,
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
import { expiryLabel, kg, scoreTone } from '../lib/format'
import type { AllocationView, Donation, RecipientCandidate, Recommendation, VolunteerCandidate } from '../lib/types'

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
  const [overrideOpen, setOverrideOpen] = useState<AllocationView | null>(null)
  const [overrideCandidates, setOverrideCandidates] = useState<RecipientCandidate[]>([])
  const [overrideLoading, setOverrideLoading] = useState(false)
  const [overrideTarget, setOverrideTarget] = useState<number | null>(null)
  const [overrideReason, setOverrideReason] = useState('')
  const [overriding, setOverriding] = useState(false)

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

  // most urgent first: the donation closest to its safe window is the one an
  // operator should look at, and it is selected automatically
  const pending = useMemo(
    () =>
      donations
        .filter((d) => d.status === 'PENDING')
        .sort((a, b) => (a.hoursToExpiry ?? 999) - (b.hoursToExpiry ?? 999)),
    [donations],
  )
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

  /** Shows the stored decision of an allocation that the engine already made. */
  const showDecision = async (allocation: AllocationView) => {
    setSelectedId(allocation.donationId)
    setRunning(true)
    try {
      const { data } = await api.post<Recommendation>(`/allocations/engine/${allocation.donationId}/preview`)
      setRecommendation(data)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setRunning(false)
    }
  }

  const openOverride = async (allocation: AllocationView) => {
    setOverrideOpen(allocation)
    setOverrideTarget(null)
    setOverrideReason('')
    setOverrideLoading(true)
    try {
      const { data } = await api.post<Recommendation>(`/allocations/engine/${allocation.donationId}/preview`)
      setOverrideCandidates(data.ranked.filter((candidate) => candidate.recipientId !== allocation.recipientId))
    } catch (error) {
      toast.error(errorMessage(error))
      setOverrideOpen(null)
    } finally {
      setOverrideLoading(false)
    }
  }

  const submitOverride = async () => {
    if (!overrideOpen || !overrideTarget) {
      toast.error('Choose the organization that should receive this donation')
      return
    }
    setOverriding(true)
    try {
      await api.post(`/allocations/${overrideOpen.allocationId}/override`, {
        recipientId: overrideTarget,
        reason: overrideReason.trim() || null,
      })
      toast.success('Recipient changed — both organizations and the donor have been notified')
      if (recommendation?.donationId === overrideOpen.donationId) setRecommendation(null)
      setOverrideOpen(null)
      await load()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setOverriding(false)
    }
  }

  const selected = donations.find((d) => d.donationId === selectedId) ?? null
  const canAllocate = selected ? pending.some((d) => d.donationId === selected.donationId) : false

  return (
    <div>
      <PageHeader
        title="Intelligent Allocation & Decision Engine"
        subtitle="Every donation is matched the moment it is registered. Six weighted factors, one safety rule, and a written explanation behind each decision."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(320px,420px)_1fr]">
        <div className="space-y-5">
          <Card>
            <SectionTitle
              title="Waiting for a match"
              subtitle={`${pending.length} donation${pending.length === 1 ? '' : 's'} the engine could not place, most urgent first`}
            />
            {loading && <Skeleton className="h-40" />}
            {!loading && pending.length === 0 && (
              <EmptyState
                icon={<CheckCircle2 size={18} />}
                title="Nothing is waiting"
                message="Every registered donation has been matched automatically. A donation only appears here when no organization is eligible at that moment."
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
              <button
                className="btn-primary flex-1"
                onClick={() => void run('run')}
                disabled={running || !canAllocate}
                title={canAllocate ? undefined : 'Only donations that are still waiting can be allocated again'}
              >
                <Sparkles size={15} /> Allocate now
              </button>
            </div>
            {selected && (
              <p className="mt-3 rounded-xl bg-ink-50 p-3 text-[12px] leading-relaxed text-ink-500">
                {canAllocate ? 'Evaluating' : 'Showing the stored decision for'}{' '}
                <span className="font-semibold text-ink-700">{selected.foodName}</span> ·{' '}
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
                        → {allocation.recipientName}
                        {allocation.priorityScore != null ? ` · ${allocation.priorityScore.toFixed(1)}/100` : ' · chosen by override'}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button className="btn-secondary px-3 py-1.5 text-[12px]" onClick={() => void showDecision(allocation)}>
                        <FileSearch size={13} /> Decision
                      </button>
                      <button className="btn-secondary px-3 py-1.5 text-[12px]" onClick={() => void openOverride(allocation)}>
                        <Repeat size={13} /> Change
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {accepted.length > 0 && (
            <Card>
              <SectionTitle title="Accepted — needs a volunteer" subtitle="No volunteer was free when the allocation was accepted" />
              <div className="space-y-2.5">
                {accepted.map((allocation) => (
                  <div key={allocation.allocationId} className="flex items-center justify-between gap-3 rounded-xl bg-amber-50/70 p-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-ink-900">{allocation.foodName}</p>
                      <p className="truncate text-[11.5px] text-ink-500">{allocation.recipientName}</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button className="btn-primary px-3 py-1.5 text-[12px]" onClick={() => void openMatches(allocation)}>
                        <UserCheck size={13} /> Assign
                      </button>
                      <button className="btn-secondary px-3 py-1.5 text-[12px]" onClick={() => void openOverride(allocation)}>
                        <Repeat size={13} /> Change
                      </button>
                    </div>
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
              {recommendation.recommended && canAllocate && (
                <div className="mt-5 flex justify-end">
                  <button className="btn-primary" onClick={() => void run('run')} disabled={running}>
                    {running ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    Allocate this donation
                  </button>
                </div>
              )}
            </Card>
          ) : (
            <Card className="flex h-full min-h-[420px] flex-col items-center justify-center text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                <BrainCircuit size={28} />
              </div>
              <h3 className="mt-4 text-base font-extrabold text-ink-900">Open a decision to see the reasoning</h3>
              <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-ink-500">
                New donations are matched as soon as they are registered, so most of the work here is reading. Pick a
                waiting donation to preview the ranking, or open a proposed allocation to see how the engine reached its
                decision and change the recipient if you disagree with it.
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

      <Modal
        open={Boolean(overrideOpen)}
        onClose={() => setOverrideOpen(null)}
        title="Change the recipient"
        subtitle={
          overrideOpen
            ? `${overrideOpen.foodName} · now with ${overrideOpen.recipientName}`
            : undefined
        }
        width="max-w-2xl"
      >
        {overrideLoading ? (
          <Skeleton className="h-56" />
        ) : (
          <div className="space-y-4">
            <p className="text-[12.5px] leading-relaxed text-ink-500">
              Every organization is listed with the score the engine gave it. Ruled-out organizations cannot be picked.
            </p>
            <div className="max-h-[250px] space-y-2 overflow-y-auto pr-1">
              {overrideCandidates.map((candidate) => {
                const selected = overrideTarget === candidate.recipientId
                return (
                  <button
                    key={candidate.recipientId}
                    disabled={candidate.excluded}
                    onClick={() => setOverrideTarget(candidate.recipientId)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl p-3.5 text-left ring-1 transition ${
                      selected
                        ? 'bg-brand-50 ring-brand-300'
                        : candidate.excluded
                          ? 'cursor-not-allowed bg-ink-50 ring-transparent opacity-60'
                          : 'bg-white ring-ink-900/5 hover:ring-brand-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-bold text-ink-900">{candidate.organizationName}</p>
                      <p className="truncate text-[11.5px] text-ink-500">
                        {candidate.excluded
                          ? candidate.exclusionReason
                          : `${candidate.distanceKm ?? '—'} km away · ${kg(candidate.freeCapacityKg)} free storage · demand ${kg(candidate.demandKg)}`}
                      </p>
                    </div>
                    {!candidate.excluded && (
                      <span className={`shrink-0 text-[15px] font-extrabold tabular-nums ${scoreTone(candidate.totalScore)}`}>
                        {candidate.totalScore.toFixed(1)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <div>
              <label className="label">Reason (optional)</label>
              <input
                className="input"
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
                placeholder="e.g. the coordinator confirmed on the phone that they can collect it today"
              />
            </div>
            <p className="rounded-xl bg-ink-50 p-3 text-[12px] leading-relaxed text-ink-500">
              The chosen score, your reason and both notifications are kept in the decision record.
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setOverrideOpen(null)}>
                Cancel
              </button>
              <button className="btn-primary" disabled={!overrideTarget || overriding} onClick={() => void submitOverride()}>
                {overriding ? <Loader2 size={15} className="animate-spin" /> : <Repeat size={15} />} Confirm change
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
