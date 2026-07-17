'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle, Copy, Check, X, Plus, Pencil } from 'lucide-react'
import { timeAgo } from '@/app/utils/time'

// Some uploaded job JSON has stray nested objects in fields expected to be plain
// strings (e.g. a notice-period object dropped into application_closing_date) — render
// those safely instead of letting React throw "Objects are not valid as a React child".
function renderFieldValue(value: any): string {
    if (value === null || value === undefined || value === '') return '—'
    if (typeof value === 'object') {
        if (Array.isArray(value)) return value.join(', ') || '—'
        return Object.entries(value).map(([k, v]) => `${k}: ${v}`).join(', ') || '—'
    }
    return String(value)
}

export const APPLICATION_STATUS_OPTIONS = [
    { value: '', label: 'Not tracked' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'positive', label: 'Positive Response' },
    { value: 'negative', label: 'Negative Response' },
    { value: 'job_not_available', label: 'Job Not Available' },
]

export function ApplicationStatusIcon({ job }: { job: any }) {
    const status = job.application_status
    if (!status) return <span className="text-gray-300 text-[10px]">—</span>
    if (status === 'in_progress') {
        return <span title="In Progress" className="inline-flex"><Clock size={13} className="text-amber-500" /></span>
    }
    if (status === 'positive') {
        return <span title={job.application_status_note ? `Next steps: ${job.application_status_note}` : 'Positive Response'} className="inline-flex"><CheckCircle2 size={13} className="text-green-600" /></span>
    }
    if (status === 'negative') {
        return <span title={job.application_status_note ? `Reason: ${job.application_status_note}` : 'Negative Response'} className="inline-flex"><XCircle size={13} className="text-red-600" /></span>
    }
    if (status === 'job_not_available') {
        return <span title="Job Not Available" className="inline-flex"><XCircle size={13} className="text-gray-400" /></span>
    }
    return null
}

export function CvSubmissionBadge({ job, userMap }: { job: any; userMap?: Record<string, string> }) {
    if (!job.is_cv_submitted) {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded font-medium">
                CV not submitted
            </span>
        )
    }
    const ago = timeAgo(job.cv_submitted_at)
    const submitterName = job.cv_submitted_by ? userMap?.[job.cv_submitted_by] : null
    return (
        <span className="inline-flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
            CV Submitted{ago ? ` — ${ago}` : ''}
            {submitterName ? ` by ${submitterName}` : ''}
            {job.cv_email_sent ? ` · ${job.cv_email_sent}` : ''}
        </span>
    )
}

export function JobPreview({ job, userMap }: { job: any; userMap?: Record<string, string> }) {
    const [activeTab, setActiveTab] = useState<'overview' | 'qa'>('overview')
    const [expandedDescription, setExpandedDescription] = useState(true)
    const [expandedRawDescription, setExpandedRawDescription] = useState(false)
    const [rawDescFontSize, setRawDescFontSize] = useState<number>(() => {
        try { return Number(localStorage.getItem('raw_desc_font_size')) || 12 } catch { return 12 }
    })
    const changeRawDescFontSize = (delta: number) => {
        setRawDescFontSize(prev => {
            const next = Math.min(24, Math.max(8, prev + delta))
            try { localStorage.setItem('raw_desc_font_size', String(next)) } catch {}
            return next
        })
    }

    const qaList: { question: string; answer: string }[] = job.additional_fields?.qa_list ?? []

    return (
        <>
            <div>
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">{job.job_title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{job.company_name} • {job.location}</p>
                        <div className="mt-2 flex items-center gap-2">
                            <CvSubmissionBadge job={job} userMap={userMap} />
                            {job.application_status && (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded font-medium bg-gray-50 border border-gray-200">
                                    <ApplicationStatusIcon job={job} />
                                    {APPLICATION_STATUS_OPTIONS.find(o => o.value === job.application_status)?.label}
                                    {job.application_status_note ? ` — ${job.application_status_note}` : ''}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-0 border-b border-gray-200 mt-3">
                {([
                    { key: 'overview', label: 'Overview' },
                    { key: 'qa',       label: `Q&A${qaList.length ? ` (${qaList.length})` : ''}` },
                ] as const).map(tab => (
                    <button key={tab.key} type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-gray-800 text-gray-800' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Q&A Tab */}
            {activeTab === 'qa' && (
                <div className="py-4">
                    {qaList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                                <span className="text-gray-400 text-lg">?</span>
                            </div>
                            <p className="text-sm font-medium text-gray-500">No Q&amp;A added yet</p>
                            <p className="text-xs text-gray-400 mt-1">Switch to Edit mode to add application questions and answers.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {qaList.map((item, idx) => (
                                <div key={idx} className="rounded-lg border border-gray-200 overflow-hidden">
                                    <div className="flex items-start gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
                                        <span className="shrink-0 w-5 h-5 rounded-full bg-gray-800 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                                            {idx + 1}
                                        </span>
                                        <p className="text-sm font-medium text-gray-800 leading-snug">{item.question || <span className="text-gray-400 italic">No question text</span>}</p>
                                    </div>
                                    <div className="px-4 py-3 bg-white">
                                        {item.answer ? (
                                            <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{item.answer}</p>
                                        ) : (
                                            <p className="text-xs text-gray-400 italic">No answer yet</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Overview Tab */}
            {activeTab === 'overview' && <>

            {/* Main Fields Grid */}
            <div className="grid grid-cols-2 gap-3 py-3 border-t border-b">
                {[
                    { label: 'Type', value: job.type },
                    { label: 'Category', value: job.job_category },
                    { label: 'Experience Required', value: job.experience_required },
                    { label: 'Visa Sponsorship', value: job.visa_sponsorship_text, highlight: true },
                    { label: 'Sponsorship Status', value: job.sponsorship_status, highlight: true },
                    { label: 'Freelance Status', value: job.freelance_status },
                    { label: 'Application Start', value: job.application_start_date },
                    { label: 'Application Closing', value: job.application_closing_date },
                    { label: 'Qualification Required', value: job.qualification_required },
                    { label: 'Security Clearance Required', value: job.is_security_cleared_required ? 'Yes' : 'No' },
                    { label: 'Certifications Required', value: job.is_certifications_required ? 'Yes' : 'No' },
                ].map((field: any, idx) => {
                    const highlighted = field.highlight && field.value
                    return (
                        <div key={idx} className={highlighted ? 'bg-amber-50 border border-amber-300 rounded p-1.5' : ''}>
                            <p className="text-[10px] text-gray-400 uppercase font-semibold">{field.label}</p>
                            <p className={`text-xs mt-0.5 ${highlighted ? 'text-amber-900 font-semibold' : 'text-gray-700'}`}>
                                {renderFieldValue(field.value)}
                            </p>
                        </div>
                    )
                })}
            </div>

            {/* Freelance Description */}
            {job.freelance_description && (
                <div className="py-3 border-b">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Freelance Notes</p>
                    <p className="text-xs text-gray-700 whitespace-pre-wrap">{job.freelance_description}</p>
                </div>
            )}

            {/* Description (HTML) */}
            {job.job_complete_description && (
                <div className="py-3 border-b">
                    <button
                        onClick={() => setExpandedDescription(!expandedDescription)}
                        className="flex items-center gap-2 w-full text-left"
                    >
                        {expandedDescription ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Description</p>
                    </button>
                    {expandedDescription && (
                        <div
                            className="text-xs text-gray-700 space-y-2 mt-2 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_p]:text-xs [&_p]:text-gray-700 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-1 [&_li]:text-xs [&_li]:text-gray-700 [&_a]:text-blue-600 [&_a]:hover:underline"
                            dangerouslySetInnerHTML={{ __html: job.job_complete_description }}
                        />
                    )}
                </div>
            )}

            {/* Raw Description */}
            {job.raw_description && (
                <div className="py-3 border-b">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setExpandedRawDescription(!expandedRawDescription)}
                            className="flex items-center gap-2 flex-1 text-left"
                        >
                            {expandedRawDescription ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            <p className="text-[10px] text-gray-400 uppercase font-semibold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">Raw Description (for CV)</p>
                        </button>
                        {expandedRawDescription && (
                            <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => changeRawDescFontSize(-1)}
                                    className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded border border-gray-200 text-xs leading-none">−</button>
                                <span className="text-[10px] text-gray-400 w-7 text-center">{rawDescFontSize}px</span>
                                <button onClick={() => changeRawDescFontSize(1)}
                                    className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded border border-gray-200 text-xs leading-none">+</button>
                            </div>
                        )}
                    </div>
                    {expandedRawDescription && (
                        <div className="mt-2 bg-blue-50 border border-blue-200 rounded p-3">
                            <p className="text-gray-700 whitespace-pre-wrap" style={{ fontSize: rawDescFontSize }}>{job.raw_description}</p>
                            {job.tech_skills && job.tech_skills.length > 0 && (
                                <SkillsFoundInDescription
                                    skills={job.tech_skills}
                                    description={job.raw_description}
                                    label="Technical Skills Found"
                                />
                            )}
                            {job.soft_skills && job.soft_skills.length > 0 && (
                                <SkillsFoundInDescription
                                    skills={job.soft_skills}
                                    description={job.raw_description}
                                    label="Soft Skills Found"
                                />
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Tech Skills */}
            {Array.isArray(job.tech_skills) && job.tech_skills.length > 0 && (
                <div className="py-3 border-b">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold mb-2">Technical Skills</p>
                    <div className="flex flex-wrap gap-1">
                        {job.tech_skills.map((skill: string, idx: number) => (
                            <span key={idx} className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px]">
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Soft Skills */}
            {Array.isArray(job.soft_skills) && job.soft_skills.length > 0 && (
                <div className="py-3 border-b">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold mb-2">Soft Skills</p>
                    <div className="flex flex-wrap gap-1">
                        {job.soft_skills.map((skill: string, idx: number) => (
                            <span key={idx} className="inline-block bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px]">
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Additional Fields */}
            {job.additional_fields && Object.keys(job.additional_fields).filter(k => k !== 'qa_list').length > 0 && (
                <div className="py-3">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold mb-2">Additional Information</p>
                    <div className="space-y-2">
                        {Object.entries(job.additional_fields).filter(([k]) => k !== 'qa_list').map(([key, value]: [string, any], idx) => (
                            <div key={idx} className="bg-gray-50 p-2 rounded">
                                <p className="text-[10px] text-gray-500 uppercase font-semibold">{key.replace(/_/g, ' ')}</p>
                                {Array.isArray(value) ? (
                                    <ul className="text-xs text-gray-700 mt-1 list-disc list-inside">
                                        {value.map((item, i) => (
                                            <li key={i}>{renderFieldValue(item)}</li>
                                        ))}
                                    </ul>
                                ) : typeof value === 'object' ? (
                                    <pre className="text-[10px] text-gray-700 mt-1 overflow-x-auto bg-white p-1 rounded border border-gray-200">
                                        {JSON.stringify(value, null, 2)}
                                    </pre>
                                ) : (
                                    <p className="text-xs text-gray-700 mt-1">{value}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            </>}
        </>
    )
}

function SkillsFoundInDescription({ skills, description, label }: { skills: string[]; description: string; label: string }) {
    const foundSkills = skills.filter(skill => description.toLowerCase().includes(skill.toLowerCase()))

    if (foundSkills.length === 0) return null

    return (
        <div className="mt-3 pt-3 border-t border-blue-100">
            <p className="text-[10px] text-blue-600 uppercase font-semibold mb-2">✓ {label}</p>
            <div className="flex flex-wrap gap-1">
                {foundSkills.map((skill, idx) => (
                    <span key={idx} className="inline-block bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-medium">
                        {skill}
                    </span>
                ))}
            </div>
        </div>
    )
}

const QA_PROMPT = `You are helping extract application questions from a job posting page.

Look at the current job application page carefully. Find ALL questions, form fields, and prompts that require a written response when submitting a job application — such as cover letter prompts, motivational questions, eligibility questions, custom screening questions, or any other text-input fields.

Return ONLY a raw JSON array of strings — no explanation, no markdown, no code fences. Example format:
["Why do you want to work here?", "Do you have the right to work in the UK?", "Describe your experience with React."]

Do NOT include standard personal detail fields like name, email, phone number, address, or CV/resume upload.`

export function JobEditForm({ job, setJob, userMap }: { job: any; setJob: (job: any) => void; userMap?: Record<string, string> }) {
    const inputCls = 'w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-gray-500'
    const labelCls = 'text-[10px] text-gray-400 uppercase font-medium mb-0.5 block'
    const textareaCls = 'w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-gray-500 resize-none'

    const [activeTab, setActiveTab] = useState<'basic' | 'qa'>('basic')
    const [promptCopied, setPromptCopied] = useState(false)
    const [qaJsonPaste, setQaJsonPaste] = useState('')
    const [qaParseError, setQaParseError] = useState('')
    const [editingQIdx, setEditingQIdx] = useState<number | null>(null)

    const qaList: { question: string; answer: string }[] = job.additional_fields?.qa_list ?? []

    const handleFieldChange = (field: string, value: any) => {
        setJob({ ...job, [field]: value })
    }

    const handleAdditionalFieldChange = (fieldKey: string, value: any) => {
        setJob({
            ...job,
            additional_fields: { ...(job.additional_fields || {}), [fieldKey]: value }
        })
    }

    const addAdditionalField = () => {
        setJob({
            ...job,
            additional_fields: { ...(job.additional_fields || {}), new_field: '' }
        })
    }

    const removeAdditionalField = (fieldKey: string) => {
        const newAdditional = { ...(job.additional_fields || {}) }
        delete newAdditional[fieldKey]
        setJob({ ...job, additional_fields: newAdditional })
    }

    const setQaList = (list: { question: string; answer: string }[]) => {
        setJob({ ...job, additional_fields: { ...(job.additional_fields || {}), qa_list: list } })
    }

    const copyPrompt = () => {
        navigator.clipboard.writeText(QA_PROMPT).then(() => {
            setPromptCopied(true)
            setTimeout(() => setPromptCopied(false), 2000)
        })
    }

    const parseQaJson = () => {
        setQaParseError('')
        try {
            const parsed = JSON.parse(qaJsonPaste.trim())
            if (!Array.isArray(parsed) || !parsed.every(q => typeof q === 'string')) {
                setQaParseError('Must be a JSON array of strings e.g. ["Q1","Q2"]')
                return
            }
            const merged = parsed.map((q: string) => {
                const existing = qaList.find(e => e.question === q)
                return { question: q, answer: existing?.answer ?? '' }
            })
            setQaList(merged)
            setQaJsonPaste('')
        } catch {
            setQaParseError('Invalid JSON — paste the raw array from Claude.')
        }
    }

    const updateAnswer = (idx: number, answer: string) => {
        const updated = qaList.map((item, i) => i === idx ? { ...item, answer } : item)
        setQaList(updated)
    }

    const removeQuestion = (idx: number) => {
        setQaList(qaList.filter((_, i) => i !== idx))
        if (editingQIdx === idx) setEditingQIdx(null)
    }

    const updateQuestion = (idx: number, question: string) => {
        const updated = qaList.map((item, i) => i === idx ? { ...item, question } : item)
        setQaList(updated)
    }

    const addQuestion = () => {
        const newIdx = qaList.length
        setQaList([...qaList, { question: '', answer: '' }])
        setEditingQIdx(newIdx)
    }

    return (
        <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="flex gap-0 border-b border-gray-200 mb-4 shrink-0">
                {(['basic', 'qa'] as const).map(tab => (
                    <button key={tab} type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-gray-800 text-gray-800' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        {tab === 'basic' ? 'Basic Details' : `Q/A${qaList.length ? ` (${qaList.length})` : ''}`}
                    </button>
                ))}
            </div>

            {/* Basic Details Tab */}
            {activeTab === 'basic' && (
        <div className="space-y-4 grid grid-cols-2 gap-4">
            {/* Left Column - Main Fields */}
            <div className="space-y-4">
                <div>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold mb-2 sticky top-0 bg-white py-1">Core Information</p>
                    <div className="space-y-2">
                        <div>
                            <label className={labelCls}>Job Title</label>
                            <input type="text" value={job.job_title || ''} onChange={e => handleFieldChange('job_title', e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Company Name</label>
                            <input type="text" value={job.company_name || ''} onChange={e => handleFieldChange('company_name', e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Location</label>
                            <input type="text" value={job.location || ''} onChange={e => handleFieldChange('location', e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Link</label>
                            <input type="text" value={job.link || ''} onChange={e => handleFieldChange('link', e.target.value)} className={inputCls} />
                        </div>
                    </div>
                </div>

                <div>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold mb-2">Job Details</p>
                    <div className="space-y-2">
                        <div>
                            <label className={labelCls}>Type</label>
                            <input type="text" value={job.type || ''} onChange={e => handleFieldChange('type', e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Category</label>
                            <input type="text" value={job.job_category || ''} onChange={e => handleFieldChange('job_category', e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Experience Required</label>
                            <input type="text" value={job.experience_required || ''} onChange={e => handleFieldChange('experience_required', e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Qualification Required</label>
                            <textarea value={job.qualification_required || ''} onChange={e => handleFieldChange('qualification_required', e.target.value)} className={`${textareaCls} h-16`} />
                        </div>
                    </div>
                </div>

                <div>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold mb-2 bg-amber-50 border-2 border-amber-300 p-2 rounded">🔴 Visa Sponsorship</p>
                    <div className="bg-amber-50 border-2 border-amber-300 rounded p-3 space-y-2">
                        <div>
                            <label className={labelCls}>Sponsorship Status</label>
                            <select value={job.sponsorship_status || 'Nothing Mentioned'} onChange={e => handleFieldChange('sponsorship_status', e.target.value)} className={`${inputCls} bg-white`}>
                                <option value="Visa Sponsorship Available">Visa Sponsorship Available</option>
                                <option value="Working Right Required">Working Right Required</option>
                                <option value="Nothing Mentioned">Nothing Mentioned</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Visa Sponsorship Text</label>
                            <textarea value={job.visa_sponsorship_text || ''} onChange={e => handleFieldChange('visa_sponsorship_text', e.target.value)} className={`${textareaCls} h-16 bg-white`} />
                        </div>
                    </div>
                </div>

                <div>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold mb-2 bg-teal-50 border-2 border-teal-300 p-2 rounded">💼 Freelance</p>
                    <div className="bg-teal-50 border-2 border-teal-300 rounded p-3 space-y-2">
                        <div>
                            <label className={labelCls}>Freelance Status</label>
                            <select value={job.freelance_status || 'Nothing Mentioned'} onChange={e => handleFieldChange('freelance_status', e.target.value)} className={`${inputCls} bg-white`}>
                                <option value="It's Freelance">It's Freelance</option>
                                <option value="Could be Freelance">Could be Freelance</option>
                                <option value="Nothing Mentioned">Nothing Mentioned</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Freelance Description</label>
                            <textarea value={job.freelance_description || ''} onChange={e => handleFieldChange('freelance_description', e.target.value)} className={`${textareaCls} h-16 bg-white`} placeholder="Any freelance-related mentions in the job description" />
                        </div>
                    </div>
                </div>

                <div>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold mb-2">Dates</p>
                    <div className="space-y-2">
                        <div>
                            <label className={labelCls}>Application Start Date</label>
                            <input type="text" value={job.application_start_date || ''} onChange={e => handleFieldChange('application_start_date', e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Application Closing Date</label>
                            <input type="text" value={job.application_closing_date || ''} onChange={e => handleFieldChange('application_closing_date', e.target.value)} className={inputCls} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column - Description, Skills & Additional Fields */}
            <div className="space-y-4">
                <div>
                    <label className={labelCls}>Description (HTML)</label>
                    <textarea value={job.job_complete_description || ''} onChange={e => handleFieldChange('job_complete_description', e.target.value)} className={`${textareaCls} h-24`} />
                </div>

                <div>
                    <label className={labelCls + ' bg-blue-50 border border-blue-200 px-2 py-0.5 rounded block'}>Raw Description (for CV)</label>
                    <textarea value={job.raw_description || ''} onChange={e => handleFieldChange('raw_description', e.target.value)} className={`${textareaCls} h-24 bg-blue-50 border-blue-200`} placeholder="Raw job description text for CV generation" />
                </div>

                <div>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold mb-2">Skills</p>
                    <div className="space-y-2">
                        <div>
                            <label className={labelCls}>Technical Skills (comma-separated)</label>
                            <textarea
                                value={Array.isArray(job.tech_skills) ? job.tech_skills.join(', ') : job.tech_skills || ''}
                                onChange={e => handleFieldChange('tech_skills', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                className={`${textareaCls} h-16`}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Soft Skills (comma-separated)</label>
                            <textarea
                                value={Array.isArray(job.soft_skills) ? job.soft_skills.join(', ') : job.soft_skills || ''}
                                onChange={e => handleFieldChange('soft_skills', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                className={`${textareaCls} h-16`}
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold mb-2">Requirements & Tracking</p>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={job.is_security_cleared_required || false}
                                onChange={e => handleFieldChange('is_security_cleared_required', e.target.checked)}
                                className="w-3.5 h-3.5"
                            />
                            <span className="text-xs text-gray-700">Security Clearance Required</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={job.is_certifications_required || false}
                                onChange={e => handleFieldChange('is_certifications_required', e.target.checked)}
                                className="w-3.5 h-3.5"
                            />
                            <span className="text-xs text-gray-700">Certifications Required</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={job.is_cv_submitted || false}
                                onChange={e => handleFieldChange('is_cv_submitted', e.target.checked)}
                                className="w-3.5 h-3.5"
                            />
                            <span className="text-xs text-gray-700">CV Submitted</span>
                        </label>
                        {job.is_cv_submitted && job.cv_submitted_at && (
                            <p className="text-[10px] text-gray-400 pl-5">
                                Submitted {timeAgo(job.cv_submitted_at)}
                                {job.cv_submitted_by && userMap?.[job.cv_submitted_by] ? ` by ${userMap[job.cv_submitted_by]}` : ''}
                            </p>
                        )}
                        <div>
                            <label className={labelCls}>Email CV Sent To</label>
                            <input
                                type="email"
                                value={job.cv_email_sent || ''}
                                onChange={e => handleFieldChange('cv_email_sent', e.target.value)}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Application Status</label>
                            <select
                                value={job.application_status || ''}
                                onChange={e => {
                                    const value = e.target.value
                                    setJob({
                                        ...job,
                                        application_status: value || null,
                                        ...(value !== 'positive' && value !== 'negative' ? { application_status_note: null } : {}),
                                    })
                                }}
                                className={inputCls}
                            >
                                {APPLICATION_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        {job.application_status === 'negative' && (
                            <div>
                                <label className={labelCls}>Rejection Reason</label>
                                <textarea
                                    value={job.application_status_note || ''}
                                    onChange={e => handleFieldChange('application_status_note', e.target.value)}
                                    placeholder="Why did they reject the application?"
                                    className={`${textareaCls} h-16`}
                                />
                            </div>
                        )}
                        {job.application_status === 'positive' && (
                            <div>
                                <label className={labelCls}>Next Steps</label>
                                <textarea
                                    value={job.application_status_note || ''}
                                    onChange={e => handleFieldChange('application_status_note', e.target.value)}
                                    placeholder="What's next (interview, assessment, etc.)?"
                                    className={`${textareaCls} h-16`}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Additional Fields - Dynamic */}
                <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Additional Fields</p>
                        <button
                            type="button"
                            onClick={addAdditionalField}
                            className="text-[10px] text-blue-600 hover:text-blue-800 underline"
                        >
                            + Add Field
                        </button>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {job.additional_fields && Object.entries(job.additional_fields).map(([key, value]: [string, any]) => (
                            <div key={key} className="bg-gray-50 p-2 rounded border border-gray-200">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <input
                                        type="text"
                                        value={key}
                                        onChange={e => {
                                            const newAdditional = { ...(job.additional_fields || {}) }
                                            delete newAdditional[key]
                                            newAdditional[e.target.value] = value
                                            handleAdditionalFieldChange(e.target.value, value)
                                            setJob({ ...job, additional_fields: newAdditional })
                                        }}
                                        placeholder="Field name"
                                        className="flex-1 text-[10px] border border-gray-300 rounded px-2 py-0.5 focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeAdditionalField(key)}
                                        className="text-red-600 hover:text-red-800 text-xs font-semibold"
                                    >
                                        ✕
                                    </button>
                                </div>
                                {Array.isArray(value) && value.every(item => typeof item !== 'object' || item === null) ? (
                                    <textarea
                                        value={value.join('\n')}
                                        onChange={e => handleAdditionalFieldChange(key, e.target.value.split('\n').filter(Boolean))}
                                        placeholder="One item per line"
                                        className={`${textareaCls} h-12 bg-white text-[10px]`}
                                    />
                                ) : typeof value === 'object' ? (
                                    <textarea
                                        value={JSON.stringify(value, null, 2)}
                                        onChange={e => {
                                            try {
                                                handleAdditionalFieldChange(key, JSON.parse(e.target.value))
                                            } catch { }
                                        }}
                                        placeholder="Valid JSON object"
                                        className={`${textareaCls} h-16 bg-white font-mono text-[10px]`}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={value || ''}
                                        onChange={e => handleAdditionalFieldChange(key, e.target.value)}
                                        placeholder="Field value"
                                        className={`${inputCls} text-[10px] bg-white`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
            )}

            {/* Q/A Tab */}
            {activeTab === 'qa' && (
                <div className="space-y-4">
                    {/* Prompt copy */}
                    <div className="bg-indigo-50 border border-indigo-200 rounded p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-semibold text-indigo-700 uppercase">Step 1 — Copy Claude Prompt</p>
                            <button type="button" onClick={copyPrompt}
                                className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded border transition-colors ${promptCopied ? 'bg-teal-100 border-teal-400 text-teal-700' : 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700'}`}>
                                {promptCopied ? <><Check size={10} /> Copied!</> : <><Copy size={10} /> Copy Prompt</>}
                            </button>
                        </div>
                        <p className="text-[9px] text-indigo-500">Paste this prompt into the Claude browser extension on the job application page, then paste the JSON array back below.</p>
                    </div>

                    <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase">Step 2 — Paste Claude's JSON Response</p>
                        <div className="flex gap-2">
                            <textarea
                                rows={3}
                                className={`${textareaCls} flex-1 font-mono text-[10px] resize-y`}
                                placeholder='["Why do you want this role?","Do you have the right to work in the UK?"]'
                                value={qaJsonPaste}
                                onChange={e => { setQaJsonPaste(e.target.value); setQaParseError('') }}
                            />
                            <button type="button" onClick={parseQaJson}
                                className="shrink-0 self-end px-3 py-1.5 text-xs font-semibold bg-gray-800 text-white rounded hover:bg-gray-900">
                                Add Questions
                            </button>
                        </div>
                        {qaParseError && <p className="text-[10px] text-red-500">{qaParseError}</p>}
                    </div>

                    {/* Question list */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-semibold text-gray-500 uppercase">{qaList.length} Question{qaList.length !== 1 ? 's' : ''}</p>
                            <button type="button" onClick={addQuestion}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded">
                                <Plus size={10} /> Add Question
                            </button>
                        </div>
                        {qaList.length === 0 && (
                            <p className="text-[10px] text-gray-400 italic text-center py-6">No questions yet — copy the prompt, run it on the job page, then paste the JSON array above.</p>
                        )}
                        {qaList.map((item, idx) => (
                            <div key={idx} className="border border-gray-200 rounded p-3 space-y-1.5 bg-white">
                                <div className="flex items-start justify-between gap-2">
                                    {editingQIdx === idx ? (
                                        <input
                                            autoFocus
                                            className={`${inputCls} flex-1 text-[11px] font-semibold`}
                                            value={item.question}
                                            placeholder="Question title…"
                                            onChange={e => updateQuestion(idx, e.target.value)}
                                            onBlur={() => setEditingQIdx(null)}
                                            onKeyDown={e => { if (e.key === 'Enter') setEditingQIdx(null) }}
                                        />
                                    ) : (
                                        <p className="text-[11px] font-semibold text-gray-700 flex-1 cursor-pointer hover:text-gray-900 group/q flex items-start gap-1"
                                            onClick={() => setEditingQIdx(idx)}>
                                            <span className="text-gray-400 shrink-0">{idx + 1}.</span>
                                            <span className="flex-1">{item.question || <span className="italic text-gray-400">Click to edit question…</span>}</span>
                                            <Pencil size={10} className="text-gray-300 group-hover/q:text-gray-500 shrink-0 mt-0.5" />
                                        </p>
                                    )}
                                    <button type="button" onClick={() => removeQuestion(idx)}
                                        className="text-gray-300 hover:text-red-500 shrink-0 mt-0.5">
                                        <X size={11} />
                                    </button>
                                </div>
                                <textarea
                                    rows={3}
                                    className={`${textareaCls} resize-y text-[11px]`}
                                    placeholder="Your answer…"
                                    value={item.answer}
                                    onChange={e => updateAnswer(idx, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
