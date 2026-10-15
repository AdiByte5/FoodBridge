import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { prettyStatus } from '../lib/format'
import type { FairnessPoint, Slice, TrendPoint } from '../lib/types'

const categoryColors = ['#0e7c57', '#37a279', '#6ec9a4', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ec4899', '#64748b']

export const statusColors: Record<string, string> = {
  PENDING: '#f59e0b',
  ALLOCATED: '#0ea5e9',
  PICKED_UP: '#8b5cf6',
  DELIVERED: '#14b8a6',
  COMPLETED: '#0e7c57',
  CANCELLED: '#f43f5e',
  EXPIRED: '#94a3b8',
}

const tooltipBox = {
  borderRadius: 12,
  border: '1px solid rgba(19,26,36,.08)',
  fontSize: 12,
  padding: '8px 12px',
}

/**
 * One bar per day showing kilograms rescued. A single series keeps it obvious
 * what the chart is telling you.
 */
export function DonationTrendChart({ data, height = 260 }: { data: TrendPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#e9ecf1" />
        <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: '#687487' }} axisLine={false} tickLine={false} interval={1} />
        <YAxis tick={{ fontSize: 11, fill: '#687487' }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: 'rgba(14,124,87,0.06)' }}
          contentStyle={tooltipBox}
          content={({ active, payload }) => {
            if (!active || !payload || payload.length === 0) return null
            const point = payload[0].payload as TrendPoint
            return (
              <div className="rounded-xl bg-white px-3 py-2 text-[12px] shadow-lift ring-1 ring-ink-900/5">
                <p className="font-bold text-ink-900">{point.label}</p>
                <p className="text-ink-700">{point.kgRescued} kg rescued</p>
                <p className="text-ink-500">
                  {point.donations} donation{point.donations === 1 ? '' : 's'} received
                </p>
              </div>
            )
          }}
        />
        <Bar dataKey="kgRescued" name="kg rescued" fill="#0e7c57" radius={[6, 6, 0, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Share of donations per food category. */
export function CategoryDonut({ data, height = 240 }: { data: Slice[]; height?: number }) {
  const filtered = data.filter((slice) => slice.value > 0)
  const total = filtered.reduce((sum, slice) => sum + slice.value, 0)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={filtered}
          dataKey="value"
          nameKey="name"
          innerRadius="56%"
          outerRadius="82%"
          paddingAngle={2}
          strokeWidth={0}
        >
          {filtered.map((slice, index) => (
            <Cell key={slice.name} fill={categoryColors[index % categoryColors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipBox}
          formatter={(value, _name, item) => {
            const slice = item?.payload as Slice | undefined
            const share = total > 0 ? Math.round((Number(value) / total) * 100) : 0
            return [`${value} donations · ${slice?.kg ?? 0} kg · ${share}%`, '']
          }}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ fontSize: 11.5, color: '#525d6e' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

/** Kilograms each organization received, with the value printed on every bar. */
export function FairnessBars({ data, height = 260 }: { data: FairnessPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 46, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 6" horizontal={false} stroke="#e9ecf1" />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#687487' }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="organizationName"
          width={150}
          tick={{ fontSize: 11, fill: '#434c5a' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={tooltipBox} formatter={(value) => [`${value} kg received`, '']} />
        <Bar dataKey="kgReceived" fill="#0e7c57" radius={[0, 8, 8, 0]} barSize={18}>
          <LabelList
            dataKey="kgReceived"
            position="right"
            formatter={(value) => `${value} kg`}
            style={{ fontSize: 11, fontWeight: 700, fill: '#434c5a' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** How many donations sit in each status, counted at the end of every bar. */
export function StatusFunnel({ data, height = 240 }: { data: Slice[]; height?: number }) {
  const visible = data.filter((slice) => slice.value > 0)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={visible} layout="vertical" margin={{ top: 4, right: 34, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 6" horizontal={false} stroke="#e9ecf1" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#687487' }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={92}
          tick={{ fontSize: 11, fill: '#434c5a' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => prettyStatus(String(value))}
        />
        <Tooltip
          cursor={{ fill: 'rgba(19,26,36,0.04)' }}
          contentStyle={tooltipBox}
          formatter={(value, _name, item) => {
            const slice = item?.payload as Slice | undefined
            return [`${value} donations · ${slice?.kg ?? 0} kg`, '']
          }}
        />
        <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={16}>
          {visible.map((slice) => (
            <Cell key={slice.name} fill={statusColors[slice.name] ?? '#0e7c57'} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            style={{ fontSize: 11, fontWeight: 700, fill: '#434c5a' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
