'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    X, Copy, ExternalLink, MessageCircle, ChevronDown, ChevronRight,
    Check, Loader2, Search, Filter,
} from 'lucide-react'
import { showAppNotification } from '@/utils/notificationService'
import { getAllAiJobs } from '@/app/api_handlers/api/ai-jobs.api'
import { saveBatchMatches } from '@/app/api_handlers/api/matched-jobs.api'
import { getCountryName } from '@/utils/countries'

// ── Types ─────────────────────────────────────────────────────────────────────

type AIMatch = {
    jobId: string
    jobTitle: string
    matchScore: number
    isDomainMatched: boolean
    isCountryMatched: boolean
    isSkillsMatched: boolean
    linkedInContextScore: number
    reasoning: string
    resolvedJob: any | null
}

type ProState = {
    open: boolean
    pasted: string
    parsed: AIMatch[] | null
    parseError: string
    selectedMatchIds: Set<string>
    saving: boolean
    saved: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
    mercor: 'bg-violet-100 text-violet-700 border-violet-200',
    aligner: 'bg-teal-100 text-teal-700 border-teal-200',
}

const ARRANGEMENT_COLORS: Record<string, string> = {
    remote: 'bg-green-50 text-green-700 border-green-200',
    hybrid: 'bg-amber-50 text-amber-700 border-amber-200',
    onsite: 'bg-blue-50 text-blue-700 border-blue-200',
    'on-site': 'bg-blue-50 text-blue-700 border-blue-200',
}

function fmtRate(min: number | null, max: number | null, freq: string | null) {
    if (!min && !max) return null
    const f = freq === 'hourly' ? '/hr' : freq ? `/${freq}` : ''
    if (min && max) return `$${min}–$${max}${f}`
    if (min) return `$${min}+${f}`
    return `up to $${max}${f}`
}

function copyText(text: string, label = 'Copied') {
    navigator.clipboard.writeText(text)
    showAppNotification('success', label, text)
}

function whatsappUrl(phone: string) {
    return `https://wa.me/${phone.replace(/\D/g, '')}`
}

function generatePrompt(pro: any, selectedJobs: any[]): string {
    const proData = {
        id: pro.id,
        name: `${pro.first_name} ${pro.last_name}`,
        designation: pro.designation ?? null,
        qualification: pro.qualification ?? null,
        country: pro.country ?? null,
        linkedin_url: pro.linkedin_url ?? null,
        linkedin_context: pro.linkedin_context ?? null,
    }

    const jobsData = selectedJobs.map(j => ({
        id: j.id,
        title: j.title,
        domain: j.category ?? null,
        eligible_locations: j.locations ?? [],
        description: j.description ?? null,
    }))

    return `You are an advanced recruitment automation agent specializing in high-end vetting and placement for multi-disciplinary professional platforms.

Task: Compare the provided Employee Profile against the list of ${jobsData.length} available Job Listings. Identify the TOP 10 most accurate job matches for this candidate, regardless of industry domain.

Vetting & Scoring Taxonomy:
1. Macro-Domain Alignment (35%): Match the candidate's "designation" field against the job's "domain" field. These must align at the industry-vertical level (e.g., Healthcare vs. Medical Research, Software vs. AI/ML Engineering).
2. Micro-Skill Correspondence (35%): Check if the candidate's linkedin_context and qualification map to the specific execution requirements inside the job description.
3. Seniority & Scope Balancing (30%): Analyze seniority level from the linkedin_context. Filter OUT high-level SME/advisory roles for mid-level workers, and vice versa.

Execution Constraint: Do not match based on broad keywords. Look for overlapping high-stakes execution logic between the candidate profile and the job description.

isCountryMatched: true if eligible_locations is empty/null (worldwide open) OR contains the candidate's country code or "Worldwide".

Employee Profile:
${JSON.stringify(proData, null, 2)}

Job Listings (${jobsData.length} total):
${JSON.stringify(jobsData, null, 2)}

Return ONLY valid JSON — no markdown, no code blocks, no explanation. Use the exact 'id' field from Job Listings as jobId:
{
  "matches": [
    {
      "jobId": "<exact id from Job Listings>",
      "jobTitle": "<title>",
      "matchScore": <integer 0-100>,
      "isDomainMatched": <true|false>,
      "isCountryMatched": <true|false>,
      "isSkillsMatched": <true|false>,
      "linkedInContextScore": <integer 0-100>,
      "reasoning": "<one concise sentence>"
    }
  ]
}`
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export default function MatchJobsModal({
    professionals,
    onClose,
    onMatchSaved,
}: {
    professionals: any[]
    onClose: () => void
    onMatchSaved: () => void
}) {
    // Right panel state
    const [allJobs, setAllJobs] = useState<any[]>([])
    const [jobsLoading, setJobsLoading] = useState(false)
    const [jobFilter, setJobFilter] = useState({ source: '', category: '' })
    const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set())

    // Per-professional state
    const [proStates, setProStates] = useState<Record<string, ProState>>(() =>
        Object.fromEntries(
            professionals.map(p => [p.id, {
                open: false, pasted: '', parsed: null, parseError: '',
                selectedMatchIds: new Set(), saving: false, saved: false,
            }])
        )
    )

    const loadJobs = useCallback(async () => {
        setJobsLoading(true)
        const res = await getAllAiJobs({ limit: 150, is_active: 'true' })
        if (res?.data) setAllJobs(res.data.data || [])
        setJobsLoading(false)
    }, [])

    useEffect(() => { loadJobs() }, [loadJobs])

    const filteredJobs = allJobs.filter(j => {
        if (jobFilter.source && j.source !== jobFilter.source) return false
        if (jobFilter.category && !j.category?.toLowerCase().includes(jobFilter.category.toLowerCase())) return false
        return true
    })

    const selectedJobs = allJobs.filter(j => selectedJobIds.has(j.id))

    const allFilteredSelected = filteredJobs.length > 0 && filteredJobs.every(j => selectedJobIds.has(j.id))

    const toggleJobSelect = (id: string) => {
        setSelectedJobIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const toggleSelectAll = () => {
        if (allFilteredSelected) {
            setSelectedJobIds(prev => {
                const next = new Set(prev)
                filteredJobs.forEach(j => next.delete(j.id))
                return next
            })
        } else {
            setSelectedJobIds(prev => {
                const next = new Set(prev)
                filteredJobs.forEach(j => next.add(j.id))
                return next
            })
        }
    }

    const updateProState = (id: string, updates: Partial<ProState>) => {
        setProStates(prev => ({ ...prev, [id]: { ...prev[id], ...updates } }))
    }

    const handleCopyPrompt = async (pro: any) => {
        if (selectedJobIds.size === 0) {
            showAppNotification('error', 'No Jobs Selected', 'Select jobs on the right panel first.')
            return
        }
        const prompt = generatePrompt(pro, selectedJobs)
        await navigator.clipboard.writeText(prompt)
        showAppNotification('success', 'Prompt Copied', `${selectedJobs.length} job${selectedJobs.length !== 1 ? 's' : ''} included.`)
        updateProState(pro.id, { open: true })
    }

    const handleParse = (proId: string) => {
        const state = proStates[proId]
        if (!state.pasted.trim()) {
            updateProState(proId, { parseError: 'Paste the AI response first.' })
            return
        }
        try {
            let text = state.pasted.trim()
            // Strip markdown code fences if present
            const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
            if (fence) text = fence[1]
            const json = JSON.parse(text)
            const rawMatches: any[] = json.matches ?? (Array.isArray(json) ? json : [])
            if (!rawMatches.length) throw new Error('No matches array found in the JSON.')
            const resolved: AIMatch[] = rawMatches.map((m: any) => ({
                jobId: m.jobId ?? m.job_id ?? '',
                jobTitle: m.jobTitle ?? m.job_title ?? '',
                matchScore: Number(m.matchScore ?? m.match_score ?? 0),
                isDomainMatched: !!m.isDomainMatched,
                isCountryMatched: !!m.isCountryMatched,
                isSkillsMatched: !!m.isSkillsMatched,
                linkedInContextScore: Number(m.linkedInContextScore ?? m.linkedin_context_score ?? 0),
                reasoning: m.reasoning ?? '',
                resolvedJob: allJobs.find(j => j.id === (m.jobId ?? m.job_id)) ?? null,
            }))
            const allIds = new Set(resolved.map(m => m.jobId))
            updateProState(proId, { parsed: resolved, parseError: '', selectedMatchIds: allIds })
        } catch (err: any) {
            updateProState(proId, { parseError: err.message || 'Invalid JSON.' })
        }
    }

    const handleSaveMatches = async (pro: any) => {
        const state = proStates[pro.id]
        if (!state.parsed) return
        const toSave = state.parsed.filter(m => state.selectedMatchIds.has(m.jobId) && m.resolvedJob)
        if (toSave.length === 0) {
            showAppNotification('error', 'Nothing to Save', 'Select at least one match with a valid job ID.')
            return
        }
        updateProState(pro.id, { saving: true })
        const res = await saveBatchMatches({
            professional_id: pro.id,
            matches: toSave.map(m => ({
                ai_job_id: m.jobId,
                match_score: m.matchScore,
                is_domain_matched: m.isDomainMatched,
                is_country_matched: m.isCountryMatched,
                is_skills_matched: m.isSkillsMatched,
                linkedin_context_score: m.linkedInContextScore,
                reasoning: m.reasoning,
            })),
        })
        if (res) {
            updateProState(pro.id, { saving: false, saved: true })
            onMatchSaved()
            showAppNotification('success', 'Matches Saved', `${toSave.length} job${toSave.length !== 1 ? 's' : ''} matched to ${pro.first_name} ${pro.last_name}.`)
        } else {
            updateProState(pro.id, { saving: false })
        }
    }

    const boolIcon = (v: boolean) => v
        ? <Check size={11} className="text-green-600" />
        : <X size={11} className="text-red-400" />

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 text-white shrink-0">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">Match Jobs</span>
                    <span className="text-xs text-gray-400">{professionals.length} professional{professionals.length !== 1 ? 's' : ''} · {selectedJobIds.size} job{selectedJobIds.size !== 1 ? 's' : ''} selected</span>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={16} /></button>
            </div>

            {/* Body */}
            <div className="flex flex-1 min-h-0">

                {/* ── Left Panel: Professionals ── */}
                <div className="w-[38%] border-r border-gray-200 flex flex-col bg-white min-h-0">
                    <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
                        <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Selected Professionals</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {professionals.map(pro => {
                            const state = proStates[pro.id]
                            if (!state) return null
                            const emails: any[] = Array.isArray(pro.emails) ? pro.emails : []
                            const phones: any[] = Array.isArray(pro.phones) ? pro.phones : []
                            const primaryEmail = emails[0]
                            const whatsappPhone = phones.find(p => p.is_whatsapp)

                            return (
                                <div key={pro.id} className="border border-gray-200 rounded bg-white">
                                    {/* Pro card header */}
                                    <div className="p-2.5 space-y-1">
                                        {/* Name + icons */}
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-xs font-semibold text-gray-800">{pro.first_name} {pro.last_name}</span>
                                            {pro.linkedin_url && (
                                                <a href={pro.linkedin_url} target="_blank" rel="noopener noreferrer"
                                                    className="text-blue-500 hover:text-blue-700" title="LinkedIn">
                                                    <ExternalLink size={11} />
                                                </a>
                                            )}
                                            {primaryEmail?.email && (
                                                <button onClick={() => copyText(primaryEmail.email, 'Email copied')}
                                                    className="text-gray-400 hover:text-gray-700" title="Copy email">
                                                    <Copy size={11} />
                                                </button>
                                            )}
                                            {whatsappPhone && (
                                                <a href={whatsappUrl(whatsappPhone.phone)} target="_blank" rel="noopener noreferrer"
                                                    className="text-green-600 hover:text-green-800" title="WhatsApp">
                                                    <MessageCircle size={11} />
                                                </a>
                                            )}
                                        </div>
                                        {/* Details grid */}
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-gray-600">
                                            {pro.designation && (
                                                <div><span className="text-gray-400">Domain: </span>{pro.designation}</div>
                                            )}
                                            {pro.qualification && (
                                                <div><span className="text-gray-400">Qual: </span>{pro.qualification}</div>
                                            )}
                                            {pro.country && (
                                                <div><span className="text-gray-400">Country: </span>
                                                    <span className="font-mono bg-gray-100 px-0.5 rounded">{pro.country}</span>
                                                    {' '}{getCountryName(pro.country)}
                                                </div>
                                            )}
                                            {pro.job_match_status && (
                                                <div><span className="text-gray-400">Match: </span>{pro.job_match_status}</div>
                                            )}
                                        </div>
                                        {/* Copy Prompt button */}
                                        <div className="flex items-center gap-2 pt-1">
                                            <button onClick={() => handleCopyPrompt(pro)}
                                                className="flex items-center gap-1 text-[10px] bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700">
                                                <Copy size={10} /> Copy Prompt
                                            </button>
                                            <button onClick={() => updateProState(pro.id, { open: !state.open })}
                                                className="flex items-center gap-0.5 text-[10px] text-gray-500 hover:text-gray-800">
                                                {state.open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                                {state.saved ? 'Saved ✓' : 'Paste AI Response'}
                                            </button>
                                            {pro.matched_jobs_count > 0 && (
                                                <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                                                    {pro.matched_jobs_count} matched
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Paste / Parse / Review section */}
                                    {state.open && (
                                        <div className="border-t border-gray-100 px-2.5 pb-2.5 pt-2 space-y-2">
                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[10px] text-gray-500 font-medium uppercase">Paste AI Response JSON</label>
                                                <textarea
                                                    value={state.pasted}
                                                    onChange={e => updateProState(pro.id, { pasted: e.target.value, parsed: null, parseError: '' })}
                                                    rows={4}
                                                    placeholder={'{\n  "matches": [...]\n}'}
                                                    className="border border-gray-300 rounded px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-gray-500 resize-y"
                                                />
                                            </div>
                                            {state.parseError && (
                                                <p className="text-[10px] text-red-500">{state.parseError}</p>
                                            )}
                                            {!state.parsed && (
                                                <button onClick={() => handleParse(pro.id)}
                                                    className="text-[10px] bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-700">
                                                    Parse Results
                                                </button>
                                            )}

                                            {/* Review table */}
                                            {state.parsed && (
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-medium text-gray-700">
                                                            {state.parsed.length} match{state.parsed.length !== 1 ? 'es' : ''} returned · {state.selectedMatchIds.size} selected
                                                        </span>
                                                        <button onClick={() => {
                                                            const allIds = new Set(state.parsed!.map(m => m.jobId))
                                                            updateProState(pro.id, { selectedMatchIds: allIds })
                                                        }} className="text-[10px] text-indigo-600 hover:underline">Select all</button>
                                                    </div>
                                                    <div className="border border-gray-200 rounded overflow-hidden">
                                                        <table className="w-full text-[10px] border-collapse">
                                                            <thead>
                                                                <tr className="bg-gray-50 border-b border-gray-200">
                                                                    <th className="w-5 px-1 py-1"></th>
                                                                    <th className="px-2 py-1 text-left font-medium text-gray-600">Job</th>
                                                                    <th className="px-1 py-1 text-center font-medium text-gray-600">Score</th>
                                                                    <th className="px-1 py-1 text-center font-medium text-gray-600">Dom</th>
                                                                    <th className="px-1 py-1 text-center font-medium text-gray-600">Ctry</th>
                                                                    <th className="px-1 py-1 text-center font-medium text-gray-600">Skill</th>
                                                                    <th className="px-1 py-1 text-center font-medium text-gray-600">LI</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {state.parsed.map((m, i) => (
                                                                    <tr key={i} className={`border-b border-gray-100 ${!m.resolvedJob ? 'opacity-40' : ''}`}>
                                                                        <td className="px-1 py-1 text-center">
                                                                            <input type="checkbox"
                                                                                checked={state.selectedMatchIds.has(m.jobId)}
                                                                                disabled={!m.resolvedJob}
                                                                                onChange={() => {
                                                                                    const next = new Set(state.selectedMatchIds)
                                                                                    next.has(m.jobId) ? next.delete(m.jobId) : next.add(m.jobId)
                                                                                    updateProState(pro.id, { selectedMatchIds: next })
                                                                                }}
                                                                                className="w-3 h-3 cursor-pointer"
                                                                            />
                                                                        </td>
                                                                        <td className="px-2 py-1 max-w-[120px]">
                                                                            <div className="truncate font-medium text-gray-800" title={m.jobTitle}>{m.jobTitle}</div>
                                                                            {!m.resolvedJob && <div className="text-red-400 text-[9px]">ID not found</div>}
                                                                            {m.reasoning && <div className="text-gray-400 text-[9px] truncate" title={m.reasoning}>{m.reasoning}</div>}
                                                                        </td>
                                                                        <td className="px-1 py-1 text-center font-bold text-gray-800">{m.matchScore}</td>
                                                                        <td className="px-1 py-1 text-center">{boolIcon(m.isDomainMatched)}</td>
                                                                        <td className="px-1 py-1 text-center">{boolIcon(m.isCountryMatched)}</td>
                                                                        <td className="px-1 py-1 text-center">{boolIcon(m.isSkillsMatched)}</td>
                                                                        <td className="px-1 py-1 text-center text-gray-600">{m.linkedInContextScore}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => handleSaveMatches(pro)} disabled={state.saving || state.saved}
                                                            className="flex items-center gap-1 text-[10px] bg-emerald-700 text-white px-3 py-1 rounded hover:bg-emerald-600 disabled:opacity-50">
                                                            {state.saving ? <><Loader2 size={10} className="animate-spin" /> Saving…</> : state.saved ? <><Check size={10} /> Saved</> : 'Save Matches'}
                                                        </button>
                                                        <button onClick={() => updateProState(pro.id, { parsed: null, pasted: '', parseError: '' })}
                                                            className="text-[10px] text-gray-400 hover:text-gray-700 underline">Reset</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* ── Right Panel: AI Jobs ── */}
                <div className="flex-1 flex flex-col bg-gray-50 min-h-0">
                    {/* Right panel header + filters */}
                    <div className="px-3 py-2 border-b border-gray-200 bg-white shrink-0 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">AI Jobs</span>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                {jobsLoading ? <Loader2 size={11} className="animate-spin" /> : <span>{filteredJobs.length} jobs</span>}
                                <button onClick={toggleSelectAll}
                                    className="text-[10px] border border-gray-300 rounded px-2 py-0.5 hover:bg-gray-50 text-gray-700">
                                    {allFilteredSelected ? 'Deselect All' : 'Select All'}
                                </button>
                                {selectedJobIds.size > 0 && (
                                    <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">{selectedJobIds.size} selected</span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 border border-gray-300 rounded px-1.5 py-0.5 bg-white">
                                <Filter size={10} className="text-gray-400" />
                                <select value={jobFilter.source} onChange={e => setJobFilter(p => ({ ...p, source: e.target.value }))}
                                    className="text-xs focus:outline-none bg-transparent">
                                    <option value="">All Sources</option>
                                    <option value="mercor">Mercor</option>
                                    <option value="aligner">Aligner</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-1 border border-gray-300 rounded px-1.5 py-0.5 bg-white flex-1">
                                <Search size={10} className="text-gray-400" />
                                <input value={jobFilter.category}
                                    onChange={e => setJobFilter(p => ({ ...p, category: e.target.value }))}
                                    placeholder="Filter by domain / category…"
                                    className="text-xs focus:outline-none bg-transparent w-full" />
                            </div>
                        </div>
                    </div>

                    {/* Jobs list */}
                    <div className="flex-1 overflow-y-auto p-2">
                        {jobsLoading && (
                            <div className="flex items-center justify-center h-24 text-xs text-gray-400">
                                <Loader2 size={16} className="animate-spin mr-2" /> Loading jobs…
                            </div>
                        )}
                        {!jobsLoading && filteredJobs.length === 0 && (
                            <div className="text-center py-8 text-xs text-gray-400">No jobs match the filter.</div>
                        )}
                        {!jobsLoading && filteredJobs.map(job => {
                            const selected = selectedJobIds.has(job.id)
                            const locations: string[] = Array.isArray(job.locations) ? job.locations : []
                            const rate = fmtRate(job.rate_min, job.rate_max, job.rate_frequency)
                            const arrangement = (job.work_arrangement ?? '').toLowerCase()
                            const arrangementColor = ARRANGEMENT_COLORS[arrangement] || 'bg-gray-50 text-gray-600 border-gray-200'
                            const referralAmount: number = job.raw_json?.referralAmount ?? 0
                            return (
                                <div key={job.id}
                                    onClick={() => toggleJobSelect(job.id)}
                                    className={`flex items-start gap-2 p-2 mb-1 rounded border cursor-pointer transition-colors ${selected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                                    <input type="checkbox" checked={selected} onChange={() => toggleJobSelect(job.id)}
                                        onClick={e => e.stopPropagation()} className="w-3 h-3 mt-0.5 shrink-0 cursor-pointer" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wide ${SOURCE_COLORS[job.source] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                {job.source}
                                            </span>
                                            {job.category && (
                                                <span className="text-[9px] px-1 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">{job.category}</span>
                                            )}
                                            {arrangement && (
                                                <span className={`text-[9px] px-1 py-0.5 rounded border capitalize ${arrangementColor}`}>{arrangement}</span>
                                            )}
                                            {referralAmount > 0 && (
                                                <span className="text-[9px] px-1 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 font-medium">
                                                    Referral ${referralAmount}
                                                </span>
                                            )}
                                            {rate && <span className="text-[9px] font-medium text-gray-700">{rate}</span>}
                                        </div>
                                        <div className="text-xs font-medium text-gray-800 truncate">{job.title}</div>
                                        {locations.length > 0 && (
                                            <div className="text-[9px] text-gray-500 mt-0.5">
                                                Eligible: {locations.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
