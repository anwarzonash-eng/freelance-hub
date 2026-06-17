'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Pencil, Trash2, Check } from 'lucide-react'
import { manualCheckCompany } from '@/app/api_handlers/api/sponsored-companies.api'
import { getCompanyCategories, createCompanyCategory, updateCompanyCategory, deleteCompanyCategory } from '@/app/api_handlers/api/company-categories.api'

interface Props {
    company: any
    currentUserId: string
    onClose: () => void
    onSaved: () => void
}

function decodeToken(token: string): any {
    try { return JSON.parse(atob(token.split('.')[1])) } catch { return {} }
}

export default function ManualCheckModal({ company, currentUserId, onClose, onSaved }: Props) {
    const today = new Date().toISOString().split('T')[0]

    const [form, setForm] = useState({
        manual_check_done: Boolean(company.manual_check_done),
        last_manual_check_date: company.last_manual_check_date
            ? new Date(company.last_manual_check_date).toISOString().split('T')[0]
            : today,
        has_it_jobs: company.has_it_jobs ?? null as boolean | null,
        estimated_it_jobs: company.estimated_it_jobs ?? '' as number | '',
        category_id: company.category_id ?? '',
        visa_mentioned: Boolean(company.visa_mentioned),
        website: company.website ?? '',
        career_page: company.career_page ?? '',
    })

    const [saving, setSaving] = useState(false)

    // Categories inline management
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
    const [catInput, setCatInput] = useState('')
    const [editingCatId, setEditingCatId] = useState<string | null>(null)
    const [editingCatName, setEditingCatName] = useState('')
    const [catLoading, setCatLoading] = useState(false)

    useEffect(() => { loadCategories() }, [])

    const loadCategories = async () => {
        const res: any = await getCompanyCategories()
        const list = res?.data ?? res
        setCategories(Array.isArray(list) ? list : [])
    }

    const addCategory = async () => {
        const name = catInput.trim()
        if (!name) return
        setCatLoading(true)
        try {
            const res: any = await createCompanyCategory({ name })
            const created = res?.data ?? res
            await loadCategories()
            if (created?.id) setForm(f => ({ ...f, category_id: created.id }))
            setCatInput('')
        } finally { setCatLoading(false) }
    }

    const saveEditCat = async (id: string) => {
        const name = editingCatName.trim()
        if (!name) return
        setCatLoading(true)
        try {
            await updateCompanyCategory(id, { name })
            await loadCategories()
            setEditingCatId(null)
        } finally { setCatLoading(false) }
    }

    const deleteCat = async (id: string) => {
        if (!confirm('Delete this category?')) return
        setCatLoading(true)
        try {
            await deleteCompanyCategory(id)
            if (form.category_id === id) setForm(f => ({ ...f, category_id: '' }))
            await loadCategories()
        } finally { setCatLoading(false) }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            await manualCheckCompany(company.id, {
                ...form,
                estimated_it_jobs: form.estimated_it_jobs !== '' ? Number(form.estimated_it_jobs) : null,
                category_id: form.category_id || null,
                website: form.website || null,
                career_page: form.career_page || null,
                checked_by: currentUserId || null,
            })
            onSaved()
        } finally { setSaving(false) }
    }

    const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }))

    const inputCls = 'w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-gray-500'
    const labelCls = 'text-[10px] text-gray-400 uppercase font-medium mb-0.5 block'

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
                    <div>
                        <span className="text-sm font-semibold text-gray-800">Apply Manual Check</span>
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-xs">{company.organisation_name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-4 space-y-4">

                        {/* Last Manual Check Date */}
                        <div>
                            <label className={labelCls}>Last Manual Check Date</label>
                            <input type="date" className={inputCls} value={form.last_manual_check_date}
                                onChange={e => set('last_manual_check_date', e.target.value)} />
                        </div>

                        {/* Does have IT Jobs */}
                        <div>
                            <label className={labelCls}>Does Have IT Jobs</label>
                            <div className="flex items-center gap-3">
                                {([['true', 'Yes'], ['false', 'No'], ['', 'Unknown']] as const).map(([val, label]) => (
                                    <label key={val} className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700">
                                        <input type="radio" name="has_it_jobs"
                                            checked={form.has_it_jobs === (val === '' ? null : val === 'true')}
                                            onChange={() => set('has_it_jobs', val === '' ? null : val === 'true')}
                                            className="w-3 h-3" />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Estimated IT Jobs Count */}
                        <div>
                            <label className={labelCls}>Estimated IT Jobs Count</label>
                            <input type="number" min={0} className={inputCls} placeholder="Leave blank if unknown"
                                value={form.estimated_it_jobs}
                                onChange={e => set('estimated_it_jobs', e.target.value === '' ? '' : Number(e.target.value))} />
                        </div>

                        {/* Category */}
                        <div>
                            <label className={labelCls}>Category</label>
                            <select className={inputCls} value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                                <option value="">— None —</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>

                            {/* Inline category management */}
                            <div className="mt-1.5 border border-gray-100 rounded bg-gray-50 p-2">
                                <p className="text-[10px] text-gray-400 uppercase font-medium mb-1.5">Manage Categories</p>
                                <div className="space-y-1 mb-2 max-h-28 overflow-y-auto">
                                    {categories.length === 0 && <p className="text-[10px] text-gray-400 italic">No categories yet</p>}
                                    {categories.map(c => (
                                        <div key={c.id} className="flex items-center gap-1.5">
                                            {editingCatId === c.id ? (
                                                <>
                                                    <input autoFocus className="flex-1 border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none"
                                                        value={editingCatName} onChange={e => setEditingCatName(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveEditCat(c.id) } if (e.key === 'Escape') setEditingCatId(null) }} />
                                                    <button type="button" onClick={() => saveEditCat(c.id)} disabled={catLoading}
                                                        className="text-teal-600 hover:text-teal-800 shrink-0"><Check size={12} /></button>
                                                    <button type="button" onClick={() => setEditingCatId(null)}
                                                        className="text-gray-400 hover:text-gray-600 shrink-0"><X size={12} /></button>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="flex-1 text-xs text-gray-700 truncate">{c.name}</span>
                                                    <button type="button" onClick={() => { setEditingCatId(c.id); setEditingCatName(c.name) }}
                                                        className="text-gray-400 hover:text-blue-600 shrink-0"><Pencil size={11} /></button>
                                                    <button type="button" onClick={() => deleteCat(c.id)} disabled={catLoading}
                                                        className="text-gray-400 hover:text-red-600 shrink-0"><Trash2 size={11} /></button>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <input className="flex-1 border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:outline-none"
                                        placeholder="New category name…" value={catInput} onChange={e => setCatInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategory() } }} />
                                    <button type="button" onClick={addCategory} disabled={catLoading || !catInput.trim()}
                                        className="flex items-center gap-1 text-[10px] text-teal-600 border border-teal-200 rounded px-1.5 py-0.5 hover:bg-teal-50 disabled:opacity-40">
                                        <Plus size={10} /> Add
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Visa Mentioned */}
                        <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                                <input type="checkbox" checked={form.visa_mentioned} onChange={e => set('visa_mentioned', e.target.checked)} className="w-3.5 h-3.5" />
                                Visa Mentioned
                            </label>
                        </div>

                        {/* Domain */}
                        <div>
                            <label className={labelCls}>Domain (Website)</label>
                            <input className={inputCls} placeholder="https://" value={form.website}
                                onChange={e => set('website', e.target.value)} />
                        </div>

                        {/* Career Page */}
                        <div>
                            <label className={labelCls}>Absolute Career Page URL</label>
                            <input className={inputCls} placeholder="https://" value={form.career_page}
                                onChange={e => set('career_page', e.target.value)} />
                        </div>

                        {/* Manual Checked */}
                        <div className="bg-gray-50 border border-gray-200 rounded p-3">
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-800">
                                <input type="checkbox" checked={form.manual_check_done}
                                    onChange={e => set('manual_check_done', e.target.checked)} className="w-4 h-4 accent-teal-600" />
                                Mark as Manual Check Complete
                            </label>
                            <p className="text-[10px] text-gray-400 mt-0.5 ml-6">Records the check date and marks this company as reviewed</p>
                        </div>

                        {/* Checked By (read-only display) */}
                        <div>
                            <label className={labelCls}>Checked By</label>
                            <div className="text-xs text-gray-600 border border-gray-200 rounded px-2 py-1 bg-gray-50">
                                {currentUserId || '—'}
                                <span className="text-[10px] text-gray-400 ml-1">(current user)</span>
                            </div>
                        </div>

                    </div>

                    <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2 shrink-0">
                        <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={saving}
                            className="px-4 py-1.5 text-xs bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50">
                            {saving ? 'Saving…' : 'Save Check'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
