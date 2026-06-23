'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { RefreshCw, ExternalLink, Search, ChevronDown, Briefcase, FileText, Eye, Building2 } from 'lucide-react'
import { getAllJobs, getDistinctJobValues } from '@/app/api_handlers/api/sponsored-jobs.api'
import { getAllCVs } from '@/app/api_handlers/api/job-cvs.api'
import { listAuthUsers } from '@/app/api_handlers/api/auth.api'
import JobCVModal from '@/app/components/jobs/JobCVModal'
import JobViewModal from '@/app/components/jobs/JobViewModal'
import { timeAgo } from '@/app/utils/time'

const LIMIT_OPTIONS = [25, 50, 100, 200]
const EMPTY_FILTERS = { keyword: '', is_job_sponsored: '', type: '', job_category: '', has_cv: false, cv_submitted: '' }

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
    return (
        <Suspense fallback={null}>
            <ListedJobsPageInner />
        </Suspense>
    )
}

function ListedJobsPageInner() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [data, setData] = useState<any[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(50)
    const [totalPages, setTotalPages] = useState(1)
    const [loading, setLoading] = useState(false)

    const [cvJob, setCvJob] = useState<any | null>(null)
    const [viewingJob, setViewingJob] = useState<any | null>(null)
    const [cvMap, setCvMap] = useState<Record<number, any>>({})
    const [userMap, setUserMap] = useState<Record<string, string>>({})

    const [filters, setFilters] = useState({ ...EMPTY_FILTERS })
    const [applied, setApplied] = useState({ ...EMPTY_FILTERS })

    const [categories, setCategories] = useState<string[]>([])
    const [jobTypes, setJobTypes] = useState<string[]>([])
    const [showCatDd, setShowCatDd] = useState(false)
    const [showTypeDd, setShowTypeDd] = useState(false)

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
            if (af.cv_submitted) q.cv_submitted = af.cv_submitted
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

    useEffect(() => {
        loadCVs().then(map => load(page, limit, applied, map))
    }, [])

    // Pick up id / company_id from the URL (cross-page navigation) and drop it into the keyword search.
    useEffect(() => {
        const urlKeyword = searchParams.get('id') || searchParams.get('company_id')
        if (urlKeyword) {
            setFilters(f => ({ ...f, keyword: urlKeyword }))
            setApplied(a => ({ ...a, keyword: urlKeyword }))
            setPage(1)
        }
    }, [])

    useEffect(() => { load(page, limit, applied) }, [page, limit, applied, load])

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

    const applyFilters = () => { setPage(1); setApplied({ ...filters }) }
    const clearFilters = () => {
        const e = { ...EMPTY_FILTERS }
        setFilters(e); setApplied(e); setPage(1)
        if (searchParams.get('id') || searchParams.get('company_id')) router.replace('/jobs/listed-jobs')
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
                                className={`border rounded pl-6 pr-2 py-1 text-xs focus:outline-none w-52 transition-colors ${filters.keyword ? 'border-blue-300 bg-blue-50' : 'border-gray-300 bg-white'}`}
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
                            className={`border rounded px-2 py-1 text-xs focus:outline-none transition-colors ${filters.is_job_sponsored ? 'border-blue-300 bg-blue-50' : 'border-gray-300 bg-white'}`}>
                            <option value="">All</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                            <option value="unknown">Unknown</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-0.5 relative">
                        <label className="text-[10px] text-gray-400 uppercase">Type</label>
                        <button onClick={() => { setShowTypeDd(p => !p); setShowCatDd(false) }}
                            className={`flex items-center gap-1 border rounded px-2 py-1 text-xs text-gray-700 min-w-[120px] transition-colors ${filters.type ? 'border-blue-300 bg-blue-50 hover:bg-blue-100' : 'border-gray-300 bg-white hover:bg-gray-50'}`}>
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
                        <button onClick={() => { setShowCatDd(p => !p); setShowTypeDd(false) }}
                            className={`flex items-center gap-1 border rounded px-2 py-1 text-xs text-gray-700 min-w-[140px] transition-colors ${filters.job_category ? 'border-blue-300 bg-blue-50 hover:bg-blue-100' : 'border-gray-300 bg-white hover:bg-gray-50'}`}>
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

                    <div className={`flex flex-col gap-0.5 mt-auto px-2 py-1 rounded transition-colors ${filters.has_cv ? 'bg-blue-50' : ''}`}>
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
                            className={`border rounded px-2 py-1 text-xs focus:outline-none transition-colors ${filters.cv_submitted ? 'border-blue-300 bg-blue-50' : 'border-gray-300 bg-white'}`}>
                            <option value="">All</option>
                            <option value="true">Submitted</option>
                            <option value="false">Not Submitted</option>
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
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Job Title</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Company</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Location</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Type</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Category</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Sponsored</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Tech Skills</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Closes</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Submission</th>
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
                            <tr><td colSpan={11} className="text-center py-10 text-gray-400">
                                <div className="flex items-center justify-center gap-2"><RefreshCw size={13} className="animate-spin" /> Loading…</div>
                            </td></tr>
                        )}
                        {!loading && data.length === 0 && (
                            <tr><td colSpan={11} className="text-center py-10 text-gray-400">No jobs found.</td></tr>
                        )}
                        {!loading && data.map((row, idx) => {
                            const rowNum = (page - 1) * limit + idx + 1
                            const techSkills: string[] = row.tech_skills ?? []
                            const shown = techSkills.slice(0, 4)
                            const extra = techSkills.length - shown.length
                            return (
                                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-2 py-1.5 text-gray-400 border-r border-gray-100">{rowNum}</td>
                                    <td className="px-2 py-1.5 border-r border-gray-100 max-w-[200px]">
                                        <a href={row.link} target="_blank" rel="noopener noreferrer"
                                            className="font-medium text-blue-600 hover:underline flex items-center gap-0.5">
                                            <span className="truncate">{row.job_title}</span>
                                            <ExternalLink size={9} className="shrink-0" />
                                        </a>
                                        {row.experience_required && (
                                            <div className="text-[10px] text-gray-400 mt-0.5">{row.experience_required}</div>
                                        )}
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
                                        <div className="flex flex-wrap gap-0.5">
                                            {shown.map((s, i) => (
                                                <span key={i} className="text-[9px] bg-gray-100 text-gray-600 px-1 py-0.5 rounded">{s}</span>
                                            ))}
                                            {extra > 0 && <span className="text-[9px] text-gray-400">+{extra}</span>}
                                        </div>
                                    </td>
                                    <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap text-[10px] border-r border-gray-100">
                                        {row.application_closing_date || '—'}
                                    </td>
                                    <td className="px-2 py-1.5 whitespace-nowrap border-r border-gray-100">
                                        <SubmissionBadge row={row} userMap={userMap} />
                                    </td>
                                    <td className="px-2 py-1.5 whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setViewingJob(row)}
                                                title="View job details"
                                                className="flex items-center gap-1 text-[10px] px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-600">
                                                <Eye size={10} /> View
                                            </button>
                                            <button
                                                onClick={() => setCvJob(row)}
                                                title="Create CV for this job"
                                                className="flex items-center gap-1 text-[10px] px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-600">
                                                <FileText size={10} /> CV
                                            </button>
                                            {row.company_id && (
                                                <a
                                                    href={`/jobs/companies?id=${encodeURIComponent(row.company_id)}`}
                                                    title="View this company"
                                                    className="flex items-center p-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-500">
                                                    <Building2 size={10} />
                                                </a>
                                            )}
                                            {cvMap[row.id] && (
                                                <a
                                                    href={`/viewCV/${cvMap[row.id].id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title={`View CV — ${cvMap[row.id].applicant_name}`}
                                                    className="flex items-center gap-1 text-[10px] px-2 py-1 bg-teal-50 border border-teal-300 text-teal-700 rounded hover:bg-teal-100">
                                                    <ExternalLink size={10} /> View
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
