import { Download, Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CategoryDonut, DonationTrendChart, FairnessBars, StatusFunnel } from '../components/charts'
import { Card, PageHeader, SectionTitle, Skeleton, StatStrip } from '../components/ui'
import { api, errorMessage, TOKEN_KEY } from '../lib/api'
import { formatCount, formatDuration, kg } from '../lib/format'
import type { Analytics } from '../lib/types'

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    api
      .get<Analytics>('/analytics/overview')
      .then((res) => setAnalytics(res.data))
      .catch((error) => toast.error(errorMessage(error)))
      .finally(() => setLoading(false))
  }, [])

  const exportCsv = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/analytics/export/donations.csv', {
        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}` },
      })
      if (!response.ok) throw new Error('Export failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `foodbridge-donations-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Donation report exported')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setExporting(false)
    }
  }

  if (loading || !analytics) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-5 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-80" />
          </div>
          <div className="space-y-5">
            <Skeleton className="h-72" />
            <Skeleton className="h-60" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    )
  }

  const { overview } = analytics
  const maxKg = Math.max(...analytics.fairness.map((point) => point.kgReceived), 1)
  const minKg = Math.min(...analytics.fairness.map((point) => point.kgReceived), maxKg)
  const fairnessGap = maxKg > 0 ? Math.round(((maxKg - minKg) / maxKg) * 100) : 0

  return (
    <div>
      <PageHeader
        title="Reports & analytics"
        subtitle="How much food was rescued, where it went and how evenly it was shared."
        actions={
          <button className="btn-secondary" onClick={() => void exportCsv()} disabled={exporting}>
            <Download size={15} /> Export donations CSV
          </button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-3">
        {/* main column */}
        <div className="space-y-5 xl:col-span-2">
          <Card>
            <SectionTitle
              title="Rescue performance"
              subtitle="What the network achieved over the last 14 days"
            />
            <StatStrip
              className="ring-0 shadow-none"
              items={[
                { label: 'Food rescued', value: kg(overview.totalKgRescued) },
                { label: 'Meals equivalent', value: formatCount(overview.estimatedMeals) },
                { label: 'Completed rescues', value: overview.completedDonations },
                { label: 'Avg delivery time', value: formatDuration(overview.avgDeliveryHours) },
              ]}
            />
            <div className="mt-5">
              <DonationTrendChart data={analytics.donationTrend} height={250} />
            </div>
          </Card>

          <Card>
            <SectionTitle
              title="Food shared between organizations"
              subtitle={
                fairnessGap === 0
                  ? 'Every partner has received the same amount so far'
                  : `Kilograms each partner received — the busiest partner is ${fairnessGap}% ahead of the quietest`
              }
            />
            <FairnessBars data={analytics.fairness} height={260} />
            <p className="mt-3 flex items-start gap-2.5 rounded-xl bg-ink-50 p-3.5 text-[12px] leading-relaxed text-ink-500">
              <Info size={14} className="mt-0.5 shrink-0 text-ink-400" />
              The engine gives organizations that received less in the last 30 days a higher fairness score, so
              distribution stays balanced instead of going to whoever asks first.
            </p>
          </Card>
        </div>

        {/* side column */}
        <div className="space-y-5">
          <Card>
            <SectionTitle title="What kind of food" subtitle="Donations per category" />
            <CategoryDonut data={analytics.categoryDistribution} height={240} />
          </Card>

          <Card>
            <SectionTitle title="Pipeline" subtitle="Donations by current status" />
            <StatusFunnel data={analytics.statusFunnel} height={220} />
          </Card>

          <Card>
            <SectionTitle title="Volunteers" subtitle="Completed deliveries" />
            <div className="space-y-3">
              {analytics.volunteerLeaderboard.slice(0, 4).map((row, index) => (
                <div key={row.name} className="flex items-center gap-3">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11.5px] font-extrabold ${
                      index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-ink-100 text-ink-600'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-ink-900">{row.name}</p>
                    <p className="text-[11px] text-ink-500">
                      {row.vehicleType} · {row.activeDeliveries} active now
                    </p>
                  </div>
                  <span className="text-[14px] font-extrabold tabular-nums text-brand-700">{row.completedDeliveries}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
