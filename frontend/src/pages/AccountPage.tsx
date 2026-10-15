import { BadgeCheck, Building2, CheckCircle2, Loader2, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Card, KeyValue, PageHeader, SectionTitle } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { formatDate, roleLabel } from '../lib/format'
import { useAuth } from '../store/auth'

export function AccountPage() {
  const { user, refresh, setUser } = useAuth()
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '')
  const [address, setAddress] = useState(user?.address ?? user?.currentLocation ?? '')
  const [vehicleType, setVehicleType] = useState(user?.vehicleType ?? '')
  const [busy, setBusy] = useState(false)

  if (!user) return null

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      const { data } = await api.patch('/auth/me', {
        fullName,
        phoneNumber,
        address: address || undefined,
        vehicleType: user.role === 'VOLUNTEER' ? vehicleType : undefined,
      })
      setUser(data)
      await refresh()
      toast.success('Profile updated')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const displayName = user.organizationName && user.organizationName !== user.fullName ? user.organizationName : null

  return (
    <div>
      <PageHeader
        title="Your account"
        subtitle="Keep your contact details up to date — they are shared with donors, recipients or volunteers involved in your pickups."
      />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card>
            <SectionTitle title="Profile details" subtitle="Changes apply immediately" />
            <form onSubmit={save} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Full name</label>
                  <input className="input" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
                </div>
                <div>
                  <label className="label">Phone number</label>
                  <input className="input" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="+91 …" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">
                    {user.role === 'VOLUNTEER' ? 'Your area' : 'Address'}
                  </label>
                  <input
                    className="input"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder={user.role === 'DONOR' ? 'Pickup area' : 'Where you are located'}
                  />
                </div>
                {user.role === 'VOLUNTEER' && (
                  <div>
                    <label className="label">Vehicle</label>
                    <select className="input" value={vehicleType} onChange={(event) => setVehicleType(event.target.value)}>
                      {['Bike', 'Scooter', 'Car', 'Van'].map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn-primary" disabled={busy}>
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Save changes
                </button>
              </div>
            </form>
          </Card>

          {user.role === 'RECIPIENT' && (
            <Card className="mt-5">
              <SectionTitle title="Demand & food preferences" subtitle="These drive the allocation engine, so keep them current" />
              <p className="text-[13px] leading-relaxed text-ink-600">
                Storage capacity, current load, food needed and accepted categories are managed from your dashboard,
                where you can also see how they affect incoming allocations.
              </p>
              <Link to="/recipient" className="btn-secondary mt-4">
                Open recipient dashboard
              </Link>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <SectionTitle title="Account" subtitle="Managed by the platform" />
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                {user.role === 'DONOR' ? <UserRound size={20} /> : <Building2 size={20} />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-extrabold text-ink-900">{displayName ?? user.fullName}</p>
                <p className="text-[12px] text-ink-500">{roleLabel[user.role]}</p>
              </div>
            </div>
            <div className="mt-4 space-y-3.5">
              <KeyValue label="Email" value={<span className="inline-flex items-center gap-1.5"><Mail size={13} /> {user.email}</span>} />
              <KeyValue label="Phone on file" value={<span className="inline-flex items-center gap-1.5"><Phone size={13} /> {phoneNumber || '—'}</span>} />
              <KeyValue label="Account status" value={<span className="chip bg-emerald-50 text-emerald-700">{user.accountStatus.replace('_', ' ').toLowerCase()}</span>} />
              <KeyValue label="Member since" value={formatDate(user.createdAt)} />
            </div>
          </Card>

          {(user.role === 'DONOR' || user.role === 'RECIPIENT') && (
            <Card>
              <SectionTitle title="Verification" subtitle="Required before full participation" />
              {user.verified ? (
                <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-[13px] font-semibold text-emerald-800">
                  <BadgeCheck size={16} /> Verified by the administrator
                </p>
              ) : (
                <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-[12.5px] leading-relaxed text-amber-800">
                  <ShieldCheck size={15} className="mt-0.5 shrink-0" />
                  Your account is waiting for administrator verification. You can keep using your workspace in the meantime.
                </p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
