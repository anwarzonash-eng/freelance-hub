'use client'

import { useState, useRef } from 'react'
import { Upload, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, Copy } from 'lucide-react'
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

const SAMPLE_JSON = `[
  {
    "id": "acme_corp_ltd",
    "organisation_name": "Acme Corp Ltd",
    "city": "London",
    "county": "Greater London",
    "sponsor_type": "Worker",
    "sponsor_route": "Skilled Worker",
    "website": "https://acme.com",
    "career_page": "https://acme.com/careers",
    "hr_email": "hr@acme.com",
    "rank": 1,
    "is_deleted": false,
    "visa_mentioned": true,
    "it_jobs_count": 12,
    "overall_jobs_count": 45
  },
  {
    "id": "globex_solutions",
    "organisation_name": "Globex Solutions",
    "city": "Manchester",
    "county": "Greater Manchester",
    "sponsor_type": "Worker",
    "sponsor_route": "Skilled Worker",
    "website": "https://globex.io",
    "career_page": null,
    "hr_email": null,
    "rank": null,
    "is_deleted": false,
    "visa_mentioned": false,
    "it_jobs_count": 3,
    "overall_jobs_count": 10
  }
]`

export default function CompanyJsonPanel({ onDone }: Props) {
    const [open, setOpen] = useState(false)
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ added: number; updated: number; errors: string[] } | null>(null)
    const [parseError, setParseError] = useState('')
    const [showSample, setShowSample] = useState(false)
    const [copied, setCopied] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    const copySample = () => {
        navigator.clipboard.writeText(SAMPLE_JSON)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }

    const useSample = () => {
        setText(SAMPLE_JSON)
        setParseError('')
        setResult(null)
    }

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
                        Paste a JSON array of companies or upload a .json file. Existing IDs → updates <strong>website, career_page, hr_email, rank, is_deleted</strong> only. New IDs → full insert.
                    </p>

                    {/* Sample JSON */}
                    <div className="border border-gray-200 rounded bg-white">
                        <button
                            type="button"
                            className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] text-gray-500 hover:bg-gray-50"
                            onClick={() => setShowSample(s => !s)}
                        >
                            <span className="font-medium text-gray-600">Sample JSON</span>
                            <div className="flex items-center gap-2">
                                {showSample && (
                                    <>
                                        <button type="button" onClick={e => { e.stopPropagation(); copySample() }}
                                            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-700 border border-gray-200 rounded px-1.5 py-0.5">
                                            <Copy size={9} /> {copied ? 'Copied!' : 'Copy'}
                                        </button>
                                        <button type="button" onClick={e => { e.stopPropagation(); useSample() }}
                                            className="flex items-center gap-1 text-[10px] text-teal-600 hover:text-teal-800 border border-teal-200 rounded px-1.5 py-0.5">
                                            Use this
                                        </button>
                                    </>
                                )}
                                {showSample ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            </div>
                        </button>
                        {showSample && (
                            <pre className="px-2 pb-2 text-[10px] font-mono text-gray-600 overflow-x-auto border-t border-gray-100 leading-relaxed">
                                {SAMPLE_JSON}
                            </pre>
                        )}
                    </div>

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
