'use client'

import { useEffect, useState } from 'react'
import { getReferralSettings, saveReferralSettings } from '@/app/api_handlers/api/referral-settings.api'

const EMPTY = { me_link: '', ou_link: '', mi_link: '', al_link: '' }

const FIELDS = [
    { key: 'me_link', label: 'ME Link' },
    { key: 'ou_link', label: 'OU Link' },
    { key: 'mi_link', label: 'Mi Link' },
    { key: 'al_link', label: 'AL Link' },
] as const

export default function ReferralSettings() {
    const [form, setForm] = useState({ ...EMPTY })
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getReferralSettings().then((res) => {
            const d = res?.data || res || {}
            setForm({
                me_link: d.me_link || '',
                ou_link: d.ou_link || '',
                mi_link: d.mi_link || '',
                al_link: d.al_link || '',
            })
            setLoading(false)
        })
    }, [])

    const handleChange = (key: string, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }))
        setSaved(false)
    }

    const handleSave = async () => {
        setSaving(true)
        await saveReferralSettings({
            me_link: form.me_link || undefined,
            ou_link: form.ou_link || undefined,
            mi_link: form.mi_link || undefined,
            al_link: form.al_link || undefined,
        })
        setSaving(false)
        setSaved(true)
    }

    return (
        <div className="p-8 max-w-xl mx-auto">
            <h1 className="text-2xl font-bold mb-1">Referral Settings</h1>
            <p className="text-gray-500 text-sm mb-6">Manage your referral profile links.</p>

            {loading ? (
                <div className="text-sm text-gray-400">Loading...</div>
            ) : (
                <div className="bg-white rounded shadow border border-gray-200 p-6 flex flex-col gap-5">
                    {FIELDS.map(({ key, label }) => (
                        <div key={key}>
                            <label className="block text-sm font-semibold mb-1 text-gray-700">{label}</label>
                            <input
                                type="url"
                                value={form[key]}
                                onChange={(e) => handleChange(key, e.target.value)}
                                placeholder={`https://...`}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        </div>
                    ))}

                    <div className="flex items-center gap-3 pt-1">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-teal-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                        {saved && <span className="text-green-600 text-sm">Saved successfully.</span>}
                    </div>
                </div>
            )}
        </div>
    )
}
