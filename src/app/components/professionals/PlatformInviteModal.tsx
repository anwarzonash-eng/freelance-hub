'use client'

import { useState, useEffect } from 'react'
import { X, Copy, ChevronDown, ChevronRight, Check, Loader2, AlertCircle, Globe } from 'lucide-react'
import { showAppNotification } from '@/utils/notificationService'
import { saveBatchEmails } from '@/app/api_handlers/api/email-campaigns.api'
import { getReferralSettings } from '@/app/api_handlers/api/referral-settings.api'

// ── Constants ─────────────────────────────────────────────────────────────────

const EMAIL_TYPE_BADGES: Record<string, { label: string; bg: string; text: string }> = {
    courtesy_email:        { label: "Ce", bg: "bg-blue-100",   text: "text-blue-700"   },
    mercor_platform_join:  { label: "Me", bg: "bg-violet-100", text: "text-violet-700" },
    micro1_platform_join:  { label: "Mi", bg: "bg-sky-100",    text: "text-sky-700"    },
    aligner_platform_join: { label: "Al", bg: "bg-teal-100",   text: "text-teal-700"   },
    outlier_platform_join: { label: "Ou", bg: "bg-orange-100", text: "text-orange-700" },
    mercor_job:            { label: "Mj", bg: "bg-violet-200", text: "text-violet-800" },
    aligner_job:           { label: "Aj", bg: "bg-teal-200",   text: "text-teal-800"   },
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ParsedEmail = {
    professional_id: string
    subject: string
    greeting: string
    body: string
    pro: any | null
}

// ── Platform Config ───────────────────────────────────────────────────────────

const PLATFORMS = {
    mercor_platform_join: {
        label: 'Mercor',
        linkKey: 'me_link',
        color: 'bg-violet-600',
        activeColor: 'ring-violet-500',
        context: 'an AI-powered talent network that connects domain experts — across medicine, law, engineering, finance, and software — with short-term AI research, annotation, and evaluation projects from top research labs. Projects pay $20–$90/hr and are entirely remote.',
    },
    micro1_platform_join: {
        label: 'Micro1',
        linkKey: 'mi_link',
        color: 'bg-blue-600',
        activeColor: 'ring-blue-500',
        context: 'a platform specializing in remote AI coding, software engineering, and technical evaluation tasks for leading AI companies. Projects pay $30–$80/hr.',
    },
    aligner_platform_join: {
        label: 'Aligner',
        linkKey: 'al_link',
        color: 'bg-teal-600',
        activeColor: 'ring-teal-500',
        context: 'an AI training platform connecting domain experts in law, medicine, finance, and engineering with AI data annotation, model alignment, and evaluation tasks. Projects pay $15–$60/hr.',
    },
    outlier_platform_join: {
        label: 'Outlier',
        linkKey: 'ou_link',
        color: 'bg-orange-600',
        activeColor: 'ring-orange-500',
        context: 'an AI model training platform where domain experts contribute to RLHF (Reinforcement Learning from Human Feedback), AI output evaluation, and data quality tasks. Projects pay $15–$50/hr.',
    },
} as const

type PlatformKey = keyof typeof PLATFORMS

// ── Prompt Generator ──────────────────────────────────────────────────────────

function generatePrompt(pros: any[], platformKey: PlatformKey, referralLink: string): string {
    const platform = PLATFORMS[platformKey]
    const proData = pros.map(p => ({
        professional_id: p.id,
        name: `${p.first_name} ${p.last_name}`,
        designation: p.designation ?? null,
        domain: p.designation ?? null,
        linkedin_context: p.linkedin_context ?? null,
        linkedin_url: p.linkedin_url ?? null,
    }))

    return `You are a senior-level technical recruiter writing personalized platform invitation emails to specialized professionals.

Objective: Invite each candidate to sign up on a remote freelance platform. Do NOT reveal the platform name — refer to it only as "the platform" or "the network".

Platform context: ${platform.context}
Application/Referral Link: ${referralLink}

For EACH candidate profile:
1. Use a casual, non-corporate tone. Absolutely forbidden: "exciting opportunity", "vibrant team", "prestigious network", "innovative platform", "dear candidate", "impressive profile".
2. Reference 1–2 highly specific skills from their linkedin_context naturally within the body — do not list skills in a row.
3. Briefly describe what the platform offers using the platform context above (without naming it).
4. Include the application/referral link as the CTA in the closing line.
5. Keep the full email under 130 words.
6. Subject line: use casual angles — domain-specific, task-specific, or curiosity-driven. Never repeat the same subject.
7. Greeting variety: "Hi [Name]," / "Hey [Name]," / "Hello [Name]," / "[Name] — quick one."

Return ONLY a valid JSON array. No markdown, no code blocks, no text before or after:
[
  {
    "professional_id": "<exact id from input>",
    "subject": "<subject line>",
    "greeting": "<greeting line>",
    "body": "<plain text body, newlines as \\n>"
  }
]

Candidate Profiles (${proData.length} total):
${JSON.stringify(proData, null, 2)}`
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function PlatformInviteModal({
    professionals,
    onClose,
    onSaved,
}: {
    professionals: any[]
    onClose: () => void
    onSaved: () => void
}) {
    const [activePlatform, setActivePlatform] = useState<PlatformKey>('mercor_platform_join')
    const [referralSettings, setReferralSettings] = useState<any>(null)
    const [loadingSettings, setLoadingSettings] = useState(true)
    const [pasted, setPasted] = useState('')
    const [parsed, setParsed] = useState<ParsedEmail[] | null>(null)
    const [parseError, setParseError] = useState('')
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    // Load referral settings on mount
    useEffect(() => {
        const load = async () => {
            setLoadingSettings(true)
            const res = await getReferralSettings()
            if (res?.data) setReferralSettings(res.data)
            setLoadingSettings(false)
        }
        load()
    }, [])

    // Reset paste/parsed state when platform changes
    useEffect(() => {
        setPasted('')
        setParsed(null)
        setParseError('')
        setSaved(false)
        setSelectedIds(new Set())
        setExpanded(new Set())
    }, [activePlatform])

    const platform = PLATFORMS[activePlatform]
    const referralLink: string = referralSettings?.[platform.linkKey] ?? ''

    const handleCopyPrompt = async () => {
        if (!referralLink) {
            showAppNotification('error', 'No Referral Link', 'Configure a referral link for this platform in Referral Settings first.')
            return
        }
        const prompt = generatePrompt(professionals, activePlatform, referralLink)
        await navigator.clipboard.writeText(prompt)
        showAppNotification('success', 'Prompt Copied', `${professionals.length} professional${professionals.length !== 1 ? 's' : ''} included.`)
    }

    const handleParse = () => {
        if (!pasted.trim()) {
            setParseError('Paste the AI response first.')
            return
        }
        try {
            let text = pasted.trim()
            const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
            if (fence) text = fence[1]
            const json = JSON.parse(text)
            const arr: any[] = Array.isArray(json) ? json : (json.emails ?? json.results ?? [])
            if (!arr.length) throw new Error('Expected a JSON array of email objects.')

            const result: ParsedEmail[] = arr.map((item: any) => ({
                professional_id: item.professional_id ?? '',
                subject: item.subject ?? '',
                greeting: item.greeting ?? '',
                body: item.body ?? '',
                pro: professionals.find(p => p.id === item.professional_id) ?? null,
            }))

            setParsed(result)
            setParseError('')
            setSelectedIds(new Set(result.map(r => r.professional_id)))
            setExpanded(new Set(result.map(r => r.professional_id)))
        } catch (err: any) {
            setParseError(err.message || 'Invalid JSON.')
        }
    }

    const handleSave = async () => {
        if (!parsed) return
        const toSave = parsed.filter(r => selectedIds.has(r.professional_id) && r.pro)
        if (!toSave.length) {
            showAppNotification('error', 'Nothing Selected', 'Select at least one email to save.')
            return
        }
        setSaving(true)
        const res = await saveBatchEmails({
            emails: toSave.map(r => ({
                professional_id: r.professional_id,
                email_type: activePlatform,
                subject: r.subject,
                body: `${r.greeting}\n\n${r.body}`,
            })),
        })
        if (res) {
            setSaving(false)
            setSaved(true)
            onSaved()
            showAppNotification('success', 'Emails Saved', `${toSave.length} platform invite${toSave.length !== 1 ? 's' : ''} saved to campaign.`)
        } else {
            setSaving(false)
        }
    }

    const toggleExpand = (id: string) => {
        setExpanded(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const updateEmailField = (id: string, field: 'subject' | 'greeting' | 'body', value: string) => {
        setParsed(prev => prev ? prev.map(e => e.professional_id === id ? { ...e, [field]: value } : e) : prev)
    }

    const isAlreadyInvited = (pro: any) =>
        Array.isArray(pro.email_campaigns) &&
        pro.email_campaigns.some((c: any) => c.email_type === activePlatform)

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 text-white shrink-0">
                <div className="flex items-center gap-3">
                    <Globe size={14} className="text-gray-400" />
                    <span className="text-sm font-semibold">Platform Invite</span>
                    <span className="text-xs text-gray-400">{professionals.length} professional{professionals.length !== 1 ? 's' : ''}</span>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={16} /></button>
            </div>

            {/* Body */}
            <div className="flex flex-1 min-h-0">

                {/* ── Left: Professionals list ── */}
                <div className="w-[35%] border-r border-gray-200 flex flex-col bg-white min-h-0">
                    <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
                        <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Selected Professionals</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                        {professionals.map(pro => {
                            const alreadyInvited = isAlreadyInvited(pro)
                            return (
                                <div key={pro.id} className="p-2 border border-gray-200 rounded bg-white">
                                    <div className="flex items-center justify-between gap-1">
                                        <div className="text-xs font-semibold text-gray-800">{pro.first_name} {pro.last_name}</div>
                                        {alreadyInvited && (
                                            <span className="text-[9px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-medium whitespace-nowrap shrink-0">
                                                Invited ✓
                                            </span>
                                        )}
                                    </div>
                                    {pro.designation && (
                                        <div className="text-[10px] text-gray-500 mt-0.5">
                                            <span className="text-gray-400">Domain: </span>{pro.designation}
                                        </div>
                                    )}
                                    {pro.linkedin_context && (
                                        <div className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-snug">
                                            {pro.linkedin_context}
                                        </div>
                                    )}
                                    {/* All existing email campaigns */}
                                    {Array.isArray(pro.email_campaigns) && pro.email_campaigns.length > 0 && (
                                        <div className="flex items-center gap-0.5 flex-wrap mt-1 pt-1 border-t border-gray-100">
                                            {pro.email_campaigns.map((ec: any, i: number) => {
                                                const badge = EMAIL_TYPE_BADGES[ec.email_type]
                                                const tip = `${(ec.email_type || '').replace(/_/g, ' ')} · ${(ec.status || '').replace(/_/g, ' ')}`
                                                return (
                                                    <span key={i} title={tip}
                                                        className={`text-[8px] font-bold px-1 py-0 rounded cursor-default select-none ${badge ? badge.bg + ' ' + badge.text : 'bg-gray-100 text-gray-600'}`}>
                                                        {badge ? badge.label : (ec.email_type[0] || '?').toUpperCase()}
                                                    </span>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* ── Right: Platform tabs + Prompt + Paste + Preview ── */}
                <div className="flex-1 flex flex-col bg-gray-50 min-h-0 overflow-y-auto">

                    {/* Platform selector tabs */}
                    <div className="flex items-center gap-1.5 px-3 pt-3 pb-0 shrink-0 flex-wrap">
                        {(Object.keys(PLATFORMS) as PlatformKey[]).map(key => {
                            const p = PLATFORMS[key]
                            const isActive = activePlatform === key
                            return (
                                <button
                                    key={key}
                                    onClick={() => setActivePlatform(key)}
                                    className={`text-xs px-3 py-1.5 rounded font-medium transition-all border ${
                                        isActive
                                            ? `${p.color} text-white border-transparent ring-2 ${p.activeColor} ring-offset-1`
                                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            )
                        })}
                    </div>

                    {/* Referral link display */}
                    <div className="px-3 pt-2 pb-3 shrink-0">
                        {loadingSettings ? (
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                                <Loader2 size={11} className="animate-spin" /> Loading referral link…
                            </div>
                        ) : referralLink ? (
                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded px-2 py-1.5">
                                <Globe size={11} className="text-gray-400 shrink-0" />
                                <span className="text-[10px] text-gray-600 truncate flex-1">{referralLink}</span>
                                <button
                                    onClick={() => { navigator.clipboard.writeText(referralLink); showAppNotification('success', 'Copied', 'Referral link copied.') }}
                                    className="text-gray-400 hover:text-gray-700 shrink-0">
                                    <Copy size={10} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                                <AlertCircle size={11} className="shrink-0" />
                                No referral link configured for {platform.label}. Add one in Referral Settings.
                            </div>
                        )}
                    </div>

                    {/* Step 1: Copy + Paste */}
                    <div className="px-3 pb-3 border-b border-gray-200 bg-white space-y-2 shrink-0 mx-3 mb-3 rounded border">
                        <div className="flex items-center justify-between pt-2">
                            <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                                Step 1 — Copy prompt, run in ChatGPT, paste response
                            </span>
                            <button
                                onClick={handleCopyPrompt}
                                disabled={!referralLink}
                                className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                                <Copy size={11} /> Copy Prompt ({professionals.length})
                            </button>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-gray-500 font-medium uppercase">Paste AI JSON Response</label>
                            <textarea
                                value={pasted}
                                onChange={e => { setPasted(e.target.value); setParsed(null); setParseError(''); setSaved(false) }}
                                rows={5}
                                placeholder={'[{ "professional_id": "...", "subject": "...", "greeting": "...", "body": "..." }, ...]'}
                                className="border border-gray-300 rounded px-2 py-1.5 text-[10px] font-mono focus:outline-none focus:border-gray-500 resize-y"
                            />
                        </div>
                        {parseError && <p className="text-[10px] text-red-500">{parseError}</p>}
                        <div className="flex items-center gap-2 pb-2">
                            {!parsed && (
                                <button onClick={handleParse}
                                    className="text-xs bg-gray-800 text-white px-3 py-1.5 rounded hover:bg-gray-700">
                                    Parse Results
                                </button>
                            )}
                            {parsed && (
                                <>
                                    <button onClick={handleSave} disabled={saving || saved}
                                        className="flex items-center gap-1 text-xs bg-emerald-700 text-white px-3 py-1.5 rounded hover:bg-emerald-600 disabled:opacity-50 font-medium">
                                        {saving ? <><Loader2 size={11} className="animate-spin" /> Saving…</>
                                            : saved ? <><Check size={11} /> Saved</>
                                                : `Save ${selectedIds.size} Invite${selectedIds.size !== 1 ? 's' : ''}`}
                                    </button>
                                    <button onClick={() => { setParsed(null); setPasted(''); setParseError(''); setSaved(false) }}
                                        className="text-xs text-gray-400 hover:text-gray-700 underline">
                                        Reset
                                    </button>
                                    <span className="text-[10px] text-gray-500">{parsed.length} email{parsed.length !== 1 ? 's' : ''} parsed · {selectedIds.size} selected</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Step 2: Preview cards */}
                    {parsed && (
                        <div className="p-3 space-y-2">
                            <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                                Step 2 — Review & select invites to save
                            </span>
                            {parsed.map(email => {
                                const isExpanded = expanded.has(email.professional_id)
                                const isSelected = selectedIds.has(email.professional_id)
                                const unmatched = !email.pro

                                return (
                                    <div key={email.professional_id}
                                        className={`border rounded bg-white ${unmatched ? 'opacity-50' : ''} ${isSelected ? 'border-emerald-300' : 'border-gray-200'}`}>
                                        <div className="flex items-center gap-2 p-2.5">
                                            <input type="checkbox"
                                                checked={isSelected}
                                                disabled={unmatched}
                                                onChange={() => toggleSelect(email.professional_id)}
                                                className="w-3.5 h-3.5 shrink-0 cursor-pointer"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-semibold text-gray-800">
                                                        {email.pro ? `${email.pro.first_name} ${email.pro.last_name}` : 'Unknown Professional'}
                                                    </span>
                                                    {unmatched && <span className="text-[9px] text-red-500 border border-red-200 bg-red-50 px-1 rounded">ID not found</span>}
                                                    {email.pro?.designation && (
                                                        <span className="text-[9px] text-gray-500">{email.pro.designation}</span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-gray-600 mt-0.5 font-medium truncate">
                                                    Subject: {email.subject}
                                                </div>
                                            </div>
                                            <button onClick={() => toggleExpand(email.professional_id)}
                                                className="text-gray-400 hover:text-gray-700 shrink-0">
                                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            </button>
                                        </div>

                                        {isExpanded && (
                                            <div className="border-t border-gray-100 px-3 pb-3 pt-2">
                                                <div className="text-[10px] text-gray-500 mb-1 font-medium uppercase tracking-wide">Subject</div>
                                                <input
                                                    type="text"
                                                    value={email.subject}
                                                    onChange={e => updateEmailField(email.professional_id, 'subject', e.target.value)}
                                                    className="w-full text-xs text-gray-800 mb-2 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-gray-400"
                                                />
                                                <div className="text-[10px] text-gray-500 mb-1 font-medium uppercase tracking-wide">Greeting</div>
                                                <input
                                                    type="text"
                                                    value={email.greeting}
                                                    onChange={e => updateEmailField(email.professional_id, 'greeting', e.target.value)}
                                                    className="w-full text-xs text-gray-800 mb-2 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-gray-400"
                                                />
                                                <div className="text-[10px] text-gray-500 mb-1 font-medium uppercase tracking-wide">Body</div>
                                                <textarea
                                                    value={email.body}
                                                    onChange={e => updateEmailField(email.professional_id, 'body', e.target.value)}
                                                    rows={6}
                                                    className="w-full text-xs text-gray-700 leading-relaxed bg-gray-50 p-2 rounded border border-gray-100 focus:outline-none focus:border-gray-400 resize-y"
                                                />
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`${email.greeting}\n\n${email.body}`)
                                                        showAppNotification('success', 'Email Copied', `Copied invite for ${email.pro?.first_name ?? 'professional'}.`)
                                                    }}
                                                    className="flex items-center gap-1 mt-2 text-[10px] text-gray-500 hover:text-gray-800">
                                                    <Copy size={10} /> Copy email text
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
