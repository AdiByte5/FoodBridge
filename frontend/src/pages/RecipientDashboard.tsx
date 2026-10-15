import { motion } from 'framer-motion'
import {
  BadgeCheck,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  Inbox,
  Loader2,
  MapPin,
  Phone,
  Settings2,
  Sliders,
  Truck,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Card,
  EmptyState,
  FactorBar,
  KeyValue,
  Modal,
  PageHeader,
  ProgressBar,
  ScoreRing,
  SectionTitle,
  Skeleton,
  StatStrip,
  StatusBadge,
  Tabs,
} from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { expiryLabel, kg, prettyStatus, relativeTime, scoreTone } from '../lib/format'
import type { AllocationView, CategoryView, Recipient } from '../lib/types'

export function RecipientDashboard() {
  const [profile, setProfile] = useState<Recipient | null>(null)
  const [allocations, setAllocations] = useState<AllocationView[]>([])
  const [categories, setCategories] = useState<CategoryView[]>([])
  const [preferenceIds, setPreferenceIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('incoming')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [detail, setDetail] = useState<AllocationView | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const [profileRes, allocationRes, categoryRes, prefRes] = await Promise.all([
        api.get<Recipient>('/recipients/me'),
        api.get<AllocationView[]>('/recipients/me/allocations'),
        api.get<CategoryView[]>('/public/categories'),
        api.get<number[]>('/recipients/me/preferences'),
      ])
      setProfile(profileRes.data)
      setAllocations(allocationRes.data)
      setCategories(categoryRes.data)
      setPreferenceIds(prefRes.data)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const act = async (allocation: AllocationView, action: 'accept' | 'reject' | 'confirm-delivery') => {
    setBusyId(allocation.allocationId)
    try {
      await api.post(`/allocations/${allocation.allocationId}/${action}`, action === 'reject' ? { reason: 'Capacity or timing mismatch' } : undefined)
      const messages = {
        accept: 'Allocation accepted — volunteer matching started',
        reject: 'Allocation declined and returned for re-matching',
        'confirm-delivery': 'Receipt confirmed — food rescue completed',
      }
      toast.success(messages[action])
      setDetail(null)
      await load()
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  const incoming = allocations.filter((a) => a.allocationStatus === 'PROPOSED')
  const active = allocations.filter((a) => a.allocationStatus === 'ACCEPTED')
  const completed = allocations.filter((a) => a.allocationStatus === 'COMPLETED')
  const closed = allocations.filter((a) => ['REJECTED', 'SUPERSEDED'].includes(a.allocationStatus))
  const utilisation = profile.storageCapacityKg ? ((profile.currentLoadKg ?? 0) / profile.storageCapacityKg) * 100 : 0
  const receivedKg = completed.reduce((sum, a) => sum + a.quantity, 0)

  const filtered = tab === 'incoming' ? incoming : tab === 'active' ? active : tab === 'completed' ? completed : closed

  return (
    <div>
      <PageHeader
        title={profile.organizationName}
        subtitle="Review allocations recommended by the engine, coordinate volunteers and keep your demand profile fresh."
        actions={
          <>
            <button className="btn-secondary" onClick={() => setSettingsOpen(true)}>
              <Sliders size={15} /> Demand & preferences
            </button>
          </>
        }
      />

      {!profile.verified && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-800">
          Awaiting administrator verification — your organization becomes eligible for allocations once verified.
        </div>
      )}

      <StatStrip
        items={[
          { label: 'Pending allocations', value: incoming.length, hint: 'awaiting your decision', icon: <Inbox size={15} /> },
          { label: 'Food received', value: kg(receivedKg), hint: `${completed.length} completed rescues`, icon: <Boxes size={15} /> },
          { label: 'Free storage', value: kg(profile.freeCapacityKg), hint: `${Math.round(utilisation)}% of ${kg(profile.storageCapacityKg)} used`, icon: <Gauge size={15} /> },
          { label: 'People served', value: profile.beneficiaries ?? '—', hint: `demand ${kg(profile.demandKg)}`, icon: <Users size={15} /> },
        ]}
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Tabs
              active={tab}
              onChange={setTab}
              tabs={[
                { id: 'incoming', label: 'Incoming', count: incoming.length },
                { id: 'active', label: 'Active', count: active.length },
                { id: 'completed', label: 'Completed', count: completed.length },
                { id: 'closed', label: 'Closed', count: closed.length },
              ]}
            />
          </div>

          <div className="space-y-3">
            {filtered.length === 0 && (
              <EmptyState
                icon={<Inbox size={20} />}
                title="Nothing here right now"
                message="When the allocation engine recommends food for your organization it will appear here instantly."
              />
            )}
            {filtered.map((allocation) => {
              const urgent = (allocation.hoursToExpiry ?? 99) < 4
              return (
                <motion.div key={allocation.allocationId} layout className="card card-hover p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-4">
                      <ScoreRing score={allocation.priorityScore} size={64} label="score" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[15px] font-bold text-ink-900">{allocation.foodName}</p>
                          <StatusBadge status={allocation.allocationStatus} />
                          {urgent && (
                            <span className={`chip ${expiryLabel(allocation.hoursToExpiry).tone.bg} ${expiryLabel(allocation.hoursToExpiry).tone.text}`}>
                              {expiryLabel(allocation.hoursToExpiry).text}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[12.5px] text-ink-500">
                          {kg(allocation.quantity, allocation.unit)} · {allocation.categoryName} · from{' '}
                          <span className="font-semibold text-ink-700">{allocation.donorName}</span>
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-ink-500">
                          <MapPin size={12} /> {allocation.pickupAddress} · {allocation.distanceKm ?? '—'} km · pickup{' '}
                          {allocation.pickupWindow}
                        </p>
                        {allocation.volunteerName && (
                          <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-ink-600">
                            <Truck size={12} className="text-brand-600" />
                            <span className="font-semibold">{allocation.volunteerName}</span>
                            {allocation.volunteerPhone && (
                              <span className="inline-flex items-center gap-1 text-ink-500">
                                <Phone size={11} /> {allocation.volunteerPhone}
                              </span>
                            )}
                            <span className="chip bg-ink-100 text-ink-600">{prettyStatus(allocation.deliveryStatus)}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button className="btn-secondary py-2 text-[13px]" onClick={() => setDetail(allocation)}>
                        Why this match?
                      </button>
                      {allocation.allocationStatus === 'PROPOSED' && (
                        <>
                          <button
                            className="btn-ghost py-2 text-[13px] text-rose-600 hover:bg-rose-50"
                            onClick={() => void act(allocation, 'reject')}
                            disabled={busyId === allocation.allocationId}
                          >
                            Decline
                          </button>
                          <button
                            className="btn-primary py-2 text-[13px]"
                            onClick={() => void act(allocation, 'accept')}
                            disabled={busyId === allocation.allocationId}
                          >
                            {busyId === allocation.allocationId ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <ClipboardCheck size={14} />
                            )}
                            Accept allocation
                          </button>
                        </>
                      )}
                      {allocation.allocationStatus === 'ACCEPTED' && allocation.deliveryStatus === 'DELIVERED' && (
                        <button
                          className="btn-primary py-2 text-[13px]"
                          onClick={() => void act(allocation, 'confirm-delivery')}
                          disabled={busyId === allocation.allocationId}
                        >
                          <CheckCircle2 size={14} /> Confirm receipt
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        <div className="space-y-5">
          <Card>
            <SectionTitle title="Capacity & demand" subtitle="Live profile used by the scoring engine" />
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[12.5px] font-semibold text-ink-600">
                  <span>Storage utilisation</span>
                  <span className="tabular-nums">
                    {kg(profile.currentLoadKg)} / {kg(profile.storageCapacityKg)}
                  </span>
                </div>
                <ProgressBar value={utilisation} tone={utilisation > 85 ? 'rose' : utilisation > 65 ? 'amber' : 'brand'} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <KeyValue label="Free capacity" value={kg(profile.freeCapacityKg)} />
                <KeyValue label="Registered demand" value={kg(profile.demandKg)} />
                <KeyValue label="Beneficiaries" value={profile.beneficiaries ?? '—'} />
                <KeyValue label="Preferences" value={`${preferenceIds.length || 'All'} categories`} />
              </div>
              <button className="btn-secondary w-full" onClick={() => setSettingsOpen(true)}>
                <Settings2 size={15} /> Update profile
              </button>
            </div>
          </Card>

          <Card>
            <SectionTitle title="Fair-share standing" subtitle="How the engine balances allocations over 30 days" />
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3">
                <span className="text-[13px] font-semibold text-brand-800">Received in last 30 days</span>
                <span className="text-[15px] font-extrabold tabular-nums text-brand-800">{kg(receivedKg)}</span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-ink-500">
                Organizations that received less recently score higher on the fairness factor, ensuring distribution stays
                balanced across all verified partners — never first-come-first-served.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {profile.preferences.length > 0 ? (
                  profile.preferences.map((preference) => (
                    <span key={preference} className="chip bg-ink-100 text-ink-600">
                      {preference}
                    </span>
                  ))
                ) : (
                  <span className="chip bg-emerald-50 text-emerald-700">
                    <BadgeCheck size={12} /> Open to all categories
                  </span>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Why the engine chose this allocation"
        subtitle={detail ? `${detail.foodName} · ${kg(detail.quantity, detail.unit)} from ${detail.donorName}` : undefined}
        width="max-w-3xl"
      >
        {detail && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-brand-50/70 p-4 ring-1 ring-brand-100">
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700">Decision explanation</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-700">{detail.decisionExplanation}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {detail.factorBreakdown.map((factor) => (
                <FactorBar key={factor.key} factor={factor} />
              ))}
            </div>
            <div className="grid gap-4 rounded-2xl bg-ink-50 p-4 sm:grid-cols-3">
              <KeyValue label="Priority score" value={<span className={`text-lg font-extrabold ${scoreTone(detail.priorityScore)}`}>{detail.priorityScore?.toFixed(1)}/100</span>} />
              <KeyValue label="Proposed" value={relativeTime(detail.allocationTime)} />
              <KeyValue label="Distance" value={`${detail.distanceKm ?? '—'} km`} />
            </div>
          </div>
        )}
      </Modal>

      <DemandSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        profile={profile}
        categories={categories}
        preferenceIds={preferenceIds}
        setPreferenceIds={setPreferenceIds}
        onSaved={async () => {
          setSettingsOpen(false)
          await load()
        }}
      />
    </div>
  )
}

function DemandSettingsModal({
  open,
  onClose,
  profile,
  categories,
  preferenceIds,
  setPreferenceIds,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  profile: Recipient
  categories: CategoryView[]
  preferenceIds: number[]
  setPreferenceIds: (ids: number[]) => void
  onSaved: () => Promise<void>
}) {
  const [capacity, setCapacity] = useState(String(profile.storageCapacityKg ?? 100))
  const [load, setLoad] = useState(String(profile.currentLoadKg ?? 0))
  const [demand, setDemand] = useState(String(profile.demandKg ?? 50))
  const [beneficiaries, setBeneficiaries] = useState(String(profile.beneficiaries ?? 100))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setCapacity(String(profile.storageCapacityKg ?? 100))
    setLoad(String(profile.currentLoadKg ?? 0))
    setDemand(String(profile.demandKg ?? 50))
    setBeneficiaries(String(profile.beneficiaries ?? 100))
  }, [profile, open])

  const save = async () => {
    setBusy(true)
    try {
      await api.patch('/recipients/me/demand', {
        storageCapacityKg: Number(capacity),
        currentLoadKg: Number(load),
        demandKg: Number(demand),
        beneficiaries: Number(beneficiaries),
      })
      await api.put('/recipients/me/preferences', { categoryIds: preferenceIds })
      toast.success('Profile updated — the engine will use these values immediately')
      await onSaved()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const free = Math.max(0, Number(capacity) - Number(load))

  return (
    <Modal open={open} onClose={onClose} title="Demand, capacity & preferences" subtitle="These values directly influence allocation scoring.">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Storage capacity (kg)</label>
            <input className="input" type="number" value={capacity} onChange={(event) => setCapacity(event.target.value)} />
          </div>
          <div>
            <label className="label">Current load (kg)</label>
            <input className="input" type="number" value={load} onChange={(event) => setLoad(event.target.value)} />
          </div>
          <div>
            <label className="label">Food still needed (kg)</label>
            <input className="input" type="number" value={demand} onChange={(event) => setDemand(event.target.value)} />
          </div>
          <div>
            <label className="label">Beneficiaries served</label>
            <input className="input" type="number" value={beneficiaries} onChange={(event) => setBeneficiaries(event.target.value)} />
          </div>
        </div>
        <div className="rounded-xl bg-brand-50 px-4 py-3 text-[13px] font-semibold text-brand-800">
          Free capacity after this update: {free} kg — donations larger than this are filtered out by the engine.
        </div>
        <div>
          <label className="label">Accepted food categories</label>
          <p className="mb-2 text-[12px] text-ink-500">
            Select none to accept every category (neutral score). Selecting categories improves match accuracy.
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const selected = preferenceIds.includes(category.categoryId)
              return (
                <button
                  key={category.categoryId}
                  type="button"
                  onClick={() =>
                    setPreferenceIds(
                      selected
                        ? preferenceIds.filter((id) => id !== category.categoryId)
                        : [...preferenceIds, category.categoryId],
                    )
                  }
                  className={`rounded-xl px-3 py-2 text-[12.5px] font-semibold ring-1 transition ${
                    selected
                      ? 'bg-brand-600 text-white ring-brand-600'
                      : 'bg-white text-ink-600 ring-ink-200 hover:ring-brand-300'
                  }`}
                >
                  {category.categoryName}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={() => void save()} disabled={busy}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Save profile
          </button>
        </div>
      </div>
    </Modal>
  )
}
