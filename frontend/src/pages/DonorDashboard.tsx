import { motion } from 'framer-motion'
import {
  Boxes,
  CalendarClock,
  CheckCircle2,
  Eye,
  History,
  Loader2,
  PackagePlus,
  Pencil,
  Plus,
  Sparkles,
  Timer,
  Truck,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DonationTimeline } from '../components/DonationTimeline'
import { RecommendationPanel } from '../components/RecommendationPanel'
import {
  EmptyState,
  KeyValue,
  Modal,
  PageHeader,
  Skeleton,
  StatStrip,
  StatusBadge,
  Tabs,
} from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { expiryLabel, formatDateTime, kg, prettyStatus } from '../lib/format'
import type { CategoryView, Donation, Recommendation } from '../lib/types'
import { useAuth } from '../store/auth'

const storageOptions = ['AMBIENT', 'REFRIGERATED', 'FROZEN', 'HOT_HOLDING']

function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function DonorDashboard() {
  const { user } = useAuth()
  const [donations, setDonations] = useState<Donation[]>([])
  const [categories, setCategories] = useState<CategoryView[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [detail, setDetail] = useState<Donation | null>(null)
  const [editTarget, setEditTarget] = useState<Donation | null>(null)
  const [preview, setPreview] = useState<{ donation: Donation; recommendation: Recommendation } | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const [donationRes, categoryRes] = await Promise.all([
        api.get<Donation[]>('/donations'),
        api.get<CategoryView[]>('/public/categories'),
      ])
      setDonations(donationRes.data)
      setCategories(categoryRes.data)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const previewMatch = async (donation: Donation) => {
    setBusyId(donation.donationId)
    try {
      const { data } = await api.post<Recommendation>(`/allocations/engine/${donation.donationId}/preview`)
      setPreview({ donation, recommendation: data })
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusyId(null)
    }
  }

  const cancelDonation = async (donation: Donation) => {
    setBusyId(donation.donationId)
    try {
      await api.post(`/donations/${donation.donationId}/cancel`)
      toast.success('Donation cancelled')
      await load()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusyId(null)
    }
  }

  const filtered = donations.filter((donation) => {
    if (tab === 'all') return true
    if (tab === 'active') return ['PENDING', 'ALLOCATED', 'PICKED_UP', 'DELIVERED'].includes(donation.status)
    return donation.status === tab.toUpperCase()
  })

  const totalKg = donations.reduce((sum, d) => sum + d.quantity, 0)
  const completed = donations.filter((d) => d.status === 'COMPLETED').length
  const active = donations.filter((d) => ['PENDING', 'ALLOCATED', 'PICKED_UP', 'DELIVERED'].includes(d.status)).length
  const rescuedKg = donations.filter((d) => d.status === 'COMPLETED').reduce((sum, d) => sum + d.quantity, 0)

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.fullName?.split(' ')[0] ?? 'Donor'}`}
        subtitle={`${user?.organizationName ?? user?.fullName ?? 'Your account'} · register surplus food and follow where it goes.`}
        actions={
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> Register donation
          </button>
        }
      />

      {!user?.verified && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-800">
          Your account is pending verification by the administrator. You can register donations right away — they get allocated once you are verified.
        </div>
      )}

      <StatStrip
        items={[
          { label: 'Total donations', value: donations.length, hint: 'all-time registrations', icon: <PackagePlus size={15} /> },
          { label: 'Food offered', value: kg(totalKg), hint: 'across every donation', icon: <Boxes size={15} /> },
          { label: 'Rescued', value: kg(rescuedKg), hint: `${completed} deliveries confirmed`, icon: <CheckCircle2 size={15} /> },
          { label: 'In progress', value: active, hint: 'pending, allocated or moving', icon: <Timer size={15} /> },
        ]}
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'all', label: 'All', count: donations.length },
            { id: 'active', label: 'Active', count: active },
            { id: 'completed', label: 'Completed', count: completed },
            { id: 'expired', label: 'Expired' },
            { id: 'cancelled', label: 'Cancelled' },
          ]}
        />
        <p className="text-[12px] font-medium text-ink-500">Latest first · {filtered.length} shown</p>
      </div>

      <div className="mt-4 space-y-3">
        {loading &&
          Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-[104px] w-full" />)}

        {!loading && filtered.length === 0 && (
          <EmptyState
            icon={<History size={20} />}
            title="No donations in this view"
            message="Register a surplus food donation and it is matched with the most suitable recipient organization."
            action={
              <button className="btn-primary" onClick={() => setCreateOpen(true)}>
                <Plus size={16} /> Register donation
              </button>
            }
          />
        )}

        {filtered.map((donation) => {
          const expiry = expiryLabel(donation.hoursToExpiry)
          return (
            <motion.div key={donation.donationId} layout className="card card-hover p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                    <Boxes size={19} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-bold text-ink-900">{donation.foodName}</p>
                      <StatusBadge status={donation.status} />
                      {['PENDING', 'ALLOCATED', 'PICKED_UP', 'DELIVERED'].includes(donation.status) && (
                        <span className={`chip ${expiry.tone.bg} ${expiry.tone.text}`}>
                          <CalendarClock size={12} /> {expiry.text}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[12.5px] text-ink-500">
                      {kg(donation.quantity, donation.unit)} · {donation.categoryName} · {prettyStatus(donation.storageRequirement)} ·{' '}
                      {formatDateTime(donation.createdAt)}
                    </p>
                    {donation.recipientName && (
                      <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-600">
                        <Sparkles size={13} className="text-brand-600" />
                        <span className="font-semibold">{donation.recipientName}</span>
                        <span className="chip bg-brand-50 text-brand-700">
                          priority {donation.priorityScore?.toFixed(1)}/100
                        </span>
                        {donation.volunteerName && (
                          <span className="chip bg-ink-100 text-ink-600">
                            <Truck size={12} /> {donation.volunteerName} · {prettyStatus(donation.deliveryStatus)}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {['PENDING', 'ALLOCATED'].includes(donation.status) && (
                    <button
                      className="btn-secondary py-2 text-[13px]"
                      onClick={() => void previewMatch(donation)}
                      disabled={busyId === donation.donationId}
                    >
                      {busyId === donation.donationId ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                      Preview match
                    </button>
                  )}
                  {(donation.status === 'PENDING'
                    || (donation.status === 'ALLOCATED' && donation.allocationStatus === 'PROPOSED')) && (
                    <button className="btn-ghost py-2 text-[13px]" onClick={() => setEditTarget(donation)}>
                      <Pencil size={13} /> Edit
                    </button>
                  )}
                  {['PENDING', 'ALLOCATED'].includes(donation.status) && (
                    <button
                      className="btn-ghost py-2 text-[13px] text-rose-600 hover:bg-rose-50"
                      onClick={() => void cancelDonation(donation)}
                      disabled={busyId === donation.donationId}
                    >
                      <X size={14} /> Cancel
                    </button>
                  )}
                  <button className="btn-secondary py-2 text-[13px]" onClick={() => setDetail(donation)}>
                    Details
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <CreateDonationModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        categories={categories}
        defaultAddress={user?.address ?? ''}
        onCreated={(donation) => {
          setCreateOpen(false)
          void load()
          if (donation.recipientName) {
            toast.success(
              `Matched with ${donation.recipientName}`,
              {
                description:
                  donation.priorityScore != null
                    ? `The engine gave it a priority score of ${donation.priorityScore.toFixed(1)}/100. You will be told as the pickup progresses.`
                    : 'The allocation engine picked this organization for your donation.',
                duration: 8000,
              },
            )
          } else {
            toast.info('Donation registered', {
              description:
                'No organization can take it right now, so it is waiting in the queue. You will be notified as soon as it is matched.',
              duration: 8000,
            })
          }
        }}
      />

      <EditDonationModal
        donation={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          setEditTarget(null)
          void load()
        }}
      />

      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title="Why this donation went where it did"
        subtitle={preview ? `${preview.donation.foodName} · ${kg(preview.donation.quantity, preview.donation.unit)}` : undefined}
        width="max-w-3xl"
      >
        {preview && (
          <>
            <RecommendationPanel recommendation={preview.recommendation} />
            <div className="mt-6 space-y-3">
              <p className="rounded-xl bg-ink-50 p-3.5 text-[12.5px] leading-relaxed text-ink-500">
                This ranking is produced automatically when a donation is registered - opening it changes nothing.
                You will be notified at every step, from the recipient accepting the food to the delivery being confirmed.
              </p>
              <div className="flex justify-end">
                <button className="btn-secondary" onClick={() => setPreview(null)}>
                  Close
                </button>
              </div>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.foodName ?? ''}
        subtitle={detail ? `${kg(detail.quantity, detail.unit)} · ${detail.categoryName}` : undefined}
      >
        {detail && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <KeyValue label="Status" value={<StatusBadge status={detail.status} />} />
              <KeyValue label="Registered" value={formatDateTime(detail.createdAt)} />
              <KeyValue label="Expiry" value={formatDateTime(detail.expiryTime)} />
              <KeyValue label="Pickup" value={detail.pickupAddress ?? '—'} />
              <KeyValue label="Storage requirement" value={prettyStatus(detail.storageRequirement)} />
              <KeyValue label="Pickup window" value={`${formatDateTime(detail.pickupStart)} → ${formatDateTime(detail.pickupEnd)}`} />
            </div>
            {detail.decisionExplanation && (
              <div className="rounded-2xl bg-brand-50/60 p-4 ring-1 ring-brand-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700">Engine decision explanation</p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-700">{detail.decisionExplanation}</p>
              </div>
            )}
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-ink-500">Lifecycle</p>
              <DonationTimeline donation={detail} />
            </div>
            {detail.status === 'PENDING' && (
              <div className="flex justify-end border-t border-ink-100 pt-4">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setEditTarget(detail)
                    setDetail(null)
                  }}
                >
                  <Pencil size={14} /> Modify this donation
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function EditDonationModal({
  donation,
  onClose,
  onSaved,
}: {
  donation: Donation | null
  onClose: () => void
  onSaved: () => void
}) {
  const [foodName, setFoodName] = useState('')
  const [quantity, setQuantity] = useState('10')
  const [unit, setUnit] = useState('kg')
  const [expiry, setExpiry] = useState('')
  const [pickupAddress, setPickupAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!donation) return
    setFoodName(donation.foodName)
    setQuantity(String(donation.quantity))
    setUnit(donation.unit || 'kg')
    setExpiry(donation.expiryTime ? toLocalInput(new Date(donation.expiryTime)) : '')
    setPickupAddress(donation.pickupAddress ?? '')
    setNotes(donation.notes ?? '')
  }, [donation])

  const submit = async () => {
    if (!donation) return
    setBusy(true)
    try {
      await api.patch(`/donations/${donation.donationId}`, {
        foodName: foodName.trim() || undefined,
        quantity: Number(quantity),
        unit,
        expiryTime: expiry || undefined,
        pickupAddress: pickupAddress || undefined,
        notes,
      })
      toast.success('Donation updated')
      onSaved()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={Boolean(donation)}
      onClose={onClose}
      title="Modify donation"
      subtitle="You can change a donation until the recipient accepts it. The engine re-evaluates the match afterwards."
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">What food is available?</label>
            <input className="input" value={foodName} onChange={(event) => setFoodName(event.target.value)} />
          </div>
          <div>
            <label className="label">Quantity</label>
            <div className="flex gap-2">
              <input
                className="input"
                type="number"
                min={0.5}
                step={0.5}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
              <select className="input w-24" value={unit} onChange={(event) => setUnit(event.target.value)}>
                {['kg', 'litre', 'packs', 'meals'].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Safe until (expiry)</label>
            <input className="input" type="datetime-local" value={expiry} onChange={(event) => setExpiry(event.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Pickup address</label>
            <input className="input" value={pickupAddress} onChange={(event) => setPickupAddress(event.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Handling notes</label>
            <textarea
              className="input min-h-[80px] resize-none"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={() => void submit()} disabled={busy}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Save changes
          </button>
        </div>
      </div>
    </Modal>
  )
}

function CreateDonationModal({
  open,
  onClose,
  categories,
  defaultAddress,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  categories: CategoryView[]
  defaultAddress: string
  onCreated: (donation: Donation) => void
}) {
  const [foodName, setFoodName] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [quantity, setQuantity] = useState('10')
  const [unit, setUnit] = useState('kg')
  const [expiry, setExpiry] = useState(toLocalInput(new Date(Date.now() + 4 * 3600 * 1000)))
  const [pickupAddress, setPickupAddress] = useState(defaultAddress)
  const [storage, setStorage] = useState('AMBIENT')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (categories.length > 0 && categoryId === '') {
      setCategoryId(categories[0].categoryId)
      setStorage(categories[0].recommendedStorage ?? 'AMBIENT')
    }
  }, [categories, categoryId])

  const submit = async () => {
    if (!foodName.trim()) {
      toast.error('Please describe the food being donated')
      return
    }
    setBusy(true)
    try {
      const { data } = await api.post<Donation>('/donations', {
        foodName: foodName.trim(),
        categoryId: categoryId === '' ? null : categoryId,
        quantity: Number(quantity),
        unit,
        expiryTime: expiry,
        pickupAddress: pickupAddress || defaultAddress,
        storageRequirement: storage,
        notes: notes || null,
      })
      setFoodName('')
      setNotes('')
      onCreated(data)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Register surplus food"
      subtitle="The engine uses these details, your location and the expiry window to pick the best recipient."
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">What food is available?</label>
            <input
              className="input"
              placeholder="e.g. Veg Biryani, Sandwich Platters, Bread Loaves"
              value={foodName}
              onChange={(event) => setFoodName(event.target.value)}
            />
          </div>
          <div>
            <label className="label">Food category</label>
            <select
              className="input"
              value={categoryId}
              onChange={(event) => {
                const value = Number(event.target.value)
                setCategoryId(value)
                const category = categories.find((c) => c.categoryId === value)
                if (category?.recommendedStorage) setStorage(category.recommendedStorage)
              }}
            >
              {categories.map((category) => (
                <option key={category.categoryId} value={category.categoryId}>
                  {category.categoryName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Storage requirement</label>
            <select className="input" value={storage} onChange={(event) => setStorage(event.target.value)}>
              {storageOptions.map((option) => (
                <option key={option} value={option}>
                  {prettyStatus(option)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Quantity</label>
            <div className="flex gap-2">
              <input
                className="input"
                type="number"
                min={0.5}
                step={0.5}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
              <select className="input w-24" value={unit} onChange={(event) => setUnit(event.target.value)}>
                <option value="kg">kg</option>
                <option value="litre">litre</option>
                <option value="packs">packs</option>
                <option value="meals">meals</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Safe until (expiry)</label>
            <input className="input" type="datetime-local" value={expiry} onChange={(event) => setExpiry(event.target.value)} />
            <div className="mt-1.5 flex gap-1.5">
              {[
                { label: '+2h', hours: 2 },
                { label: '+6h', hours: 6 },
                { label: '+24h', hours: 24 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="rounded-lg bg-ink-100 px-2.5 py-1 text-[11.5px] font-semibold text-ink-600 hover:bg-ink-200"
                  onClick={() => setExpiry(toLocalInput(new Date(Date.now() + preset.hours * 3600 * 1000)))}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Pickup address</label>
            <input className="input" value={pickupAddress} onChange={(event) => setPickupAddress(event.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Handling notes (optional)</label>
            <textarea
              className="input min-h-[84px] resize-none"
              placeholder="Packed in sealed trays, ready at the service counter…"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={() => void submit()} disabled={busy}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Register donation
          </button>
        </div>
      </div>
    </Modal>
  )
}
