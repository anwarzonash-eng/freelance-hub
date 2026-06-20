'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { createCompany, updateCompany } from '@/app/api_handlers/api/sponsored-companies.api'

interface Props {
    company?: any | null
    onClose: () => void
    onSaved: () => void
}

const EMPTY_FORM = {
    id: '',
    organisation_name: '',
    city: '',
    county: '',
    sponsor_type: '',
    sponsor_route: '',
    website: '',
    career_page: '',
    hr_email: '',
    visa_example_job_url: '',
    is_deleted: false,
    visa_mentioned: false,
    offers_freelance: null as boolean | null,
    should_apply: false,
    rank: '' as number | '',
    it_jobs_count: 0,
    overall_jobs_count: 0,
}

export default function CompanyFormModal({ company, onClose, onSaved }: Props) {
    const isEdit = !!company
    const [form, setForm] = useState({ ...EMPTY_FORM })
    const [metaRows, setMetaRows] = useState<{ key: string; value: string }[]>([])
    const [credentials, setCredentials] = useState<any[]>([])
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState<'general' | 'credentials'>('general')

    useEffect(() => {
        if (company) {
            setForm({
                id: company.id ?? '',
                organisation_name: company.organisation_name ?? '',
                city: company.city ?? '',
                county: company.county ?? '',
                sponsor_type: company.sponsor_type ?? '',
                sponsor_route: company.sponsor_route ?? '',
                website: company.website ?? '',
                career_page: company.career_page ?? '',
                hr_email: company.hr_email ?? '',
                visa_example_job_url: company.visa_example_job_url ?? '',
                is_deleted: Boolean(company.is_deleted),
                visa_mentioned: Boolean(company.visa_mentioned),
                offers_freelance: company.offers_freelance ?? null,
                should_apply: Boolean(company.should_apply),
                rank: company.rank != null ? Number(company.rank) : '' as number | '',
                it_jobs_count: Number(company.it_jobs_count) || 0,
                overall_jobs_count: Number(company.overall_jobs_count) || 0,
            })
            const meta = company.meta_data
            if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
                setMetaRows(Object.entries(meta).map(([key, value]) => ({ key, value: String(value ?? '') })))
            }
            const creds = company.credentials
            if (Array.isArray(creds)) {
                setCredentials(creds)
            }
        }
    }, [company])

    const generateSlug = (orgName: string): string => {
        const slug = orgName
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[^a-z0-9]/g, '')
        const timestamp = Date.now()
        return `${slug}${timestamp}`
    }

    const set = (field: string, value: any) => {
        setForm(f => {
            const updated = { ...f, [field]: value }
            if (!isEdit && field === 'organisation_name') {
                updated.id = generateSlug(value)
            }
            return updated
        })
    }

    const addMetaRow = () => setMetaRows(r => [...r, { key: '', value: '' }])
    const removeMetaRow = (i: number) => setMetaRows(r => r.filter((_, idx) => idx !== i))
    const setMetaRow = (i: number, field: 'key' | 'value', val: string) =>
        setMetaRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const meta_data = metaRows.length > 0
                ? Object.fromEntries(metaRows.filter(r => r.key.trim()).map(r => [r.key.trim(), r.value]))
                : null
            const credsData = credentials.filter(c => c.application_url || c.username || c.password).length > 0 ? credentials : null
            const payload = { ...form, rank: form.rank !== '' ? Number(form.rank) : null, meta_data, credentials: credsData }
            if (isEdit) {
                await updateCompany(company.id, payload)
            } else {
                await createCompany(payload)
            }
            onSaved()
        } finally {
            setSaving(false)
        }
    }

    const inputCls = 'w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-gray-500'
    const labelCls = 'text-[10px] text-gray-400 uppercase font-medium mb-0.5 block'

    const addCredential = () => {
        setCredentials([...credentials, { application_url: '', username: '', password: '' }])
    }

    const removeCredential = (idx: number) => {
        setCredentials(credentials.filter((_, i) => i !== idx))
    }

    const updateCredential = (idx: number, field: string, value: string) => {
        const newCreds = [...credentials]
        newCreds[idx] = { ...newCreds[idx], [field]: value }
        setCredentials(newCreds)
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="px-4 py-3 border-b border-gray-200 shrink-0">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-800">{isEdit ? 'Edit Company' : 'Add Company'}</span>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
                    </div>
                    <div className="flex gap-4 border-t border-gray-200 pt-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('general')}
                            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                                activeTab === 'general'
                                    ? 'border-gray-800 text-gray-800'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            General
                        </button>
                        {isEdit && (
                            <button
                                type="button"
                                onClick={() => setActiveTab('credentials')}
                                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                                    activeTab === 'credentials'
                                        ? 'border-gray-800 text-gray-800'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Credentials
                            </button>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-4 space-y-4">
                        {activeTab === 'general' && (
                            <>
                        {/* Core fields */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className={labelCls}>ID (slug) * {!isEdit && <span className="text-[9px] text-gray-500">(auto-generated)</span>}</label>
                                <input required className={`${inputCls} ${!isEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`} value={form.id} onChange={e => isEdit && set('id', e.target.value)}
                                    disabled={!isEdit} placeholder={isEdit ? "e.g. hsbc_holdings_plc" : ""} />
                            </div>
                            <div className="col-span-2">
                                <label className={labelCls}>Organisation Name *</label>
                                <input required className={inputCls} value={form.organisation_name} onChange={e => set('organisation_name', e.target.value)} />
                            </div>
                            <div>
                                <label className={labelCls}>City</label>
                                <input className={inputCls} value={form.city} onChange={e => set('city', e.target.value)} />
                            </div>
                            <div>
                                <label className={labelCls}>County</label>
                                <input className={inputCls} value={form.county} onChange={e => set('county', e.target.value)} />
                            </div>
                            <div>
                                <label className={labelCls}>Sponsor Type</label>
                                <input className={inputCls} value={form.sponsor_type} onChange={e => set('sponsor_type', e.target.value)} placeholder="e.g. Worker (A (Premium))" />
                            </div>
                            <div>
                                <label className={labelCls}>Sponsor Route</label>
                                <input className={inputCls} value={form.sponsor_route} onChange={e => set('sponsor_route', e.target.value)} placeholder="e.g. Skilled Worker" />
                            </div>
                            <div className="col-span-2">
                                <label className={labelCls}>Website</label>
                                <input className={inputCls} value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://" />
                            </div>
                            <div className="col-span-2">
                                <label className={labelCls}>Career Page</label>
                                <input className={inputCls} value={form.career_page} onChange={e => set('career_page', e.target.value)} placeholder="https://" />
                            </div>
                            <div className="col-span-2">
                                <label className={labelCls}>HR Email</label>
                                <input className={inputCls} type="email" value={form.hr_email} onChange={e => set('hr_email', e.target.value)} />
                            </div>
                            <div className="col-span-2">
                                <label className={labelCls}>Visa Example Job URL</label>
                                <input className={inputCls} value={form.visa_example_job_url} onChange={e => set('visa_example_job_url', e.target.value)} placeholder="https://" />
                            </div>
                            <div>
                                <label className={labelCls}>Rank</label>
                                <input className={inputCls} type="number" min={1} value={form.rank} placeholder="Leave blank for unranked"
                                    onChange={e => set('rank', e.target.value === '' ? '' : Number(e.target.value))} />
                            </div>
                            <div>
                                <label className={labelCls}>IT Jobs Count</label>
                                <input className={inputCls} type="number" min={0} value={form.it_jobs_count} onChange={e => set('it_jobs_count', Number(e.target.value))} />
                            </div>
                            <div>
                                <label className={labelCls}>Overall Jobs Count</label>
                                <input className={inputCls} type="number" min={0} value={form.overall_jobs_count} onChange={e => set('overall_jobs_count', Number(e.target.value))} />
                            </div>
                        </div>

                        {/* Flags */}
                        <div className="flex items-center gap-6 flex-wrap">
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                                <input type="checkbox" checked={form.is_deleted} onChange={e => set('is_deleted', e.target.checked)} className="w-3.5 h-3.5" />
                                Is Deleted
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                                <input type="checkbox" checked={form.visa_mentioned} onChange={e => set('visa_mentioned', e.target.checked)} className="w-3.5 h-3.5" />
                                Visa Mentioned
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                                <input type="checkbox" checked={form.should_apply} onChange={e => set('should_apply', e.target.checked)} className="w-3.5 h-3.5 accent-teal-600" />
                                Should Apply
                            </label>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-700">Offers Freelance</span>
                                {([['true', 'Yes'], ['false', 'No'], ['', 'Unknown']] as const).map(([val, label]) => (
                                    <label key={val} className="flex items-center gap-1 cursor-pointer text-xs text-gray-600">
                                        <input type="radio" name="offers_freelance"
                                            checked={form.offers_freelance === (val === '' ? null : val === 'true')}
                                            onChange={() => set('offers_freelance', val === '' ? null : val === 'true')}
                                            className="w-3 h-3" />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Dynamic meta_data */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] text-gray-400 uppercase font-medium">Additional Fields (meta_data)</span>
                                <button type="button" onClick={addMetaRow}
                                    className="flex items-center gap-1 text-[10px] text-teal-600 hover:text-teal-800 border border-teal-200 rounded px-1.5 py-0.5">
                                    <Plus size={10} /> Add Field
                                </button>
                            </div>
                            {metaRows.length === 0 && (
                                <p className="text-[10px] text-gray-400 italic">No additional fields. Click "Add Field" to add dynamic key-value pairs.</p>
                            )}
                            <div className="space-y-1.5">
                                {metaRows.map((row, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input
                                            className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-gray-500"
                                            placeholder="Key"
                                            value={row.key}
                                            onChange={e => setMetaRow(i, 'key', e.target.value)}
                                        />
                                        <input
                                            className="flex-2 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-gray-500"
                                            placeholder="Value"
                                            value={row.value}
                                            onChange={e => setMetaRow(i, 'value', e.target.value)}
                                        />
                                        <button type="button" onClick={() => removeMetaRow(i)} className="text-gray-400 hover:text-red-500 shrink-0">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                            </>
                        )}

                        {activeTab === 'credentials' && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-800">Career Page Credentials</h3>
                                    <button
                                        type="button"
                                        onClick={addCredential}
                                        className="flex items-center gap-1 text-[10px] text-teal-600 hover:text-teal-800 border border-teal-200 rounded px-2 py-1"
                                    >
                                        <Plus size={10} /> Add Credential
                                    </button>
                                </div>
                                {credentials.length === 0 && (
                                    <p className="text-[10px] text-gray-400 italic py-4">No credentials added. Click "Add Credential" to add login information for career pages.</p>
                                )}
                                <div className="space-y-3">
                                    {credentials.map((cred, idx) => (
                                        <div key={idx} className="border border-gray-200 rounded p-3 space-y-2">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-[10px] text-gray-400 uppercase font-semibold">Credential #{idx + 1}</p>
                                                <button
                                                    type="button"
                                                    onClick={() => removeCredential(idx)}
                                                    className="text-gray-400 hover:text-red-600"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                            <div>
                                                <label className={labelCls}>Application URL *</label>
                                                <input
                                                    type="url"
                                                    className={inputCls}
                                                    placeholder="https://careers.company.com/login"
                                                    value={cred.application_url || ''}
                                                    onChange={e => updateCredential(idx, 'application_url', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Username</label>
                                                <input
                                                    type="text"
                                                    className={inputCls}
                                                    placeholder="Your username"
                                                    value={cred.username || ''}
                                                    onChange={e => updateCredential(idx, 'username', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Password</label>
                                                <input
                                                    type="password"
                                                    className={inputCls}
                                                    placeholder="Your password"
                                                    value={cred.password || ''}
                                                    onChange={e => updateCredential(idx, 'password', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2 shrink-0">
                        <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={saving}
                            className="px-4 py-1.5 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50">
                            {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
