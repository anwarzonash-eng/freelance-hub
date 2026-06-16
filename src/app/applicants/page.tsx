'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw, Pencil, Trash2, ExternalLink, Search, Users } from 'lucide-react'
import { getAllApplicants, deleteApplicant } from '@/app/api_handlers/api/job-applicants.api'
import ApplicantFormModal from '@/app/components/applicants/ApplicantFormModal'

const LIMIT_OPTIONS = [25, 50, 100]

export default function ApplicantsPage() {
    const [data, setData] = useState<any[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(25)
    const [totalPages, setTotalPages] = useState(1)
    const [loading, setLoading] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [appliedKeyword, setAppliedKeyword] = useState('')
    const [hasExperience, setHasExperience] = useState('')
    const [hasEducation, setHasEducation] = useState('')
    const [hasProjects, setHasProjects] = useState('')
    const [appliedFilters, setAppliedFilters] = useState({ has_experience: '', has_education: '', has_projects: '' })

    const [adding, setAdding] = useState(false)
    const [editing, setEditing] = useState<any | null>(null)
    const [deleting, setDeleting] = useState<number | null>(null)

    const load = useCallback(async (pg: number, lim: number, kw: string, af = appliedFilters) => {
        setLoading(true)
        try {
            const q: any = { page: pg, limit: lim }
            if (kw) q.keyword = kw
            if (af.has_experience) q.has_experience = af.has_experience
            if (af.has_education) q.has_education = af.has_education
            if (af.has_projects) q.has_projects = af.has_projects
            const res: any = await getAllApplicants(q)
            const payload = res?.data ?? res
            setData(Array.isArray(payload?.data) ? payload.data : [])
            setTotal(payload?.total ?? 0)
            setTotalPages(payload?.totalPages ?? 1)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load(page, limit, appliedKeyword, appliedFilters) }, [page, limit, appliedKeyword, appliedFilters, load])

    const search = () => {
        const af = { has_experience: hasExperience, has_education: hasEducation, has_projects: hasProjects }
        setPage(1)
        setAppliedKeyword(keyword)
        setAppliedFilters(af)
    }
    const clear = () => {
        setKeyword(''); setAppliedKeyword(''); setPage(1)
        setHasExperience(''); setHasEducation(''); setHasProjects('')
        setAppliedFilters({ has_experience: '', has_education: '', has_projects: '' })
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this applicant?')) return
        setDeleting(id)
        try { await deleteApplicant(id); load(page, limit, appliedKeyword) }
        finally { setDeleting(null) }
    }

    const refresh = () => load(page, limit, appliedKeyword, appliedFilters)

    return (
        <div className="p-3 bg-white min-h-screen">
            <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-2">
                <div className="flex items-center gap-2">
                    <Users size={14} className="text-gray-500" />
                    <h1 className="text-sm font-semibold text-gray-800">Job Applicants</h1>
                    <span className="text-[10px] text-gray-400">{total} total</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={refresh} disabled={loading}
                        className="flex items-center gap-1 text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50 text-gray-600">
                        <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button onClick={() => setAdding(true)}
                        className="flex items-center gap-1 text-xs bg-gray-800 text-white rounded px-3 py-1 hover:bg-gray-700">
                        <Plus size={12} /> Add Applicant
                    </button>
                </div>
            </div>

            {/* Search bar */}
            <div className="border border-gray-200 rounded p-2 mb-2 bg-gray-50">
                <div className="flex items-end gap-1.5 flex-wrap">
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Search by Name</label>
                        <div className="relative">
                            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                className="border border-gray-300 rounded pl-6 pr-2 py-1 text-xs bg-white focus:outline-none w-60"
                                placeholder="Applicant name…"
                                value={keyword}
                                onChange={e => setKeyword(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && search()}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Has Experience</label>
                        <select value={hasExperience} onChange={e => setHasExperience(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none">
                            <option value="">All</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Has Education</label>
                        <select value={hasEducation} onChange={e => setHasEducation(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none">
                            <option value="">All</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <label className="text-[10px] text-gray-400 uppercase">Has Projects</label>
                        <select value={hasProjects} onChange={e => setHasProjects(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none">
                            <option value="">All</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>
                    <button onClick={search} className="px-3 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 mt-auto">Filter</button>
                    <button onClick={clear} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-white mt-auto">Clear</button>
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
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Name</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Emails</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Phone Numbers</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Links</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200">Experience</th>
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 w-14"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan={7} className="text-center py-10 text-gray-400">
                                <div className="flex items-center justify-center gap-2"><RefreshCw size={13} className="animate-spin" /> Loading…</div>
                            </td></tr>
                        )}
                        {!loading && data.length === 0 && (
                            <tr><td colSpan={7} className="text-center py-10 text-gray-400">No applicants found.</td></tr>
                        )}
                        {!loading && data.map((row, idx) => {
                            const rowNum = (page - 1) * limit + idx + 1
                            const expCount = Array.isArray(row.experience) ? row.experience.length : 0
                            return (
                                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-2 py-1.5 text-gray-400 border-r border-gray-100">{rowNum}</td>
                                    <td className="px-2 py-1.5 border-r border-gray-100">
                                        <div className="font-medium text-gray-800">{row.name}</div>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100">
                                        <div className="space-y-0.5">
                                            {(row.emails ?? []).map((e: string, i: number) => (
                                                <div key={i} className="text-[10px] text-gray-600">{e}</div>
                                            ))}
                                            {!row.emails?.length && <span className="text-[10px] text-gray-300">—</span>}
                                        </div>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100">
                                        <div className="space-y-0.5">
                                            {(row.phone_numbers ?? []).map((p: string, i: number) => (
                                                <div key={i} className="text-[10px] text-gray-600">{p}</div>
                                            ))}
                                            {!row.phone_numbers?.length && <span className="text-[10px] text-gray-300">—</span>}
                                        </div>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100">
                                        <div className="flex flex-col gap-0.5">
                                            {row.github && (
                                                <a href={row.github} target="_blank" rel="noopener noreferrer"
                                                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5">
                                                    GitHub <ExternalLink size={8} />
                                                </a>
                                            )}
                                            {row.linkedin && (
                                                <a href={row.linkedin} target="_blank" rel="noopener noreferrer"
                                                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5">
                                                    LinkedIn <ExternalLink size={8} />
                                                </a>
                                            )}
                                            {(row.portfolios ?? []).map((p: string, i: number) => (
                                                <a key={i} href={p} target="_blank" rel="noopener noreferrer"
                                                    className="text-[10px] text-teal-600 hover:underline flex items-center gap-0.5">
                                                    Portfolio {i + 1} <ExternalLink size={8} />
                                                </a>
                                            ))}
                                            {!row.github && !row.linkedin && !row.portfolios?.length && (
                                                <span className="text-[10px] text-gray-300">—</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-gray-100">
                                        {expCount > 0 ? (
                                            <div>
                                                <span className="text-[10px] font-medium text-gray-700">{expCount} {expCount === 1 ? 'role' : 'roles'}</span>
                                                {row.experience[0]?.designation && (
                                                    <div className="text-[10px] text-gray-400 truncate max-w-[160px]">
                                                        {row.experience[0].designation}
                                                        {row.experience[0].company_name ? ` @ ${row.experience[0].company_name}` : ''}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-gray-300">—</span>
                                        )}
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <div className="flex items-center gap-1.5">
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

            {(adding || editing) && (
                <ApplicantFormModal
                    applicant={editing}
                    onClose={() => { setAdding(false); setEditing(null) }}
                    onSaved={() => { setAdding(false); setEditing(null); refresh() }}
                />
            )}
        </div>
    )
}
