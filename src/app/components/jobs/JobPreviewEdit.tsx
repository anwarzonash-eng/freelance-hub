'use client'

import { useState } from 'react'
import { ExternalLink, ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { timeAgo } from '@/app/utils/time'

export const APPLICATION_STATUS_OPTIONS = [
    { value: '', label: 'Not tracked' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'positive', label: 'Positive Response' },
    { value: 'negative', label: 'Negative Response' },
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
    const [expandedDescription, setExpandedDescription] = useState(true)
    const [expandedRawDescription, setExpandedRawDescription] = useState(false)

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
                    {job.link && (
                        <a
                            href={job.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 shrink-0 whitespace-nowrap"
                        >
                            <ExternalLink size={12} />
                            View Job
                        </a>
                    )}
                </div>
            </div>

            {/* Main Fields Grid */}
            <div className="grid grid-cols-2 gap-3 py-3 border-t border-b">
                {[
                    { label: 'Type', value: job.type },
                    { label: 'Category', value: job.job_category },
                    { label: 'Experience Required', value: job.experience_required },
                    { label: 'Visa Sponsorship', value: job.visa_sponsorship_text, highlight: true },
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
                                {field.value || '—'}
                            </p>
                        </div>
                    )
                })}
            </div>

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
                    <button
                        onClick={() => setExpandedRawDescription(!expandedRawDescription)}
                        className="flex items-center gap-2 w-full text-left"
                    >
                        {expandedRawDescription ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        <p className="text-[10px] text-gray-400 uppercase font-semibold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">Raw Description (for CV)</p>
                    </button>
                    {expandedRawDescription && (
                        <div className="mt-2 bg-blue-50 border border-blue-200 rounded p-3">
                            <p className="text-xs text-gray-700 whitespace-pre-wrap">{job.raw_description}</p>
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
            {job.additional_fields && Object.keys(job.additional_fields).length > 0 && (
                <div className="py-3">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold mb-2">Additional Information</p>
                    <div className="space-y-2">
                        {Object.entries(job.additional_fields).map(([key, value]: [string, any], idx) => (
                            <div key={idx} className="bg-gray-50 p-2 rounded">
                                <p className="text-[10px] text-gray-500 uppercase font-semibold">{key.replace(/_/g, ' ')}</p>
                                {Array.isArray(value) ? (
                                    <ul className="text-xs text-gray-700 mt-1 list-disc list-inside">
                                        {value.map((item, i) => (
                                            <li key={i}>{item}</li>
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

export function JobEditForm({ job, setJob, userMap }: { job: any; setJob: (job: any) => void; userMap?: Record<string, string> }) {
    const inputCls = 'w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-gray-500'
    const labelCls = 'text-[10px] text-gray-400 uppercase font-medium mb-0.5 block'
    const textareaCls = 'w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-gray-500 resize-none'

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

    return (
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
                    <div className="bg-amber-50 border-2 border-amber-300 rounded p-3">
                        <label className={labelCls}>Visa Sponsorship Text</label>
                        <textarea value={job.visa_sponsorship_text || ''} onChange={e => handleFieldChange('visa_sponsorship_text', e.target.value)} className={`${textareaCls} h-16 bg-white`} />
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
                                {Array.isArray(value) ? (
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
    )
}
