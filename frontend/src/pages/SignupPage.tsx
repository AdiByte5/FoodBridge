import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { errorMessage } from '../lib/api'
import type { RegisterPayload, Role } from '../lib/types'
import { homeRouteFor, useAuth } from '../store/auth'

const roleOptions: { id: Role; title: string; blurb: string }[] = [
  { id: 'DONOR', title: 'Donor', blurb: 'Restaurant, hotel, shop, company, NGO or an individual with surplus food' },
  { id: 'RECIPIENT', title: 'Recipient organization', blurb: 'NGO, food bank, orphanage, shelter or community kitchen' },
  { id: 'VOLUNTEER', title: 'Volunteer', blurb: 'Pick up and deliver donations in your area' },
]

const donorTypes = [
  { value: 'RESTAURANT', label: 'Restaurant' },
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'SUPERMARKET', label: 'Supermarket' },
  { value: 'BAKERY', label: 'Bakery' },
  { value: 'CATERING', label: 'Catering service' },
  { value: 'COMPANY', label: 'Company / office' },
  { value: 'NGO', label: 'NGO' },
  { value: 'INDIVIDUAL', label: 'Individual — I am donating personally' },
]

const recipientTypes = [
  { value: 'NGO', label: 'NGO' },
  { value: 'FOOD_BANK', label: 'Food bank' },
  { value: 'ORPHANAGE', label: 'Orphanage' },
  { value: 'SHELTER', label: 'Shelter' },
  { value: 'OTHER', label: 'Community kitchen / other' },
]

const vehicleTypes = ['Bike', 'Scooter', 'Car', 'Van']

export function SignupPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('DONOR')
  const [busy, setBusy] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [address, setAddress] = useState('')

  const [donorType, setDonorType] = useState('RESTAURANT')
  const [organizationName, setOrganizationName] = useState('')

  const [recipientType, setRecipientType] = useState('NGO')
  const [storageCapacityKg, setStorageCapacityKg] = useState('250')
  const [demandKg, setDemandKg] = useState('100')
  const [beneficiaries, setBeneficiaries] = useState('150')

  const [vehicleType, setVehicleType] = useState('Bike')

  const isIndividual = role === 'DONOR' && donorType === 'INDIVIDUAL'

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      const payload: RegisterPayload = {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        phoneNumber: phoneNumber || undefined,
        role,
        address: address || undefined,
      }

      if (role === 'DONOR') {
        payload.organizationType = donorType
        payload.organizationName = isIndividual ? undefined : organizationName.trim() || undefined
      }
      if (role === 'RECIPIENT') {
        payload.organizationType = recipientType
        payload.organizationName = organizationName.trim()
        payload.storageCapacityKg = Number(storageCapacityKg)
        payload.demandKg = Number(demandKg)
        payload.beneficiaries = Number(beneficiaries)
      }
      if (role === 'VOLUNTEER') {
        payload.vehicleType = vehicleType
        payload.address = address || undefined
      }

      const profile = await register(payload)
      toast.success(`Account created — welcome, ${profile.fullName.split(' ')[0]}`)
      navigate(homeRouteFor(profile.role), { replace: true })
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink-50 px-5 py-10">
      <div className="mx-auto w-full max-w-[720px]">
        <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-[13px] font-semibold text-ink-500 hover:text-ink-800">
          <ArrowLeft size={14} /> Back to sign in
        </Link>

        <div className="mb-7 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700">
            <svg viewBox="0 0 100 100" className="h-5 w-5">
              <path d="M18 60c16 0 22-9 32-9s16 9 32 9" stroke="white" strokeWidth={9} fill="none" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-extrabold tracking-tight text-ink-900">Create your FoodBridge account</p>
            <p className="text-[12.5px] text-ink-500">Donate surplus food, receive it, or volunteer to deliver it.</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="card p-5">
            <label className="label">I want to join as</label>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {roleOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setRole(option.id)}
                  className={`rounded-xl p-3.5 text-left ring-1 transition ${
                    role === option.id ? 'bg-brand-50 ring-brand-500' : 'bg-white ring-ink-200 hover:ring-brand-300'
                  }`}
                >
                  <p className={`text-[13.5px] font-bold ${role === option.id ? 'text-brand-800' : 'text-ink-900'}`}>
                    {option.title}
                  </p>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-ink-500">{option.blurb}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="card space-y-4 p-5">
            <p className="text-[13.5px] font-bold text-ink-900">Your details</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Full name</label>
                <input className="input" required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your name" />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  className="input"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>
              <div>
                <label className="label">Phone number</label>
                <input className="input" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="+91 …" />
              </div>
              {role !== 'VOLUNTEER' && (
                <div className="sm:col-span-2">
                  <label className="label">{role === 'DONOR' && isIndividual ? 'Your area / address' : 'Address'}</label>
                  <input
                    className="input"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder={role === 'DONOR' ? 'Pickup area, e.g. Anna Nagar, Chennai' : 'Where you are located'}
                  />
                </div>
              )}
            </div>
          </div>

          {role === 'DONOR' && (
            <div className="card space-y-4 p-5">
              <p className="text-[13.5px] font-bold text-ink-900">What kind of donor are you?</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label">Donor type</label>
                  <select className="input" value={donorType} onChange={(event) => setDonorType(event.target.value)}>
                    {donorTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                {!isIndividual && (
                  <div className="sm:col-span-2">
                    <label className="label">Business / organization name</label>
                    <input
                      className="input"
                      value={organizationName}
                      onChange={(event) => setOrganizationName(event.target.value)}
                      placeholder="Shown to recipient organizations"
                    />
                  </div>
                )}
                {isIndividual && (
                  <p className="rounded-xl bg-brand-50 px-4 py-3 text-[12.5px] leading-relaxed text-brand-800 sm:col-span-2">
                    No business details needed — your donations will be listed under your own name.
                  </p>
                )}
              </div>
            </div>
          )}

          {role === 'RECIPIENT' && (
            <div className="card space-y-4 p-5">
              <p className="text-[13.5px] font-bold text-ink-900">Your organization</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Organization name</label>
                  <input
                    className="input"
                    required
                    value={organizationName}
                    onChange={(event) => setOrganizationName(event.target.value)}
                    placeholder="e.g. Sneha Sadan"
                  />
                </div>
                <div>
                  <label className="label">Organization type</label>
                  <select className="input" value={recipientType} onChange={(event) => setRecipientType(event.target.value)}>
                    {recipientTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Storage capacity (kg)</label>
                  <input className="input" type="number" value={storageCapacityKg} onChange={(event) => setStorageCapacityKg(event.target.value)} />
                </div>
                <div>
                  <label className="label">Food needed now (kg)</label>
                  <input className="input" type="number" value={demandKg} onChange={(event) => setDemandKg(event.target.value)} />
                </div>
                <div>
                  <label className="label">People you serve</label>
                  <input className="input" type="number" value={beneficiaries} onChange={(event) => setBeneficiaries(event.target.value)} />
                </div>
              </div>
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-[12.5px] leading-relaxed text-amber-800">
                New organizations are reviewed by the platform administrator before they start receiving allocations.
              </p>
            </div>
          )}

          {role === 'VOLUNTEER' && (
            <div className="card space-y-4 p-5">
              <p className="text-[13.5px] font-bold text-ink-900">How will you deliver?</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Vehicle</label>
                  <select className="input" value={vehicleType} onChange={(event) => setVehicleType(event.target.value)}>
                    {vehicleTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Your area</label>
                  <input
                    className="input"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="e.g. Adyar, Chennai"
                  />
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            {busy ? 'Creating account…' : 'Create account'}
          </button>
          <p className="text-center text-[12px] text-ink-400">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-brand-700 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
