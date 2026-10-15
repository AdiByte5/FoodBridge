import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

export function DonationTrendChart({ data, height = 260 }: { data: TrendPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="fbKg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0e7c57" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#0e7c57" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="fbDonations" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#e6e9ee" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#687487' }} axisLine={false} tickLine={false} />
        <YAxis
          yAxisId="kg"
          tick={{ fontSize: 11, fill: '#0e7c57' }}
          axisLine={false}
          tickLine={false}
          width={38}
        />
        <YAxis
          yAxisId="count"
          orientation="right"
          tick={{ fontSize: 11, fill: '#d97706' }}
          axisLine={false}
          tickLine={false}
          width={28}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: '1px solid rgba(19,26,36,.08)', fontSize: 12 }}
          formatter={(value, name) => [value, name === 'kgRescued' ? 'kg rescued' : 'donations']}
        />
        <Area
          yAxisId="kg"
          type="monotone"
          dataKey="kgRescued"
          stroke="#0e7c57"
          strokeWidth={2.4}
          fill="url(#fbKg)"
          name="kg rescued"
        />
        <Area
          yAxisId="count"
          type="monotone"
          dataKey="donations"
          stroke="#f59e0b"
          strokeWidth={2}
          fill="url(#fbDonations)"
          name="donations"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function CategoryDonut({ data, height = 240 }: { data: Slice[]; height?: number }) {
  const filtered = data.filter((slice) => slice.value > 0)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={filtered}
          dataKey="value"
          nameKey="name"
          innerRadius="58%"
          outerRadius="86%"
          paddingAngle={2}
          strokeWidth={0}
        >
          {filtered.map((slice, index) => (
            <Cell key={slice.name} fill={categoryColors[index % categoryColors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: 12, border: '1px solid rgba(19,26,36,.08)', fontSize: 12 }}
          formatter={(value, name, item) => [
            `${value} donations · ${(item?.payload as Slice | undefined)?.kg ?? 0} kg`,
            String(name),
          ]}
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

export function FairnessBars({ data, height = 260 }: { data: FairnessPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 6" horizontal={false} stroke="#e6e9ee" />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#687487' }} axisLine={false} tickLine={false} unit=" kg" />
        <YAxis
          type="category"
          dataKey="organizationName"
          width={150}
          tick={{ fontSize: 11, fill: '#434c5a' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: '1px solid rgba(19,26,36,.08)', fontSize: 12 }}
          formatter={(value) => [`${value} kg`, 'allocated']}
        />
        <Bar dataKey="kgReceived" fill="#0e7c57" radius={[0, 8, 8, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function StatusFunnel({ data, height = 240 }: { data: Slice[]; height?: number }) {
  const colors: Record<string, string> = {
    PENDING: '#f59e0b',
    ALLOCATED: '#0ea5e9',
    PICKED_UP: '#8b5cf6',
    DELIVERED: '#14b8a6',
    COMPLETED: '#0e7c57',
    CANCELLED: '#f43f5e',
    EXPIRED: '#94a3b8',
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#e6e9ee" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10.5, fill: '#687487' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => prettyStatus(String(value))}
        />
        <YAxis tick={{ fontSize: 11, fill: '#687487' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: '1px solid rgba(19,26,36,.08)', fontSize: 12 }}
          formatter={(value, _name, item) => [
            `${value} donations · ${(item?.payload as Slice | undefined)?.kg ?? 0} kg`,
            'status',
          ]}
          labelFormatter={(label) => prettyStatus(String(label))}
        />
        <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={34}>
          {data.map((slice) => (
            <Cell key={slice.name} fill={colors[slice.name] ?? '#0e7c57'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
