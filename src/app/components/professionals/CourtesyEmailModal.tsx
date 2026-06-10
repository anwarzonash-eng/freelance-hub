'use client'

import { useState } from 'react'
import { X, Copy, ChevronDown, ChevronRight, Check, Loader2, Mail } from 'lucide-react'
import { showAppNotification } from '@/utils/notificationService'
import { saveBatchEmails } from '@/app/api_handlers/api/email-campaigns.api'

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

// ── Prompt ────────────────────────────────────────────────────────────────────

function generatePrompt(professionals: any[]): string {
    const proData = professionals.map(p => ({
        professional_id: p.id,
        name: `${p.first_name} ${p.last_name}`,
        designation: p.designation ?? null,
        domain: p.designation ?? null,
        linkedin_context: p.linkedin_context ?? null,
        linkedin_url: p.linkedin_url ?? null,
    }))

    return `You are a senior-level technical recruiter writing short, text-only courtesy emails to highly specialized professionals. Your objective is to introduce a remote freelance/contract opportunity without giving away the names of any specific underlying platforms (like Mercor, Outlier, Alignerr, etc.).

You must act as the official gateway partner to these networks to maintain information asymmetry and protect referral commissions.

For EACH candidate profile provided, generate a highly customized, 100% plain-text email using the following strict structural constraints:

1. SUBJECT LINE VARIETY (Do not repeat the same subject across candidates):
   Dynamically generate a brief, lowercase or casual subject line. Mix up the angle for every candidate. Examples:
   - [Candidate Domain] background / [Target Technical Field] track
   - quick question regarding your [Core Skill] work
   - freelance inquiry for [Singular Designation Name]
   - [Core Tool/Language] background check

2. GREETING VARIETY (Never default to the same opener):
   Randomly select from one of these conversational greetings:
   - Hi [First Name],
   - Hey [First Name],
   - Hello [First Name],
   - [First Name] - hope you're having a good week.

3. COLD OUTREACH RULES (Strictly Enforced):
   - ABSOLUTELY FORBID all corporate recruitment buzzwords: "exciting opportunity", "revolutionary platform", "vibrant team", "innovative space", "prestigious network", "dear candidate", "impressive profile".
   - Do not list out all their skills in a row. Select only 2 or 3 highly specific technical anchors from their linkedin_context and write them naturally into a sentence.
   - Reference their career path or company transitions from their linkedin_context to prove this is not an automated mail merge.
   - Keep paragraphs extremely short (1 to 2 sentences max).

4. CALL TO ACTION:
   - Use a low-friction, curiosity-based closing. Mention that contract compensation bands go up to $50–$90/hr and that it is entirely free to apply.
   - Close with: "If you're open to reviewing the project track criteria, let me know and I'll drop the details/application link straight into your inbox."

5. OUTPUT FORMAT — CRITICAL:
   Return ONLY a valid JSON array. Do not include markdown code blocks, backticks, or any text before or after the JSON.
   The JSON must match this exact schema — one entry per professional_id:
   [
     {
       "professional_id": "<exactly same as in input>",
       "subject": "<email subject>",
       "greeting": "<greeting line only>",
       "body": "<full email body as plain text, no HTML, newlines as \\n>"
     }
   ]

Candidate Profiles (${proData.length} total):
${JSON.stringify(proData, null, 2)}`
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function CourtesyEmailModal({
    professionals,
    onClose,
    onSaved,
}: {
    professionals: any[]
    onClose: () => void
    onSaved: () => void
}) {
    const [pasted, setPasted] = useState('')
    const [parsed, setParsed] = useState<ParsedEmail[] | null>(null)
    const [parseError, setParseError] = useState('')
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const handleCopyPrompt = async () => {
        const prompt = generatePrompt(professionals)
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
                email_type: 'courtesy_email',
                subject: r.subject,
                body: `${r.greeting}\n\n${r.body}`,
            })),
        })
        if (res) {
            setSaving(false)
            setSaved(true)
            onSaved()
            showAppNotification('success', 'Emails Saved', `${toSave.length} courtesy email${toSave.length !== 1 ? 's' : ''} saved to campaign.`)
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

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 text-white shrink-0">
                <div className="flex items-center gap-3">
                    <Mail size={14} className="text-gray-400" />
                    <span className="text-sm font-semibold">Courtesy Email Generator</span>
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
                        {professionals.map(pro => (
                            <div key={pro.id} className="p-2 border border-gray-200 rounded bg-white">
                                <div className="text-xs font-semibold text-gray-800">{pro.first_name} {pro.last_name}</div>
                                {pro.designation && (
                                    <div className="text-[10px] text-gray-500 mt-0.5">
                                        <span className="text-gray-400">Domain: </span>{pro.designation}
                                    </div>
                                )}
                                {pro.qualification && (
                                    <div className="text-[10px] text-gray-500">
                                        <span className="text-gray-400">Qual: </span>{pro.qualification}
                                    </div>
                                )}
                                {pro.linkedin_context && (
                                    <div className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-snug">
                                        {pro.linkedin_context}
                                    </div>
                                )}
                                {/* Existing email campaigns */}
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
                        ))}
                    </div>
                </div>

                {/* ── Right: Prompt + Paste + Preview ── */}
                <div className="flex-1 flex flex-col bg-gray-50 min-h-0 overflow-y-auto">
                    {/* Step 1: Copy + Paste */}
                    <div className="p-3 border-b border-gray-200 bg-white space-y-2 shrink-0">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                                Step 1 — Copy prompt, run in ChatGPT, paste response
                            </span>
                            <button onClick={handleCopyPrompt}
                                className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 font-medium">
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
                        <div className="flex items-center gap-2">
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
                                                : `Save ${selectedIds.size} Email${selectedIds.size !== 1 ? 's' : ''}`}
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
                                Step 2 — Review & select emails to save
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
                                                        showAppNotification('success', 'Email Copied', `Copied email for ${email.pro?.first_name ?? 'professional'}.`)
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
