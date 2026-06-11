'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, ChevronDown, Loader2, AlertTriangle, MessageCircle, RefreshCw, Eye } from 'lucide-react'
import { getAllNotifications } from '@/app/api_handlers/api/email-notifications.api'
import NotificationDetailModal from './NotificationDetailModal'

const TYPE_COLORS: Record<string, string> = {
    courtesy_email: 'bg-blue-100 text-blue-700',
    mercor_platform_join: 'bg-violet-100 text-violet-700',
    micro1_platform_join: 'bg-sky-100 text-sky-800',
    aligner_platform_join: 'bg-teal-100 text-teal-700',
    outlier_platform_join: 'bg-orange-100 text-orange-700',
    mercor_job: 'bg-violet-200 text-violet-800',
    aligner_job: 'bg-teal-200 text-teal-800',
}

const NOTIFICATION_TYPES = [
    { value: 'email_failed', label: 'Email Failed' },
    { value: 'email_replied', label: 'Email Replied' },
]

const EMAIL_TYPES = [
    { value: 'courtesy_email', label: 'Courtesy Email' },
    { value: 'mercor_platform_join', label: 'Mercor Invite' },
    { value: 'micro1_platform_join', label: 'Micro1 Invite' },
    { value: 'aligner_platform_join', label: 'Aligner Invite' },
    { value: 'outlier_platform_join', label: 'Outlier Invite' },
    { value: 'mercor_job', label: 'Mercor Job' },
    { value: 'aligner_job', label: 'Aligner Job' },
]

const LIMIT_OPTIONS = [50, 100, 200, 500]
const EMPTY_FILTERS = { type: '', email_type: '' }

function fmt(s: string) { return (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }
function fmtDate(iso: string) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function NotificationsPage() {
    const [data, setData] = useState<any[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(100)
    const [totalPages, setTotalPages] = useState(1)
    const [loading, setLoading] = useState(false)
    const [selected, setSelected] = useState<any>(null)

    const [filters, setFilters] = useState({ ...EMPTY_FILTERS })
    const [appliedFilters, setAppliedFilters] = useState({ ...EMPTY_FILTERS })
    const [showTypeDd, setShowTypeDd] = useState(false)
    const [showEmailTypeDd, setShowEmailTypeDd] = useState(false)

    const load = useCallback(async (pg: number, lim: number, af: typeof EMPTY_FILTERS) => {
        setLoading(true)
        try {
            const res: any = await getAllNotifications({ ...af, page: pg, limit: lim })
            const payload = res?.data ?? res
            setData(Array.isArray(payload?.data) ? payload.data : [])
            setTotal(payload?.total ?? 0)
            setTotalPages(payload?.totalPages ?? 1)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load(page, limit, appliedFilters) }, [page, limit, appliedFilters, load])

    const applyFilters = () => { setPage(1); setAppliedFilters({ ...filters }) }
    const clearFilters = () => { const e = { ...EMPTY_FILTERS }; setFilters(e); setAppliedFilters(e); setPage(1) }

    const toggleMulti = (field: keyof typeof filters, value: string) => {
        const current = (filters[field] ?? '').split(',').filter(Boolean)
        const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
        setFilters(f => ({ ...f, [field]: next.join(',') }))
    }

    return (
        <div className="p-3 bg-white min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-2">
                <div className="flex items-center gap-2">
                    <Bell size={14} className="text-gray-500" />
                    <h1 className="text-sm font-semibold text-gray-800">Notifications</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => load(page, limit, appliedFilters)} disabled={loading}
                        className="flex items-center gap-1 text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50 text-gray-600">
                        <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <span className="text-[10px] text-gray-400">{total} total</span>
                </div>
            </div>

            {/* Filter bar */}
            <div className="border border-gray-200 rounded p-2 mb-2 bg-gray-50">
                <div className="flex items-end gap-1.5 flex-wrap">
                    {/* Notification Type */}
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Notification Type</label>
                        <div className="relative">
                            <button onClick={() => setShowTypeDd(p => !p)}
                                className="flex items-center gap-1 border border-gray-300 rounded px-2 py-1 text-xs bg-white hover:bg-gray-50 text-gray-700 min-w-[140px]">
                                Type{filters.type ? ` (${filters.type.split(',').length})` : ''}
                                <ChevronDown size={11} className="ml-auto text-gray-400" />
                            </button>
                            {showTypeDd && (
                                <div className="absolute z-20 top-full mt-1 left-0 bg-white border border-gray-200 rounded shadow-lg p-2 space-y-1 min-w-[180px]">
                                    {NOTIFICATION_TYPES.map(opt => (
                                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                                            <input type="checkbox"
                                                checked={(filters.type ?? '').split(',').filter(Boolean).includes(opt.value)}
                                                onChange={() => toggleMulti('type', opt.value)} className="w-3 h-3" />
                                            <span className="text-xs text-gray-700">{opt.label}</span>
                                        </label>
                                    ))}
                                    <div className="border-t border-gray-100 pt-1 mt-1">
                                        <button onClick={() => { setFilters(f => ({ ...f, type: '' })); setShowTypeDd(false) }}
                                            className="text-[10px] text-gray-400 hover:text-gray-700 w-full text-left">Clear</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Email Type */}
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Email Type</label>
                        <div className="relative">
                            <button onClick={() => setShowEmailTypeDd(p => !p)}
                                className="flex items-center gap-1 border border-gray-300 rounded px-2 py-1 text-xs bg-white hover:bg-gray-50 text-gray-700 min-w-[140px]">
                                Email Type{filters.email_type ? ` (${filters.email_type.split(',').length})` : ''}
                                <ChevronDown size={11} className="ml-auto text-gray-400" />
                            </button>
                            {showEmailTypeDd && (
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
                                        <button onClick={() => { setFilters(f => ({ ...f, email_type: '' })); setShowEmailTypeDd(false) }}
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
                            <th className="px-2 py-1.5 text-left font-medium text-gray-500 border-r border-gray-200 w-6">#</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Type</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Email Type</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Title</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Message</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Date</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 w-8"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan={7} className="text-center py-8 text-gray-400">
                                <div className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div>
                            </td></tr>
                        )}
                        {!loading && data.length === 0 && (
                            <tr><td colSpan={7} className="text-center py-8 text-gray-400">No notifications found.</td></tr>
                        )}
                        {!loading && data.map((row, idx) => {
                            const rowNum = (page - 1) * limit + idx + 1
                            const isFailed = row.type === 'email_failed'
                            return (
                                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-2 py-1.5 text-gray-400 border-r border-gray-100">{rowNum}</td>
                                    <td className="px-2 py-1.5 border-r border-gray-100">
                                        <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap ${isFailed ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {isFailed ? <AlertTriangle size={10} /> : <MessageCircle size={10} />}
                                            {fmt(row.type)}
                                        </span>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100">
                                        {row.email_type ? (
                                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide whitespace-nowrap ${TYPE_COLORS[row.email_type] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {fmt(row.email_type)}
                                            </span>
                                        ) : <span className="text-gray-300">—</span>}
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100 font-medium text-gray-800 max-w-[180px] truncate">{row.title}</td>
                                    <td className="px-2 py-1.5 border-r border-gray-100 text-gray-600 max-w-[320px] truncate">{row.message}</td>
                                    <td className="px-2 py-1.5 border-r border-gray-100 text-gray-400 whitespace-nowrap">{fmtDate(row.createdAt)}</td>
                                    <td className="px-2 py-1.5">
                                        <button onClick={() => setSelected(row)} title="View details" className="text-gray-400 hover:text-teal-600">
                                            <Eye size={12} />
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

            {selected && <NotificationDetailModal notification={selected} onClose={() => setSelected(null)} />}
        </div>
    )
}
