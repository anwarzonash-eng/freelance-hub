'use client'

import { useState, useEffect } from 'react'
import { Save, Trash2, Eye, EyeOff } from 'lucide-react'
import { getAllLLMSettings, upsertLLMSetting, deleteLLMSetting } from '@/app/api_handlers/api/llm-settings.api'

const PROVIDERS = [
    { id: 'gemini', name: 'Google Gemini', icon: '🔤' },
    { id: 'chatgpt', name: 'OpenAI ChatGPT', icon: '🤖' },
    { id: 'anthropic', name: 'Anthropic Claude', icon: '✨' },
]

export default function LLMSettings() {
    const [settings, setSettings] = useState<Record<string, any>>({})
    const [formData, setFormData] = useState<Record<string, { api_key: string; is_active: boolean }>>({})
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
    const [saving, setSaving] = useState<Record<string, boolean>>({})
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            const res: any = await getAllLLMSettings()
            const data = res?.data || res || []
            const settingsMap: Record<string, any> = {}
            const formMap: Record<string, any> = {}

            data.forEach((s: any) => {
                settingsMap[s.provider] = s
                formMap[s.provider] = { api_key: s.api_key || '', is_active: s.is_active || false }
            })

            PROVIDERS.forEach(p => {
                if (!settingsMap[p.id]) {
                    formMap[p.id] = { api_key: '', is_active: false }
                }
            })

            setSettings(settingsMap)
            setFormData(formMap)
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to load settings' })
        }
    }

    const handleSave = async (provider: string) => {
        if (!formData[provider]?.api_key) {
            setMessage({ type: 'error', text: 'API key is required' })
            return
        }

        setSaving(prev => ({ ...prev, [provider]: true }))
        try {
            await upsertLLMSetting(provider, formData[provider].api_key, formData[provider].is_active)
            await loadSettings()
            setMessage({ type: 'success', text: `${provider} settings saved` })
            setTimeout(() => setMessage(null), 3000)
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to save settings' })
        } finally {
            setSaving(prev => ({ ...prev, [provider]: false }))
        }
    }

    const handleDelete = async (provider: string) => {
        if (!confirm(`Delete ${provider} settings?`)) return

        try {
            await deleteLLMSetting(provider)
            await loadSettings()
            setMessage({ type: 'success', text: `${provider} settings deleted` })
            setTimeout(() => setMessage(null), 3000)
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to delete settings' })
        }
    }

    return (
        <div className="p-4 space-y-4">
            <div>
                <p className="text-xs text-gray-500">Configure API keys for AI language models to use in CV generation and other features.</p>
            </div>

            {message && (
                <div className={`p-3 rounded text-xs ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <div className="space-y-3">
                {PROVIDERS.map(provider => (
                    <div key={provider.id} className="border border-gray-200 rounded p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">{provider.icon}</span>
                                <h3 className="font-semibold text-gray-800">{provider.name}</h3>
                            </div>
                            {settings[provider.id] && (
                                <span className="text-[10px] px-2 py-1 rounded bg-green-100 text-green-700">Configured</span>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] text-gray-400 uppercase font-medium block">API Key</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type={showKeys[provider.id] ? 'text' : 'password'}
                                    value={formData[provider.id]?.api_key || ''}
                                    onChange={e => setFormData(prev => ({
                                        ...prev,
                                        [provider.id]: { ...prev[provider.id], api_key: e.target.value }
                                    }))}
                                    placeholder="Enter API key"
                                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-xs bg-white focus:outline-none focus:border-gray-500"
                                />
                                <button
                                    onClick={() => setShowKeys(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                                    className="p-2 text-gray-400 hover:text-gray-600"
                                >
                                    {showKeys[provider.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData[provider.id]?.is_active || false}
                                onChange={e => setFormData(prev => ({
                                    ...prev,
                                    [provider.id]: { ...prev[provider.id], is_active: e.target.checked }
                                }))}
                                className="w-4 h-4"
                            />
                            <span className="text-xs text-gray-700">Set as active LLM</span>
                        </label>

                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                            <button
                                onClick={() => handleSave(provider.id)}
                                disabled={saving[provider.id]}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                            >
                                <Save size={12} />
                                {saving[provider.id] ? 'Saving...' : 'Save'}
                            </button>
                            {settings[provider.id] && (
                                <button
                                    onClick={() => handleDelete(provider.id)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                                >
                                    <Trash2 size={12} />
                                    Delete
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
