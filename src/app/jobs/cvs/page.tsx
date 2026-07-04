'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, ExternalLink, Pencil, Trash2, FileText, Search, X, Link, Briefcase, Building2 } from 'lucide-react'
import { useColResize } from '@/app/hooks/useColResize'

function SponsorBadge({ value }: { value: string }) {
    const v = value?.toLowerCase()
    const cls = v === 'yes' ? 'bg-green-100 text-green-700'
        : v === 'no' ? 'bg-red-100 text-red-700'
        : 'bg-gray-100 text-gray-500'
    return <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${cls}`}>{value}</span>
}
import { getAllCVs, deleteCV } from '@/app/api_handlers/api/job-cvs.api'
import { getAllApplicants } from '@/app/api_handlers/api/job-applicants.api'
import { getAllCompanies } from '@/app/api_handlers/api/sponsored-companies.api'
import { listAuthUsers } from '@/app/api_handlers/api/auth.api'
import JobCVModal from '@/app/components/jobs/JobCVModal'
import ContextMenu, { ContextMenuItem } from '@/app/components/jobs/ContextMenu'

const CV_STATUSES = [
    { value: 'cv_created', label: 'CV Created', cls: 'bg-gray-100 text-gray-600' },
    { value: 'cv_reviewed', label: 'CV Reviewed', cls: 'bg-yellow-100 text-yellow-700' },
    { value: 'cv_sent', label: 'CV Sent', cls: 'bg-green-100 text-green-700' },
]

function CvStatusBadge({ value }: { value: string }) {
    const s = CV_STATUSES.find(x => x.value === value)
    if (!s) return <span className="text-gray-300">—</span>
    return <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${s.cls}`}>{s.label}</span>
}

const CVS_COL_WIDTHS: Record<string, number> = {
    num: 36, cv_title: 200, applicant: 120, organisation: 140,
    sponsorship: 90, job_link: 70, email: 180, exp_yrs: 70,
    status: 100, created: 90, created_by: 90,
}

const EMPTY_FILTERS = {
    keyword: '',
    applicant_id: '',
    company_id: '',
    email: '',
    exp_yrs: '',
    created_by: '',
    status: '',
}
type CvFilters = typeof EMPTY_FILTERS

function filterCvs(list: any[], f: CvFilters) {
    let out = list

    const kw = f.keyword.trim().toLowerCase()
    if (kw) {
        const kwNum = Number(kw)
        const isExactNumber = kw !== '' && Number.isInteger(kwNum)
        out = out.filter(cv =>
            cv.cv_title?.toLowerCase().includes(kw) ||
            cv.applicant_name?.toLowerCase().includes(kw) ||
            cv.organization_name?.toLowerCase().includes(kw) ||
            (cv.company_id && String(cv.company_id).toLowerCase() === kw) ||
            (isExactNumber && (cv.id === kwNum || cv.job_id === kwNum))
        )
    }

    if (f.applicant_id) {
        out = out.filter(cv => String(cv.applicant_id ?? '') === f.applicant_id)
    }

    if (f.company_id) {
        out = out.filter(cv => String(cv.company_id ?? '') === f.company_id)
    }

    if (f.email.trim()) {
        const q = f.email.trim().toLowerCase()
        out = out.filter(cv => cv.selected_email?.toLowerCase().includes(q))
    }

    if (f.exp_yrs !== '') {
        const n = Number(f.exp_yrs)
        out = out.filter(cv => cv.years_of_experience === n)
    }

    if (f.created_by) {
        out = out.filter(cv => cv.created_by === f.created_by)
    }

    if (f.status) {
        out = out.filter(cv => (cv.status ?? 'cv_created') === f.status)
    }

    return out
}

function buildQueryString(f: CvFilters): string {
    const params = new URLSearchParams()
    Object.entries(f).forEach(([k, v]) => { if (v) params.set(k, v) })
    return params.toString()
}

export default function CvsPage() {
    const router = useRouter()
    const [allData, setAllData] = useState<any[]>([])
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [editingCV, setEditingCV] = useState<any | null>(null)
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; row: any } | null>(null)
    const [userMap, setUserMap] = useState<Record<string, string>>({})
    const [applicants, setApplicants] = useState<{ id: string; name: string }[]>([])

    const [filters, setFilters] = useState<CvFilters>({ ...EMPTY_FILTERS })
    const [companyQuery, setCompanyQuery] = useState('')
    const [companyResults, setCompanyResults] = useState<{ id: string; name: string }[]>([])
    const [showCompanyDd, setShowCompanyDd] = useState(false)
    const companyDdRef = useRef<HTMLDivElement>(null)
    const hydratedFromUrl = useRef(false)
    const { widths: colW, startResize } = useColResize(CVS_COL_WIDTHS, 'cvs_col_widths')

    const tableWidth = 120 + Object.keys(CVS_COL_WIDTHS).reduce((s, k) => s + (colW[k] ?? CVS_COL_WIDTHS[k] ?? 100), 0)

    const rh = (key: string) => (
        <div className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400/40 active:bg-blue-500/60 select-none"
            onMouseDown={e => startResize(key, e)} />
    )

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res: any = await getAllCVs()
            const payload = res?.data ?? res
            const list = Array.isArray(payload) ? payload : []
            setAllData(list)
            return list
        } finally {
            setLoading(false)
        }
    }, [])

    // Hydrate filters from the URL on first load (so a copied link reproduces the same view).
    useEffect(() => {
        load().then(() => {
            const searchParams = new URLSearchParams(window.location.search)
            const hydratedCompanyId = searchParams.get('company_id') || ''
            const fromUrl: CvFilters = {
                keyword: searchParams.get('keyword') || searchParams.get('id') || searchParams.get('job_id') || '',
                applicant_id: searchParams.get('applicant_id') || '',
                company_id: hydratedCompanyId,
                email: searchParams.get('email') || '',
                exp_yrs: searchParams.get('exp_yrs') || '',
                created_by: searchParams.get('created_by') || '',
                status: searchParams.get('status') || '',
            }
            hydratedFromUrl.current = true
            setFilters(fromUrl)

            if (hydratedCompanyId) {
                getAllCompanies({ keyword: hydratedCompanyId, limit: 1 }).then((res: any) => {
                    const payload = res?.data ?? res
                    const found = (payload?.data ?? [])[0]
                    setCompanyQuery(found?.organisation_name || hydratedCompanyId)
                }).catch(() => setCompanyQuery(hydratedCompanyId))
            }
        })
    }, [])

    useEffect(() => {
        listAuthUsers().then((res: any) => {
            const list = res?.data ?? res
            if (Array.isArray(list)) {
                const map: Record<string, string> = {}
                list.forEach((u: any) => { if (u.id) map[u.id] = u.userid || u.id })
                setUserMap(map)
            }
        }).catch(() => { })

        getAllApplicants().then((res: any) => {
            const list = res?.data ?? res
            if (Array.isArray(list)) {
                setApplicants(
                    list
                        .map((a: any) => ({ id: String(a.id), name: a.name || `Applicant #${a.id}` }))
                        .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))
                )
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

    // Debounced company search-as-you-type (queries the backend, same pattern as Listed Jobs).
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

    // Recompute the visible rows + keep the URL in sync whenever a filter changes.
    useEffect(() => {
        setData(filterCvs(allData, filters))
        if (!hydratedFromUrl.current) return
        const qs = buildQueryString(filters)
        router.replace(qs ? `/jobs/cvs?${qs}` : '/jobs/cvs')
    }, [allData, filters, router])

    const selectCompany = (c: { id: string; name: string }) => {
        setFilters(f => ({ ...f, company_id: c.id }))
        setCompanyQuery(c.name)
        setShowCompanyDd(false)
    }

    const clearCompany = () => {
        setFilters(f => ({ ...f, company_id: '' }))
        setCompanyQuery('')
    }

    const clearAllFilters = () => {
        setFilters({ ...EMPTY_FILTERS })
        setCompanyQuery('')
        router.replace('/jobs/cvs')
    }

    const activeFilterCount = Object.values(filters).filter(Boolean).length

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this CV?')) return
        await deleteCV(id)
        load()
    }

    return (
        <div className="p-3 bg-white min-h-screen">
            <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-2">
                <div className="flex items-center gap-2">
                    <FileText size={14} className="text-gray-500" />
                    <h1 className="text-sm font-semibold text-gray-800">CVs</h1>
                    <span className="text-[10px] text-gray-400">{data.length} / {allData.length} total</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => load()} disabled={loading}
                        className="flex items-center gap-1 text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50 text-gray-600">
                        <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            {/* Filter bar */}
            <div className="border border-gray-200 rounded p-2 mb-2 bg-gray-50">
                <div className="flex items-end gap-1.5 flex-wrap">
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Search</label>
                        <div className="relative">
                            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                className={`border rounded pl-6 pr-2 py-1 text-xs focus:outline-none w-56 transition-colors ${filters.keyword ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}
                                placeholder="CV title, applicant, company, job/company ID…"
                                value={filters.keyword}
                                onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Applicant</label>
                        <select
                            className={`border rounded px-2 py-1 text-xs focus:outline-none min-w-[140px] transition-colors ${filters.applicant_id ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}
                            value={filters.applicant_id}
                            onChange={e => setFilters(f => ({ ...f, applicant_id: e.target.value }))}
                        >
                            <option value="">All</option>
                            {applicants.map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
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

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Email</label>
                        <input
                            className={`border rounded px-2 py-1 text-xs focus:outline-none w-40 transition-colors ${filters.email ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}
                            placeholder="email@example.com"
                            value={filters.email}
                            onChange={e => setFilters(f => ({ ...f, email: e.target.value }))}
                        />
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Exp (yrs)</label>
                        <input
                            type="number"
                            min={0}
                            className={`border rounded px-2 py-1 text-xs focus:outline-none w-20 transition-colors ${filters.exp_yrs ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}
                            placeholder="e.g. 5"
                            value={filters.exp_yrs}
                            onChange={e => setFilters(f => ({ ...f, exp_yrs: e.target.value }))}
                        />
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Created By</label>
                        <select
                            className={`border rounded px-2 py-1 text-xs focus:outline-none min-w-[110px] transition-colors ${filters.created_by ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}
                            value={filters.created_by}
                            onChange={e => setFilters(f => ({ ...f, created_by: e.target.value }))}
                        >
                            <option value="">All</option>
                            {Object.entries(userMap).map(([id, name]) => (
                                <option key={id} value={id}>{name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Status</label>
                        <select
                            className={`border rounded px-2 py-1 text-xs focus:outline-none min-w-[110px] transition-colors ${filters.status ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}
                            value={filters.status}
                            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                        >
                            <option value="">All</option>
                            {CV_STATUSES.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>

                    {activeFilterCount > 0 && (
                        <button onClick={clearAllFilters} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-white mt-auto">
                            Clear ({activeFilterCount})
                        </button>
                    )}

                    {activeFilterCount > 0 && (
                        <span className="text-[10px] text-gray-400 mt-auto">
                            {data.length} result{data.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            </div>

            <div className="border border-gray-200 rounded overflow-x-auto min-h-[60vh]">
                <table className="text-xs border-collapse" style={{ tableLayout: 'fixed', width: tableWidth }}>
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-300">
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 flex items-center justify-between" style={{ width: 120 }}>
                                <span>Actions</span>
                                <button
                                    onClick={() => setData(filterCvs(allData, filters))}
                                    disabled={loading}
                                    title="Refresh results with current filter"
                                    className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                                </button>
                            </th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-500 border-r border-gray-200 relative overflow-hidden" style={{ width: colW.num }}>#&nbsp;{rh('num')}</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 relative overflow-hidden" style={{ width: colW.cv_title }}>CV Title{rh('cv_title')}</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 relative overflow-hidden" style={{ width: colW.applicant }}>Applicant{rh('applicant')}</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 relative overflow-hidden" style={{ width: colW.organisation }}>Organisation{rh('organisation')}</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 relative overflow-hidden" style={{ width: colW.sponsorship }}>Sponsorship{rh('sponsorship')}</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 relative overflow-hidden" style={{ width: colW.job_link }}>Job Link{rh('job_link')}</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 relative overflow-hidden" style={{ width: colW.email }}>Email{rh('email')}</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 relative overflow-hidden" style={{ width: colW.exp_yrs }}>Exp (yrs){rh('exp_yrs')}</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 relative overflow-hidden" style={{ width: colW.status }}>Status{rh('status')}</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 relative overflow-hidden" style={{ width: colW.created }}>Created{rh('created')}</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 relative overflow-hidden" style={{ width: colW.created_by }}>Created By{rh('created_by')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan={12} className="text-center py-10 text-gray-400" style={{ minWidth: tableWidth }}>
                                <div className="flex items-center justify-center gap-2"><RefreshCw size={13} className="animate-spin" /> Loading…</div>
                            </td></tr>
                        )}
                        {!loading && data.length === 0 && (
                            <tr><td colSpan={12} className="text-center py-10 text-gray-400">
                                {activeFilterCount > 0 ? 'No CVs match your filters.' : 'No CVs yet. Create one from the Listed Jobs page.'}
                            </td></tr>
                        )}
                        {!loading && data.map((row, idx) => (
                            <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-context-menu"
                                onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, row }) }}>
                                <td className="px-2 py-1.5 border-r border-gray-100">
                                    <div className="flex items-center gap-1">
                                        <a href={`/viewCV/${row.id}`} target="_blank" rel="noopener noreferrer"
                                            title="View CV"
                                            className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded">
                                            <ExternalLink size={12} />
                                        </a>
                                        {['cv_reviewed', 'cv_sent'].includes(row.status) ? (
                                            <span title="CV can't be altered" className="p-1 text-gray-300 cursor-not-allowed">
                                                <Pencil size={12} />
                                            </span>
                                        ) : (
                                            <button onClick={() => setEditingCV(row)} title="Edit CV"
                                                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                                                <Pencil size={12} />
                                            </button>
                                        )}
                                        {row.job_id && (
                                            <a href={`/jobs/listed-jobs?job_id=${row.job_id}`} title="View this job"
                                                className="p-1 text-gray-500 hover:text-teal-700 hover:bg-teal-50 rounded">
                                                <Briefcase size={12} />
                                            </a>
                                        )}
                                        {row.company_id && (
                                            <a href={`/jobs/companies?id=${encodeURIComponent(row.company_id)}`} title="View this company"
                                                className="p-1 text-gray-500 hover:text-indigo-700 hover:bg-indigo-50 rounded">
                                                <Building2 size={12} />
                                            </a>
                                        )}
                                        <button onClick={() => handleDelete(row.id)} title="Delete CV"
                                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </td>
                                <td className="px-2 py-1.5 text-gray-400 border-r border-gray-100 cursor-pointer select-none"
                                    title={`Click to copy ID: ${row.id}`}
                                    onClick={() => navigator.clipboard.writeText(String(row.id))}>
                                    {idx + 1}
                                </td>
                                <td className="px-2 py-1.5 border-r border-gray-100 max-w-[200px]">
                                    <div className="truncate font-medium text-gray-800">{row.cv_title || '—'}</div>
                                </td>
                                <td className="px-2 py-1.5 border-r border-gray-100">
                                    <div className="text-gray-700">{row.applicant_name || '—'}</div>
                                </td>
                                <td className="px-2 py-1.5 border-r border-gray-100 max-w-[140px]">
                                    <div className="truncate text-gray-600">{row.organization_name || '—'}</div>
                                </td>
                                <td className="px-2 py-1.5 border-r border-gray-100 whitespace-nowrap">
                                    {row.sponsorship ? <SponsorBadge value={row.sponsorship} /> : <span className="text-gray-300">—</span>}
                                </td>
                                <td className="px-2 py-1.5 border-r border-gray-100">
                                    {row.job_link ? (
                                        <a href={row.job_link} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-0.5 text-blue-500 hover:underline text-[10px]">
                                            <Link size={9} /> Link
                                        </a>
                                    ) : <span className="text-gray-300">—</span>}
                                </td>
                                <td className="px-2 py-1.5 border-r border-gray-100 max-w-[180px]">
                                    <div className="truncate text-gray-500">{row.selected_email || '—'}</div>
                                </td>
                                <td className="px-2 py-1.5 border-r border-gray-100 text-center text-gray-600">
                                    {row.years_of_experience ?? '—'}
                                </td>
                                <td className="px-2 py-1.5 border-r border-gray-100 whitespace-nowrap">
                                    <CvStatusBadge value={row.status ?? 'cv_created'} />
                                </td>
                                <td className="px-2 py-1.5 border-r border-gray-100 text-gray-400 text-[10px] whitespace-nowrap">
                                    {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}
                                </td>
                                <td className="px-2 py-1.5 border-r border-gray-100 text-gray-600 text-[10px] whitespace-nowrap">
                                    {row.created_by ? (userMap[row.created_by] || row.created_by) : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {ctxMenu && (() => {
                const r = ctxMenu.row
                const items: ContextMenuItem[] = [
                    { icon: <ExternalLink size={13} />, label: 'View CV', onClick: () => window.open(`/viewCV/${r.id}`, '_blank') },
                    { icon: <Pencil size={13} />, label: 'Edit CV', disabled: ['cv_reviewed', 'cv_sent'].includes(r.status), disabledTitle: "CV can't be altered", onClick: () => setEditingCV(r) },
                    ...(r.job_id ? [{ icon: <Briefcase size={13} />, label: 'View Job', onClick: () => window.open(`/jobs/listed-jobs?job_id=${r.job_id}`, '_blank') }] : []),
                    ...(r.company_id ? [{ icon: <Building2 size={13} />, label: 'View Company', onClick: () => window.open(`/jobs/companies?keyword=${encodeURIComponent(r.company_id)}`, '_blank') }] : []),
                    { icon: <Link size={13} />, label: 'Copy Link', separator: true, onClick: () => navigator.clipboard.writeText(`${window.location.origin}/viewCV/${r.id}`) },
                    { icon: <Trash2 size={13} />, label: 'Delete', variant: 'danger' as const, onClick: () => handleDelete(r.id) },
                ]
                return <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={items} onClose={() => setCtxMenu(null)} />
            })()}

            {editingCV && (
                <JobCVModal
                    cv={editingCV}
                    onClose={() => setEditingCV(null)}
                    onSaved={load}
                />
            )}
        </div>
    )
}
