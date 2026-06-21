'use client'

import { useState, useEffect } from 'react'
import { X, Loader, Copy, Check } from 'lucide-react'
import { getActiveLLMSettings, getModelsForProvider, generateLLMResponse } from '@/app/api_handlers/api/llm-settings.api'

interface Props {
    prompt: string
    isOpen: boolean
    onClose: () => void
}

export default function LLMGeneratorPopup({ prompt, isOpen, onClose }: Props) {
    const [llmSettings, setLLMSettings] = useState<any[]>([])
    const [selectedProvider, setSelectedProvider] = useState<string>('')
    const [selectedModel, setSelectedModel] = useState<string>('')
    const [models, setModels] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [response, setResponse] = useState<string>('')
    const [copied, setCopied] = useState(false)
    const [error, setError] = useState<string>('')

    useEffect(() => {
        if (isOpen) {
            loadLLMSettings()
        }
    }, [isOpen])

    useEffect(() => {
        if (selectedProvider) {
            loadModelsForProvider(selectedProvider)
        }
    }, [selectedProvider])

    const loadLLMSettings = async () => {
        try {
            const res: any = await getActiveLLMSettings()
            const settings = res?.data || res || []
            setLLMSettings(settings)
            if (settings.length > 0) {
                setSelectedProvider(settings[0].provider)
            }
        } catch (err: any) {
            setError('Failed to load LLM settings')
        }
    }

    const loadModelsForProvider = async (provider: string) => {
        try {
            const res: any = await getModelsForProvider(provider)
            const modelsList = res?.data || res || []
            setModels(modelsList)
            if (modelsList.length > 0) {
                setSelectedModel(modelsList[0].id)
            }
        } catch (err: any) {
            setError('Failed to load models')
        }
    }

    const handleGenerate = async () => {
        if (!selectedProvider || !selectedModel) {
            setError('Please select LLM and model')
            return
        }

        setLoading(true)
        setError('')
        setResponse('')

        try {
            const res: any = await generateLLMResponse(selectedProvider, selectedModel, prompt)
            const result = res?.data || res
            setResponse(result.response || '')
        } catch (err: any) {
            setError(err.message || 'Failed to generate response')
        } finally {
            setLoading(false)
        }
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(response).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
                    <h2 className="text-sm font-semibold text-gray-800">Generate with AI</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                            <p className="text-xs text-red-700">{error}</p>
                        </div>
                    )}

                    {/* LLM Selection */}
                    <div className="space-y-2">
                        <label className="text-[10px] text-gray-400 uppercase font-medium block">Select LLM</label>
                        <select
                            value={selectedProvider}
                            onChange={e => setSelectedProvider(e.target.value)}
                            disabled={loading}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-xs bg-white focus:outline-none focus:border-gray-500 disabled:opacity-50"
                        >
                            {llmSettings.map(setting => (
                                <option key={setting.provider} value={setting.provider}>
                                    {setting.provider.toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Model Selection */}
                    {models.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-[10px] text-gray-400 uppercase font-medium block">Select Model</label>
                            <select
                                value={selectedModel}
                                onChange={e => setSelectedModel(e.target.value)}
                                disabled={loading}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-xs bg-white focus:outline-none focus:border-gray-500 disabled:opacity-50"
                            >
                                {models.map(model => (
                                    <option key={model.id} value={model.id}>
                                        {model.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Prompt Display */}
                    <div className="space-y-2">
                        <label className="text-[10px] text-gray-400 uppercase font-medium block">Prompt</label>
                        <div className="bg-gray-50 border border-gray-200 rounded p-3 max-h-24 overflow-y-auto">
                            <p className="text-xs text-gray-700 whitespace-pre-wrap">{prompt}</p>
                        </div>
                    </div>

                    {/* Response Display */}
                    {response && (
                        <div className="space-y-2">
                            <label className="text-[10px] text-gray-400 uppercase font-medium block">Generated Response</label>
                            <div className="bg-blue-50 border border-blue-200 rounded p-3 max-h-48 overflow-y-auto">
                                <p className="text-xs text-gray-700 whitespace-pre-wrap">{response}</p>
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="flex items-center justify-center py-8">
                            <Loader size={20} className="animate-spin text-gray-400" />
                            <span className="ml-2 text-xs text-gray-400">Generating response...</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 shrink-0">
                    {response && (
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                        >
                            {copied ? <Check size={12} /> : <Copy size={12} />}
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    )}
                    <button
                        onClick={handleGenerate}
                        disabled={loading || !selectedProvider || !selectedModel || !prompt}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading && <Loader size={12} className="animate-spin" />}
                        {loading ? 'Generating...' : 'Generate'}
                    </button>
                    <button onClick={onClose} className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50">
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
