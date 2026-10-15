import { BadgeCheck, Ban, CheckCircle2, Loader2, Search, ShieldCheck, Users as UsersIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Avatar, Card, EmptyState, PageHeader, Skeleton, StatStrip, StatusBadge, Tabs } from '../components/ui'
import { api, errorMessage } from '../lib/api'
import { formatDateTime, prettyStatus } from '../lib/format'
import type { AdminUser, Role } from '../lib/types'

export function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'ALL' | Role>('ALL')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<AdminUser[]>('/admin/users')
      setUsers(data)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const verify = async (user: AdminUser) => {
    setBusyId(user.userId)
    try {
      await api.post(`/admin/users/${user.userId}/verify`)
      toast.success(`${user.organizationName ?? user.fullName} verified`)
      await load()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusyId(null)
    }
  }

  const toggleStatus = async (user: AdminUser) => {
    const next = user.accountStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED'
    setBusyId(user.userId)
    try {
      await api.patch(`/admin/users/${user.userId}/status`, { status: next })
      toast.success(`${user.fullName} is now ${prettyStatus(next).toLowerCase()}`)
      await load()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusyId(null)
    }
  }

  const filtered = useMemo(
    () =>
      users.filter((user) => {
        const matchesTab = tab === 'ALL' || user.role === tab
        const query = search.trim().toLowerCase()
        const matchesSearch =
          query.length === 0 ||
          user.fullName.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          (user.organizationName ?? '').toLowerCase().includes(query)
        return matchesTab && matchesSearch
      }),
    [users, tab, search],
  )

  const unverified = users.filter((u) => (u.role === 'DONOR' || u.role === 'RECIPIENT') && u.verified === false)

  return (
    <div>
      <PageHeader
        title="Users & organization verification"
        subtitle="Verify donor and recipient organizations, manage accounts and keep the platform trustworthy."
      />

      <StatStrip
        items={[
          { label: 'Total users', value: users.length, hint: 'all roles', icon: <UsersIcon size={15} /> },
          { label: 'Pending verification', value: unverified.length, hint: 'need a decision', icon: <ShieldCheck size={15} /> },
          { label: 'Donors', value: users.filter((u) => u.role === 'DONOR').length, hint: 'food businesses', icon: <BadgeCheck size={15} /> },
          { label: 'Recipient organizations', value: users.filter((u) => u.role === 'RECIPIENT').length, hint: 'NGOs and shelters', icon: <BadgeCheck size={15} /> },
        ]}
      />

      <Card className="mt-6" padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 p-4">
          <Tabs
            active={tab}
            onChange={(value) => setTab(value as 'ALL' | Role)}
            tabs={[
              { id: 'ALL', label: 'All', count: users.length },
              { id: 'DONOR', label: 'Donors', count: users.filter((u) => u.role === 'DONOR').length },
              { id: 'RECIPIENT', label: 'Recipients', count: users.filter((u) => u.role === 'RECIPIENT').length },
              { id: 'VOLUNTEER', label: 'Volunteers', count: users.filter((u) => u.role === 'VOLUNTEER').length },
              { id: 'ADMIN', label: 'Admins', count: users.filter((u) => u.role === 'ADMIN').length },
            ]}
          />
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              className="input w-64 pl-9"
              placeholder="Search name, email or org"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-14" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={<Search size={18} />} title="No users match" message="Try a different search or filter." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px]">
              <thead>
                <tr className="border-b border-ink-100">
                  <th className="th">User</th>
                  <th className="th">Role</th>
                  <th className="th">Organization</th>
                  <th className="th">Verification</th>
                  <th className="th">Account</th>
                  <th className="th">Last login</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.userId} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/60">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.fullName} size={34} />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold text-ink-900">{user.fullName}</p>
                          <p className="truncate text-[11.5px] text-ink-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td">
                      <span className="chip bg-ink-100 text-ink-600">{prettyStatus(user.role)}</span>
                    </td>
                    <td className="td">
                      <p className="text-[12.5px] font-semibold text-ink-700">{user.organizationName ?? '—'}</p>
                      <p className="text-[11.5px] text-ink-400">{user.organizationType ? prettyStatus(user.organizationType) : ''}</p>
                    </td>
                    <td className="td">
                      {user.verified === true && (
                        <span className="chip bg-emerald-50 text-emerald-700">
                          <BadgeCheck size={12} /> Verified
                        </span>
                      )}
                      {user.verified === false && (
                        <button
                          className="chip bg-amber-50 text-amber-700 hover:bg-amber-100"
                          onClick={() => void verify(user)}
                          disabled={busyId === user.userId}
                        >
                          {busyId === user.userId ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                          Verify now
                        </button>
                      )}
                    </td>
                    <td className="td">
                      <StatusBadge status={user.accountStatus} />
                    </td>
                    <td className="td text-[12px] text-ink-500">{formatDateTime(user.lastLogin)}</td>
                    <td className="td">
                      <div className="flex justify-end gap-2">
                        {user.verified === false && (
                          <button className="btn-primary px-3 py-1.5 text-[12px]" onClick={() => void verify(user)} disabled={busyId === user.userId}>
                            <CheckCircle2 size={13} /> Verify
                          </button>
                        )}
                        {user.role !== 'ADMIN' && (
                          <button
                            className={`btn px-3 py-1.5 text-[12px] ${
                              user.accountStatus === 'SUSPENDED'
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                            }`}
                            onClick={() => void toggleStatus(user)}
                            disabled={busyId === user.userId}
                          >
                            {user.accountStatus === 'SUSPENDED' ? <CheckCircle2 size={13} /> : <Ban size={13} />}
                            {user.accountStatus === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
