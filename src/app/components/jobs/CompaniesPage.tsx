'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw, Pencil, Trash2, ExternalLink, ChevronDown, Search, Building2, BriefcaseBusiness } from 'lucide-react'
import { getAllCompanies, getDistinctCompanyValues, deleteCompany } from '@/app/api_handlers/api/sponsored-companies.api'
import CompanyFormModal from './CompanyFormModal'
import CompanyJsonPanel from './CompanyJsonPanel'
import CompanyJobsModal from './CompanyJobsModal'

const LIMIT_OPTIONS = [25, 50, 100, 200]
const EMPTY_FILTERS = { sponsor_type: '', sponsor_route: '', is_deleted: 'false', visa_mentioned: '', keyword: '', has_website: '', has_career_page: '' }

function Badge({ value, on, off }: { value: boolean; on: string; off: string }) {
    return (
        <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded font-medium ${value ? on : off}`}>
            {value ? 'Yes' : 'No'}
        </span>
    )
}

export default function CompaniesPage() {
    const [data, setData] = useState<any[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(50)
    const [totalPages, setTotalPages] = useState(1)
    const [loading, setLoading] = useState(false)

    const [filters, setFilters] = useState({ ...EMPTY_FILTERS })
    const [applied, setApplied] = useState({ ...EMPTY_FILTERS })

    const [sponsorTypes, setSponsorTypes] = useState<string[]>([])
    const [sponsorRoutes, setSponsorRoutes] = useState<string[]>([])

    const [showTypeDd, setShowTypeDd] = useState(false)
    const [showRouteDd, setShowRouteDd] = useState(false)

    const [editing, setEditing] = useState<any | null>(null)
    const [adding, setAdding] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [addingJobsFor, setAddingJobsFor] = useState<any | null>(null)

    const load = useCallback(async (pg: number, lim: number, af: typeof EMPTY_FILTERS) => {
        setLoading(true)
        try {
            const q: any = { page: pg, limit: lim }
            if (af.sponsor_type) q.sponsor_type = af.sponsor_type
            if (af.sponsor_route) q.sponsor_route = af.sponsor_route
            if (af.is_deleted !== '') q.is_deleted = af.is_deleted
            if (af.visa_mentioned !== '') q.visa_mentioned = af.visa_mentioned
            if (af.keyword) q.keyword = af.keyword
            if (af.has_website !== '') q.has_website = af.has_website
            if (af.has_career_page !== '') q.has_career_page = af.has_career_page
            const res: any = await getAllCompanies(q)
            const payload = res?.data ?? res
            setData(Array.isArray(payload?.data) ? payload.data : [])
            setTotal(payload?.total ?? 0)
            setTotalPages(payload?.totalPages ?? 1)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load(page, limit, applied) }, [page, limit, applied, load])

    useEffect(() => {
        getDistinctCompanyValues().then((res: any) => {
            const p = res?.data ?? res
            setSponsorTypes(p?.sponsor_types ?? [])
            setSponsorRoutes(p?.sponsor_routes ?? [])
        }).catch(() => { })
    }, [])

    const applyFilters = () => { setPage(1); setApplied({ ...filters }) }
    const clearFilters = () => { const e = { ...EMPTY_FILTERS }; setFilters(e); setApplied(e); setPage(1) }

    const toggleMulti = (field: 'sponsor_type' | 'sponsor_route', value: string) => {
        const current = (filters[field] ?? '').split(',').filter(Boolean)
        const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
        setFilters(f => ({ ...f, [field]: next.join(',') }))
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this company?')) return
        setDeleting(id)
        try { await deleteCompany(id); load(page, limit, applied) }
        finally { setDeleting(null) }
    }

    const refresh = () => load(page, limit, applied)

    return (
        <div className="p-3 bg-white min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-2">
                <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-gray-500" />
                    <h1 className="text-sm font-semibold text-gray-800">Sponsored Companies</h1>
                    <span className="text-[10px] text-gray-400">{total} total</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={refresh} disabled={loading} className="flex items-center gap-1 text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50 text-gray-600">
                        <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs bg-gray-800 text-white rounded px-3 py-1 hover:bg-gray-700">
                        <Plus size={12} /> Add Company
                    </button>
                </div>
            </div>

            {/* JSON Upload Panel */}
            <CompanyJsonPanel onDone={refresh} />

            {/* Filter bar */}
            <div className="border border-gray-200 rounded p-2 mb-2 bg-gray-50">
                <div className="flex items-end gap-1.5 flex-wrap">
                    {/* Keyword */}
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Search</label>
                        <div className="relative">
                            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                className="border border-gray-300 rounded pl-6 pr-2 py-1 text-xs bg-white focus:outline-none w-44"
                                placeholder="Name, website, career page…"
                                value={filters.keyword}
                                onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && applyFilters()}
                            />
                        </div>
                    </div>

                    {/* Sponsor Type */}
                    <div className="flex flex-col gap-0.5 relative">
                        <label className="text-[10px] text-gray-400 uppercase">Sponsor Type</label>
                        <button onClick={() => { setShowTypeDd(p => !p); setShowRouteDd(false) }}
                            className="flex items-center gap-1 border border-gray-300 rounded px-2 py-1 text-xs bg-white hover:bg-gray-50 text-gray-700 min-w-[140px]">
                            Type{filters.sponsor_type ? ` (${filters.sponsor_type.split(',').length})` : ''}
                            <ChevronDown size={11} className="ml-auto text-gray-400" />
                        </button>
                        {showTypeDd && (
                            <div className="absolute z-20 top-full mt-1 left-0 bg-white border border-gray-200 rounded shadow-lg p-2 space-y-1 min-w-[220px] max-h-60 overflow-y-auto">
                                {sponsorTypes.length === 0 && <p className="text-[10px] text-gray-400">No values yet</p>}
                                {sponsorTypes.map(t => (
                                    <label key={t} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                                        <input type="checkbox"
                                            checked={filters.sponsor_type.split(',').filter(Boolean).includes(t)}
                                            onChange={() => toggleMulti('sponsor_type', t)} className="w-3 h-3" />
                                        <span className="text-xs text-gray-700">{t}</span>
                                    </label>
                                ))}
                                <div className="border-t border-gray-100 pt-1">
                                    <button onClick={() => { setFilters(f => ({ ...f, sponsor_type: '' })); setShowTypeDd(false) }}
                                        className="text-[10px] text-gray-400 hover:text-gray-700 w-full text-left">Clear</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sponsor Route */}
                    <div className="flex flex-col gap-0.5 relative">
                        <label className="text-[10px] text-gray-400 uppercase">Sponsor Route</label>
                        <button onClick={() => { setShowRouteDd(p => !p); setShowTypeDd(false) }}
                            className="flex items-center gap-1 border border-gray-300 rounded px-2 py-1 text-xs bg-white hover:bg-gray-50 text-gray-700 min-w-[140px]">
                            Route{filters.sponsor_route ? ` (${filters.sponsor_route.split(',').length})` : ''}
                            <ChevronDown size={11} className="ml-auto text-gray-400" />
                        </button>
                        {showRouteDd && (
                            <div className="absolute z-20 top-full mt-1 left-0 bg-white border border-gray-200 rounded shadow-lg p-2 space-y-1 min-w-[200px] max-h-60 overflow-y-auto">
                                {sponsorRoutes.length === 0 && <p className="text-[10px] text-gray-400">No values yet</p>}
                                {sponsorRoutes.map(r => (
                                    <label key={r} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                                        <input type="checkbox"
                                            checked={filters.sponsor_route.split(',').filter(Boolean).includes(r)}
                                            onChange={() => toggleMulti('sponsor_route', r)} className="w-3 h-3" />
                                        <span className="text-xs text-gray-700">{r}</span>
                                    </label>
                                ))}
                                <div className="border-t border-gray-100 pt-1">
                                    <button onClick={() => { setFilters(f => ({ ...f, sponsor_route: '' })); setShowRouteDd(false) }}
                                        className="text-[10px] text-gray-400 hover:text-gray-700 w-full text-left">Clear</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Is Deleted */}
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Is Deleted</label>
                        <select value={filters.is_deleted} onChange={e => setFilters(f => ({ ...f, is_deleted: e.target.value }))}
                            className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none">
                            <option value="">All</option>
                            <option value="false">Active</option>
                            <option value="true">Deleted</option>
                        </select>
                    </div>

                    {/* Visa Mentioned */}
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Visa Mentioned</label>
                        <select value={filters.visa_mentioned} onChange={e => setFilters(f => ({ ...f, visa_mentioned: e.target.value }))}
                            className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none">
                            <option value="">All</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>

                    {/* Has Domain */}
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Domain Found</label>
                        <select value={filters.has_website} onChange={e => setFilters(f => ({ ...f, has_website: e.target.value }))}
                            className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none">
                            <option value="">All</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>

                    {/* Has Career Page */}
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Career Page Found</label>
                        <select value={filters.has_career_page} onChange={e => setFilters(f => ({ ...f, has_career_page: e.target.value }))}
                            className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none">
                            <option value="">All</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
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
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Organisation</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">City</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Sponsor Type</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Route</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Links</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Deleted</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Visa</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 w-14"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan={9} className="text-center py-10 text-gray-400">
                                <div className="flex items-center justify-center gap-2"><RefreshCw size={13} className="animate-spin" /> Loading…</div>
                            </td></tr>
                        )}
                        {!loading && data.length === 0 && (
                            <tr><td colSpan={9} className="text-center py-10 text-gray-400">No companies found.</td></tr>
                        )}
                        {!loading && data.map((row, idx) => {
                            const rowNum = (page - 1) * limit + idx + 1
                            return (
                                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-2 py-1.5 text-gray-400 border-r border-gray-100">{rowNum}</td>
                                    <td className="px-2 py-1.5 border-r border-gray-100">
                                        <div className="font-medium text-gray-800 max-w-[200px] truncate">{row.organisation_name}</div>
                                        <div className="text-[10px] text-gray-400 font-mono">{row.id}</div>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100 text-gray-600 whitespace-nowrap">
                                        {row.city}{row.county ? `, ${row.county}` : ''}
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100">
                                        {row.sponsor_type && (
                                            <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded whitespace-nowrap">{row.sponsor_type}</span>
                                        )}
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100">
                                        {row.sponsor_route && (
                                            <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded whitespace-nowrap">{row.sponsor_route}</span>
                                        )}
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100">
                                        <div className="flex items-center gap-2">
                                            {row.website && (
                                                <a href={row.website} target="_blank" rel="noopener noreferrer"
                                                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5" title={row.website}>
                                                    Web <ExternalLink size={9} />
                                                </a>
                                            )}
                                            {row.career_page && (
                                                <a href={row.career_page} target="_blank" rel="noopener noreferrer"
                                                    className="text-[10px] text-teal-600 hover:underline flex items-center gap-0.5" title={row.career_page}>
                                                    Careers <ExternalLink size={9} />
                                                </a>
                                            )}
                                        </div>
                                        {row.hr_email && <div className="text-[10px] text-gray-400 truncate max-w-[140px]">{row.hr_email}</div>}
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100">
                                        <Badge value={row.is_deleted} on="bg-red-100 text-red-700" off="bg-green-100 text-green-700" />
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100">
                                        <Badge value={row.visa_mentioned} on="bg-teal-100 text-teal-700" off="bg-gray-100 text-gray-500" />
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <button onClick={() => setAddingJobsFor(row)} title="Add Jobs"
                                                className="text-gray-400 hover:text-teal-600"><BriefcaseBusiness size={12} /></button>
                                            <button onClick={() => setEditing(row)} title="Edit"
                                                className="text-gray-400 hover:text-blue-600"><Pencil size={12} /></button>
                                            <button onClick={() => handleDelete(row.id)} disabled={deleting === row.id} title="Delete"
                                                className="text-gray-400 hover:text-red-600 disabled:opacity-40"><Trash2 size={12} /></button>
                                        </div>
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
                            const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                            const pg = start + i
                            return (
                                <button key={pg} onClick={() => setPage(pg)}
                                    className={`px-2 py-0.5 text-[10px] border rounded ${pg === page ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-300 hover:bg-gray-50'}`}>
                                    {pg}
                                </button>
                            )
                        })}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-0.5 text-[10px] border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">›</button>
                        <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-0.5 text-[10px] border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">»</button>
                    </div>
                </div>
            )}

            {/* Modals */}
            {(adding || editing) && (
                <CompanyFormModal
                    company={editing}
                    onClose={() => { setAdding(false); setEditing(null) }}
                    onSaved={() => { setAdding(false); setEditing(null); refresh() }}
                />
            )}
            {addingJobsFor && (
                <CompanyJobsModal
                    company={addingJobsFor}
                    onClose={() => setAddingJobsFor(null)}
                />
            )}
        </div>
    )
}
