'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { getGlobalSettings, updateGmailSchedulerEnabled } from '@/app/api_handlers/api/global-settings.api'

function fmtDateTime(value: string | null) {
    if (!value) return 'Never'
    return new Date(value).toLocaleString()
}

export default function GlobalSettings() {
    const [enabled, setEnabled] = useState(false)
    const [lastRunAt, setLastRunAt] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    const load = async () => {
        const res = await getGlobalSettings()
        const d = res?.data || res || {}
        const scheduler = d.gmail_api_scheduler || { enabled: false, last_run_at: null }
        setEnabled(!!scheduler.enabled)
        setLastRunAt(scheduler.last_run_at || null)
        setLoading(false)
    }

    const handleRefresh = async () => {
        setRefreshing(true)
        await load()
        setRefreshing(false)
    }

    useEffect(() => {
        load()
    }, [])

    const handleToggle = async () => {
        setSaving(true)
        const next = !enabled
        await updateGmailSchedulerEnabled(next)
        setEnabled(next)
        setSaving(false)
    }

    return (
        <div className="p-8 max-w-xl mx-auto">
            <h1 className="text-2xl font-bold mb-1">Gmail Api Schedular</h1>
            <p className="text-gray-500 text-sm mb-6">Manage system-wide automation settings.</p>

            {loading ? (
                <div className="text-sm text-gray-400">Loading...</div>
            ) : (
                <div className="bg-white rounded shadow border border-gray-200 p-6 flex flex-col gap-5">
                    <div>
                        <h2 className="text-sm font-semibold text-gray-700 mb-1">Gmail API Scheduler</h2>
                        <p className="text-xs text-gray-500 mb-3">
                            When enabled, the backend scheduler will automatically send queued emails that are due.
                            The scheduler always runs in the background, but emails are only sent while this is on.
                        </p>

                        <div className="flex items-center justify-between border border-gray-200 rounded px-4 py-3">
                            <div>
                                <div className="text-sm font-medium text-gray-800">
                                    Status: <span className={enabled ? 'text-green-600' : 'text-red-600'}>{enabled ? 'Enabled' : 'Disabled'}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                                    Last run: {fmtDateTime(lastRunAt)}
                                    <button
                                        onClick={handleRefresh}
                                        disabled={refreshing}
                                        title="Refresh last run time"
                                        className="text-gray-400 hover:text-gray-700 disabled:opacity-50"
                                    >
                                        <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={handleToggle}
                                disabled={saving}
                                className={`px-5 py-2 rounded text-sm font-medium text-white disabled:opacity-50 ${enabled ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'
                                    }`}
                            >
                                {saving ? 'Saving...' : enabled ? 'Stop Scheduler' : 'Start Scheduler'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
