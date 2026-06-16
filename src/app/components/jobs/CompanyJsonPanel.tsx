'use client'

import { useState, useRef } from 'react'
import { Upload, ChevronDown, ChevronUp, CheckCircle, AlertTriangle } from 'lucide-react'
import { upsertCompaniesFromJson } from '@/app/api_handlers/api/sponsored-companies.api'

interface Props {
    onDone: () => void
}

function parseLooseJson(input: string): any {
    try {
        return JSON.parse(input)
    } catch {}
    // Handles JS object literal syntax: single quotes, unquoted keys, trailing commas, comments
    return new Function(`"use strict"; return (${input})`)()
}

export default function CompanyJsonPanel({ onDone }: Props) {
    const [open, setOpen] = useState(false)
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ added: number; updated: number; errors: string[] } | null>(null)
    const [parseError, setParseError] = useState('')
    const fileRef = useRef<HTMLInputElement>(null)

    const processJson = async (json: string) => {
        setParseError('')
        setResult(null)
        let parsed: any
        try {
            parsed = parseLooseJson(json)
        } catch {
            setParseError('Could not parse input — check for syntax errors (mismatched brackets, missing commas, etc.).')
            return
        }
        const companies = Array.isArray(parsed) ? parsed : [parsed]
        setLoading(true)
        try {
            const res: any = await upsertCompaniesFromJson(companies)
            const payload = res?.data ?? res
            setResult({ added: payload?.added ?? 0, updated: payload?.updated ?? 0, errors: payload?.errors ?? [] })
            onDone()
        } finally {
            setLoading(false)
        }
    }

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = ev => {
            const content = ev.target?.result as string
            setText(content)
            processJson(content)
        }
        reader.readAsText(file)
        e.target.value = ''
    }

    return (
        <div className="border border-gray-200 rounded mb-3 bg-gray-50">
            <button
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded"
                onClick={() => setOpen(p => !p)}
            >
                <span className="flex items-center gap-2"><Upload size={13} /> Upload / Paste JSON</span>
                {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {open && (
                <div className="px-3 pb-3 space-y-2">
                    <p className="text-[10px] text-gray-400">
                        Paste a JSON array of companies or upload a .json file. Existing IDs → updates <strong>website, career_page, hr_email, is_deleted</strong> only. New IDs → full insert.
                    </p>

                    <textarea
                        className="w-full h-40 border border-gray-300 rounded px-2 py-1.5 text-xs font-mono resize-y focus:outline-none focus:border-gray-500 bg-white"
                        placeholder={'[\n  { "id": "...", "organisation_name": "...", ... }\n]'}
                        value={text}
                        onChange={e => { setText(e.target.value); setParseError(''); setResult(null) }}
                    />

                    {parseError && (
                        <div className="flex items-center gap-1.5 text-xs text-red-600">
                            <AlertTriangle size={12} /> {parseError}
                        </div>
                    )}

                    {result && (
                        <div className="bg-white border border-gray-200 rounded p-2 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
                                <CheckCircle size={12} />
                                Done — {result.added} added, {result.updated} updated
                            </div>
                            {result.errors.length > 0 && (
                                <details className="text-[10px] text-red-600">
                                    <summary className="cursor-pointer">{result.errors.length} error(s)</summary>
                                    <ul className="mt-1 space-y-0.5 list-disc list-inside">
                                        {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                                    </ul>
                                </details>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => processJson(text)}
                            disabled={loading || !text.trim()}
                            className="px-3 py-1.5 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                        >
                            {loading ? 'Processing…' : 'Process JSON'}
                        </button>
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-white flex items-center gap-1"
                        >
                            <Upload size={11} /> Upload File
                        </button>
                        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFile} />
                    </div>
                </div>
            )}
        </div>
    )
}
