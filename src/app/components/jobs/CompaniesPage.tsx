'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, RefreshCw, Pencil, Trash2, ExternalLink, ChevronDown, ChevronUp, Search, Building2, BriefcaseBusiness, Terminal, Download, X, SlidersHorizontal } from 'lucide-react'
import { getAllCompanies, getDistinctCompanyValues, deleteCompany, rawQueryCompanies, rawQueryCompaniesOrError } from '@/app/api_handlers/api/sponsored-companies.api'
import CompanyFormModal from './CompanyFormModal'
import CompanyJsonPanel from './CompanyJsonPanel'
import CompanyJobsModal from './CompanyJobsModal'

const LIMIT_OPTIONS = [25, 50, 100, 200, 500, 1000, 2000, 3000, 4000, 5000]
const EMPTY_FILTERS = { sponsor_type: '', sponsor_route: '', is_deleted: 'false', visa_mentioned: '', keyword: '', has_website: '', has_career_page: '', ranked: '', rank_op: '', rank_val: '' }

const ALL_COLUMNS = [
    { key: 'id', label: 'ID' },
    { key: 'rank', label: 'Rank' },
    { key: 'organisation_name', label: 'Organisation' },
    { key: 'city', label: 'City' },
    { key: 'county', label: 'County' },
    { key: 'sponsor_type', label: 'Sponsor Type' },
    { key: 'sponsor_route', label: 'Sponsor Route' },
    { key: 'website', label: 'Website' },
    { key: 'career_page', label: 'Career Page' },
    { key: 'hr_email', label: 'HR Email' },
    { key: 'is_deleted', label: 'Is Deleted' },
    { key: 'visa_mentioned', label: 'Visa Mentioned' },
    { key: 'it_jobs_count', label: 'IT Jobs Count' },
    { key: 'overall_jobs_count', label: 'Overall Jobs Count' },
    { key: 'createdAt', label: 'Created At' },
    { key: 'updatedAt', label: 'Updated At' },
]
const DEFAULT_EXPORT_COLS = ['organisation_name', 'city', 'county', 'sponsor_type', 'sponsor_route', 'website', 'career_page', 'hr_email']

function Badge({ value, on, off }: { value: boolean; on: string; off: string }) {
    return (
        <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded font-medium ${value ? on : off}`}>
            {value ? 'Yes' : 'No'}
        </span>
    )
}

export default function CompaniesPage() {
    // Shared data state (filled by either filter or SQL mode)
    const [data, setData] = useState<any[]>([])
    const [total, setTotal] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const [loading, setLoading] = useState(false)

    // Pagination + limit
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(50)

    // Filter mode
    const [filters, setFilters] = useState({ ...EMPTY_FILTERS })
    const [applied, setApplied] = useState({ ...EMPTY_FILTERS })
    const [sponsorTypes, setSponsorTypes] = useState<string[]>([])
    const [sponsorRoutes, setSponsorRoutes] = useState<string[]>([])
    const [showTypeDd, setShowTypeDd] = useState(false)
    const [showRouteDd, setShowRouteDd] = useState(false)

    // SQL mode
    const [sqlMode, setSqlMode] = useState(false)
    const [sqlWhere, setSqlWhere] = useState('')
    const [sqlApplied, setSqlApplied] = useState<string | null>(null)
    const [sqlError, setSqlError] = useState<string | null>(null)

    // Export
    const [exportCols, setExportCols] = useState<string[]>(DEFAULT_EXPORT_COLS)
    const [exporting, setExporting] = useState(false)

    // Panel visibility (all hidden by default)
    const [visiblePanels, setVisiblePanels] = useState<Set<string>>(new Set())
    const [showViewDd, setShowViewDd] = useState(false)
    const viewDdRef = useRef<HTMLDivElement>(null)

    const togglePanel = (key: string) =>
        setVisiblePanels(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s })

    const showSqlPanel = visiblePanels.has('sql')

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (viewDdRef.current && !viewDdRef.current.contains(e.target as Node)) setShowViewDd(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Modals
    const [editing, setEditing] = useState<any | null>(null)
    const [adding, setAdding] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [addingJobsFor, setAddingJobsFor] = useState<any | null>(null)

    const loadFilter = useCallback(async (pg: number, lim: number, af: typeof EMPTY_FILTERS) => {
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
            if (af.ranked !== '') q.ranked = af.ranked
            if (af.rank_op && af.rank_val !== '') { q.rank_op = af.rank_op; q.rank_val = af.rank_val }
            const res: any = await getAllCompanies(q)
            const payload = res?.data ?? res
            setData(Array.isArray(payload?.data) ? payload.data : [])
            setTotal(payload?.total ?? 0)
            setTotalPages(payload?.totalPages ?? 1)
        } finally {
            setLoading(false)
        }
    }, [])

    const loadSql = useCallback(async (pg: number, lim: number, where: string) => {
        setLoading(true)
        setSqlError(null)
        try {
            const { payload, error } = await rawQueryCompaniesOrError({ where_clause: where, page: pg, limit: lim })
            if (error) {
                setSqlError(error)
                setVisiblePanels(prev => new Set(prev).add('sql'))
                setData([])
                setTotal(0)
                setTotalPages(1)
                return
            }
            const p = payload?.data ?? payload
            setData(Array.isArray(p?.data) ? p.data : [])
            setTotal(p?.total ?? 0)
            setTotalPages(p?.totalPages ?? 1)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (sqlMode && sqlApplied !== null) {
            loadSql(page, limit, sqlApplied)
        } else if (!sqlMode) {
            loadFilter(page, limit, applied)
        }
    }, [page, limit, applied, sqlApplied, sqlMode, loadFilter, loadSql])

    useEffect(() => {
        getDistinctCompanyValues().then((res: any) => {
            const p = res?.data ?? res
            setSponsorTypes(p?.sponsor_types ?? [])
            setSponsorRoutes(p?.sponsor_routes ?? [])
        }).catch(() => { })
    }, [])

    const applyFilters = () => {
        setSqlMode(false)
        setSqlApplied(null)
        setPage(1)
        setApplied({ ...filters })
    }
    const clearFilters = () => {
        const e = { ...EMPTY_FILTERS }
        setFilters(e)
        setApplied(e)
        setSqlMode(false)
        setSqlApplied(null)
        setPage(1)
    }

    const executeSql = () => {
        setSqlMode(true)
        setSqlApplied(sqlWhere)
        setSqlError(null)
        setPage(1)
    }
    const exitSqlMode = () => {
        setSqlMode(false)
        setSqlApplied(null)
        setSqlWhere('')
        setSqlError(null)
        setPage(1)
    }

    const toggleMulti = (field: 'sponsor_type' | 'sponsor_route', value: string) => {
        const current = (filters[field] ?? '').split(',').filter(Boolean)
        const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
        setFilters(f => ({ ...f, [field]: next.join(',') }))
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this company?')) return
        setDeleting(id)
        try {
            await deleteCompany(id)
            if (sqlMode && sqlApplied !== null) loadSql(page, limit, sqlApplied)
            else loadFilter(page, limit, applied)
        } finally { setDeleting(null) }
    }

    const refresh = () => {
        if (sqlMode && sqlApplied !== null) loadSql(page, limit, sqlApplied)
        else loadFilter(page, limit, applied)
    }

    const handleExport = async () => {
        if (exportCols.length === 0) return
        setExporting(true)
        try {
            let allData: any[] = []
            if (sqlMode && sqlApplied !== null) {
                const res: any = await rawQueryCompanies({ where_clause: sqlApplied, export_all: true })
                const payload = res?.data ?? res
                allData = Array.isArray(payload?.data) ? payload.data : []
            } else {
                const q: any = { export_all: true }
                if (applied.sponsor_type) q.sponsor_type = applied.sponsor_type
                if (applied.sponsor_route) q.sponsor_route = applied.sponsor_route
                if (applied.is_deleted !== '') q.is_deleted = applied.is_deleted
                if (applied.visa_mentioned !== '') q.visa_mentioned = applied.visa_mentioned
                if (applied.keyword) q.keyword = applied.keyword
                if (applied.has_website !== '') q.has_website = applied.has_website
                if (applied.has_career_page !== '') q.has_career_page = applied.has_career_page
                if (applied.ranked !== '') q.ranked = applied.ranked
                if (applied.rank_op && applied.rank_val !== '') { q.rank_op = applied.rank_op; q.rank_val = applied.rank_val }
                const res: any = await getAllCompanies(q)
                const payload = res?.data ?? res
                allData = Array.isArray(payload?.data) ? payload.data : []
            }

            const filtered = allData.map(row => {
                const out: any = {}
                exportCols.forEach(c => { out[c] = row[c] ?? null })
                return out
            })

            const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `companies_${Date.now()}.json`
            a.click()
            URL.revokeObjectURL(url)
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="p-3 bg-white min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-2">
                <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-gray-500" />
                    <h1 className="text-sm font-semibold text-gray-800">Sponsored Companies</h1>
                    <span className="text-[10px] text-gray-400">{total.toLocaleString()} total</span>
                    {sqlMode && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">SQL Mode</span>}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={refresh} disabled={loading} className="flex items-center gap-1 text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50 text-gray-600">
                        <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>

                    {/* View toggle */}
                    <div className="relative" ref={viewDdRef}>
                        <button
                            onClick={() => setShowViewDd(p => !p)}
                            className="flex items-center gap-1 text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 text-gray-600"
                        >
                            <SlidersHorizontal size={11} /> View
                            {visiblePanels.size > 0 && (
                                <span className="ml-0.5 bg-teal-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                                    {visiblePanels.size}
                                </span>
                            )}
                        </button>
                        {showViewDd && (
                            <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded shadow-lg p-2 min-w-[160px]">
                                {[
                                    { key: 'upload', label: 'Upload JSON' },
                                    { key: 'filters', label: 'Filters' },
                                    { key: 'sql', label: 'SQL Query' },
                                    { key: 'export', label: 'Export JSON' },
                                ].map(({ key, label }) => (
                                    <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-1 rounded">
                                        <input type="checkbox" className="w-3 h-3"
                                            checked={visiblePanels.has(key)}
                                            onChange={() => togglePanel(key)} />
                                        <span className="text-xs text-gray-700">{label}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs bg-gray-800 text-white rounded px-3 py-1 hover:bg-gray-700">
                        <Plus size={12} /> Add Company
                    </button>
                </div>
            </div>

            {/* JSON Upload Panel */}
            {visiblePanels.has('upload') && <CompanyJsonPanel onDone={refresh} />}

            {/* Filter bar */}
            <div className={`${visiblePanels.has('filters') ? '' : 'hidden'} border border-gray-200 rounded p-2 mb-2 bg-gray-50 transition-opacity ${sqlMode ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                <div className="flex items-end gap-1.5 flex-wrap">
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
                                        <input type="checkbox" checked={filters.sponsor_type.split(',').filter(Boolean).includes(t)}
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
                                        <input type="checkbox" checked={filters.sponsor_route.split(',').filter(Boolean).includes(r)}
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

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Is Deleted</label>
                        <select value={filters.is_deleted} onChange={e => setFilters(f => ({ ...f, is_deleted: e.target.value }))}
                            className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none">
                            <option value="">All</option>
                            <option value="false">Active</option>
                            <option value="true">Deleted</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Visa Mentioned</label>
                        <select value={filters.visa_mentioned} onChange={e => setFilters(f => ({ ...f, visa_mentioned: e.target.value }))}
                            className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none">
                            <option value="">All</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Domain Found</label>
                        <select value={filters.has_website} onChange={e => setFilters(f => ({ ...f, has_website: e.target.value }))}
                            className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none">
                            <option value="">All</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Career Page Found</label>
                        <select value={filters.has_career_page} onChange={e => setFilters(f => ({ ...f, has_career_page: e.target.value }))}
                            className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none">
                            <option value="">All</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Ranked</label>
                        <select value={filters.ranked} onChange={e => setFilters(f => ({ ...f, ranked: e.target.value }))}
                            className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none">
                            <option value="">All</option>
                            <option value="true">Ranked only</option>
                            <option value="false">Unranked only</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Rank</label>
                        <div className="flex items-center gap-1">
                            <select value={filters.rank_op} onChange={e => setFilters(f => ({ ...f, rank_op: e.target.value }))}
                                className="border border-gray-300 rounded px-1.5 py-1 text-xs bg-white focus:outline-none w-14">
                                <option value="">—</option>
                                <option value="eq">=</option>
                                <option value="lt">&lt;</option>
                                <option value="lte">≤</option>
                                <option value="gt">&gt;</option>
                                <option value="gte">≥</option>
                            </select>
                            <input
                                type="number" min={1}
                                className="border border-gray-300 rounded px-1.5 py-1 text-xs bg-white focus:outline-none w-16"
                                placeholder="value"
                                value={filters.rank_val}
                                onChange={e => setFilters(f => ({ ...f, rank_val: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && applyFilters()}
                            />
                        </div>
                    </div>

                    <button onClick={applyFilters} className="px-3 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 mt-auto">Filter</button>
                    <button onClick={clearFilters} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-white mt-auto">Clear</button>

                    <div className="flex flex-col gap-0.5 ml-auto">
                        <label className="text-[10px] text-gray-400 uppercase">Per page</label>
                        <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1) }}
                            className="border border-gray-300 rounded px-1.5 py-1 text-xs bg-white focus:outline-none">
                            {LIMIT_OPTIONS.map(o => <option key={o} value={o}>{o.toLocaleString()}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* SQL Query Panel */}
            {visiblePanels.has('sql') && <div className={`border rounded mb-2 ${sqlMode ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                <button
                    className="w-full flex items-center justify-between px-2 py-1.5"
                    onClick={() => togglePanel('sql')}
                >
                    <div className="flex items-center gap-1.5">
                        <Terminal size={12} className={sqlMode ? 'text-amber-600' : 'text-gray-400'} />
                        <span className={`text-[11px] font-medium ${sqlMode ? 'text-amber-700' : 'text-gray-600'}`}>SQL Query</span>
                        {sqlMode && sqlApplied !== null && (
                            <span className="text-[9px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-medium">Active — {total.toLocaleString()} rows</span>
                        )}
                    </div>
                    {showSqlPanel
                        ? <ChevronUp size={11} className="text-gray-400" />
                        : <ChevronDown size={11} className="text-gray-400" />}
                </button>

                {showSqlPanel && (
                    <div className="px-2 pb-2 border-t border-amber-200">
                        <div className="text-[10px] text-amber-700 font-mono mt-1.5 mb-1 select-none">
                            Full SELECT query <span className="text-amber-500">or</span> WHERE clause only
                        </div>
                        <textarea
                            className="w-full border border-amber-300 rounded px-2 py-1.5 text-xs font-mono bg-white focus:outline-none focus:border-amber-500 resize-y min-h-[70px]"
                            placeholder={`Full query:    SELECT id, organisation_name, website FROM "SponsoredCompanies" WHERE city ILIKE '%london%'\nWHERE clause:  sponsor_type = 'Skilled Worker' AND is_deleted = false\n               website IS NOT NULL AND overall_jobs_count > 5`}
                            value={sqlWhere}
                            onChange={e => setSqlWhere(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) executeSql() }}
                        />
                        <div className="flex items-center gap-2 mt-1.5">
                            <button onClick={executeSql} disabled={loading}
                                className="flex items-center gap-1 px-3 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 font-medium">
                                <Terminal size={11} /> Execute
                            </button>
                            <span className="text-[10px] text-gray-400">Ctrl+Enter</span>
                            {sqlMode && (
                                <button onClick={exitSqlMode}
                                    className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-white text-gray-600 ml-2">
                                    <X size={10} /> Exit SQL Mode
                                </button>
                            )}
                        </div>
                        {sqlError && (
                            <div className="mt-2 bg-red-50 border border-red-200 rounded px-2 py-1.5">
                                <p className="text-[10px] font-semibold text-red-700 mb-0.5">PostgreSQL Error</p>
                                <p className="text-[10px] font-mono text-red-600 whitespace-pre-wrap break-all">{sqlError}</p>
                            </div>
                        )}
                        <div className="mt-2 text-[10px] text-gray-400">
                            Table: <span className="font-mono text-gray-600">"SponsoredCompanies"</span> &nbsp;·&nbsp;
                            Columns: <span className="font-mono text-gray-600">id, rank, organisation_name, city, county, sponsor_type, sponsor_route, website, career_page, hr_email, is_deleted, visa_mentioned, it_jobs_count, overall_jobs_count</span>
                        </div>
                    </div>
                )}
            </div>}

            {/* Export Panel */}
            {visiblePanels.has('export') && <div className="border border-gray-200 rounded mb-2 bg-gray-50">
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-200">
                    <div className="flex items-center gap-1.5">
                        <Download size={12} className="text-gray-400" />
                        <span className="text-[11px] font-medium text-gray-600">Export JSON</span>
                        <span className="text-[10px] text-gray-400">{exportCols.length} columns · {total.toLocaleString()} rows</span>
                    </div>
                </div>
                {(
                    <div className="px-2 pb-2 pt-1.5">
                        <div className="flex items-center gap-3 mt-1.5 mb-1">
                            <span className="text-[10px] text-gray-400 uppercase">Columns to include</span>
                            <button onClick={() => setExportCols(ALL_COLUMNS.map(c => c.key))}
                                className="text-[10px] text-teal-600 hover:underline">All</button>
                            <button onClick={() => setExportCols([])}
                                className="text-[10px] text-gray-400 hover:underline">None</button>
                        </div>
                        <div className="grid grid-cols-5 gap-x-2 gap-y-0.5 mb-2">
                            {ALL_COLUMNS.map(col => (
                                <label key={col.key} className="flex items-center gap-1 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                                    <input type="checkbox"
                                        checked={exportCols.includes(col.key)}
                                        onChange={() => setExportCols(prev => prev.includes(col.key) ? prev.filter(c => c !== col.key) : [...prev, col.key])}
                                        className="w-3 h-3 shrink-0" />
                                    <span className="text-[10px] text-gray-700 truncate">{col.label}</span>
                                </label>
                            ))}
                        </div>
                        <button
                            onClick={handleExport}
                            disabled={exporting || exportCols.length === 0}
                            className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                        >
                            <Download size={11} />
                            {exporting ? 'Exporting…' : `Download JSON (${total.toLocaleString()} rows, ${exportCols.length} cols)`}
                        </button>
                    </div>
                )}
            </div>}

            {/* Table */}
            <div className="border border-gray-200 rounded overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-300">
                            <th className="px-2 py-1.5 text-left font-medium text-gray-500 border-r border-gray-200 w-6">#</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 w-10">Rank</th>
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
                            <tr><td colSpan={10} className="text-center py-10 text-gray-400">
                                <div className="flex items-center justify-center gap-2"><RefreshCw size={13} className="animate-spin" /> Loading…</div>
                            </td></tr>
                        )}
                        {!loading && data.length === 0 && (
                            <tr><td colSpan={10} className="text-center py-10 text-gray-400">No companies found.</td></tr>
                        )}
                        {!loading && data.map((row, idx) => {
                            const rowNum = (page - 1) * limit + idx + 1
                            return (
                                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-2 py-1.5 text-gray-400 border-r border-gray-100">{rowNum}</td>
                                    <td className="px-2 py-1.5 border-r border-gray-100 text-center">
                                        {row.rank != null
                                            ? <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{row.rank}</span>
                                            : <span className="text-[10px] text-gray-300">—</span>}
                                    </td>
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
                    <span className="text-[10px] text-gray-400">Page {page} of {totalPages} · {total.toLocaleString()} records</span>
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
