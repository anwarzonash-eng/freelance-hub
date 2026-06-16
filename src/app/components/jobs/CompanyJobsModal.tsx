'use client'

import { useState } from 'react'
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react'
import { upsertJobsForCompany } from '@/app/api_handlers/api/sponsored-jobs.api'

const REQUIRED_JOB_KEYS = [
    'link', 'job_title', 'company_name', 'location', 'job_complete_description',
    'type', 'experience_required', 'qualification_required', 'tech_skills',
    'soft_skills', 'application_closing_date', 'application_start_date',
    'job_category', 'is_job_sponsored', 'visa_sponsorship_text',
]

function parseLooseJson(input: string): any {
    try { return JSON.parse(input) } catch {}
    return new Function(`"use strict"; return (${input})`)()
}

interface Props {
    company: any
    onClose: () => void
}

interface ValidationError { job: string; missingKeys: string[] }
interface UpsertResult {
    added: string[]
    already_exists: string[]
    errors: { job: string; missing_keys: string[] }[]
}

export default function CompanyJobsModal({ company, onClose }: Props) {
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(false)
    const [parseError, setParseError] = useState('')
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
    const [result, setResult] = useState<UpsertResult | null>(null)

    const handleProcess = async () => {
        setResult(null)
        setValidationErrors([])
        setParseError('')

        let parsed: any
        try {
            parsed = parseLooseJson(text.trim())
        } catch {
            setParseError('Could not parse — check for syntax errors (brackets, commas, quotes).')
            return
        }

        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.jobs)) {
            setParseError('JSON must be an object with a top-level "jobs" array.')
            return
        }

        const errors: ValidationError[] = []
        parsed.jobs.forEach((job: any, idx: number) => {
            const missing = REQUIRED_JOB_KEYS.filter(k => !(k in job))
            if (missing.length > 0) {
                errors.push({ job: job.link || `Job #${idx + 1}`, missingKeys: missing })
            }
        })

        if (errors.length > 0) {
            setValidationErrors(errors)
            return
        }

        setLoading(true)
        try {
            const res: any = await upsertJobsForCompany(company.id, parsed)
            const payload = res?.data ?? res
            setResult({
                added: payload?.added ?? [],
                already_exists: payload?.already_exists ?? [],
                errors: payload?.errors ?? [],
            })
        } finally {
            setLoading(false)
        }
    }

    const hasResult = result && (result.added.length > 0 || result.already_exists.length > 0 || result.errors.length > 0)

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
                    <div>
                        <span className="text-sm font-semibold text-gray-800">Add Jobs</span>
                        <span className="ml-2 text-[10px] text-gray-400">{company.organisation_name}</span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <p className="text-[10px] text-gray-400">
                        Paste the JSON payload with top-level <code className="bg-gray-100 px-0.5 rounded">hr_email</code> (array) and <code className="bg-gray-100 px-0.5 rounded">jobs</code> (array). Jobs already in the database (matched by link) are skipped. Deduplication is by job link URL.
                    </p>

                    <textarea
                        className="w-full h-52 border border-gray-300 rounded px-2 py-1.5 text-xs font-mono resize-y focus:outline-none focus:border-gray-500 bg-white"
                        placeholder={'{\n  "hr_email": ["recruitment@company.co.uk"],\n  "jobs": [\n    {\n      "link": "https://...",\n      "job_title": "...",\n      ...\n    }\n  ]\n}'}
                        value={text}
                        onChange={e => { setText(e.target.value); setParseError(''); setValidationErrors([]); setResult(null) }}
                    />

                    {parseError && (
                        <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                            <AlertTriangle size={12} className="shrink-0 mt-0.5" /> {parseError}
                        </div>
                    )}

                    {validationErrors.length > 0 && (
                        <div className="border border-red-200 rounded bg-red-50 p-3 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-red-700">
                                <AlertTriangle size={12} /> {validationErrors.length} job(s) are missing required keys — fix before submitting:
                            </div>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                {validationErrors.map((e, i) => (
                                    <div key={i} className="text-[10px] text-red-600">
                                        <span className="font-medium">{e.job}</span>
                                        {' — missing: '}
                                        <span className="font-mono">{e.missingKeys.join(', ')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {hasResult && (
                        <div className="border border-gray-200 rounded p-3 space-y-3">
                            {result.added.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700 mb-1">
                                        <CheckCircle size={12} /> {result.added.length} added
                                    </div>
                                    <ul className="space-y-0.5 max-h-28 overflow-y-auto">
                                        {result.added.map((link, i) => (
                                            <li key={i} className="text-[10px] text-green-700 font-mono truncate">{link}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {result.already_exists.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 mb-1">
                                        <Info size={12} /> {result.already_exists.length} already exist (skipped)
                                    </div>
                                    <ul className="space-y-0.5 max-h-28 overflow-y-auto">
                                        {result.already_exists.map((link, i) => (
                                            <li key={i} className="text-[10px] text-amber-700 font-mono truncate">{link}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {result.errors.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700 mb-1">
                                        <AlertTriangle size={12} /> {result.errors.length} error(s)
                                    </div>
                                    <ul className="space-y-0.5 max-h-28 overflow-y-auto">
                                        {result.errors.map((e, i) => (
                                            <li key={i} className="text-[10px] text-red-600">
                                                <span className="font-medium">{e.job}</span>: <span className="font-mono">{e.missing_keys.join(', ')}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    <details className="text-[10px] text-gray-400">
                        <summary className="cursor-pointer hover:text-gray-600 select-none">Required keys per job object</summary>
                        <div className="mt-1.5 font-mono bg-gray-50 rounded p-2 leading-relaxed text-gray-500">
                            {REQUIRED_JOB_KEYS.join(', ')}
                        </div>
                    </details>
                </div>

                <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2 shrink-0">
                    <button type="button" onClick={onClose}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50">
                        {result ? 'Close' : 'Cancel'}
                    </button>
                    <button
                        type="button"
                        onClick={handleProcess}
                        disabled={loading || !text.trim()}
                        className="px-4 py-1.5 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                    >
                        {loading ? 'Processing…' : 'Process Jobs'}
                    </button>
                </div>
            </div>
        </div>
    )
}
