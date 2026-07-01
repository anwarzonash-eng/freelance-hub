'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, ExternalLink, Search, ChevronDown, Briefcase, FileText, Eye, Building2, X, Copy, Link } from 'lucide-react'
import { getAllJobs, getDistinctJobValues } from '@/app/api_handlers/api/sponsored-jobs.api'
import { getAllCompanies } from '@/app/api_handlers/api/sponsored-companies.api'
import { getAllCVs } from '@/app/api_handlers/api/job-cvs.api'
import { listAuthUsers } from '@/app/api_handlers/api/auth.api'
import JobCVModal from '@/app/components/jobs/JobCVModal'
import JobViewModal from '@/app/components/jobs/JobViewModal'
import { ApplicationStatusIcon, APPLICATION_STATUS_OPTIONS } from '@/app/components/jobs/JobPreviewEdit'
import ContextMenu, { ContextMenuItem } from '@/app/components/jobs/ContextMenu'
import { timeAgo } from '@/app/utils/time'

const LIMIT_OPTIONS = [25, 50, 100, 200]
const EMPTY_FILTERS = { keyword: '', is_job_sponsored: '', type: '', job_category: '', company_id: '', has_cv: false, cv_submitted: '', application_status: '', job_id: '' }
const APP_STATUS_FILTER_OPTIONS = [{ value: 'none', label: 'Not tracked' }, ...APPLICATION_STATUS_OPTIONS.filter(o => o.value)]

function filtersToParams(f: typeof EMPTY_FILTERS, page: number, limit: number): URLSearchParams {
    const params = new URLSearchParams()
    if (f.keyword) params.set('keyword', f.keyword)
    if (f.is_job_sponsored) params.set('is_job_sponsored', f.is_job_sponsored)
    if (f.type) params.set('type', f.type)
    if (f.job_category) params.set('job_category', f.job_category)
    if (f.company_id) params.set('company_id', f.company_id)
    if (f.has_cv) params.set('has_cv', 'true')
    if (f.cv_submitted) params.set('cv_submitted', f.cv_submitted)
    if (f.application_status) params.set('application_status', f.application_status)
    if (f.job_id) params.set('job_id', f.job_id)
    if (page !== 1) params.set('page', String(page))
    if (limit !== 50) params.set('limit', String(limit))
    return params
}

function SubmissionBadge({ row, userMap }: { row: any; userMap: Record<string, string> }) {
    if (!row.is_cv_submitted) {
        return <span className="text-[9px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-medium">Not submitted</span>
    }
    const ago = timeAgo(row.cv_submitted_at)
    const submitterName = row.cv_submitted_by ? userMap[row.cv_submitted_by] : null
    return (
        <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium whitespace-nowrap" title={row.cv_email_sent || ''}>
            Submitted{ago ? ` · ${ago}` : ''}{submitterName ? ` · ${submitterName}` : ''}
        </span>
    )
}

function SponsorBadge({ value }: { value: string }) {
    const v = value?.toLowerCase()
    const cls = v === 'yes' ? 'bg-green-100 text-green-700'
        : v === 'no' ? 'bg-red-100 text-red-700'
        : 'bg-gray-100 text-gray-500'
    return <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${cls}`}>{value || 'unknown'}</span>
}

function TypeBadge({ value }: { value: string }) {
    const cls = value === 'remote' ? 'bg-teal-100 text-teal-700'
        : value === 'hybrid' ? 'bg-blue-100 text-blue-700'
        : 'bg-orange-100 text-orange-700'
    return value ? <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${cls} capitalize`}>{value}</span> : null
}

export default function ListedJobsPage() {
    const router = useRouter()
    const [data, setData] = useState<any[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(50)
    const [totalPages, setTotalPages] = useState(1)
    const [loading, setLoading] = useState(false)

    const [cvJob, setCvJob] = useState<any | null>(null)
    const [viewingJob, setViewingJob] = useState<any | null>(null)
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; row: any } | null>(null)
    const [cvMap, setCvMap] = useState<Record<number, any>>({})
    const [userMap, setUserMap] = useState<Record<string, string>>({})

    const [filters, setFilters] = useState({ ...EMPTY_FILTERS })
    const [applied, setApplied] = useState({ ...EMPTY_FILTERS })
    const hydratedFromUrl = useRef(false)

    const [categories, setCategories] = useState<string[]>([])
    const [jobTypes, setJobTypes] = useState<string[]>([])
    const [showCatDd, setShowCatDd] = useState(false)
    const [showTypeDd, setShowTypeDd] = useState(false)
    const [showAppStatusDd, setShowAppStatusDd] = useState(false)

    const [companyQuery, setCompanyQuery] = useState('')
    const [companyResults, setCompanyResults] = useState<{ id: string; name: string }[]>([])
    const [showCompanyDd, setShowCompanyDd] = useState(false)
    const companyDdRef = useRef<HTMLDivElement>(null)

    const loadCVs = useCallback(async () => {
        const res: any = await getAllCVs()
        const list: any[] = Array.isArray(res?.data ?? res) ? (res?.data ?? res) : []
        const map: Record<number, any> = {}
        list.forEach(cv => { if (cv.job_id) map[cv.job_id] = cv })
        setCvMap(map)
        return map
    }, [])

    const load = useCallback(async (pg: number, lim: number, af: typeof EMPTY_FILTERS, latestCvMap?: Record<number, any>) => {
        setLoading(true)
        try {
            const q: any = { page: pg, limit: lim }
            if (af.keyword) q.keyword = af.keyword
            if (af.is_job_sponsored) q.is_job_sponsored = af.is_job_sponsored
            if (af.type) q.type = af.type
            if (af.job_category) q.job_category = af.job_category
            if (af.company_id) q.company_id = af.company_id
            if (af.cv_submitted) q.cv_submitted = af.cv_submitted
            if (af.application_status) q.application_status = af.application_status
            if (af.job_id) q.job_ids = af.job_id
            if (af.has_cv) {
                const map = latestCvMap ?? cvMap
                const ids = Object.keys(map).join(',')
                if (!ids) { setData([]); setTotal(0); setTotalPages(1); return }
                q.job_ids = ids
            }
            const res: any = await getAllJobs(q)
            const payload = res?.data ?? res
            setData(Array.isArray(payload?.data) ? payload.data : [])
            setTotal(payload?.total ?? 0)
            setTotalPages(payload?.totalPages ?? 1)
        } finally {
            setLoading(false)
        }
    }, [cvMap])

    // Hydrate filters/page/limit from the URL on first load (so a copied link reproduces the same view),
    // falling back to id / company_id for cross-page navigation links.
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search)
        const hydratedCompanyId = searchParams.get('company_id') || ''
        const hydrated = {
            keyword: searchParams.get('keyword') || searchParams.get('id') || '',
            is_job_sponsored: searchParams.get('is_job_sponsored') || '',
            type: searchParams.get('type') || '',
            job_category: searchParams.get('job_category') || '',
            company_id: hydratedCompanyId,
            has_cv: searchParams.get('has_cv') === 'true',
            cv_submitted: searchParams.get('cv_submitted') || '',
            application_status: searchParams.get('application_status') || '',
            job_id: searchParams.get('job_id') || '',
        }
        const hydratedPage = Number(searchParams.get('page')) || 1
        const hydratedLimit = Number(searchParams.get('limit')) || 50

        setFilters(hydrated)
        setApplied(hydrated)
        setPage(hydratedPage)
        setLimit(hydratedLimit)

        if (hydratedCompanyId) {
            getAllCompanies({ keyword: hydratedCompanyId, limit: 1 }).then((res: any) => {
                const payload = res?.data ?? res
                const found = (payload?.data ?? [])[0]
                setCompanyQuery(found?.organisation_name || hydratedCompanyId)
            }).catch(() => setCompanyQuery(hydratedCompanyId))
        }

        loadCVs().then(map => load(hydratedPage, hydratedLimit, hydrated, map)).finally(() => {
            hydratedFromUrl.current = true
        })
    }, [])

    useEffect(() => {
        if (!hydratedFromUrl.current) return
        load(page, limit, applied)
        const qs = filtersToParams(applied, page, limit).toString()
        router.replace(qs ? `/jobs/listed-jobs?${qs}` : '/jobs/listed-jobs')
    }, [page, limit, applied, load, router])

    useEffect(() => {
        getDistinctJobValues().then((res: any) => {
            const p = res?.data ?? res
            setCategories(p?.job_categories ?? [])
            setJobTypes(p?.types ?? [])
        }).catch(() => { })

        listAuthUsers().then((res: any) => {
            const list = res?.data ?? res
            if (Array.isArray(list)) {
                const map: Record<string, string> = {}
                list.forEach((u: any) => { if (u.id) map[u.id] = u.userid || u.id })
                setUserMap(map)
            }
        }).catch(() => { })
    }, [])

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (companyDdRef.current && !companyDdRef.current.contains(e.target as Node)) setShowCompanyDd(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Debounced company search-as-you-type (queries the backend so it works even with a huge company list).
    useEffect(() => {
        if (!showCompanyDd) return
        const q = companyQuery.trim()
        const t = setTimeout(() => {
            getAllCompanies({ keyword: q, limit: 20 }).then((res: any) => {
                const payload = res?.data ?? res
                const rows = Array.isArray(payload?.data) ? payload.data : []
                setCompanyResults(rows.map((c: any) => ({ id: c.id, name: c.organisation_name || c.id })))
            }).catch(() => setCompanyResults([]))
        }, 250)
        return () => clearTimeout(t)
    }, [companyQuery, showCompanyDd])

    const selectCompany = (c: { id: string; name: string }) => {
        setFilters(f => ({ ...f, company_id: c.id }))
        setCompanyQuery(c.name)
        setShowCompanyDd(false)
    }

    const clearCompany = () => {
        setFilters(f => ({ ...f, company_id: '' }))
        setCompanyQuery('')
    }

    const applyFilters = () => { setPage(1); setApplied({ ...filters }) }
    const clearFilters = () => {
        const e = { ...EMPTY_FILTERS }
        setFilters(e); setApplied(e); setPage(1); setLimit(50)
        setCompanyQuery('')
    }

    const toggleType = (value: string) => {
        const cur = filters.type.split(',').filter(Boolean)
        const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value]
        setFilters(f => ({ ...f, type: next.join(',') }))
    }
    const toggleCat = (value: string) => {
        const cur = filters.job_category.split(',').filter(Boolean)
        const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value]
        setFilters(f => ({ ...f, job_category: next.join(',') }))
    }
    const toggleAppStatus = (value: string) => {
        const cur = filters.application_status.split(',').filter(Boolean)
        const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value]
        setFilters(f => ({ ...f, application_status: next.join(',') }))
    }

    const ddCls = 'absolute z-20 top-full mt-1 left-0 bg-white border border-gray-200 rounded shadow-lg p-2 space-y-1 min-w-[180px] max-h-60 overflow-y-auto'
    const knownTypes = ['hybrid', 'remote', 'onsite']
    const allTypes = [...knownTypes, ...jobTypes.filter(t => !knownTypes.includes(t))]

    return (
        <div className="p-3 bg-white min-h-screen">
            <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-2">
                <div className="flex items-center gap-2">
                    <Briefcase size={14} className="text-gray-500" />
                    <h1 className="text-sm font-semibold text-gray-800">Listed Jobs</h1>
                    <span className="text-[10px] text-gray-400">{total} total</span>
                </div>
                <button onClick={() => load(page, limit, applied)} disabled={loading}
                    className="flex items-center gap-1 text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50 text-gray-600">
                    <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {/* Filter bar */}
            <div className="border border-gray-200 rounded p-2 mb-2 bg-gray-50">
                <div className="flex items-end gap-1.5 flex-wrap">
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Search</label>
                        <div className="relative">
                            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                className={`border rounded pl-6 pr-2 py-1 text-xs focus:outline-none w-52 transition-colors ${filters.keyword ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}
                                placeholder="Title, description, company, location…"
                                value={filters.keyword}
                                onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && applyFilters()}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Sponsorship</label>
                        <select value={filters.is_job_sponsored}
                            onChange={e => setFilters(f => ({ ...f, is_job_sponsored: e.target.value }))}
                            className={`border rounded px-2 py-1 text-xs focus:outline-none transition-colors ${filters.is_job_sponsored ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}>
                            <option value="">All</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                            <option value="unknown">Unknown</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-0.5 relative">
                        <label className="text-[10px] text-gray-400 uppercase">Type</label>
                        <button onClick={() => { setShowTypeDd(p => !p); setShowCatDd(false); setShowAppStatusDd(false) }}
                            className={`flex items-center gap-1 border rounded px-2 py-1 text-xs text-gray-700 min-w-[120px] transition-colors ${filters.type ? 'border-blue-500 bg-blue-100 hover:bg-blue-100' : 'border-gray-300 bg-white hover:bg-gray-50'}`}>
                            Type{filters.type ? ` (${filters.type.split(',').filter(Boolean).length})` : ''}
                            <ChevronDown size={11} className="ml-auto text-gray-400" />
                        </button>
                        {showTypeDd && (
                            <div className={ddCls}>
                                {allTypes.map(t => (
                                    <label key={t} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                                        <input type="checkbox" className="w-3 h-3"
                                            checked={filters.type.split(',').filter(Boolean).includes(t)}
                                            onChange={() => toggleType(t)} />
                                        <span className="text-xs text-gray-700 capitalize">{t}</span>
                                    </label>
                                ))}
                                <div className="border-t border-gray-100 pt-1">
                                    <button onClick={() => { setFilters(f => ({ ...f, type: '' })); setShowTypeDd(false) }}
                                        className="text-[10px] text-gray-400 hover:text-gray-700 w-full text-left">Clear</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-0.5 relative">
                        <label className="text-[10px] text-gray-400 uppercase">Category</label>
                        <button onClick={() => { setShowCatDd(p => !p); setShowTypeDd(false); setShowAppStatusDd(false) }}
                            className={`flex items-center gap-1 border rounded px-2 py-1 text-xs text-gray-700 min-w-[140px] transition-colors ${filters.job_category ? 'border-blue-500 bg-blue-100 hover:bg-blue-100' : 'border-gray-300 bg-white hover:bg-gray-50'}`}>
                            Category{filters.job_category ? ` (${filters.job_category.split(',').filter(Boolean).length})` : ''}
                            <ChevronDown size={11} className="ml-auto text-gray-400" />
                        </button>
                        {showCatDd && (
                            <div className={ddCls}>
                                {categories.length === 0 && <p className="text-[10px] text-gray-400">No categories yet</p>}
                                {categories.map(c => (
                                    <label key={c} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                                        <input type="checkbox" className="w-3 h-3"
                                            checked={filters.job_category.split(',').filter(Boolean).includes(c)}
                                            onChange={() => toggleCat(c)} />
                                        <span className="text-xs text-gray-700">{c}</span>
                                    </label>
                                ))}
                                <div className="border-t border-gray-100 pt-1">
                                    <button onClick={() => { setFilters(f => ({ ...f, job_category: '' })); setShowCatDd(false) }}
                                        className="text-[10px] text-gray-400 hover:text-gray-700 w-full text-left">Clear</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-0.5 relative" ref={companyDdRef}>
                        <label className="text-[10px] text-gray-400 uppercase">Company</label>
                        <div className="relative">
                            <input
                                className={`border rounded pl-2 pr-6 py-1 text-xs focus:outline-none w-44 transition-colors ${filters.company_id ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}
                                placeholder="Search company by id or name…"
                                value={companyQuery}
                                onFocus={() => setShowCompanyDd(true)}
                                onChange={e => {
                                    setCompanyQuery(e.target.value)
                                    setShowCompanyDd(true)
                                    if (filters.company_id) setFilters(f => ({ ...f, company_id: '' }))
                                }}
                            />
                            {(companyQuery || filters.company_id) && (
                                <button onClick={clearCompany} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <X size={11} />
                                </button>
                            )}
                        </div>
                        {showCompanyDd && (
                            <div className="absolute z-20 top-full mt-1 left-0 bg-white border border-gray-200 rounded shadow-lg p-1 min-w-[220px] max-h-60 overflow-y-auto">
                                {companyResults.length === 0 && (
                                    <p className="text-[10px] text-gray-400 px-2 py-1">No matching companies</p>
                                )}
                                {companyResults.map(c => (
                                    <button key={c.id} type="button" onClick={() => selectCompany(c)}
                                        className="w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 rounded truncate">
                                        {c.name}
                                        <span className="text-[9px] text-gray-400 ml-1">({c.id})</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className={`flex flex-col gap-0.5 mt-auto px-2 py-1 rounded transition-colors ${filters.has_cv ? 'bg-blue-100' : ''}`}>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700">
                            <input type="checkbox" className="w-3.5 h-3.5"
                                checked={filters.has_cv}
                                onChange={e => setFilters(f => ({ ...f, has_cv: e.target.checked }))} />
                            Has CV
                        </label>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">CV Submission</label>
                        <select value={filters.cv_submitted}
                            onChange={e => setFilters(f => ({ ...f, cv_submitted: e.target.value }))}
                            className={`border rounded px-2 py-1 text-xs focus:outline-none transition-colors ${filters.cv_submitted ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}>
                            <option value="">All</option>
                            <option value="true">Submitted</option>
                            <option value="false">Not Submitted</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-0.5 relative">
                        <label className="text-[10px] text-gray-400 uppercase">App. Status</label>
                        <button onClick={() => { setShowAppStatusDd(p => !p); setShowTypeDd(false); setShowCatDd(false) }}
                            className={`flex items-center gap-1 border rounded px-2 py-1 text-xs text-gray-700 min-w-[140px] transition-colors ${filters.application_status ? 'border-blue-500 bg-blue-100 hover:bg-blue-100' : 'border-gray-300 bg-white hover:bg-gray-50'}`}>
                            App. Status{filters.application_status ? ` (${filters.application_status.split(',').filter(Boolean).length})` : ''}
                            <ChevronDown size={11} className="ml-auto text-gray-400" />
                        </button>
                        {showAppStatusDd && (
                            <div className={ddCls}>
                                {APP_STATUS_FILTER_OPTIONS.map(o => (
                                    <label key={o.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                                        <input type="checkbox" className="w-3 h-3"
                                            checked={filters.application_status.split(',').filter(Boolean).includes(o.value)}
                                            onChange={() => toggleAppStatus(o.value)} />
                                        <span className="text-xs text-gray-700">{o.label}</span>
                                    </label>
                                ))}
                                <div className="border-t border-gray-100 pt-1">
                                    <button onClick={() => { setFilters(f => ({ ...f, application_status: '' })); setShowAppStatusDd(false) }}
                                        className="text-[10px] text-gray-400 hover:text-gray-700 w-full text-left">Clear</button>
                                </div>
                            </div>
                        )}
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
            <div className="border border-gray-200 rounded overflow-x-auto min-h-[60vh]">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-300">
                            <th className="px-2 py-1.5 text-left font-medium text-gray-500 border-r border-gray-200 w-6">#</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Job Title</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Company</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Location</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Type</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Category</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Sponsored</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Tech Skills</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Closes</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Submission</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Status</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 flex items-center justify-between">
                                <span>Actions</span>
                                <button
                                    onClick={() => load(page, limit, applied)}
                                    disabled={loading}
                                    title="Refresh results with current filter"
                                    className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan={12} className="text-center py-10 text-gray-400">
                                <div className="flex items-center justify-center gap-2"><RefreshCw size={13} className="animate-spin" /> Loading…</div>
                            </td></tr>
                        )}
                        {!loading && data.length === 0 && (
                            <tr><td colSpan={12} className="text-center py-10 text-gray-400">No jobs found.</td></tr>
                        )}
                        {!loading && data.map((row, idx) => {
                            const rowNum = (page - 1) * limit + idx + 1
                            const techSkills: string[] = row.tech_skills ?? []
                            const shown = techSkills.slice(0, 2)
                            const extra = techSkills.length - shown.length
                            return (
                                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-context-menu"
                                    onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, row }) }}>
                                    <td className="px-2 py-1.5 text-gray-400 border-r border-gray-100">{rowNum}</td>
                                    <td className="px-2 py-1.5 border-r border-gray-100 max-w-[200px]">
                                        <a href={row.link} target="_blank" rel="noopener noreferrer"
                                            className="font-medium text-blue-600 hover:underline flex items-center gap-0.5">
                                            <span className="truncate">{row.job_title}</span>
                                            <ExternalLink size={9} className="shrink-0" />
                                        </a>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100 max-w-[140px]">
                                        <div className="truncate text-gray-700">{row.company_name}</div>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100 max-w-[130px]">
                                        <div className="truncate text-gray-600">{row.location}</div>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100 whitespace-nowrap">
                                        <TypeBadge value={row.type} />
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100 max-w-[130px]">
                                        <div className="truncate text-gray-600">{row.job_category}</div>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100 whitespace-nowrap">
                                        <SponsorBadge value={row.is_job_sponsored} />
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100 max-w-[180px]">
                                        <div className="flex flex-nowrap gap-0.5 overflow-hidden">
                                            {shown.map((s, i) => (
                                                <span key={i} className="text-[9px] bg-gray-100 text-gray-600 px-1 py-0.5 rounded shrink-0 truncate max-w-[70px]">{s}</span>
                                            ))}
                                            {extra > 0 && <span className="text-[9px] text-gray-400 shrink-0">+{extra}</span>}
                                        </div>
                                    </td>
                                    <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap text-[10px] border-r border-gray-100">
                                        {row.application_closing_date || '—'}
                                    </td>
                                    <td className="px-2 py-1.5 whitespace-nowrap border-r border-gray-100">
                                        <SubmissionBadge row={row} userMap={userMap} />
                                    </td>
                                    <td className="px-2 py-1.5 whitespace-nowrap border-r border-gray-100 text-center">
                                        <ApplicationStatusIcon job={row} />
                                    </td>
                                    <td className="px-2 py-1.5 whitespace-nowrap">
                                        <div className="flex items-center gap-0.5">
                                            <button
                                                onClick={() => setViewingJob(row)}
                                                title="View job details"
                                                className="flex items-center p-1.5 border border-gray-300 rounded hover:bg-gray-50 text-gray-600">
                                                <Eye size={12} />
                                            </button>
                                            <button
                                                onClick={() => setCvJob(row)}
                                                title="Create CV for this job"
                                                className="flex items-center p-1.5 border border-gray-300 rounded hover:bg-gray-50 text-gray-600">
                                                <FileText size={12} />
                                            </button>
                                            {row.company_id && (
                                                <a
                                                    href={`/jobs/companies?id=${encodeURIComponent(row.company_id)}`}
                                                    title="View this company"
                                                    className="flex items-center p-1.5 border border-gray-300 rounded hover:bg-gray-50 text-gray-500">
                                                    <Building2 size={12} />
                                                </a>
                                            )}
                                            {cvMap[row.id] && (
                                                <a
                                                    href={`/viewCV/${cvMap[row.id].id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title={`View CV — ${cvMap[row.id].applicant_name}`}
                                                    className="flex items-center p-1.5 bg-teal-50 border border-teal-300 text-teal-700 rounded hover:bg-teal-100">
                                                    <ExternalLink size={12} />
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {ctxMenu && (() => {
                const r = ctxMenu.row
                const cv = cvMap[r.id]
                const items: ContextMenuItem[] = [
                    { icon: <Eye size={13} />, label: 'View Job', onClick: () => setViewingJob(r) },
                    { icon: <FileText size={13} />, label: 'Create CV', onClick: () => setCvJob(r) },
                    ...(cv ? [{ icon: <ExternalLink size={13} />, label: 'View CV', onClick: () => window.open(`/viewCV/${cv.id}`, '_blank') }] : []),
                    ...(r.company_id ? [{ icon: <Building2 size={13} />, label: 'View Company', onClick: () => window.open(`/jobs/companies?keyword=${encodeURIComponent(r.company_id)}`, '_blank') }] : []),
                    { icon: <Link size={13} />, label: 'Copy Link', separator: true, onClick: () => navigator.clipboard.writeText(`${window.location.origin}/jobs/listed-jobs?job_id=${r.id}`) },
                ]
                return <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={items} onClose={() => setCtxMenu(null)} />
            })()}

            {viewingJob && (
                <JobViewModal
                    job={viewingJob}
                    onClose={() => setViewingJob(null)}
                    onJobSaved={() => { setViewingJob(null); load(page, limit, applied) }}
                    userMap={userMap}
                />
            )}

            {cvJob && (
                <JobCVModal
                    job={cvJob}
                    onClose={() => setCvJob(null)}
                    onSaved={loadCVs}
                />
            )}

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
        </div>
    )
}
