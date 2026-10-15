import { CheckCircle2, CircleDashed } from 'lucide-react'
import { formatDateTime, prettyStatus } from '../lib/format'
import type { Donation } from '../lib/types'

export function DonationTimeline({ donation }: { donation: Donation }) {
  const steps = [
    { label: 'Donation registered', detail: formatDateTime(donation.createdAt), done: true },
    {
      label: 'Allocation engine decision',
      detail: donation.recipientName
        ? `${donation.recipientName} · ${donation.priorityScore?.toFixed(1) ?? '—'}/100`
        : 'Awaiting engine run',
      done: Boolean(donation.allocationId),
    },
    {
      label: 'Recipient acceptance',
      detail: donation.allocationStatus ? prettyStatus(donation.allocationStatus) : 'Not proposed yet',
      done: ['ACCEPTED', 'COMPLETED'].includes(donation.allocationStatus ?? ''),
    },
    {
      label: 'Volunteer coordination',
      detail: donation.volunteerName ?? 'No volunteer assigned yet',
      done: Boolean(donation.volunteerName),
    },
    {
      label: 'Pickup & delivery',
      detail: donation.deliveryStatus ? prettyStatus(donation.deliveryStatus) : 'Not started',
      done: donation.deliveryStatus === 'DELIVERED',
    },
    {
      label: 'Receipt confirmed',
      detail: donation.status === 'COMPLETED' ? 'Food rescue completed' : 'Pending confirmation',
      done: donation.status === 'COMPLETED',
    },
  ]

  return (
    <ol className="relative space-y-4 border-l border-ink-200 pl-5">
      {steps.map((step) => (
        <li key={step.label} className="relative">
          <span className="absolute -left-[27px] top-0.5 bg-white">
            {step.done ? (
              <CheckCircle2 size={18} className="text-brand-600" />
            ) : (
              <CircleDashed size={18} className="text-ink-300" />
            )}
          </span>
          <p className={`text-[13.5px] font-bold ${step.done ? 'text-ink-900' : 'text-ink-400'}`}>{step.label}</p>
          <p className="text-[12px] text-ink-500">{step.detail}</p>
        </li>
      ))}
    </ol>
  )
}
