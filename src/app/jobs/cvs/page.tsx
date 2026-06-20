'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, ExternalLink, Pencil, Trash2, FileText, Search, X, Plus, Link } from 'lucide-react'

function SponsorBadge({ value }: { value: string }) {
    const v = value?.toLowerCase()
    const cls = v === 'yes' ? 'bg-green-100 text-green-700'
        : v === 'no' ? 'bg-red-100 text-red-700'
        : 'bg-gray-100 text-gray-500'
    return <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${cls}`}>{value}</span>
}
import { getAllCVs, deleteCV } from '@/app/api_handlers/api/job-cvs.api'
import JobCVModal from '@/app/components/jobs/JobCVModal'

export default function CvsPage() {
    const [allData, setAllData] = useState<any[]>([])
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [editingCV, setEditingCV] = useState<any | null>(null)
    const [creatingNew, setCreatingNew] = useState(false)
    const [keyword, setKeyword] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res: any = await getAllCVs()
            const payload = res?.data ?? res
            const list = Array.isArray(payload) ? payload : []
            setAllData(list)
            setData(list)
            setKeyword('')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const applyFilter = (kw: string) => {
        const q = kw.trim().toLowerCase()
        if (!q) { setData(allData); return }
        setData(allData.filter(cv =>
            cv.cv_title?.toLowerCase().includes(q) ||
            cv.applicant_name?.toLowerCase().includes(q)
        ))
    }

    const handleKeywordChange = (v: string) => {
        setKeyword(v)
        applyFilter(v)
    }

    const clearFilter = () => handleKeywordChange('')

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
                    <button onClick={load} disabled={loading}
                        className="flex items-center gap-1 text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50 text-gray-600">
                        <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            {/* Filter bar */}
            <div className="border border-gray-200 rounded p-2 mb-2 bg-gray-50 flex items-center gap-2">
                <div className="relative flex-1 max-w-xs">
                    <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        className={`w-full border rounded pl-6 pr-6 py-1 text-xs focus:outline-none transition-colors ${keyword ? 'border-blue-300 bg-blue-50' : 'border-gray-300 bg-white'}`}
                        placeholder="Search by CV title or applicant name…"
                        value={keyword}
                        onChange={e => handleKeywordChange(e.target.value)}
                    />
                    {keyword && (
                        <button onClick={clearFilter}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X size={11} />
                        </button>
                    )}
                </div>
                {keyword && (
                    <span className="text-[10px] text-gray-400">
                        {data.length} result{data.length !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            <div className="border border-gray-200 rounded overflow-x-auto">
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
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 flex items-center justify-between">
                                <span>Actions</span>
                                <button
                                    onClick={() => applyFilter(keyword)}
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
                            <tr><td colSpan={10} className="text-center py-10 text-gray-400">
                                <div className="flex items-center justify-center gap-2"><RefreshCw size={13} className="animate-spin" /> Loading…</div>
                            </td></tr>
                        )}
                        {!loading && data.length === 0 && (
                            <tr><td colSpan={10} className="text-center py-10 text-gray-400">
                                {keyword ? 'No CVs match your search.' : 'No CVs yet. Click "New CV" to create one.'}
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
