'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, ExternalLink, Pencil, Trash2, FileText, Search, X, Plus, Link, Briefcase, Building2 } from 'lucide-react'

function SponsorBadge({ value }: { value: string }) {
    const v = value?.toLowerCase()
    const cls = v === 'yes' ? 'bg-green-100 text-green-700'
        : v === 'no' ? 'bg-red-100 text-red-700'
        : 'bg-gray-100 text-gray-500'
    return <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${cls}`}>{value}</span>
}
import { getAllCVs, deleteCV } from '@/app/api_handlers/api/job-cvs.api'
import { getAllApplicants } from '@/app/api_handlers/api/job-applicants.api'
import { listAuthUsers } from '@/app/api_handlers/api/auth.api'
import JobCVModal from '@/app/components/jobs/JobCVModal'

const EMPTY_FILTERS = {
    keyword: '',
    applicant_id: '',
    org_id: '',
    org_name: '',
    email: '',
    exp_yrs: '',
    created_by: '',
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

    if (f.org_id) {
        out = out.filter(cv => String(cv.company_id ?? '') === f.org_id)
    } else if (f.org_name) {
        const q = f.org_name.trim().toLowerCase()
        out = out.filter(cv => cv.organization_name?.toLowerCase().includes(q))
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
    const [creatingNew, setCreatingNew] = useState(false)
    const [userMap, setUserMap] = useState<Record<string, string>>({})
    const [applicants, setApplicants] = useState<{ id: string; name: string }[]>([])

    const [filters, setFilters] = useState<CvFilters>({ ...EMPTY_FILTERS })
    const [orgQuery, setOrgQuery] = useState('')
    const [showOrgDd, setShowOrgDd] = useState(false)
    const orgDdRef = useRef<HTMLDivElement>(null)
    const hydratedFromUrl = useRef(false)

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
            const fromUrl: CvFilters = {
                keyword: searchParams.get('keyword') || searchParams.get('id') || searchParams.get('company_id') || searchParams.get('job_id') || '',
                applicant_id: searchParams.get('applicant_id') || '',
                org_id: searchParams.get('org_id') || searchParams.get('company_id') || '',
                org_name: searchParams.get('org_name') || '',
                email: searchParams.get('email') || '',
                exp_yrs: searchParams.get('exp_yrs') || '',
                created_by: searchParams.get('created_by') || '',
            }
            hydratedFromUrl.current = true
            setFilters(fromUrl)
            if (fromUrl.org_name) setOrgQuery(fromUrl.org_name)
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
            if (orgDdRef.current && !orgDdRef.current.contains(e.target as Node)) setShowOrgDd(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Recompute the visible rows + keep the URL in sync whenever a filter changes.
    useEffect(() => {
        setData(filterCvs(allData, filters))
        if (!hydratedFromUrl.current) return
        const qs = buildQueryString(filters)
        router.replace(qs ? `/jobs/cvs?${qs}` : '/jobs/cvs')
    }, [allData, filters, router])

    // Organizations seen across all loaded CVs, for the search-as-you-type dropdown.
    const orgOptions = useMemo(() => {
        const map = new Map<string, { id: string; name: string }>()
        allData.forEach(cv => {
            if (!cv.company_id && !cv.organization_name) return
            const key = cv.company_id || cv.organization_name
            if (!map.has(key)) map.set(key, { id: cv.company_id || '', name: cv.organization_name || cv.company_id })
        })
        return Array.from(map.values())
    }, [allData])

    const orgMatches = useMemo(() => {
        const q = orgQuery.trim().toLowerCase()
        if (!q) return orgOptions.slice(0, 20)
        return orgOptions
            .filter(o => o.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q))
            .slice(0, 20)
    }, [orgOptions, orgQuery])

    const selectOrg = (o: { id: string; name: string }) => {
        setFilters(f => ({ ...f, org_id: o.id, org_name: o.id ? '' : o.name }))
        setOrgQuery(o.name)
        setShowOrgDd(false)
    }

    const clearOrg = () => {
        setFilters(f => ({ ...f, org_id: '', org_name: '' }))
        setOrgQuery('')
    }

    const clearAllFilters = () => {
        setFilters({ ...EMPTY_FILTERS })
        setOrgQuery('')
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
                    <button onClick={() => setCreatingNew(true)}
                        className="flex items-center gap-1 text-xs bg-gray-800 text-white rounded px-2 py-1 hover:bg-gray-700">
                        <Plus size={11} /> New CV
                    </button>
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

                    <div className="flex flex-col gap-0.5 relative" ref={orgDdRef}>
                        <label className="text-[10px] text-gray-400 uppercase">Organization</label>
                        <div className="relative">
                            <input
                                className={`border rounded pl-2 pr-6 py-1 text-xs focus:outline-none w-44 transition-colors ${filters.org_id || filters.org_name ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}
                                placeholder="Search org by id or name…"
                                value={orgQuery}
                                onFocus={() => setShowOrgDd(true)}
                                onChange={e => {
                                    setOrgQuery(e.target.value)
                                    setShowOrgDd(true)
                                    if (filters.org_id || filters.org_name) setFilters(f => ({ ...f, org_id: '', org_name: '' }))
                                }}
                            />
                            {(orgQuery || filters.org_id || filters.org_name) && (
                                <button onClick={clearOrg} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <X size={11} />
                                </button>
                            )}
                        </div>
                        {showOrgDd && (
                            <div className="absolute z-20 top-full mt-1 left-0 bg-white border border-gray-200 rounded shadow-lg p-1 min-w-[220px] max-h-60 overflow-y-auto">
                                {orgMatches.length === 0 && (
                                    <p className="text-[10px] text-gray-400 px-2 py-1">No matching organizations</p>
                                )}
                                {orgMatches.map(o => (
                                    <button key={o.id || o.name} type="button" onClick={() => selectOrg(o)}
                                        className="w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 rounded truncate">
                                        {o.name}
                                        {o.id && <span className="text-[9px] text-gray-400 ml-1">({o.id})</span>}
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
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-300">
                            <th className="px-2 py-1.5 text-left font-medium text-gray-500 border-r border-gray-200 w-6">#</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">CV Title</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Applicant</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Organisation</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Sponsorship</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Job Link</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Email</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Exp (yrs)</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Created</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Created By</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 flex items-center justify-between">
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
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan={11} className="text-center py-10 text-gray-400">
                                <div className="flex items-center justify-center gap-2"><RefreshCw size={13} className="animate-spin" /> Loading…</div>
                            </td></tr>
                        )}
                        {!loading && data.length === 0 && (
                            <tr><td colSpan={11} className="text-center py-10 text-gray-400">
                                {activeFilterCount > 0 ? 'No CVs match your filters.' : 'No CVs yet. Click "New CV" to create one.'}
                            </td></tr>
                        )}
                        {!loading && data.map((row, idx) => (
                            <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-2 py-1.5 text-gray-400 border-r border-gray-100">{idx + 1}</td>
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
                                <td className="px-2 py-1.5 border-r border-gray-100 text-gray-400 text-[10px] whitespace-nowrap">
                                    {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}
                                </td>
                                <td className="px-2 py-1.5 border-r border-gray-100 text-gray-600 text-[10px] whitespace-nowrap">
                                    {row.created_by ? (userMap[row.created_by] || row.created_by) : '—'}
                                </td>
                                <td className="px-2 py-1.5">
                                    <div className="flex items-center gap-1">
                                        <a href={`/viewCV/${row.id}`} target="_blank" rel="noopener noreferrer"
                                            title="View CV"
                                            className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded">
                                            <ExternalLink size={12} />
                                        </a>
                                        <button onClick={() => setEditingCV(row)} title="Edit CV"
                                            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                                            <Pencil size={12} />
                                        </button>
                                        {row.job_id && (
                                            <a href={`/jobs/listed-jobs?id=${row.job_id}`} title="View this job"
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
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {creatingNew && (
                <JobCVModal
                    onClose={() => setCreatingNew(false)}
                    onSaved={() => { setCreatingNew(false); load() }}
                />
            )}

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
