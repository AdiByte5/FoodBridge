import { Activity, Cpu, Database, DatabaseZap, RotateCcw, ServerCog, Timer } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, EmptyState, PageHeader, SectionTitle, Skeleton, StatStrip, Tabs } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { formatDateTime, prettyStatus, relativeTime } from '../lib/format'
import type { AuditLogEntry, SystemHealth } from '../lib/types'

const moduleTones: Record<string, string> = {
  AUTH: 'bg-sky-50 text-sky-700',
  DONATION: 'bg-brand-50 text-brand-700',
  ALLOCATION: 'bg-violet-50 text-violet-700',
  VOLUNTEER: 'bg-amber-50 text-amber-700',
  DELIVERY: 'bg-emerald-50 text-emerald-700',
  ADMIN: 'bg-rose-50 text-rose-700',
  SYSTEM: 'bg-ink-100 text-ink-700',
  RECIPIENT: 'bg-sky-50 text-sky-700',
}

export function SystemPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('ALL')
  const [resetting, setResetting] = useState(false)

  const load = useCallback(async () => {
    try {
      const [healthRes, logsRes] = await Promise.all([
        api.get<SystemHealth>('/admin/system-health'),
        api.get<AuditLogEntry[]>('/admin/audit-logs?limit=100'),
      ])
      setHealth(healthRes.data)
      setLogs(logsRes.data)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const resetDemo = async () => {
    setResetting(true)
    try {
      const { data } = await api.post<{ message: string; donations: number }>('/scenario/reset')
      toast.success(`Sample data restored — ${data.donations} donations reloaded`)
      await load()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setResetting(false)
    }
  }

  if (loading || !health) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-80" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  const modules = ['ALL', ...Array.from(new Set(logs.map((log) => log.module)))]
  const filtered = tab === 'ALL' ? logs : logs.filter((log) => log.module === tab)
  const uptimeHours = Math.floor(health.uptimeSeconds / 3600)
  const uptimeMinutes = Math.floor((health.uptimeSeconds % 3600) / 60)

  return (
    <div>
      <PageHeader
        title="Audit & system monitoring"
        subtitle="Every significant action is recorded for accountability. System health is reported live from the running services."
        actions={
          <button className="btn-secondary" onClick={() => void resetDemo()} disabled={resetting}>
            <RotateCcw size={15} className={resetting ? 'animate-spin' : ''} /> Restore sample data
          </button>
        }
      />

      <StatStrip
        items={[
          { label: 'Platform status', value: health.status, hint: 'all services responding', icon: <Activity size={15} /> },
          { label: 'Database', value: 'MySQL', hint: health.database, icon: <Database size={15} /> },
          { label: 'Uptime', value: `${uptimeHours}h ${uptimeMinutes}m`, hint: `version ${health.applicationVersion}`, icon: <Timer size={15} /> },
          { label: 'Audit records', value: health.entityCounts.auditLogs ?? 0, hint: 'actions recorded', icon: <ServerCog size={15} /> },
        ]}
      />

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card padded={false}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 p-4">
            <SectionTitle title="Audit trail" subtitle="Newest first" />
            <Tabs
              active={tab}
              onChange={setTab}
              tabs={modules.slice(0, 6).map((module) => ({ id: module, label: prettyStatus(module) }))}
            />
          </div>
          <div className="max-h-[560px] overflow-y-auto">
            {filtered.length === 0 && (
              <div className="p-6">
                <EmptyState icon={<DatabaseZap size={18} />} title="No entries" message="No audit records in this module yet." />
              </div>
            )}
            {filtered.map((log) => (
              <div key={log.logId} className="flex items-start gap-3 border-b border-ink-50 px-4 py-3 last:border-0">
                <span className={`chip mt-0.5 shrink-0 ${moduleTones[log.module] ?? 'bg-ink-100 text-ink-700'}`}>
                  {log.module}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold leading-snug text-ink-800">{log.description}</p>
                  <p className="mt-0.5 text-[11px] text-ink-400">
                    {log.actor} · {prettyStatus(log.action)} · {formatDateTime(log.timestamp)} ({relativeTime(log.timestamp)})
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <SectionTitle title="Data footprint" subtitle="Live entity counts from the database" />
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(health.entityCounts).map(([entity, count]) => (
                <div key={entity} className="rounded-xl bg-ink-50 p-3 text-center">
                  <p className="text-[17px] font-extrabold tabular-nums text-ink-900">{count}</p>
                  <p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-500">
                    {entity.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle title="Active components" subtitle="Modular services currently deployed" />
            <div className="space-y-2">
              {health.activeComponents.map((component) => (
                <div key={component} className="flex items-center gap-2.5 rounded-xl bg-emerald-50/60 px-3.5 py-2.5">
                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                    <Cpu size={12} />
                  </span>
                  <p className="text-[12.5px] font-semibold text-ink-700">{component}</p>
                  <span className="chip ml-auto bg-emerald-100 text-emerald-700">online</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
