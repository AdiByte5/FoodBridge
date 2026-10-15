import { motion } from 'framer-motion'
import {
  BadgeCheck,
  Bell,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Loader2,
  PackageCheck,
  Play,
  RotateCcw,
  Route,
  Sparkles,
  Trophy,
  Truck,
  Utensils,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Card, EmptyState, PageHeader, ScoreRing, SectionTitle, Skeleton, StatusBadge } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { scoreTone } from '../lib/format'
import type { DemoScenario, FactorScore } from '../lib/types'

const stepIcons: ReactNode[] = [
  <Utensils size={16} key="1" />,
  <BrainCircuit size={16} key="2" />,
  <ClipboardCheck size={16} key="3" />,
  <BadgeCheck size={16} key="4" />,
  <Truck size={16} key="5" />,
  <PackageCheck size={16} key="6" />,
  <Route size={16} key="7" />,
  <CheckCircle2 size={16} key="8" />,
  <Sparkles size={16} key="9" />,
  <Bell size={16} key="10" />,
]

export function ScenarioPage() {
  const [scenario, setScenario] = useState<DemoScenario | null>(null)
  const [revealed, setRevealed] = useState(0)
  const [running, setRunning] = useState(false)
  const [resetting, setResetting] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [])

  const run = async () => {
    setRunning(true)
    setScenario(null)
    setRevealed(0)
    try {
      const { data } = await api.post<DemoScenario>('/scenario/run')
      setScenario(data)
      let index = 0
      timer.current = window.setInterval(() => {
        index += 1
        setRevealed(index)
        if (index >= data.steps.length) {
          if (timer.current) window.clearInterval(timer.current)
          toast.success('Scenario complete — 18 kg rescued end-to-end')
        }
      }, 650)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setRunning(false)
    }
  }

  const reset = async () => {
    setResetting(true)
    try {
      await api.post('/scenario/reset')
      setScenario(null)
      setRevealed(0)
      toast.success('Sample dataset restored to its starting state')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setResetting(false)
    }
  }

  const skip = () => {
    if (scenario) {
      if (timer.current) window.clearInterval(timer.current)
      setRevealed(scenario.steps.length)
    }
  }

  return (
    <div>
      <PageHeader
        title="Scenario runner"
        subtitle="Execute a complete rescue run against the live system: donation → engine decision → acceptance → volunteer coordination → delivery → analytics."
        actions={
          <>
            <button className="btn-secondary" onClick={() => void reset()} disabled={resetting}>
              <RotateCcw size={15} className={resetting ? 'animate-spin' : ''} /> Restore sample data
            </button>
            <button className="btn-primary" onClick={() => void run()} disabled={running}>
              {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
              {scenario ? 'Run again' : 'Run scenario'}
            </button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-2xl bg-ink-950 p-6 text-white">
            <div className="grid-noise absolute inset-0 opacity-60" />
            <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full bg-brand-600/25 blur-3xl" />
            <div className="relative">
              <span className="chip bg-white/10 text-brand-200 ring-1 ring-white/10">
                <Sparkles size={13} /> End-to-end rescue run
              </span>
              <h2 className="mt-3 text-xl font-extrabold tracking-tight">
                18 kg of surplus biryani — rescued in under 3 hours
              </h2>
              <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink-300">
                Spice Route Restaurant registers fresh surplus. The engine scores every verified recipient across six
                weighted factors, explains its choice, coordinates the closest available volunteer and closes the loop
                with a confirmed delivery — updating analytics and the audit trail in real time.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-[11.5px] font-semibold">
                <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/10">10 narrated steps</span>
                <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/10">6 live notifications</span>
                <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/10">Complete audit trail</span>
                <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/10">Real MySQL persistence</span>
              </div>
            </div>
          </div>

          {running && !scenario && (
            <Card>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Loader2 size={18} className="animate-spin text-brand-600" />
                  <p className="text-sm font-semibold text-ink-700">Running the rescue pipeline…</p>
                </div>
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            </Card>
          )}

          {!scenario && !running && (
            <EmptyState
              icon={<Play size={20} />}
              title="Ready when you are"
              message="Press “Run scenario” to execute a complete rescue against the live backend. Every step writes real records to MySQL, sends notifications and logs to the audit trail."
            />
          )}

          {scenario && (
            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <SectionTitle title="Live run timeline" subtitle={scenario.narrative} />
                {revealed < scenario.steps.length && (
                  <button className="btn-ghost px-3 py-1.5 text-[12px]" onClick={skip}>
                    <ChevronDown size={13} /> Skip animation
                  </button>
                )}
              </div>

              <div className="relative space-y-3 pl-7">
                <div className="absolute bottom-4 left-[13px] top-2 w-px bg-ink-200" />
                {scenario.steps.slice(0, revealed).map((step, index) => (
                  <motion.div
                    key={step.order}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35 }}
                    className="relative rounded-2xl bg-ink-50 p-4"
                  >
                    <span className="absolute -left-[27px] top-4 grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-white">
                      {stepIcons[index] ?? <CheckCircle2 size={14} />}
                    </span>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13.5px] font-extrabold text-ink-900">
                        <span className="mr-1.5 text-ink-400">{String(step.order).padStart(2, '0')}</span>
                        {step.title}
                      </p>
                      <StatusBadge status={step.status} />
                    </div>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-600">{step.description}</p>
                    <StepData step={step} />
                  </motion.div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          {scenario && (
            <Card>
              <SectionTitle title="Engine verdict" subtitle={`Run ${scenario.scenarioId}`} />
              <div className="flex items-center gap-4">
                <ScoreRing score={scenario.priorityScore} size={92} label="priority" />
                <div>
                  <p className="text-[15px] font-extrabold text-ink-900">{scenario.recommendedRecipient}</p>
                  <p className="mt-0.5 text-[12px] text-ink-500">
                    Donation #{scenario.donationId} · allocation #{scenario.allocationId}
                  </p>
                  <span className="chip mt-2 bg-brand-50 text-brand-700">
                    <Trophy size={12} /> Best of {scenario.ranked.filter((c) => !c.excluded).length} eligible recipients
                  </span>
                </div>
              </div>
              <p className="mt-4 rounded-xl bg-brand-50/70 p-3.5 text-[12.5px] leading-relaxed text-ink-700">
                {scenario.decisionExplanation}
              </p>
            </Card>
          )}

          <Card>
            <SectionTitle title="Scoring model in action" subtitle="Six weighted decision factors" />
            <div className="space-y-3">
              {[
                { label: 'Expiry urgency', weight: 25, tone: 'bg-amber-500' },
                { label: 'Demand match', weight: 20, tone: 'bg-brand-600' },
                { label: 'Storage fit', weight: 15, tone: 'bg-sky-500' },
                { label: 'Proximity', weight: 15, tone: 'bg-violet-500' },
                { label: 'Food preference', weight: 15, tone: 'bg-emerald-500' },
                { label: 'Fair distribution', weight: 10, tone: 'bg-pink-500' },
              ].map((factor) => (
                <div key={factor.label}>
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="font-semibold text-ink-700">{factor.label}</span>
                    <span className="font-bold tabular-nums text-ink-900">{factor.weight}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink-100">
                    <div className={`h-full rounded-full ${factor.tone}`} style={{ width: `${factor.weight * 4}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle title="What this run demonstrates" subtitle="One click, the full rescue pipeline" />
            <div className="space-y-2.5 text-[12.5px] text-ink-600">
              {[
                'Allocation engine ranks recipients and explains the pick',
                'Volunteer matched by distance, current load and experience',
                'Delivery tracked from pickup to confirmed receipt',
                'Notifications and audit entries at every step',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-brand-600" />
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StepData({ step }: { step: { order: number; data: Record<string, unknown> } }) {
  const ranked = step.data.ranked as
    | { name: string; score: number; distanceKm?: number | null; excluded: boolean; reason?: string }[]
    | undefined
  const factorBreakdown = step.data.factorBreakdown as FactorScore[] | undefined

  if (step.order === 2 && ranked) {
    return (
      <div className="mt-3 space-y-1.5">
        {ranked.map((candidate, index) => (
          <div
            key={candidate.name}
            className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 ${
              candidate.excluded ? 'bg-rose-50/70' : index === 0 ? 'bg-brand-100/70' : 'bg-white'
            }`}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="w-6 shrink-0 text-[11px] font-bold text-ink-400">
                {candidate.excluded ? '—' : `#${index + 1}`}
              </span>
              <p className="truncate text-[12.5px] font-semibold text-ink-800">{candidate.name}</p>
              {!candidate.excluded && candidate.distanceKm != null && (
                <span className="chip shrink-0 bg-white text-ink-500 ring-1 ring-ink-200">{candidate.distanceKm} km</span>
              )}
            </div>
            {candidate.excluded ? (
              <span className="truncate text-[11.5px] text-rose-600">{candidate.reason}</span>
            ) : (
              <span className={`text-[14px] font-extrabold tabular-nums ${scoreTone(candidate.score)}`}>
                {candidate.score}
              </span>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (step.order === 3 && factorBreakdown && factorBreakdown.length > 0) {
    return (
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {factorBreakdown.map((factor) => (
          <div key={factor.key} className="rounded-xl bg-white px-3 py-2">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="font-bold text-ink-700">{factor.label}</span>
              <span className="font-extrabold tabular-nums text-ink-900">{factor.contribution}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
              <div className="h-full rounded-full bg-brand-600" style={{ width: `${factor.score}%` }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (step.order === 10) {
    const entries = [
      { label: 'Donations', value: step.data.totalDonations },
      { label: 'Kg rescued', value: step.data.kgRescued },
      { label: 'Meals', value: step.data.estimatedMeals },
      { label: 'Avg score', value: step.data.avgPriorityScore },
    ]
    return (
      <div className="mt-3 grid grid-cols-4 gap-2">
        {entries.map((entry) => (
          <div key={entry.label} className="rounded-xl bg-white p-2.5 text-center">
            <p className="text-[15px] font-extrabold tabular-nums text-brand-700">{String(entry.value)}</p>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-500">{entry.label}</p>
          </div>
        ))}
      </div>
    )
  }

  const assignmentExplanation = step.data.explanation
  if (step.order === 5 && typeof assignmentExplanation === 'string') {
    return (
      <p className="mt-2 rounded-xl bg-white p-2.5 text-[12px] leading-relaxed text-ink-600">
        <span className="font-bold text-ink-800">Match reasoning: </span>
        {assignmentExplanation}
      </p>
    )
  }

  const winner = step.data.recipient
  if (step.order === 4 && typeof winner === 'string') {
    return (
      <p className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-2 text-[12px] font-semibold text-ink-700">
        <BadgeCheck size={13} className="text-brand-600" /> {winner} accepted · volunteer matched automatically
      </p>
    )
  }

  return null
}
