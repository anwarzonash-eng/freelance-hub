'use client'

import { useState } from 'react'
import { X, CheckCircle, AlertTriangle, Info, ChevronLeft, Edit2 } from 'lucide-react'
import { upsertJobsForCompany } from '@/app/api_handlers/api/sponsored-jobs.api'
import { JobPreview, JobEditForm } from './JobPreviewEdit'

const REQUIRED_JOB_KEYS = [
    'link', 'job_title', 'company_name', 'location', 'job_complete_description',
    'type', 'experience_required', 'qualification_required', 'tech_skills',
    'soft_skills', 'application_closing_date', 'application_start_date',
    'job_category', 'is_job_sponsored', 'visa_sponsorship_text', 'sponsorship_status',
]

function parseLooseJson(input: string): any {
    try { return JSON.parse(input) } catch {}
    return new Function(`"use strict"; return (${input})`)()
}

interface Props {
    company: any
    onClose: () => void
    userMap?: Record<string, string>
}

interface ValidationError { job: string; missingKeys: string[] }
interface UpsertResult {
    added: string[]
    already_exists: string[]
    errors: { job: string; issues: string[] }[]
}

const SAMPLE_SINGLE_JOB = `{
  "hr_email": ["recruitment@company.co.uk"],
  "jobs": [
    {
      "link": "https://careers.company.co.uk/job/123",
      "job_title": "Senior Software Engineer",
      "company_name": "Company Ltd",
      "location": "London, UK",
      "job_complete_description": "We are looking for a senior engineer...",
      "type": "Full-time",
      "experience_required": "5+ years",
      "qualification_required": "Bachelor's in Computer Science",
      "tech_skills": "Python, React, PostgreSQL",
      "soft_skills": "Communication, Leadership",
      "application_closing_date": "2026-12-31",
      "application_start_date": "2026-06-20",
      "job_category": "Engineering",
      "is_job_sponsored": true,
      "visa_sponsorship_text": "Yes, visa sponsorship available",
      "sponsorship_status": "Visa Sponsorship Available",
      "freelance_status": "Nothing Mentioned",
      "freelance_description": "",
      "is_security_cleared_required": false,
      "is_certifications_required": true
    }
  ]
}`

const SAMPLE_MULTIPLE_JOBS = `{
  "hr_email": ["recruitment@company.co.uk"],
  "jobs": [
    {
      "link": "https://careers.company.co.uk/job/123",
      "job_title": "Senior Software Engineer",
      "company_name": "Company Ltd",
      "location": "London, UK",
      "job_complete_description": "Senior engineer role...",
      "type": "Full-time",
      "experience_required": "5+ years",
      "qualification_required": "Bachelor's in Computer Science",
      "tech_skills": "Python, React, PostgreSQL",
      "soft_skills": "Communication, Leadership",
      "application_closing_date": "2026-12-31",
      "application_start_date": "2026-06-20",
      "job_category": "Engineering",
      "is_job_sponsored": true,
      "visa_sponsorship_text": "Yes, visa sponsorship available",
      "sponsorship_status": "Visa Sponsorship Available",
      "freelance_status": "Nothing Mentioned",
      "freelance_description": "",
      "is_security_cleared_required": false,
      "is_certifications_required": true
    },
    {
      "link": "https://careers.company.co.uk/job/124",
      "job_title": "Product Manager",
      "company_name": "Company Ltd",
      "location": "London, UK",
      "job_complete_description": "Product manager role...",
      "type": "Full-time",
      "experience_required": "3+ years",
      "qualification_required": "Bachelor's degree",
      "tech_skills": "Product management tools",
      "soft_skills": "Strategic thinking, Collaboration",
      "application_closing_date": "2026-12-31",
      "application_start_date": "2026-06-20",
      "job_category": "Product",
      "is_job_sponsored": false,
      "visa_sponsorship_text": "Visa sponsorship not available",
      "sponsorship_status": "Working Right Required",
      "freelance_status": "Nothing Mentioned",
      "freelance_description": "",
      "is_security_cleared_required": true,
      "is_certifications_required": false
    }
  ]
}`

export default function CompanyJobsModal({ company, onClose, userMap }: Props) {
    const [tab, setTab] = useState<'single' | 'multiple'>('single')
    const [stage, setStage] = useState<'input' | 'preview' | 'edit' | 'result'>('input')
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(false)
    const [parseError, setParseError] = useState('')
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
    const [result, setResult] = useState<UpsertResult | null>(null)
    const [showSample, setShowSample] = useState(false)

    // Preview/Edit state
    const [parsedData, setParsedData] = useState<any>(null)
    const [selectedJobIndex, setSelectedJobIndex] = useState(0)
    const [selectedJobs, setSelectedJobs] = useState<Set<number>>(new Set())
    const [editingJob, setEditingJob] = useState<any>(null)

    const handleParse = () => {
        setValidationErrors([])
        setParseError('')

        let parsed: any
        try {
            parsed = parseLooseJson(text.trim())
        } catch {
            setParseError('Could not parse — check for syntax errors (brackets, commas, quotes).')
            return
        }

        if (!parsed || typeof parsed !== 'object') {
            setParseError('JSON must be an object.')
            return
        }

        // Handle single job mode: wrap single job if needed
        if (tab === 'single' && !parsed.jobs) {
            if (parsed.link && parsed.job_title) {
                parsed = { hr_email: parsed.hr_email || [], jobs: [parsed] }
            } else {
                setParseError('For single job mode, JSON must contain at least "link" and "job_title" fields.')
                return
            }
        }

        if (!Array.isArray(parsed.jobs)) {
            setParseError('JSON must contain a top-level "jobs" array.')
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

        setParsedData(parsed)
        setSelectedJobIndex(0)
        setSelectedJobs(new Set(parsed.jobs.map((_: any, i: number) => i)))
        setStage('preview')
    }

    const handleEditJob = (idx: number) => {
        setEditingJob({ ...parsedData.jobs[idx] })
        setSelectedJobIndex(idx)
        setStage('edit')
    }

    const handleUpdateJob = () => {
        if (!editingJob || !parsedData) return
        const newJobs = [...parsedData.jobs]
        newJobs[selectedJobIndex] = { ...editingJob }
        setParsedData({ ...parsedData, jobs: newJobs })
        setStage('preview')
        setEditingJob(null)
    }

    const handleSaveJobs = async () => {
        if (!parsedData) return
        setLoading(true)
        try {
            const jobsToSave = tab === 'single'
                ? parsedData.jobs.slice(0, 1)
                : parsedData.jobs.filter((_: any, i: number) => selectedJobs.has(i))

            const payload = {
                hr_email: parsedData.hr_email || [],
                jobs: jobsToSave,
            }

            const res: any = await upsertJobsForCompany(company.id, payload)
            const resPayload = res?.data ?? res
            setResult({
                added: resPayload?.added ?? [],
                already_exists: resPayload?.already_exists ?? [],
                errors: resPayload?.errors ?? [],
            })
            setStage('result')
        } finally {
            setLoading(false)
        }
    }

    const goBack = () => {
        if (stage === 'edit') {
            setStage('preview')
            setEditingJob(null)
        } else if (stage === 'preview') {
            setStage('input')
            setParsedData(null)
        }
    }

    const currentJob = parsedData?.jobs[selectedJobIndex]
    const hasResult = result && (result.added.length > 0 || result.already_exists.length > 0 || result.errors.length > 0)

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white shadow-2xl w-full h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
                    <div className="flex items-center gap-3">
                        {stage !== 'input' && (
                            <button onClick={goBack} className="text-gray-400 hover:text-gray-700">
                                <ChevronLeft size={16} />
                            </button>
                        )}
                        <div>
                            <span className="text-sm font-semibold text-gray-800">Add Jobs</span>
                            <span className="ml-2 text-[10px] text-gray-400">{company.organisation_name}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
                </div>

                {/* Tabs (only on input) */}
                {stage === 'input' && (
                    <div className="flex gap-4 px-4 pt-3 border-b border-gray-200 shrink-0">
                        <button
                            onClick={() => setTab('single')}
                            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                                tab === 'single'
                                    ? 'border-gray-800 text-gray-800'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Single Job
                        </button>
                        <button
                            onClick={() => setTab('multiple')}
                            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                                tab === 'multiple'
                                    ? 'border-gray-800 text-gray-800'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Multiple Jobs
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {/* INPUT STAGE */}
                    {stage === 'input' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] text-gray-400">
                                    Paste the JSON payload. Jobs are matched by <code className="bg-gray-100 px-0.5 rounded">link</code> URL and skipped if already in database.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setShowSample(!showSample)}
                                    className="text-[10px] text-gray-600 hover:text-gray-800 underline ml-2 shrink-0"
                                >
                                    {showSample ? 'Hide' : 'Show'} Sample
                                </button>
                            </div>

                            {showSample && (
                                <div className="bg-indigo-50 border border-indigo-200 rounded p-3 max-h-48 overflow-y-auto">
                                    <p className="text-[9px] text-indigo-700 font-semibold mb-2 uppercase">Sample JSON ({tab === 'single' ? 'Single Job' : 'Multiple Jobs'})</p>
                                    <pre className="text-[10px] text-indigo-900 font-mono whitespace-pre-wrap overflow-x-auto">
                                        {tab === 'single' ? SAMPLE_SINGLE_JOB : SAMPLE_MULTIPLE_JOBS}
                                    </pre>
                                    <button
                                        type="button"
                                        onClick={() => setText(tab === 'single' ? SAMPLE_SINGLE_JOB : SAMPLE_MULTIPLE_JOBS)}
                                        className="mt-2 px-2 py-1 text-[10px] bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                    >
                                        Copy to Input
                                    </button>
                                </div>
                            )}

                            <textarea
                                className="w-full h-52 border border-gray-300 rounded px-2 py-1.5 text-xs font-mono resize-y focus:outline-none focus:border-gray-500 bg-white"
                                placeholder={tab === 'single'
                                    ? '{\n  "hr_email": ["recruitment@company.co.uk"],\n  "jobs": [\n    {\n      "link": "https://...",\n      "job_title": "..."\n    }\n  ]\n}'
                                    : '{\n  "hr_email": ["recruitment@company.co.uk"],\n  "jobs": [\n    {...},\n    {...}\n  ]\n}'}
                                value={text}
                                onChange={e => { setText(e.target.value); setParseError(''); setValidationErrors([]) }}
                            />

                            {parseError && (
                                <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                                    <AlertTriangle size={12} className="shrink-0 mt-0.5" /> {parseError}
                                </div>
                            )}

                            {validationErrors.length > 0 && (
                                <div className="border border-red-200 rounded bg-red-50 p-3 space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-red-700">
                                        <AlertTriangle size={12} /> {validationErrors.length} job(s) are missing required keys
                                    </div>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {validationErrors.map((e, i) => (
                                            <div key={i} className="text-[10px] text-red-600">
                                                <span className="font-medium">{e.job}</span> — missing: <span className="font-mono">{e.missingKeys.join(', ')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <details className="text-[10px] text-gray-400">
                                <summary className="cursor-pointer hover:text-gray-600 select-none">Required keys per job object</summary>
                                <div className="mt-1.5 font-mono bg-gray-50 rounded p-2 leading-relaxed text-gray-500 text-[9px]">
                                    {REQUIRED_JOB_KEYS.join(', ')}
                                </div>
                            </details>
                        </div>
                    )}

                    {/* PREVIEW STAGE */}
                    {stage === 'preview' && parsedData && (
                        <div className="space-y-3">
                            {tab === 'multiple' && (
                                <div className="border border-gray-200 rounded p-3">
                                    <p className="text-[10px] text-gray-400 mb-2">Select jobs to save:</p>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {parsedData.jobs.map((job: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-2 p-2 border border-gray-100 rounded hover:bg-gray-50">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedJobs.has(idx)}
                                                    onChange={e => {
                                                        const newSet = new Set(selectedJobs)
                                                        if (e.target.checked) newSet.add(idx)
                                                        else newSet.delete(idx)
                                                        setSelectedJobs(newSet)
                                                    }}
                                                    className="w-4 h-4"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-gray-800">{job.job_title}</p>
                                                    <p className="text-[10px] text-gray-500">{job.location}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleEditJob(idx)}
                                                    className="px-2 py-1 text-[10px] border border-gray-300 rounded hover:bg-gray-100 shrink-0"
                                                >
                                                    View
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {tab === 'single' && currentJob && (
                                <div className="border border-gray-200 rounded p-4 space-y-4">
                                    <JobPreview job={currentJob} userMap={userMap} />
                                    <div className="border-t pt-3 flex gap-2">
                                        <button
                                            onClick={() => handleEditJob(0)}
                                            className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center gap-1"
                                        >
                                            <Edit2 size={12} /> Edit Job
                                        </button>
                                    </div>
                                </div>
                            )}

                            {tab === 'multiple' && selectedJobIndex >= 0 && parsedData.jobs[selectedJobIndex] && (
                                <div className="border border-gray-200 rounded p-4 space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-semibold text-gray-800">Job {selectedJobIndex + 1} of {parsedData.jobs.length}</h3>
                                        <button
                                            onClick={() => setSelectedJobIndex(-1)}
                                            className="text-gray-400 hover:text-gray-600 text-sm"
                                        >
                                            ← Back to List
                                        </button>
                                    </div>
                                    <JobPreview job={parsedData.jobs[selectedJobIndex]} userMap={userMap} />
                                    <div className="border-t pt-3 flex gap-2">
                                        <button
                                            onClick={() => handleEditJob(selectedJobIndex)}
                                            className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center gap-1"
                                        >
                                            <Edit2 size={12} /> Edit Job
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* EDIT STAGE */}
                    {stage === 'edit' && editingJob && (
                        <JobEditForm job={editingJob} setJob={setEditingJob} userMap={userMap} />
                    )}

                    {/* RESULT STAGE */}
                    {stage === 'result' && hasResult && (
                        <div className="border border-gray-200 rounded p-3 space-y-3">
                            {result!.added.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700 mb-1">
                                        <CheckCircle size={12} /> {result!.added.length} added
                                    </div>
                                    <ul className="space-y-0.5 max-h-28 overflow-y-auto">
                                        {result!.added.map((link, i) => (
                                            <li key={i} className="flex items-center gap-2 text-[10px] text-green-700">
                                                <span className="font-mono truncate flex-1">{link}</span>
                                                <a
                                                    href={`/jobs/listed-jobs?id=${encodeURIComponent(link)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="shrink-0 underline hover:text-green-900"
                                                >
                                                    View Job
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {result!.already_exists.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 mb-1">
                                        <Info size={12} /> {result!.already_exists.length} already exist (skipped)
                                    </div>
                                    <ul className="space-y-0.5 max-h-28 overflow-y-auto">
                                        {result!.already_exists.map((link, i) => (
                                            <li key={i} className="text-[10px] text-amber-700 font-mono truncate">{link}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {result!.errors.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700 mb-2">
                                        <AlertTriangle size={12} /> {result!.errors.length} error(s)
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {result!.errors.map((e, i) => (
                                            <div key={i} className="bg-red-50 border border-red-200 rounded p-2">
                                                <p className="text-[10px] font-medium text-red-700 mb-1">{e.job}</p>
                                                <ul className="space-y-0.5">
                                                    {e.issues.map((issue: string, idx: number) => (
                                                        <li key={idx} className="text-[10px] text-red-600 flex gap-1.5">
                                                            <span className="text-red-400 shrink-0">•</span>
                                                            <span>{issue}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2 shrink-0">
                    <button type="button" onClick={onClose}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50">
                        {stage === 'result' ? 'Close' : 'Cancel'}
                    </button>
                    {stage === 'input' && (
                        <button
                            type="button"
                            onClick={handleParse}
                            disabled={!text.trim()}
                            className="px-4 py-1.5 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                        >
                            Parse & Preview
                        </button>
                    )}
                    {stage === 'preview' && (
                        <button
                            type="button"
                            onClick={handleSaveJobs}
                            disabled={loading || selectedJobs.size === 0}
                            className="px-4 py-1.5 text-xs bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50"
                        >
                            {loading ? 'Saving…' : 'Save Jobs'}
                        </button>
                    )}
                    {stage === 'edit' && (
                        <button
                            type="button"
                            onClick={handleUpdateJob}
                            className="px-4 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                            Done Editing
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

