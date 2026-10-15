import { Bell, BellRing, CheckCheck, Inbox } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, EmptyState, PageHeader, Skeleton, Tabs } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { formatDateTime, relativeTime } from '../lib/format'
import type { NotificationItem } from '../lib/types'

const typeTones: Record<string, string> = {
  DONATION: 'bg-brand-50 text-brand-700',
  ALLOCATION: 'bg-violet-50 text-violet-700',
  ASSIGNMENT: 'bg-amber-50 text-amber-700',
  DELIVERY: 'bg-emerald-50 text-emerald-700',
  EXPIRY_ALERT: 'bg-rose-50 text-rose-700',
  SYSTEM: 'bg-ink-100 text-ink-700',
}

export function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<NotificationItem[]>('/notifications')
      setItems(data)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const markRead = async (item: NotificationItem) => {
    if (item.isRead) return
    await api.post(`/notifications/${item.notificationId}/read`)
    setItems((prev) =>
      prev.map((entry) => (entry.notificationId === item.notificationId ? { ...entry, isRead: true } : entry)),
    )
  }

  const markAll = async () => {
    await api.post('/notifications/read-all')
    setItems((prev) => prev.map((entry) => ({ ...entry, isRead: true })))
    toast.success('All notifications marked as read')
  }

  const unread = items.filter((item) => !item.isRead)
  const filtered = tab === 'all' ? items : unread

  return (
    <div>
      <PageHeader
        title="Notification center"
        subtitle="Allocation decisions, volunteer assignments, delivery progress and expiry alerts — in one place."
        actions={
          <button className="btn-secondary" onClick={() => void markAll()} disabled={unread.length === 0}>
            <CheckCheck size={15} /> Mark all read
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'all', label: 'All', count: items.length },
            { id: 'unread', label: 'Unread', count: unread.length },
          ]}
        />
        <p className="text-[12px] font-medium text-ink-500">
          {unread.length > 0 ? `${unread.length} unread` : 'You are all caught up'}
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-20" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Inbox size={20} />}
          title={tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          message="Notifications appear here the moment the engine, a volunteer or an organization takes action."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <Card
              key={item.notificationId}
              className={`cursor-pointer transition ${item.isRead ? 'opacity-75' : 'ring-brand-200'}`}
              padded={false}
            >
              <button className="flex w-full items-start gap-4 p-4 text-left" onClick={() => void markRead(item)}>
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    typeTones[item.notificationType] ?? 'bg-ink-100 text-ink-700'
                  }`}
                >
                  {item.isRead ? <Bell size={17} /> : <BellRing size={17} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-bold text-ink-900">{item.title}</span>
                    <span className={`chip ${typeTones[item.notificationType] ?? 'bg-ink-100 text-ink-700'}`}>
                      {item.notificationType.replace('_', ' ').toLowerCase()}
                    </span>
                    {!item.isRead && <span className="h-2 w-2 rounded-full bg-brand-500" />}
                  </span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-ink-600">{item.message}</span>
                  <span className="mt-1.5 block text-[11.5px] font-medium text-ink-400">
                    {formatDateTime(item.createdAt)} · {relativeTime(item.createdAt)}
                  </span>
                </span>
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
