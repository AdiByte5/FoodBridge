import { motion } from 'framer-motion'
import { AlertTriangle, BadgeCheck, Clock, Info, MapPin, Sparkles, Trophy } from 'lucide-react'
import { expiryLabel, kg, scoreTone } from '../lib/format'
import type { Recommendation } from '../lib/types'
import { FactorBar, ScoreRing } from './ui'

export function RecommendationPanel({ recommendation }: { recommendation: Recommendation }) {
  const winner = recommendation.recommended
  const runnersUp = recommendation.ranked.filter((c) => !c.excluded && c.recipientId !== winner?.recipientId).slice(0, 3)
  const excluded = recommendation.ranked.filter((c) => c.excluded)

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 p-5 text-white">
        <div className="flex items-center gap-2 text-brand-200">
          <Sparkles size={15} />
          <span className="text-[11px] font-bold uppercase tracking-wider">Engine decision summary</span>
        </div>
        <p className="mt-2 text-[14px] leading-relaxed text-brand-50">{recommendation.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-[11.5px] font-semibold">
          <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15">
            {recommendation.eligibleCount} eligible
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15">
            {recommendation.excludedCount} excluded
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15">
            {expiryLabel(recommendation.hoursToExpiry).text} before expiry
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15">
            {recommendation.quantity} {recommendation.unit} · {recommendation.categoryName}
          </span>
        </div>
      </div>

      {winner ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-brand-200 bg-brand-50/50 p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-white text-brand-700 shadow-sm ring-1 ring-brand-200">
                <Trophy size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-extrabold text-ink-900">{winner.organizationName}</h3>
                  <BadgeCheck size={16} className="text-brand-600" />
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-500">
                  <MapPin size={12} /> {winner.address}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11.5px] font-semibold text-ink-600">
                  <span className="chip bg-white text-ink-600 ring-1 ring-ink-200">
                    {winner.distanceKm ?? '—'} km away
                  </span>
                  {winner.spareMinutes != null && winner.spareMinutes > 0 && (
                    <span className="chip bg-emerald-50 text-emerald-700">
                      <Clock size={12} /> arrives with ~{winner.spareMinutes} min to spare
                    </span>
                  )}
                  {winner.arrivalMinutes != null && (
                    <span className="chip bg-white text-ink-600 ring-1 ring-ink-200">
                      ~{winner.arrivalMinutes} min pickup to handover
                    </span>
                  )}
                  <span className="chip bg-white text-ink-600 ring-1 ring-ink-200">
                    {kg(winner.freeCapacityKg)} free storage
                  </span>
                  <span className="chip bg-white text-ink-600 ring-1 ring-ink-200">
                    demand {kg(winner.demandKg)}
                  </span>
                  <span className="chip bg-white text-ink-600 ring-1 ring-ink-200">
                    {winner.allocationsLast30Days} recent allocations
                  </span>
                </div>
              </div>
            </div>
            <ScoreRing score={winner.totalScore} size={96} label="priority" />
          </div>

          <div className="mt-5 rounded-xl bg-white p-4 ring-1 ring-brand-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700">Decision explanation</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-700">{winner.explanation}</p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {winner.factors.map((factor) => (
              <FactorBar key={factor.key} factor={factor} />
            ))}
          </div>
        </motion.div>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle size={18} className="mt-0.5 text-amber-600" />
          <div>
            <p className="text-sm font-bold text-amber-900">No eligible recipient right now</p>
            <p className="mt-0.5 text-[13px] text-amber-800">
              Verify more organizations or free up storage capacity, then run the engine again.
            </p>
          </div>
        </div>
      )}

      {runnersUp.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">Runner-up candidates</p>
          <div className="space-y-2">
            {runnersUp.map((candidate, index) => (
              <div key={candidate.recipientId} className="flex items-center justify-between gap-3 rounded-xl bg-ink-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-[12px] font-bold text-ink-500 ring-1 ring-ink-200">
                    #{index + 2}
                  </span>
                  <div>
                    <p className="text-[13.5px] font-bold text-ink-800">{candidate.organizationName}</p>
                    <p className="text-[11.5px] text-ink-500">
                      {candidate.distanceKm ?? '—'} km · demand {kg(candidate.demandKg)} · {candidate.allocationsLast30Days} recent allocations
                    </p>
                  </div>
                </div>
                <span className={`text-[15px] font-extrabold tabular-nums ${scoreTone(candidate.totalScore)}`}>
                  {candidate.totalScore.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {excluded.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">Excluded by eligibility filters</p>
          <div className="space-y-2">
            {excluded.map((candidate) => (
              <div key={candidate.recipientId} className="flex items-center justify-between gap-3 rounded-xl bg-rose-50/60 px-4 py-2.5">
                <p className="text-[13px] font-semibold text-ink-700">{candidate.organizationName}</p>
                <p className="text-[12px] text-rose-700">{candidate.exclusionReason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-start gap-2.5 rounded-xl bg-ink-50 p-3.5">
        <Info size={15} className="mt-0.5 shrink-0 text-ink-400" />
        <div className="text-[12px] leading-relaxed text-ink-500">
          <span className="font-semibold text-ink-700">Food-safety rule: </span>
          {recommendation.safetyRule?.description}
          <span className="mt-1.5 block">
          <span className="font-semibold text-ink-700">Scoring model: </span>
          {recommendation.weights.map((w) => `${w.label} ${w.weight}%`).join(' · ')}
          </span>
          <span className="mt-1 block">
            Filters applied: {recommendation.appliedFilters.join('; ')}.
          </span>
        </div>
      </div>
    </div>
  )
}
