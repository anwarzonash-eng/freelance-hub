'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, RefreshCw, Pencil, Trash2, ExternalLink, ChevronDown, ChevronUp, Search, Building2, BriefcaseBusiness, Terminal, Download, X, SlidersHorizontal, ClipboardCheck, Users, Copy, Check, FileText, ListChecks } from 'lucide-react'
import { getAllCompanies, getDistinctCompanyValues, deleteCompany, rawQueryCompanies, rawQueryCompaniesOrError } from '@/app/api_handlers/api/sponsored-companies.api'
import { timeAgo } from '@/app/utils/time'
import { getCompanyCategories } from '@/app/api_handlers/api/company-categories.api'
import { listAuthUsers } from '@/app/api_handlers/api/auth.api'
import CompanyFormModal from './CompanyFormModal'
import CompanyJsonPanel from './CompanyJsonPanel'
import CompanyJobsModal from './CompanyJobsModal'
import ManualCheckModal from './ManualCheckModal'
import AssignModal from './AssignModal'

const LIMIT_OPTIONS = [25, 50, 100, 200, 500, 1000, 2000, 3000, 4000, 5000]
const EMPTY_FILTERS = { sponsor_type: '', sponsor_route: '', is_deleted: 'false', visa_mentioned: '', keyword: '', has_website: '', has_career_page: '', ranked: '', rank_op: '', rank_val: '', manual_check_done: '', has_it_jobs: '', offers_freelance: '', should_apply: '', date_from: '', date_to: '', checked_by: '', category_id: '', assigned: '', assigned_to: '', cv_submitted: '' }

function companyFiltersToParams(
    f: typeof EMPTY_FILTERS, page: number, limit: number, sqlMode: boolean, sqlWhere: string,
): URLSearchParams {
    const params = new URLSearchParams()
    Object.entries(f).forEach(([k, v]) => {
        if (v !== EMPTY_FILTERS[k as keyof typeof EMPTY_FILTERS]) params.set(k, v)
    })
    if (page !== 1) params.set('page', String(page))
    if (limit !== 50) params.set('limit', String(limit))
    if (sqlMode) {
        params.set('sql_mode', 'true')
        if (sqlWhere) params.set('sql_where', sqlWhere)
    }
    return params
}

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

// Table column visibility — keys match render logic below
const TABLE_COLS = [
    { key: 'num',          label: '#',            default: false },
    { key: 'id',           label: 'ID',           default: false },
    { key: 'rank',         label: 'Rank',         default: true  },
    { key: 'organisation', label: 'Organisation', default: true  },
    { key: 'city',         label: 'City',         default: true  },
    { key: 'sponsor_type', label: 'Sponsor Type', default: false },
    { key: 'sponsor_route',label: 'Route',        default: false },
    { key: 'links',        label: 'Links',        default: true  },
    { key: 'category',     label: 'Category',     default: true  },
    { key: 'is_deleted',   label: 'Deleted',      default: false },
    { key: 'visa',         label: 'Visa',         default: true  },
    { key: 'checked',           label: 'Checked',       default: true  },
    { key: 'has_it_jobs',       label: 'Has IT Jobs',   default: false },
    { key: 'estimated_it_jobs', label: 'Est. IT Jobs',  default: false },
    { key: 'checked_by_col',    label: 'Checked By',    default: false },
    { key: 'overall_jobs',      label: 'Total Jobs',    default: false },
    { key: 'it_jobs_count',     label: 'IT Jobs',       default: false },
    { key: 'assigned_to_col',   label: 'Assigned To',   default: false },
    { key: 'offers_freelance',  label: 'Freelance',     default: false },
    { key: 'should_apply',      label: 'Should Apply',  default: false },
    { key: 'cv_submitted',      label: 'CV Submitted',  default: true  },
]
const DEFAULT_TABLE_COLS = new Set(TABLE_COLS.filter(c => c.default).map(c => c.key))

function Badge({ value, on, off }: { value: boolean; on: string; off: string }) {
    return (
        <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded font-medium ${value ? on : off}`}>
            {value ? 'Yes' : 'No'}
        </span>
    )
}

function CopyBtn({ value }: { value: string }) {
    const [copied, setCopied] = useState(false)
    if (!value) return null
    const copy = (e: React.MouseEvent) => {
        e.stopPropagation()
        navigator.clipboard.writeText(value).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        })
    }
    return (
        <button onClick={copy} title={`Copy: ${value}`}
            className="shrink-0 text-gray-300 hover:text-gray-600 transition-colors">
            {copied ? <Check size={10} className="text-teal-500" /> : <Copy size={10} />}
        </button>
    )
}

export default function CompaniesPage() {
    const router = useRouter()

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
    const hydratedFromUrl = useRef(false)
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

    // Panel visibility (persisted to localStorage so open/closed panels survive reloads)
    // Start from the SSR-safe default on both server and first client render, then
    // load the persisted value in a post-mount effect — branching the initializer on
    // `typeof window` caused a server/client markup mismatch (hydration error).
    const [visiblePanels, setVisiblePanels] = useState<Set<string>>(() => new Set())
    const [showViewDd, setShowViewDd] = useState(false)
    const viewDdRef = useRef<HTMLDivElement>(null)

    // Table column visibility (persisted to localStorage)
    const [visibleCols, setVisibleCols] = useState<Set<string>>(() => new Set(DEFAULT_TABLE_COLS))
    const [showColDd, setShowColDd] = useState(false)
    const colDdRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const savedPanels = localStorage.getItem('companies_visible_panels')
        if (savedPanels) setVisiblePanels(new Set(JSON.parse(savedPanels)))
        const savedCols = localStorage.getItem('companies_visible_cols')
        if (savedCols) setVisibleCols(new Set(JSON.parse(savedCols)))
    }, [])

    const col = (key: string) => visibleCols.has(key)

    const togglePanel = (key: string) =>
        setVisiblePanels(prev => {
            const s = new Set(prev)
            if (s.has(key)) s.delete(key); else s.add(key)
            return s
        })

    const toggleCol = (key: string) =>
        setVisibleCols(prev => {
            const s = new Set(prev)
            if (s.has(key)) s.delete(key); else s.add(key)
            return s
        })

    const showSqlPanel = visiblePanels.has('sql')

    // Save visible columns to localStorage
    useEffect(() => {
        localStorage.setItem('companies_visible_cols', JSON.stringify(Array.from(visibleCols)))
    }, [visibleCols])

    // Save visible panels (Filters, SQL Query, Upload JSON, Export JSON) to localStorage
    useEffect(() => {
        localStorage.setItem('companies_visible_panels', JSON.stringify(Array.from(visiblePanels)))
    }, [visiblePanels])

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (viewDdRef.current && !viewDdRef.current.contains(e.target as Node)) setShowViewDd(false)
            if (colDdRef.current && !colDdRef.current.contains(e.target as Node)) setShowColDd(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Modals
    const [editing, setEditing] = useState<any | null>(null)
    const [adding, setAdding] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [addingJobsFor, setAddingJobsFor] = useState<any | null>(null)
    const [manualChecking, setManualChecking] = useState<any | null>(null)
    const [assigning, setAssigning] = useState(false)

    // Categories + auth users for display
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
    const [userMap, setUserMap] = useState<Record<string, string>>({})
    const [userList, setUserList] = useState<{ id: string; userid: string }[]>([])
    const [currentUserId, setCurrentUserId] = useState('')
    const [isAdmin, setIsAdmin] = useState(false)

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
            if (af.manual_check_done !== '') q.manual_check_done = af.manual_check_done
            if (af.has_it_jobs !== '') q.has_it_jobs = af.has_it_jobs
            if (af.offers_freelance !== '') q.offers_freelance = af.offers_freelance
            if (af.should_apply !== '') q.should_apply = af.should_apply
            if (af.date_from) q.date_from = af.date_from
            if (af.date_to) q.date_to = af.date_to
            if (af.checked_by) q.checked_by = af.checked_by
            if (af.category_id) q.category_id = af.category_id
            if (af.assigned !== '') q.assigned = af.assigned
            if (af.assigned_to) q.assigned_to = af.assigned_to
            if (af.cv_submitted !== '') q.cv_submitted = af.cv_submitted
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
        if (!hydratedFromUrl.current) return
        if (sqlMode && sqlApplied !== null) {
            loadSql(page, limit, sqlApplied)
        } else if (!sqlMode) {
            loadFilter(page, limit, applied)
        }
        const qs = companyFiltersToParams(applied, page, limit, sqlMode, sqlApplied ?? '').toString()
        router.replace(qs ? `/jobs/companies?${qs}` : '/jobs/companies')
    }, [page, limit, applied, sqlApplied, sqlMode, loadFilter, loadSql, router])

    useEffect(() => {
        getDistinctCompanyValues().then((res: any) => {
            const p = res?.data ?? res
            setSponsorTypes(p?.sponsor_types ?? [])
            setSponsorRoutes(p?.sponsor_routes ?? [])
        }).catch(() => { })

        getCompanyCategories().then((res: any) => {
            const list = res?.data ?? res
            setCategories(Array.isArray(list) ? list : [])
        }).catch(() => { })

        listAuthUsers().then((res: any) => {
            const list = res?.data ?? res
            if (Array.isArray(list)) {
                const eligible = list.filter((u: any) => u.id !== '00000000-0000-0000-0000-000000000001')
                const map: Record<string, string> = {}
                eligible.forEach((u: any) => { if (u.id) map[u.id] = u.userid || u.id })
                setUserMap(map)
                setUserList(eligible.map((u: any) => ({ id: u.id, userid: u.userid || u.id })))
            }
        }).catch(() => { })

        // Decode current user from JWT
        try {
            const token = localStorage.getItem('authToken')
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]))
                setCurrentUserId(payload.sub || payload.id || payload.userid || '')
                setIsAdmin(payload.role === 'admin')
            }
        } catch { }
    }, [])

    // Hydrate filters/page/limit/SQL mode from the URL on first load (so a copied link reproduces
    // the same view), falling back to id for cross-page navigation links into the keyword search.
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search)
        const hydrated = { ...EMPTY_FILTERS }
        Object.keys(EMPTY_FILTERS).forEach(k => {
            const v = searchParams.get(k)
            if (v !== null) (hydrated as any)[k] = v
        })
        if (!searchParams.get('keyword') && searchParams.get('id')) hydrated.keyword = searchParams.get('id')!

        const hydratedPage = Number(searchParams.get('page')) || 1
        const hydratedLimit = Number(searchParams.get('limit')) || 50
        const hydratedSqlMode = searchParams.get('sql_mode') === 'true'
        const hydratedSqlWhere = searchParams.get('sql_where') || ''

        setFilters(hydrated)
        setApplied(hydrated)
        setPage(hydratedPage)
        setLimit(hydratedLimit)
        setSqlMode(hydratedSqlMode)
        setSqlWhere(hydratedSqlWhere)
        setSqlApplied(hydratedSqlMode ? hydratedSqlWhere : null)

        const finish = () => { hydratedFromUrl.current = true }
        if (hydratedSqlMode) loadSql(hydratedPage, hydratedLimit, hydratedSqlWhere).finally(finish)
        else loadFilter(hydratedPage, hydratedLimit, hydrated).finally(finish)
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
        setLimit(50)
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

    const isFiltersChanged = () => {
        for (const key in EMPTY_FILTERS) {
            if (filters[key as keyof typeof EMPTY_FILTERS] !== EMPTY_FILTERS[key as keyof typeof EMPTY_FILTERS]) {
                return true
            }
        }
        return false
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
                if (applied.manual_check_done !== '') q.manual_check_done = applied.manual_check_done
                if (applied.has_it_jobs !== '') q.has_it_jobs = applied.has_it_jobs
                if (applied.offers_freelance !== '') q.offers_freelance = applied.offers_freelance
                if (applied.should_apply !== '') q.should_apply = applied.should_apply
                if (applied.date_from) q.date_from = applied.date_from
                if (applied.date_to) q.date_to = applied.date_to
                if (applied.checked_by) q.checked_by = applied.checked_by
                if (applied.category_id) q.category_id = applied.category_id
                if (applied.assigned !== '') q.assigned = applied.assigned
                if (applied.assigned_to) q.assigned_to = applied.assigned_to
                if (applied.cv_submitted !== '') q.cv_submitted = applied.cv_submitted
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
            {/* Header — title only, controls live in the table's last column header */}
            <div className="flex items-center gap-2 mb-3 border-b border-gray-200 pb-2">
                <Building2 size={14} className="text-gray-500" />
                <h1 className="text-sm font-semibold text-gray-800">Sponsored Companies</h1>
                <span className="text-[10px] text-gray-400">{total.toLocaleString()} total</span>
                {sqlMode && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">SQL Mode</span>}
            </div>

            {/* JSON Upload Panel */}
            {visiblePanels.has('upload') && <CompanyJsonPanel onDone={refresh} />}

            {/* Filter bar */}
            <div className={`${visiblePanels.has('filters') ? '' : 'hidden'} border border-gray-200 rounded p-2 mb-2 bg-gray-50 ${sqlMode ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                <div className="flex items-end gap-1.5 flex-wrap">
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Search</label>
                        <div className="relative">
                            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                className={`border rounded pl-6 pr-2 py-1 text-xs focus:outline-none w-44 transition-colors ${filters.keyword ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}
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
                            className={`flex items-center gap-1 border rounded px-2 py-1 text-xs text-gray-700 min-w-[140px] transition-colors ${filters.sponsor_type ? 'border-blue-500 bg-blue-100 hover:bg-blue-100' : 'border-gray-300 bg-white hover:bg-gray-50'}`}>
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
                            className={`flex items-center gap-1 border rounded px-2 py-1 text-xs text-gray-700 min-w-[140px] transition-colors ${filters.sponsor_route ? 'border-blue-500 bg-blue-100 hover:bg-blue-100' : 'border-gray-300 bg-white hover:bg-gray-50'}`}>
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
                            className={`border rounded px-2 py-1 text-xs focus:outline-none transition-colors ${filters.is_deleted !== EMPTY_FILTERS.is_deleted ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}>
                            <option value="">All</option>
                            <option value="false">Active</option>
                            <option value="true">Deleted</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Visa Mentioned</label>
                        <select value={filters.visa_mentioned} onChange={e => setFilters(f => ({ ...f, visa_mentioned: e.target.value }))}
                            className={`border rounded px-2 py-1 text-xs focus:outline-none transition-colors ${filters.visa_mentioned ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}>
                            <option value="">All</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Domain Found</label>
                        <select value={filters.has_website} onChange={e => setFilters(f => ({ ...f, has_website: e.target.value }))}
                            className={`border rounded px-2 py-1 text-xs focus:outline-none transition-colors ${filters.has_website ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}>
                            <option value="">All</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Career Page Found</label>
                        <select value={filters.has_career_page} onChange={e => setFilters(f => ({ ...f, has_career_page: e.target.value }))}
                            className={`border rounded px-2 py-1 text-xs focus:outline-none transition-colors ${filters.has_career_page ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}>
                            <option value="">All</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Ranked</label>
                        <select value={filters.ranked} onChange={e => setFilters(f => ({ ...f, ranked: e.target.value }))}
                            className={`border rounded px-2 py-1 text-xs focus:outline-none transition-colors ${filters.ranked ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}>
                            <option value="">All</option>
                            <option value="true">Ranked only</option>
                            <option value="false">Unranked only</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Rank</label>
                        <div className="flex items-center gap-1">
                            <select value={filters.rank_op} onChange={e => setFilters(f => ({ ...f, rank_op: e.target.value }))}
                                className={`border rounded px-1.5 py-1 text-xs focus:outline-none w-14 transition-colors ${filters.rank_op ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}>
                                <option value="">—</option>
                                <option value="eq">=</option>
                                <option value="lt">&lt;</option>
                                <option value="lte">≤</option>
                                <option value="gt">&gt;</option>
                                <option value="gte">≥</option>
                            </select>
                            <input
                                type="number" min={1}
                                className={`border rounded px-1.5 py-1 text-xs focus:outline-none w-16 transition-colors ${filters.rank_val ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}
                                placeholder="value"
                                value={filters.rank_val}
                                onChange={e => setFilters(f => ({ ...f, rank_val: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && applyFilters()}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Manual Checked</label>
                        <select value={filters.manual_check_done} onChange={e => setFilters(f => ({ ...f, manual_check_done: e.target.value }))}
                            className={`border rounded px-2 py-1 text-xs focus:outline-none transition-colors ${filters.manual_check_done ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}>
                            <option value="">All</option>
                            <option value="true">Done</option>
                            <option value="false">Not Done</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Has IT Jobs</label>
                        <select value={filters.has_it_jobs} onChange={e => setFilters(f => ({ ...f, has_it_jobs: e.target.value }))}
                            className={`border rounded px-2 py-1 text-xs focus:outline-none transition-colors ${filters.has_it_jobs ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}>
                            <option value="">All</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                            <option value="unknown">Unknown</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Offers Freelance</label>
                        <select value={filters.offers_freelance} onChange={e => setFilters(f => ({ ...f, offers_freelance: e.target.value }))}
                            className={`border rounded px-2 py-1 text-xs focus:outline-none transition-colors ${filters.offers_freelance ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}>
                            <option value="">All</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                            <option value="unknown">Unknown</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Should Apply</label>
                        <select value={filters.should_apply} onChange={e => setFilters(f => ({ ...f, should_apply: e.target.value }))}
                            className={`border rounded px-2 py-1 text-xs focus:outline-none transition-colors ${filters.should_apply ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}>
                            <option value="">All</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Check Date From</label>
                        <input type="date" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
                            className={`border rounded px-2 py-1 text-xs focus:outline-none transition-colors ${filters.date_from ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`} />
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Check Date To</label>
                        <input type="date" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
                            className={`border rounded px-2 py-1 text-xs focus:outline-none transition-colors ${filters.date_to ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`} />
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Checked By</label>
                        <select value={filters.checked_by} onChange={e => setFilters(f => ({ ...f, checked_by: e.target.value }))}
                            className={`border rounded px-2 py-1 text-xs focus:outline-none min-w-[100px] transition-colors ${filters.checked_by ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}>
                            <option value="">All</option>
                            {Object.entries(userMap).map(([id, name]) => (
                                <option key={id} value={id}>{name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Category</label>
                        <select value={filters.category_id} onChange={e => setFilters(f => ({ ...f, category_id: e.target.value }))}
                            className={`border rounded px-2 py-1 text-xs focus:outline-none min-w-[110px] transition-colors ${filters.category_id ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}>
                            <option value="">All</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Assigned</label>
                        <select value={filters.assigned} onChange={e => setFilters(f => ({ ...f, assigned: e.target.value }))}
                            className={`border rounded px-2 py-1 text-xs focus:outline-none transition-colors ${filters.assigned ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}>
                            <option value="">All</option>
                            <option value="true">Assigned</option>
                            <option value="false">Unassigned</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Assigned To</label>
                        <select value={filters.assigned_to} onChange={e => setFilters(f => ({ ...f, assigned_to: e.target.value }))}
                            className={`border rounded px-2 py-1 text-xs focus:outline-none min-w-[100px] transition-colors ${filters.assigned_to ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}>
                            <option value="">All</option>
                            {Object.entries(userMap).map(([id, name]) => (
                                <option key={id} value={id}>{name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">CV Submitted</label>
                        <select value={filters.cv_submitted} onChange={e => setFilters(f => ({ ...f, cv_submitted: e.target.value }))}
                            className={`border rounded px-2 py-1 text-xs focus:outline-none transition-colors ${filters.cv_submitted ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}>
                            <option value="">All</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>

                    <button onClick={applyFilters} className="px-3 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 mt-auto">Filter</button>
                    <button onClick={clearFilters} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-white mt-auto">Clear</button>
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
            <div className="border border-gray-200 rounded overflow-x-auto min-h-[60vh]">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-300">
                            {col('num')          && <th className="px-2 py-1 text-left font-medium text-gray-500 border-r border-gray-200 w-6">#</th>}
                            {col('id')           && <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200 max-w-[80px]">ID</th>}
                            {col('rank')         && <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200 w-10">Rank</th>}
                            {col('organisation') && <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200">Organisation</th>}
                            {col('city')         && <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200">City</th>}
                            {col('sponsor_type') && <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Sponsor Type</th>}
                            {col('sponsor_route')&& <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200">Route</th>}
                            {col('links')        && <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200">Links</th>}
                            {col('category')     && <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200">Category</th>}
                            {col('is_deleted')   && <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200">Del</th>}
                            {col('visa')         && <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200">Visa</th>}
                            {col('checked')           && <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Checked</th>}
                            {col('has_it_jobs')       && <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Has IT Jobs</th>}
                            {col('estimated_it_jobs') && <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Est. IT Jobs</th>}
                            {col('checked_by_col')    && <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Checked By</th>}
                            {col('overall_jobs')      && <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Total Jobs</th>}
                            {col('it_jobs_count')     && <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">IT Jobs</th>}
                            {col('assigned_to_col')   && <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Assigned To</th>}
                            {col('offers_freelance')  && <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Freelance</th>}
                            {col('should_apply')      && <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">Should Apply</th>}
                            {col('cv_submitted')      && <th className="px-2 py-1 text-left font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap">CV Submitted</th>}
                            <th className="px-1 py-1 font-medium text-gray-600">
                                <div className="flex items-center justify-end gap-1.5 pr-1">
                                    {/* Refresh */}
                                    <button onClick={refresh} disabled={loading} title="Refresh"
                                        className="text-gray-400 hover:text-gray-700 disabled:opacity-40">
                                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                                    </button>

                                    {/* Columns dropdown */}
                                    <div className="relative" ref={colDdRef}>
                                        <button onClick={() => { setShowColDd(p => !p); setShowViewDd(false) }}
                                            title="Show/hide columns"
                                            className={`text-gray-400 hover:text-gray-700 relative ${showColDd ? 'text-indigo-600' : ''}`}>
                                            <SlidersHorizontal size={12} />
                                            {visibleCols.size !== DEFAULT_TABLE_COLS.size && (
                                                <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[7px] rounded-full w-2.5 h-2.5 flex items-center justify-center font-bold leading-none">·</span>
                                            )}
                                        </button>
                                        {showColDd && (
                                            <div className="absolute right-0 top-full mt-1 z-40 bg-white border border-gray-200 rounded shadow-lg p-2 min-w-[170px]">
                                                <p className="text-[9px] text-gray-400 uppercase font-semibold px-1 mb-1">Columns</p>
                                                {TABLE_COLS.map(({ key, label }) => (
                                                    <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                                                        <input type="checkbox" className="w-3 h-3"
                                                            checked={visibleCols.has(key)}
                                                            onChange={() => toggleCol(key)} />
                                                        <span className="text-xs text-gray-700">{label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* View (panels) dropdown */}
                                    <div className="relative" ref={viewDdRef}>
                                        <button onClick={() => { setShowViewDd(p => !p); setShowColDd(false) }}
                                            title="Toggle panels"
                                            className={`text-gray-400 hover:text-gray-700 relative ${showViewDd ? 'text-teal-600' : ''}`}>
                                            <ChevronDown size={12} />
                                            {visiblePanels.size > 0 && (
                                                <span className="absolute -top-1 -right-1 bg-teal-500 text-white text-[7px] rounded-full w-2.5 h-2.5 flex items-center justify-center font-bold leading-none">·</span>
                                            )}
                                        </button>
                                        {showViewDd && (
                                            <div className="absolute right-0 top-full mt-1 z-40 bg-white border border-gray-200 rounded shadow-lg p-2 min-w-[160px]">
                                                <p className="text-[9px] text-gray-400 uppercase font-semibold px-1 mb-1">Panels</p>
                                                {[
                                                    { key: 'upload', label: 'Upload JSON' },
                                                    { key: 'filters', label: 'Filters' },
                                                    { key: 'sql', label: 'SQL Query' },
                                                    { key: 'export', label: 'Export JSON' },
                                                ].map(({ key, label }) => (
                                                    <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                                                        <input type="checkbox" className="w-3 h-3"
                                                            checked={visiblePanels.has(key)}
                                                            onChange={() => togglePanel(key)} />
                                                        <span className="text-xs text-gray-700">{label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Assign (admin only) */}
                                    {isAdmin && !sqlMode && (
                                        <button onClick={() => setAssigning(true)} title="Assign companies"
                                            className="text-gray-400 hover:text-indigo-600"><Users size={12} /></button>
                                    )}

                                    {/* Add company */}
                                    <button onClick={() => setAdding(true)} title="Add company"
                                        className="text-gray-400 hover:text-gray-800"><Plus size={12} /></button>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan={visibleCols.size + 1} className="text-center py-10 text-gray-400">
                                <div className="flex items-center justify-center gap-2"><RefreshCw size={13} className="animate-spin" /> Loading…</div>
                            </td></tr>
                        )}
                        {!loading && data.length === 0 && (
                            <tr><td colSpan={visibleCols.size + 1} className="text-center py-10 text-gray-400">No companies found.</td></tr>
                        )}
                        {!loading && data.map((row, idx) => {
                            const rowNum = (page - 1) * limit + idx + 1
                            const catName = row.category_id ? categories.find(c => c.id === row.category_id)?.name : null
                            return (
                                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    {col('num') && (
                                        <td className="px-2 py-1 text-gray-400 border-r border-gray-100 whitespace-nowrap">{rowNum}</td>
                                    )}
                                    {col('id') && (
                                        <td className="px-2 py-1 border-r border-gray-100">
                                            <div className="flex items-center gap-1">
                                                <span className="text-[9px] font-mono text-gray-400 truncate flex-1 max-w-[60px]" title={row.id}>{row.id}</span>
                                                <CopyBtn value={row.id} />
                                            </div>
                                        </td>
                                    )}
                                    {col('rank') && (
                                        <td className="px-2 py-1 border-r border-gray-100 text-center">
                                            {row.rank != null
                                                ? <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{row.rank}</span>
                                                : <span className="text-[10px] text-gray-300">—</span>}
                                        </td>
                                    )}
                                    {col('organisation') && (
                                        <td className="px-2 py-1 border-r border-gray-100">
                                            <div className="flex items-center gap-1 max-w-[220px]">
                                                <span className="font-medium text-gray-800 truncate flex-1 text-[11px]" title={row.organisation_name}>{row.organisation_name}</span>
                                                <CopyBtn value={[row.organisation_name, row.city, row.county].filter(Boolean).join(', ')} />
                                            </div>
                                        </td>
                                    )}
                                    {col('city') && (
                                        <td className="px-2 py-1 border-r border-gray-100 text-gray-500 whitespace-nowrap text-[11px]">
                                            {row.city}{row.county ? `, ${row.county}` : ''}
                                        </td>
                                    )}
                                    {col('sponsor_type') && (
                                        <td className="px-2 py-1 border-r border-gray-100">
                                            {row.sponsor_type
                                                ? <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded whitespace-nowrap">{row.sponsor_type}</span>
                                                : <span className="text-[10px] text-gray-300">—</span>}
                                        </td>
                                    )}
                                    {col('sponsor_route') && (
                                        <td className="px-2 py-1 border-r border-gray-100">
                                            {row.sponsor_route
                                                ? <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded whitespace-nowrap">{row.sponsor_route}</span>
                                                : <span className="text-[10px] text-gray-300">—</span>}
                                        </td>
                                    )}
                                    {col('links') && (
                                        <td className="px-2 py-1 border-r border-gray-100">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {row.website && (
                                                    <span className="flex items-center gap-0.5">
                                                        <a href={row.website} target="_blank" rel="noopener noreferrer"
                                                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5" title={row.website}>
                                                            Web <ExternalLink size={9} />
                                                        </a>
                                                        <CopyBtn value={row.website} />
                                                    </span>
                                                )}
                                                {row.career_page && (
                                                    <span className="flex items-center gap-0.5">
                                                        <a href={row.career_page} target="_blank" rel="noopener noreferrer"
                                                            className="text-[10px] text-teal-600 hover:underline flex items-center gap-0.5" title={row.career_page}>
                                                            Careers <ExternalLink size={9} />
                                                        </a>
                                                        <CopyBtn value={row.career_page} />
                                                    </span>
                                                )}
                                                {row.hr_email && (
                                                    <span className="flex items-center gap-0.5">
                                                        <span className="text-[10px] text-gray-400 truncate max-w-[110px]" title={row.hr_email}>{row.hr_email}</span>
                                                        <CopyBtn value={row.hr_email} />
                                                    </span>
                                                )}
                                                {!row.website && !row.career_page && !row.hr_email && <span className="text-[10px] text-gray-300">—</span>}
                                            </div>
                                        </td>
                                    )}
                                    {col('category') && (
                                        <td className="px-2 py-1 border-r border-gray-100">
                                            {catName
                                                ? <span className="text-[9px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded whitespace-nowrap">{catName}</span>
                                                : <span className="text-[10px] text-gray-300">—</span>}
                                        </td>
                                    )}
                                    {col('is_deleted') && (
                                        <td className="px-2 py-1 border-r border-gray-100">
                                            <Badge value={row.is_deleted} on="bg-red-100 text-red-700" off="bg-green-100 text-green-700" />
                                        </td>
                                    )}
                                    {col('visa') && (
                                        <td className="px-2 py-1 border-r border-gray-100">
                                            <div className="flex items-center gap-1.5">
                                                <Badge value={row.visa_mentioned} on="bg-teal-100 text-teal-700" off="bg-gray-100 text-gray-500" />
                                                {row.visa_mentioned && row.visa_example_job_url && (
                                                    <a href={row.visa_example_job_url} target="_blank" rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800" title="View visa example job">
                                                        <ExternalLink size={12} />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                    {col('checked') && (
                                        <td className="px-2 py-1 border-r border-gray-100 whitespace-nowrap">
                                            {row.manual_check_done ? (
                                                <span className="flex items-center gap-1">
                                                    <span className="text-[9px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-medium">Done</span>
                                                    {row.last_manual_check_date && (
                                                        <span className="text-[9px] text-gray-400">
                                                            {new Date(row.last_manual_check_date).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                    {row.checked_by && userMap[row.checked_by] && (
                                                        <span className="text-[9px] text-gray-400">{userMap[row.checked_by]}</span>
                                                    )}
                                                </span>
                                            ) : <span className="text-[9px] text-gray-300">—</span>}
                                        </td>
                                    )}
                                    {col('has_it_jobs') && (
                                        <td className="px-2 py-1 border-r border-gray-100">
                                            {row.has_it_jobs === true
                                                ? <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Yes</span>
                                                : row.has_it_jobs === false
                                                ? <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">No</span>
                                                : <span className="text-[9px] text-gray-300">—</span>}
                                        </td>
                                    )}
                                    {col('estimated_it_jobs') && (
                                        <td className="px-2 py-1 border-r border-gray-100 text-center">
                                            {row.estimated_it_jobs != null
                                                ? <span className="text-[10px] font-medium text-gray-700">{row.estimated_it_jobs}</span>
                                                : <span className="text-[9px] text-gray-300">—</span>}
                                        </td>
                                    )}
                                    {col('checked_by_col') && (
                                        <td className="px-2 py-1 border-r border-gray-100">
                                            {row.checked_by && userMap[row.checked_by]
                                                ? <span className="text-[10px] text-gray-600">{userMap[row.checked_by]}</span>
                                                : <span className="text-[9px] text-gray-300">—</span>}
                                        </td>
                                    )}
                                    {col('overall_jobs') && (
                                        <td className="px-2 py-1 border-r border-gray-100 text-center">
                                            {row.overall_jobs_count > 0
                                                ? <span className="text-[10px] font-medium text-gray-700">{row.overall_jobs_count}</span>
                                                : <span className="text-[9px] text-gray-300">0</span>}
                                        </td>
                                    )}
                                    {col('it_jobs_count') && (
                                        <td className="px-2 py-1 border-r border-gray-100 text-center">
                                            {row.it_jobs_count > 0
                                                ? <span className="text-[10px] font-medium text-blue-700">{row.it_jobs_count}</span>
                                                : <span className="text-[9px] text-gray-300">0</span>}
                                        </td>
                                    )}
                                    {col('assigned_to_col') && (
                                        <td className="px-2 py-1 border-r border-gray-100">
                                            {row.assigned_to && userMap[row.assigned_to]
                                                ? <span className="text-[10px] text-gray-600">{userMap[row.assigned_to]}</span>
                                                : row.assigned_to
                                                ? <span className="text-[10px] text-gray-400 font-mono truncate block max-w-[80px]" title={row.assigned_to}>{row.assigned_to}</span>
                                                : <span className="text-[9px] text-gray-300">—</span>}
                                        </td>
                                    )}
                                    {col('offers_freelance') && (
                                        <td className="px-2 py-1 border-r border-gray-100">
                                            {row.offers_freelance === true
                                                ? <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Yes</span>
                                                : row.offers_freelance === false
                                                ? <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">No</span>
                                                : <span className="text-[9px] text-gray-300">—</span>}
                                        </td>
                                    )}
                                    {col('should_apply') && (
                                        <td className="px-2 py-1 border-r border-gray-100">
                                            {row.should_apply
                                                ? <span className="text-[9px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-medium">Yes</span>
                                                : <span className="text-[9px] text-gray-300">—</span>}
                                        </td>
                                    )}
                                    {col('cv_submitted') && (
                                        <td className="px-2 py-1 border-r border-gray-100 whitespace-nowrap">
                                            {row.cv_submitted_count > 0
                                                ? <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                                                    {row.cv_submitted_count} job{row.cv_submitted_count > 1 ? 's' : ''}{row.cv_submitted_at ? ` · ${timeAgo(row.cv_submitted_at)}` : ''}
                                                  </span>
                                                : <span className="text-[9px] text-gray-300">—</span>}
                                        </td>
                                    )}
                                    <td className="px-2 py-1">
                                        <div className="flex items-center gap-1.5">
                                            <button onClick={() => setManualChecking(row)} title="Apply Manual Check"
                                                className="text-gray-400 hover:text-teal-600"><ClipboardCheck size={12} /></button>
                                            <button onClick={() => setAddingJobsFor(row)} title="Add Jobs"
                                                className="text-gray-400 hover:text-teal-600"><BriefcaseBusiness size={12} /></button>
                                            <a href={`/jobs/listed-jobs?company_id=${encodeURIComponent(row.id)}`} target="_blank" rel="noopener noreferrer" title="View all jobs for this company"
                                                className="text-gray-400 hover:text-indigo-600"><ListChecks size={12} /></a>
                                            <a href={`/jobs/cvs?company_id=${encodeURIComponent(row.id)}`} target="_blank" rel="noopener noreferrer" title="View all CVs for this company"
                                                className="text-gray-400 hover:text-purple-600"><FileText size={12} /></a>
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
            <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">{total.toLocaleString()} records</span>
                    <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1) }}
                        className="border border-gray-300 rounded px-1.5 py-0.5 text-[10px] bg-white focus:outline-none">
                        {LIMIT_OPTIONS.map(o => <option key={o} value={o}>{o.toLocaleString()} / page</option>)}
                    </select>
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400 mr-1">Page {page} of {totalPages}</span>
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
                )}
            </div>

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
                    userMap={userMap}
                />
            )}
            {manualChecking && (
                <ManualCheckModal
                    company={manualChecking}
                    currentUserId={currentUserId}
                    currentUserUUID={userList.find(u => u.userid === currentUserId)?.id}
                    onClose={() => setManualChecking(null)}
                    onSaved={() => { setManualChecking(null); refresh() }}
                />
            )}
            {assigning && (
                <AssignModal
                    filters={applied}
                    totalFiltered={total}
                    users={userList}
                    onClose={() => setAssigning(false)}
                    onDone={() => { setAssigning(false); refresh() }}
                />
            )}
        </div>
    )
}
