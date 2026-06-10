'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Mail, ChevronDown, Loader2, ListChecks, BarChart2, Wifi, RefreshCw, Pencil, Check, X, AlertTriangle, MessageSquare, MessageCircle } from 'lucide-react'
import { getAllEmailCampaigns, queueEmailBatch, getEmailCampaignStats, rebalanceEmailQueue, updateEmailScheduledTime, checkEmailReplies } from '@/app/api_handlers/api/email-campaigns.api'
import { getAllGmailGateways } from '@/app/api_handlers/api/gmail-gateways.api'
import { showAppNotification } from '@/utils/notificationService'
import EmailDetailModal from './EmailDetailModal'
import ConversationModal from './ConversationModal'

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
    courtesy_email: 'bg-blue-100 text-blue-700',
    mercor_platform_join: 'bg-violet-100 text-violet-700',
    micro1_platform_join: 'bg-sky-100 text-sky-800',
    aligner_platform_join: 'bg-teal-100 text-teal-700',
    outlier_platform_join: 'bg-orange-100 text-orange-700',
    mercor_job: 'bg-violet-200 text-violet-800',
    aligner_job: 'bg-teal-200 text-teal-800',
}

const STATUS_COLORS: Record<string, string> = {
    email_created: 'bg-gray-100 text-gray-600',
    email_in_queue: 'bg-yellow-100 text-yellow-700',
    email_sending: 'bg-blue-100 text-blue-700',
    email_sent: 'bg-green-100 text-green-700',
    email_failed: 'bg-red-100 text-red-700',
    email_bounced: 'bg-red-100 text-red-600',
    email_replied: 'bg-purple-100 text-purple-700',
    email_positive_response: 'bg-emerald-100 text-emerald-700',
    email_negative_response: 'bg-red-100 text-red-700',
}

const STATUS_BG_MAP: Record<string, string> = {
    email_created: 'bg-gray-500',
    email_in_queue: 'bg-yellow-500',
    email_sending: 'bg-blue-500',
    email_sent: 'bg-green-500',
    email_failed: 'bg-red-700',
    email_bounced: 'bg-red-500',
    email_replied: 'bg-purple-500',
    email_positive_response: 'bg-emerald-500',
    email_negative_response: 'bg-red-700',
}

const EMAIL_TYPES = [
    { value: 'courtesy_email', label: 'Courtesy Email' },
    { value: 'mercor_platform_join', label: 'Mercor Invite' },
    { value: 'micro1_platform_join', label: 'Micro1 Invite' },
    { value: 'aligner_platform_join', label: 'Aligner Invite' },
    { value: 'outlier_platform_join', label: 'Outlier Invite' },
    { value: 'mercor_job', label: 'Mercor Job' },
    { value: 'aligner_job', label: 'Aligner Job' },
]

const EMAIL_STATUSES = [
    { value: 'email_created', label: 'Created' },
    { value: 'email_in_queue', label: 'In Queue' },
    { value: 'email_sending', label: 'Sending' },
    { value: 'email_sent', label: 'Sent' },
    { value: 'email_failed', label: 'Failed' },
    { value: 'email_bounced', label: 'Bounced' },
    { value: 'email_replied', label: 'Replied' },
    { value: 'email_positive_response', label: 'Positive Response' },
    { value: 'email_negative_response', label: 'Negative Response' },
]

const LIMIT_OPTIONS = [20, 50, 100, 200, 500]
const EMPTY_FILTERS = { email_type: '', status: '', email_gateway_ids: '' }

function fmt(s: string) { return (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }
function fmtDate(iso: string) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
}
function fmtTime(iso: string) {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
function fmtDayLabel(day: string) {
    const d = new Date(day + 'T12:00:00Z')
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: '2-digit' })
}

// ─── Scheduled Time Cell (editable, for testing) ───────────────────────────────

function ScheduledTimeCell({ row, onUpdated }: { row: any; onUpdated: (id: string, scheduledAt: string) => void }) {
    const [editing, setEditing] = useState(false)
    const [hour, setHour] = useState(0)
    const [minute, setMinute] = useState(0)
    const [saving, setSaving] = useState(false)

    if (!row.scheduled_at) return <span className="text-gray-300">—</span>

    const startEdit = () => {
        const d = new Date(row.scheduled_at)
        setHour(d.getHours())
        setMinute(d.getMinutes())
        setEditing(true)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const res: any = await updateEmailScheduledTime(row.id, hour, minute)
            const updated = res?.data?.scheduled_at ?? res?.scheduled_at
            if (updated) onUpdated(row.id, updated)
            setEditing(false)
        } catch {
            showAppNotification('error', 'Error', 'Failed to update scheduled time.')
        } finally {
            setSaving(false)
        }
    }

    if (editing) {
        return (
            <div className="flex items-center gap-1">
                <input type="number" min={0} max={23} value={hour}
                    onChange={e => setHour(Math.min(23, Math.max(0, Number(e.target.value))))}
                    className="w-10 border border-gray-300 rounded px-1 py-0.5 text-[10px]" />
                <span className="text-gray-400">:</span>
                <input type="number" min={0} max={59} value={minute}
                    onChange={e => setMinute(Math.min(59, Math.max(0, Number(e.target.value))))}
                    className="w-10 border border-gray-300 rounded px-1 py-0.5 text-[10px]" />
                <button onClick={handleSave} disabled={saving} title="Save" className="text-green-600 hover:text-green-800 disabled:opacity-50">
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                </button>
                <button onClick={() => setEditing(false)} disabled={saving} title="Cancel" className="text-gray-400 hover:text-gray-600">
                    <X size={12} />
                </button>
            </div>
        )
    }

    return (
        <span title={new Date(row.scheduled_at).toLocaleString()} className="inline-flex items-center gap-1 group">
            {fmtDate(row.scheduled_at)} {fmtTime(row.scheduled_at)}
            <button onClick={startEdit} title="Edit time" className="text-gray-300 hover:text-teal-600 opacity-0 group-hover:opacity-100">
                <Pencil size={10} />
            </button>
        </span>
    )
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color = 'text-gray-800' }: { label: string; value: number | string; color?: string }) {
    return (
        <div className="border border-gray-200 rounded p-3 bg-white">
            <div className={`text-xl font-bold ${color}`}>{value}</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{label}</div>
        </div>
    )
}

function ScheduledCell({ count, times, maxPerDay }: { count: number; times: string[]; maxPerDay: number | null }) {
    const [hover, setHover] = useState(false)
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
    const ref = useRef<HTMLTableCellElement>(null)

    if (count === 0) return (
        <td className="px-2 py-1.5 border-r border-gray-100 text-center text-[10px] text-gray-300">—</td>
    )

    const isFull = maxPerDay != null && count >= maxPerDay
    const isNearFull = maxPerDay != null && count >= maxPerDay * 0.8

    const cellBg = isFull ? 'bg-red-50' : isNearFull ? 'bg-orange-50' : 'bg-green-50'
    const textColor = isFull ? 'text-red-700 font-bold' : isNearFull ? 'text-orange-700 font-semibold' : 'text-green-700'
    const sorted = [...times].sort()

    const handleEnter = () => {
        const rect = ref.current?.getBoundingClientRect()
        if (rect) setPos({ top: rect.bottom + 4, left: rect.left + rect.width / 2 })
        setHover(true)
    }

    return (
        <td
            ref={ref}
            className={`px-2 py-1.5 border-r border-gray-100 text-center text-xs relative cursor-default ${cellBg}`}
            onMouseEnter={handleEnter}
            onMouseLeave={() => setHover(false)}
        >
            <span className={textColor}>{count}</span>
            {maxPerDay != null && <span className="text-[9px] text-gray-400 ml-0.5">/{maxPerDay}</span>}
            {hover && pos && createPortal(
                <div
                    className="fixed z-[100] -translate-x-1/2 bg-gray-900 text-white rounded shadow-xl p-2 text-[10px] space-y-0.5 min-w-[80px] max-h-[260px] overflow-y-auto"
                    style={{ top: pos.top, left: pos.left }}
                >
                    {sorted.map((t, i) => <div key={i} className="whitespace-nowrap">{fmtTime(t)}</div>)}
                </div>,
                document.body
            )}
        </td>
    )
}

function StatsTab() {
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [rebalancing, setRebalancing] = useState(false)

    const loadStats = useCallback(() => {
        return getEmailCampaignStats().then((res: any) => {
            const payload = res?.data ?? res
            setStats(payload)
            setLoading(false)
        })
    }, [])

    useEffect(() => { loadStats() }, [loadStats])

    const handleRebalance = async () => {
        setRebalancing(true)
        try {
            await rebalanceEmailQueue()
            await loadStats()
            showAppNotification('success', 'Rebalanced', 'Email queue has been rebalanced.')
        } catch {
            showAppNotification('error', 'Error', 'Failed to rebalance queue.')
        } finally {
            setRebalancing(false)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
            <Loader2 size={16} className="animate-spin" /> Loading stats…
        </div>
    )

    if (!stats) return <div className="text-center py-16 text-gray-400 text-xs">Failed to load stats.</div>

    const queued = (stats.byStatus as any[])?.find(s => s.status === 'email_in_queue')?.count ?? 0
    const sent = (stats.byStatus as any[])?.find(s => s.status === 'email_sent')?.count ?? 0
    const created = (stats.byStatus as any[])?.find(s => s.status === 'email_created')?.count ?? 0

    return (
        <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-2">
                <StatCard label="Total Campaigns" value={stats.total ?? 0} />
                <StatCard label="Created" value={created} color="text-gray-600" />
                <StatCard label="In Queue" value={queued} color="text-yellow-600" />
                <StatCard label="Sent" value={sent} color="text-green-600" />
            </div>

            {/* Breakdowns row */}
            <div className="grid grid-cols-3 gap-3">
                {/* By Status */}
                <div className="border border-gray-200 rounded overflow-hidden">
                    <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-[10px] font-semibold text-gray-600 uppercase tracking-wide">By Status</div>
                    {(stats.byStatus as any[] ?? []).map((row: any) => (
                        <div key={row.status} className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                            <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_BG_MAP[row.status] ?? 'bg-gray-400'}`} />
                                <span className="text-xs text-gray-700">{fmt(row.status)}</span>
                            </div>
                            <span className="text-xs font-semibold text-gray-800">{row.count}</span>
                        </div>
                    ))}
                </div>

                {/* By Type */}
                <div className="border border-gray-200 rounded overflow-hidden">
                    <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-[10px] font-semibold text-gray-600 uppercase tracking-wide">By Type</div>
                    {(stats.byType as any[] ?? []).map((row: any) => (
                        <div key={row.email_type} className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${TYPE_COLORS[row.email_type] ?? 'bg-gray-100 text-gray-600'}`}>
                                {fmt(row.email_type)}
                            </span>
                            <span className="text-xs font-semibold text-gray-800">{row.count}</span>
                        </div>
                    ))}
                </div>

                {/* By Gateway */}
                <div className="border border-gray-200 rounded overflow-hidden">
                    <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-[10px] font-semibold text-gray-600 uppercase tracking-wide">By Gateway</div>
                    {(stats.byGateway as any[] ?? []).map((row: any) => (
                        <div key={row.gateway_id} className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-700">
                                    {row.gateway ? row.gateway.label : <span className="italic text-gray-400">No gateway</span>}
                                </span>
                                {row.gateway?.email && <span className="text-[10px] text-gray-400">{row.gateway.email}</span>}
                                {row.gateway?.max_emails_per_day != null && (
                                    <span className="text-[9px] text-indigo-500">Max {row.gateway.max_emails_per_day}/day</span>
                                )}
                            </div>
                            <span className="text-xs font-semibold text-gray-800">{row.count}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Scheduled days table */}
            {(stats.scheduledDays as any[] ?? []).length > 0 && (() => {
                const days: any[] = stats.scheduledDays
                // Collect all unique gateway IDs that appear in any day
                const gwIdSet = new Set<string>()
                for (const d of days) Object.keys(d.byGateway || {}).forEach(id => gwIdSet.add(id))
                const gwIds = [...gwIdSet]
                const realGwIds = gwIds.filter(id => id !== 'none')
                const hasNone = gwIds.includes('none')

                // Build gateway info lookup from byGateway stats
                const gwInfoMap = new Map<string, any>()
                for (const row of (stats.byGateway as any[] ?? [])) {
                    if (row.gateway) gwInfoMap.set(row.gateway_id, row.gateway)
                }

                return (
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                                <Wifi size={11} /> Scheduled Queue — hover cells to see send times
                            </div>
                            <button
                                onClick={handleRebalance}
                                disabled={rebalancing}
                                title="Re-distribute queued emails so no day exceeds each gateway's daily limit"
                                className="flex items-center gap-1 text-[10px] border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50 text-gray-600"
                            >
                                {rebalancing
                                    ? <><Loader2 size={10} className="animate-spin" /> Rebalancing…</>
                                    : <><RefreshCw size={10} /> Rebalance Queue</>}
                            </button>
                        </div>
                        <div className="border border-gray-200 rounded overflow-x-auto">
                            <table className="text-xs border-collapse w-full">
                                <thead>
                                    <tr className="bg-gray-100 border-b border-gray-200">
                                        <th className="px-3 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Day</th>
                                        {realGwIds.map(gwId => {
                                            const gw = gwInfoMap.get(gwId)
                                            return (
                                                <th key={gwId} className="px-2 py-1.5 text-center font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">
                                                    <div>{gw?.label ?? 'Gateway'}</div>
                                                    {gw?.max_emails_per_day != null && (
                                                        <div className="text-[9px] text-indigo-500 font-normal">max {gw.max_emails_per_day}/day</div>
                                                    )}
                                                </th>
                                            )
                                        })}
                                        {hasNone && (
                                            <th className="px-2 py-1.5 text-center font-medium text-gray-500 border-r border-gray-200 whitespace-nowrap italic">
                                                No Gateway
                                            </th>
                                        )}
                                        <th className="px-2 py-1.5 text-center font-medium text-gray-600 whitespace-nowrap">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {days.map((entry: any) => (
                                        <tr key={entry.day} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                                            <td className="px-3 py-1.5 border-r border-gray-100 whitespace-nowrap text-gray-700 font-medium">
                                                {fmtDayLabel(entry.day)}
                                            </td>
                                            {realGwIds.map(gwId => {
                                                const gw = gwInfoMap.get(gwId)
                                                const cell = entry.byGateway?.[gwId]
                                                return (
                                                    <ScheduledCell
                                                        key={gwId}
                                                        count={cell?.count ?? 0}
                                                        times={cell?.times ?? []}
                                                        maxPerDay={gw?.max_emails_per_day ?? null}
                                                    />
                                                )
                                            })}
                                            {hasNone && (() => {
                                                const cell = entry.byGateway?.['none']
                                                return <ScheduledCell count={cell?.count ?? 0} times={cell?.times ?? []} maxPerDay={null} />
                                            })()}
                                            <td className="px-2 py-1.5 text-center font-semibold text-gray-700">{entry.total}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                            <span className="inline-block w-2 h-2 rounded bg-red-100 border border-red-300 mr-1" />At capacity &nbsp;
                            <span className="inline-block w-2 h-2 rounded bg-orange-100 border border-orange-300 mr-1 ml-2" />Near capacity (&ge;80%) &nbsp;
                            <span className="inline-block w-2 h-2 rounded bg-green-100 border border-green-300 mr-1 ml-2" />Available
                        </p>
                    </div>
                )
            })()}
        </div>
    )
}

// ─── Emails Tab ───────────────────────────────────────────────────────────────

function EmailsTab({ gateways }: { gateways: any[] }) {
    const [data, setData] = useState<any[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(20)
    const [totalPages, setTotalPages] = useState(1)
    const [loading, setLoading] = useState(false)

    const [filters, setFilters] = useState({ ...EMPTY_FILTERS })
    const [appliedFilters, setAppliedFilters] = useState({ ...EMPTY_FILTERS })
    const [showTypeDd, setShowTypeDd] = useState(false)
    const [showStatusDd, setShowStatusDd] = useState(false)
    const [showGatewayDd, setShowGatewayDd] = useState(false)

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [queuingIds, setQueuingIds] = useState<Set<string>>(new Set())
    const [selectedEmail, setSelectedEmail] = useState<any>(null)
    const [conversation, setConversation] = useState<any[] | null>(null)
    const [checkingReplies, setCheckingReplies] = useState(false)

    const gatewayMap = new Map(gateways.map(g => [g.id, g]))

    const load = useCallback(async (pg: number, lim: number, af: typeof EMPTY_FILTERS) => {
        setLoading(true)
        const res: any = await getAllEmailCampaigns({ ...af, page: pg, limit: lim })
        const payload = res?.data ?? res
        setData(Array.isArray(payload?.data) ? payload.data : [])
        setTotal(payload?.total ?? 0)
        setTotalPages(payload?.totalPages ?? 1)
        setLoading(false)
    }, [])

    useEffect(() => { load(page, limit, appliedFilters) }, [page, limit, appliedFilters, load])

    const applyFilters = () => { setPage(1); setAppliedFilters({ ...filters }) }
    const clearFilters = () => { const e = { ...EMPTY_FILTERS }; setFilters(e); setAppliedFilters(e); setPage(1) }

    const toggleMulti = (field: keyof typeof filters, value: string) => {
        const current = (filters[field] ?? '').split(',').filter(Boolean)
        const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
        setFilters(f => ({ ...f, [field]: next.join(',') }))
    }

    const allSelected = data.length > 0 && data.every(r => selectedIds.has(r.id))
    const someSelected = data.some(r => selectedIds.has(r.id))

    const handleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(prev => { const next = new Set(prev); data.forEach(r => next.delete(r.id)); return next })
        } else {
            setSelectedIds(prev => { const next = new Set(prev); data.forEach(r => next.add(r.id)); return next })
        }
    }

    const handleCheckReplies = async () => {
        setCheckingReplies(true)
        try {
            const res: any = await checkEmailReplies()
            const payload = res?.data ?? res
            const replied = payload?.replied ?? 0
            const checked = payload?.checked ?? 0
            showAppNotification('success', 'Checked Replies', `${replied} of ${checked} sent email${checked !== 1 ? 's' : ''} have replies.`)
            load(page, limit, appliedFilters)
        } catch {
            showAppNotification('error', 'Error', 'Failed to check replies.')
        } finally {
            setCheckingReplies(false)
        }
    }

    const handlePutInQueue = async () => {
        const ids = [...selectedIds]
        if (!ids.length) return
        setQueuingIds(new Set(ids))
        try {
            const res: any = await queueEmailBatch(ids)
            const queued = res?.data?.queued ?? res?.queued ?? ids.length
            showAppNotification('success', 'Queued', `${queued} email${queued !== 1 ? 's' : ''} scheduled.`)
            setSelectedIds(new Set())
            load(page, limit, appliedFilters)
        } catch {
            showAppNotification('error', 'Error', 'Failed to queue emails.')
        } finally {
            setQueuingIds(new Set())
        }
    }

    return (
        <div>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                    {selectedIds.size > 0 && (
                        <>
                            <span className="text-xs text-gray-500">{selectedIds.size} selected</span>
                            <button
                                onClick={handlePutInQueue}
                                disabled={queuingIds.size > 0}
                                className="flex items-center gap-1 text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700 disabled:opacity-50"
                            >
                                {queuingIds.size > 0
                                    ? <><Loader2 size={11} className="animate-spin" /> Queuing…</>
                                    : <><ListChecks size={11} /> Put in Queue</>}
                            </button>
                            <button onClick={() => setSelectedIds(new Set())}
                                className="text-xs text-gray-400 hover:text-gray-600 underline">Clear</button>
                        </>
                    )}
                    <button
                        onClick={handleCheckReplies}
                        disabled={checkingReplies}
                        className="flex items-center gap-1 text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 disabled:opacity-50"
                    >
                        {checkingReplies
                            ? <><Loader2 size={11} className="animate-spin" /> Checking…</>
                            : <><MessageSquare size={11} /> Check Replies</>}
                    </button>
                </div>
                <span className="text-[10px] text-gray-400">{total} total</span>
            </div>

            {/* Filter bar */}
            <div className="border border-gray-200 rounded p-2 mb-2 bg-gray-50">
                <div className="flex items-end gap-1.5 flex-wrap">
                    {/* Email Type */}
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Type</label>
                        <div className="relative">
                            <button onClick={() => setShowTypeDd(p => !p)}
                                className="flex items-center gap-1 border border-gray-300 rounded px-2 py-1 text-xs bg-white hover:bg-gray-50 text-gray-700 min-w-[110px]">
                                Type{filters.email_type ? ` (${filters.email_type.split(',').length})` : ''}
                                <ChevronDown size={11} className="ml-auto text-gray-400" />
                            </button>
                            {showTypeDd && (
                                <div className="absolute z-20 top-full mt-1 left-0 bg-white border border-gray-200 rounded shadow-lg p-2 space-y-1 min-w-[180px]">
                                    {EMAIL_TYPES.map(opt => (
                                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                                            <input type="checkbox"
                                                checked={(filters.email_type ?? '').split(',').filter(Boolean).includes(opt.value)}
                                                onChange={() => toggleMulti('email_type', opt.value)} className="w-3 h-3" />
                                            <span className="text-xs text-gray-700">{opt.label}</span>
                                        </label>
                                    ))}
                                    <div className="border-t border-gray-100 pt-1 mt-1">
                                        <button onClick={() => { setFilters(f => ({ ...f, email_type: '' })); setShowTypeDd(false) }}
                                            className="text-[10px] text-gray-400 hover:text-gray-700 w-full text-left">Clear</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status */}
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Status</label>
                        <div className="relative">
                            <button onClick={() => setShowStatusDd(p => !p)}
                                className="flex items-center gap-1 border border-gray-300 rounded px-2 py-1 text-xs bg-white hover:bg-gray-50 text-gray-700 min-w-[110px]">
                                Status{filters.status ? ` (${filters.status.split(',').length})` : ''}
                                <ChevronDown size={11} className="ml-auto text-gray-400" />
                            </button>
                            {showStatusDd && (
                                <div className="absolute z-20 top-full mt-1 left-0 bg-white border border-gray-200 rounded shadow-lg p-2 space-y-1 min-w-[180px]">
                                    {EMAIL_STATUSES.map(opt => (
                                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                                            <input type="checkbox"
                                                checked={(filters.status ?? '').split(',').filter(Boolean).includes(opt.value)}
                                                onChange={() => toggleMulti('status', opt.value)} className="w-3 h-3" />
                                            <span className="text-xs text-gray-700">{opt.label}</span>
                                        </label>
                                    ))}
                                    <div className="border-t border-gray-100 pt-1 mt-1">
                                        <button onClick={() => { setFilters(f => ({ ...f, status: '' })); setShowStatusDd(false) }}
                                            className="text-[10px] text-gray-400 hover:text-gray-700 w-full text-left">Clear</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Gateway */}
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Gateway</label>
                        <div className="relative">
                            <button onClick={() => setShowGatewayDd(p => !p)}
                                className="flex items-center gap-1 border border-gray-300 rounded px-2 py-1 text-xs bg-white hover:bg-gray-50 text-gray-700 min-w-[110px]">
                                Gateway{filters.email_gateway_ids ? ` (${filters.email_gateway_ids.split(',').length})` : ''}
                                <ChevronDown size={11} className="ml-auto text-gray-400" />
                            </button>
                            {showGatewayDd && (
                                <div className="absolute z-20 top-full mt-1 left-0 bg-white border border-gray-200 rounded shadow-lg p-2 space-y-1 min-w-[180px]">
                                    <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                                        <input type="checkbox"
                                            checked={(filters.email_gateway_ids ?? '').split(',').filter(Boolean).includes('none')}
                                            onChange={() => toggleMulti('email_gateway_ids', 'none')} className="w-3 h-3" />
                                        <span className="text-xs text-gray-500 italic">No Gateway</span>
                                    </label>
                                    {gateways.map(gw => (
                                        <label key={gw.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                                            <input type="checkbox"
                                                checked={(filters.email_gateway_ids ?? '').split(',').filter(Boolean).includes(gw.id)}
                                                onChange={() => toggleMulti('email_gateway_ids', gw.id)} className="w-3 h-3" />
                                            <span className="text-xs text-gray-700">{gw.label}</span>
                                        </label>
                                    ))}
                                    <div className="border-t border-gray-100 pt-1 mt-1">
                                        <button onClick={() => { setFilters(f => ({ ...f, email_gateway_ids: '' })); setShowGatewayDd(false) }}
                                            className="text-[10px] text-gray-400 hover:text-gray-700 w-full text-left">Clear</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <button onClick={applyFilters} className="px-3 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 mt-auto">Filter</button>
                    <button onClick={clearFilters} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-white mt-auto">Clear</button>

                    <div className="flex flex-col gap-0.5 ml-auto">
                        <label className="text-[10px] text-gray-400 uppercase">Per page</label>
                        <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1) }}
                            className="border border-gray-300 rounded px-1.5 py-1 text-xs bg-white focus:outline-none">
                            {LIMIT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="border border-gray-200 rounded overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-300">
                            <th className="w-6 px-1 py-1.5 border-r border-gray-200 text-center">
                                <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                                    onChange={handleSelectAll} className="w-3 h-3 cursor-pointer" />
                            </th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-500 border-r border-gray-200 w-6">#</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Professional</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">To</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Gateway</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Type</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Status</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Subject</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Reply</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Scheduled</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Date</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 w-8"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan={12} className="text-center py-8 text-gray-400">
                                <div className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div>
                            </td></tr>
                        )}
                        {!loading && data.length === 0 && (
                            <tr><td colSpan={12} className="text-center py-8 text-gray-400">No email campaigns found.</td></tr>
                        )}
                        {!loading && data.map((row, idx) => {
                            const pro = row.professional
                            const toEmail = Array.isArray(pro?.emails) && pro.emails[0]?.email ? pro.emails[0].email : null
                            const gw = pro?.email_gateway_id ? gatewayMap.get(pro.email_gateway_id) : null
                            const rowNum = (page - 1) * limit + idx + 1
                            const isSelected = selectedIds.has(row.id)
                            return (
                                <tr key={row.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isSelected ? 'bg-yellow-50' : ''}`}>
                                    <td className="px-1 py-1.5 border-r border-gray-100 text-center">
                                        <input type="checkbox" checked={isSelected}
                                            onChange={() => setSelectedIds(prev => { const next = new Set(prev); isSelected ? next.delete(row.id) : next.add(row.id); return next })}
                                            className="w-3 h-3 cursor-pointer" />
                                    </td>
                                    <td className="px-2 py-1.5 text-gray-400 border-r border-gray-100">{rowNum}</td>
                                    <td className="px-2 py-1.5 border-r border-gray-100 font-medium text-gray-800 whitespace-nowrap">
                                        {pro ? `${pro.first_name} ${pro.last_name}` : <span className="text-gray-400">—</span>}
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100 text-gray-600 text-[10px]">
                                        {toEmail ?? <span className="text-gray-400">—</span>}
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100">
                                        {gw ? (
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-medium text-gray-700">{gw.label}</span>
                                                {gw.email && <span className="text-[10px] text-gray-400">{gw.email}</span>}
                                            </div>
                                        ) : <span className="text-gray-400 text-[10px]">—</span>}
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100">
                                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide whitespace-nowrap ${TYPE_COLORS[row.email_type] ?? 'bg-gray-100 text-gray-600'}`}>
                                            {fmt(row.email_type)}
                                        </span>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100">
                                        <span className="inline-flex items-center gap-1">
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap ${STATUS_COLORS[row.status] ?? 'bg-gray-100 text-gray-500'}`}>
                                                {fmt(row.status)}
                                            </span>
                                            {row.status === 'email_failed' && (
                                                <span title={row.error_message || 'Email failed to send.'} className="shrink-0 inline-flex">
                                                    <AlertTriangle size={11} className="text-red-500" />
                                                </span>
                                            )}
                                        </span>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100 max-w-[200px] truncate text-gray-700">{row.subject}</td>
                                    <td className="px-2 py-1.5 border-r border-gray-100 max-w-[180px]">
                                        {row.status === 'email_replied' ? (
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] text-purple-700 truncate" title={row.reply_snippet || ''}>
                                                    {row.reply_snippet || 'Replied'}
                                                </span>
                                                {Array.isArray(row.conversation) && row.conversation.length > 0 && (
                                                    <button onClick={() => setConversation(row.conversation)}
                                                        title="View conversation" className="text-purple-500 hover:text-purple-700 shrink-0">
                                                        <MessageCircle size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        ) : <span className="text-gray-300 text-[10px]">—</span>}
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100 text-[10px] text-gray-500 whitespace-nowrap">
                                        <ScheduledTimeCell
                                            row={row}
                                            onUpdated={(id, scheduledAt) => setData(prev => prev.map(r => r.id === id ? { ...r, scheduled_at: scheduledAt } : r))}
                                        />
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100 text-gray-400 whitespace-nowrap">{fmtDate(row.createdAt)}</td>
                                    <td className="px-2 py-1.5">
                                        <button onClick={() => setSelectedEmail({ row, pro, gw, toEmail })}
                                            title="View email" className="text-gray-400 hover:text-teal-600">
                                            <Mail size={12} />
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-gray-400">Page {page} of {totalPages} · {total} records</span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-0.5 text-[10px] border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">«</button>
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-0.5 text-[10px] border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">‹</button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pg = Math.max(1, Math.min(page - 2 + i, totalPages - 4 + i))
                            return pg <= totalPages ? (
                                <button key={pg} onClick={() => setPage(pg)}
                                    className={`px-2 py-0.5 text-[10px] border rounded ${pg === page ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-300 hover:bg-gray-50'}`}>
                                    {pg}
                                </button>
                            ) : null
                        })}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-0.5 text-[10px] border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">›</button>
                        <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-0.5 text-[10px] border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">»</button>
                    </div>
                </div>
            )}

            {selectedEmail && (
                <EmailDetailModal
                    email={selectedEmail.row}
                    toEmail={selectedEmail.toEmail || undefined}
                    fromEmail={selectedEmail.gw?.email || undefined}
                    professionalName={selectedEmail.pro ? `${selectedEmail.pro.first_name} ${selectedEmail.pro.last_name}` : undefined}
                    onClose={() => setSelectedEmail(null)}
                />
            )}

            {conversation && (
                <ConversationModal messages={conversation} onClose={() => setConversation(null)} />
            )}
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EmailCampaignsPage() {
    const [tab, setTab] = useState<'stats' | 'emails'>('stats')
    const [gateways, setGateways] = useState<any[]>([])

    useEffect(() => {
        getAllGmailGateways().then((res: any) => {
            const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
            setGateways(list)
        })
    }, [])

    return (
        <div className="p-3 bg-white min-h-screen">
            {/* Header + Tabs */}
            <div className="flex items-center gap-4 mb-3 border-b border-gray-200 pb-2">
                <div className="flex items-center gap-2">
                    <Mail size={14} className="text-gray-500" />
                    <h1 className="text-sm font-semibold text-gray-800">Email Campaigns</h1>
                </div>
                <div className="flex items-center gap-0.5 ml-2">
                    <button
                        onClick={() => setTab('stats')}
                        className={`flex items-center gap-1 px-3 py-1 text-xs rounded-t font-medium transition-colors ${tab === 'stats' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
                    >
                        <BarChart2 size={11} /> Stats
                    </button>
                    <button
                        onClick={() => setTab('emails')}
                        className={`flex items-center gap-1 px-3 py-1 text-xs rounded-t font-medium transition-colors ${tab === 'emails' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
                    >
                        <ListChecks size={11} /> Emails
                    </button>
                </div>
            </div>

            {tab === 'stats' && <StatsTab />}
            {tab === 'emails' && <EmailsTab gateways={gateways} />}
        </div>
    )
}
