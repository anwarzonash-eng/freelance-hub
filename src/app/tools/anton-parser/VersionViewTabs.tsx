'use client'

/* ------------------------------------------------------------------ *
 * Read-only counterparts of RubricsTab / DimensionsTab / PairwiseTab in
 * page.tsx, used only in View mode. Same columns/layout, but every value
 * renders through DiffCell instead of an editable input, diffed against
 * the previous version (see TaskEditor in page.tsx for how the pair of
 * versions being compared is chosen).
 * ------------------------------------------------------------------ */

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import DiffCell from './DiffCell'
import { matchPreviousDimensions, matchPreviousRubrics } from './versionDiff'

/* ------------------------------------------------------------------ *
 * Copying — a View-mode affordance: values here are read-only, so
 * "copy this" is unambiguous (it's the committed value of the version
 * being viewed). Edit mode's tables are plain inputs instead.
 * ------------------------------------------------------------------ */
function copyText(text: string) {
    try { navigator.clipboard?.writeText(text ?? '') } catch { /* ignore */ }
}
function CopyIconBtn({ text, title = 'Copy' }: { text: string; title?: string }) {
    const [copied, setCopied] = useState(false)
    return (
        <button type="button" title={title}
            onClick={() => { copyText(text); setCopied(true); setTimeout(() => setCopied(false), 1200) }}
            className="p-0.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 shrink-0">
            {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
        </button>
    )
}
/** TSV with proper quoting (tabs/newlines/quotes escaped) so pasting into Sheets/Excel
 *  lands each column correctly, including multi-line cells. */
function tsvCell(raw: any): string {
    const s = raw == null ? '' : String(raw)
    return /[\t\n"]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}
function copyTableTSV(headers: string[], rows: any[][]) {
    copyText([headers, ...rows].map(r => r.map(tsvCell).join('\t')).join('\n'))
}
function TableCopyBtn({ headers, rows, label = 'Copy table' }: { headers: string[]; rows: any[][]; label?: string }) {
    const [copied, setCopied] = useState(false)
    return (
        <button type="button" title="Copy as TSV — paste directly into Google Sheets/Excel"
            onClick={() => { copyTableTSV(headers, rows); setCopied(true); setTimeout(() => setCopied(false), 1200) }}
            className="flex items-center gap-1 text-[10px] border border-gray-300 rounded px-1.5 py-0.5 text-gray-600 hover:bg-gray-50 shrink-0">
            {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />} {copied ? 'Copied' : label}
        </button>
    )
}

interface RubricRow {
    index?: number | string
    verifier_type?: string
    criteria?: string
    mapped_dimension?: string
    source?: string
    answer_a?: string
    reason_a?: string
    answer_b?: string
    reason_b?: string
    dependencies_note?: string
    [k: string]: any
}
interface DimensionEntry { key: string; score_a?: number | string | null; reason_a?: string; score_b?: number | string | null; reason_b?: string }

export function RubricsViewTab({ rubrics, previousRubrics, hasPrevVersion }: {
    rubrics: RubricRow[]
    previousRubrics: RubricRow[]
    hasPrevVersion: boolean
}) {
    const matched = matchPreviousRubrics(rubrics, previousRubrics)
    const [selected, setSelected] = useState<number | null>(null)
    return (
        <div className="space-y-8">
            <section>
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xs font-semibold text-gray-700">Rubrics ({rubrics.length})</h2>
                    <TableCopyBtn
                        headers={['Index', 'Verifier Type', 'Dependencies', 'Criteria', 'Mapped Dimension', 'Source']}
                        rows={rubrics.map(r => [r.index, r.verifier_type, r.dependencies_note, r.criteria, r.mapped_dimension, r.source])}
                    />
                </div>
                <div className="border border-gray-200 rounded overflow-x-auto">
                    <table className="w-full text-[11px] border-collapse">
                        <thead className="bg-gray-50">
                            <tr className="text-left text-gray-500">
                                <th className="px-2 py-1.5 w-12">Index</th>
                                <th className="px-2 py-1.5 w-40">Verifier Type</th>
                                <th className="px-2 py-1.5 w-40">Dependencies</th>
                                <th className="px-2 py-1.5 min-w-[280px]">Criteria</th>
                                <th className="px-2 py-1.5 w-48">Mapped Dimension</th>
                                <th className="px-2 py-1.5 w-40">Source</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rubrics.map((r, i) => {
                                const prev = matched[i]
                                const isNewRow = hasPrevVersion && !prev
                                return (
                                    <tr key={i} onClick={() => setSelected(i)}
                                        className={`border-t border-gray-100 align-top cursor-pointer ${selected === i ? 'bg-indigo-100' : 'hover:bg-gray-50'}`}>
                                        <td className="px-2 py-1.5 font-mono text-gray-600">{r.index}</td>
                                        <td className="px-1 py-0.5"><DiffCell value={r.verifier_type} prevValue={prev?.verifier_type} hasPrevVersion={hasPrevVersion} isNewRow={isNewRow} /></td>
                                        <td className="px-1 py-0.5"><DiffCell value={r.dependencies_note} prevValue={prev?.dependencies_note} hasPrevVersion={hasPrevVersion} isNewRow={isNewRow} /></td>
                                        <td className="px-1 py-0.5"><DiffCell value={r.criteria} prevValue={prev?.criteria} hasPrevVersion={hasPrevVersion} isNewRow={isNewRow} area /></td>
                                        <td className="px-1 py-0.5"><DiffCell value={r.mapped_dimension} prevValue={prev?.mapped_dimension} hasPrevVersion={hasPrevVersion} isNewRow={isNewRow} /></td>
                                        <td className="px-1 py-0.5"><DiffCell value={r.source} prevValue={prev?.source} hasPrevVersion={hasPrevVersion} isNewRow={isNewRow} mono /></td>
                                    </tr>
                                )
                            })}
                            {!rubrics.length && <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-300 italic">No rubrics.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>

            <VerificationViewTable side="a" title="Dimension Verification A" rubrics={rubrics} matched={matched} hasPrevVersion={hasPrevVersion} />
            <VerificationViewTable side="b" title="Dimension Verification B" rubrics={rubrics} matched={matched} hasPrevVersion={hasPrevVersion} />
        </div>
    )
}

function VerificationViewTable({ side, title, rubrics, matched, hasPrevVersion }: {
    side: 'a' | 'b'
    title: string
    rubrics: RubricRow[]
    matched: (RubricRow | undefined)[]
    hasPrevVersion: boolean
}) {
    const answerKey = `answer_${side}` as const
    const reasonKey = `reason_${side}` as const
    const accent = side === 'a' ? 'text-blue-600' : 'text-teal-600'
    const total = rubrics.length
    const yesCount = rubrics.filter(r => String(r[answerKey] ?? '').trim().toUpperCase() === 'YES').length
    const noCount = rubrics.filter(r => String(r[answerKey] ?? '').trim().toUpperCase() === 'NO').length
    const pct = (n: number) => total ? Math.round((n / total) * 100) : 0
    const [selected, setSelected] = useState<number | null>(null)

    return (
        <section>
            <div className="flex items-center gap-2 mb-2 flex-wrap gap-y-1.5">
                <h2 className="text-xs font-semibold text-gray-700">{title}</h2>
                <span title={`${yesCount} of ${total} rows answered YES, ${noCount} of ${total} answered NO`}
                    className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 whitespace-nowrap">
                    <span className="text-emerald-600 font-semibold">YES {pct(yesCount)}%</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-red-600 font-semibold">NO {pct(noCount)}%</span>
                </span>
                <TableCopyBtn
                    headers={['Index', 'Criteria', side === 'a' ? 'Answer A' : 'Answer B', side === 'a' ? 'Reason A' : 'Reason B']}
                    rows={rubrics.map(r => [r.index, r.criteria, r[answerKey], r[reasonKey]])}
                />
            </div>
            <div className="border border-gray-200 rounded overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                    <thead className="bg-gray-50">
                        <tr className="text-left text-gray-500">
                            <th className="px-2 py-1.5 w-12">Index</th>
                            <th className="px-2 py-1.5 min-w-[220px]">Criteria</th>
                            <th className={`px-2 py-1.5 w-24 ${accent}`}>Answer</th>
                            <th className="px-2 py-1.5 min-w-[260px]">Reason</th>
                            <th className="px-2 py-1.5 w-8"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rubrics.map((r, i) => {
                            const prev = matched[i]
                            const isNewRow = hasPrevVersion && !prev
                            return (
                                <tr key={i} onClick={() => setSelected(i)}
                                    className={`border-t border-gray-100 align-top cursor-pointer ${selected === i ? 'bg-indigo-100' : 'hover:bg-gray-50'}`}>
                                    <td className="px-2 py-1.5 font-mono text-gray-400">{r.index}</td>
                                    <td className="px-2 py-1.5 text-gray-500">{(r.criteria || '').slice(0, 90)}{(r.criteria || '').length > 90 ? '…' : ''}</td>
                                    <td className="px-1 py-0.5"><DiffCell value={r[answerKey]} prevValue={prev?.[answerKey]} hasPrevVersion={hasPrevVersion} isNewRow={isNewRow} mono /></td>
                                    <td className="px-1 py-0.5"><DiffCell value={r[reasonKey]} prevValue={prev?.[reasonKey]} hasPrevVersion={hasPrevVersion} isNewRow={isNewRow} area /></td>
                                    <td className="px-1 py-1 text-center"><CopyIconBtn text={r[reasonKey] || ''} title="Copy reason" /></td>
                                </tr>
                            )
                        })}
                        {!rubrics.length && <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-300 italic">No rubrics.</td></tr>}
                    </tbody>
                </table>
            </div>
        </section>
    )
}

export function DimensionsViewTab({ entries, previousEntries, hasPrevVersion }: {
    entries: DimensionEntry[]
    previousEntries: DimensionEntry[]
    hasPrevVersion: boolean
}) {
    const matched = matchPreviousDimensions(entries, previousEntries)
    return (
        <div className="space-y-8">
            <DimensionSideViewTable side="a" title="Dimensions — Model A" entries={entries} matched={matched} hasPrevVersion={hasPrevVersion} />
            <DimensionSideViewTable side="b" title="Dimensions — Model B" entries={entries} matched={matched} hasPrevVersion={hasPrevVersion} />
        </div>
    )
}

function DimensionSideViewTable({ side, title, entries, matched, hasPrevVersion }: {
    side: 'a' | 'b'
    title: string
    entries: DimensionEntry[]
    matched: (DimensionEntry | undefined)[]
    hasPrevVersion: boolean
}) {
    const accent = side === 'a' ? 'text-blue-600' : 'text-teal-600'
    const [selected, setSelected] = useState<string | null>(null)
    return (
        <section>
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-gray-700">{title}</h2>
                <TableCopyBtn
                    headers={['Dimension', 'Score', 'Reason']}
                    rows={entries.map(e => [e.key, side === 'a' ? e.score_a : e.score_b, side === 'a' ? e.reason_a : e.reason_b])}
                />
            </div>
            <div className="border border-gray-200 rounded overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                    <thead className="bg-gray-50">
                        <tr className="text-left text-gray-500">
                            <th className="px-2 py-1.5 w-56">Dimension</th>
                            <th className={`px-2 py-1.5 w-20 ${accent}`}>Score</th>
                            <th className="px-2 py-1.5 min-w-[320px]">Reason</th>
                            <th className="px-2 py-1.5 w-8"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((e, i) => {
                            const prev = matched[i]
                            const isNewRow = hasPrevVersion && !prev
                            const score = side === 'a' ? e.score_a : e.score_b
                            const prevScore = side === 'a' ? prev?.score_a : prev?.score_b
                            const reason = side === 'a' ? e.reason_a : e.reason_b
                            const prevReason = side === 'a' ? prev?.reason_a : prev?.reason_b
                            return (
                                <tr key={e.key} onClick={() => setSelected(e.key)}
                                    className={`border-t border-gray-100 align-top cursor-pointer ${selected === e.key ? 'bg-indigo-100' : 'hover:bg-gray-50'}`}>
                                    <td className="px-2 py-1.5 font-mono text-gray-600">{e.key}</td>
                                    <td className="px-1 py-0.5"><DiffCell value={score} prevValue={prevScore} hasPrevVersion={hasPrevVersion} isNewRow={isNewRow} mono /></td>
                                    <td className="px-1 py-0.5"><DiffCell value={reason} prevValue={prevReason} hasPrevVersion={hasPrevVersion} isNewRow={isNewRow} area /></td>
                                    <td className="px-1 py-1 text-center"><CopyIconBtn text={reason || ''} title="Copy reason" /></td>
                                </tr>
                            )
                        })}
                        {!entries.length && <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-300 italic">No dimensions.</td></tr>}
                    </tbody>
                </table>
            </div>
        </section>
    )
}

export function PairwiseViewTab({ current, previous, hasPrevVersion }: {
    current: { pairwise_evaluation?: string; comparative_rationale?: string; final_quality_score_a?: number | null; final_quality_score_b?: number | null }
    previous: { pairwise_evaluation?: string; comparative_rationale?: string; final_quality_score_a?: number | null; final_quality_score_b?: number | null }
    hasPrevVersion: boolean
}) {
    return (
        <div className="max-w-3xl space-y-5">
            <div>
                <label className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Pairwise Evaluation</label>
                <div className="mt-1">
                    <DiffCell value={current.pairwise_evaluation} prevValue={previous.pairwise_evaluation} hasPrevVersion={hasPrevVersion}
                        className="text-sm font-semibold border border-gray-200" />
                </div>
            </div>
            <div className="flex items-center gap-6">
                <div>
                    <label className="text-[10px] uppercase tracking-wide text-blue-500 font-semibold">Final Quality Score A</label>
                    <div className="mt-1 w-28">
                        <DiffCell value={current.final_quality_score_a} prevValue={previous.final_quality_score_a} hasPrevVersion={hasPrevVersion}
                            mono className="text-sm font-semibold border border-blue-200" />
                    </div>
                </div>
                <div>
                    <label className="text-[10px] uppercase tracking-wide text-teal-500 font-semibold">Final Quality Score B</label>
                    <div className="mt-1 w-28">
                        <DiffCell value={current.final_quality_score_b} prevValue={previous.final_quality_score_b} hasPrevVersion={hasPrevVersion}
                            mono className="text-sm font-semibold border border-teal-200" />
                    </div>
                </div>
            </div>
            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Comparative Rationale</label>
                    <CopyIconBtn text={current.comparative_rationale || ''} title="Copy full rationale" />
                </div>
                <DiffCell value={current.comparative_rationale} prevValue={previous.comparative_rationale} hasPrevVersion={hasPrevVersion}
                    area className="text-[12px] leading-relaxed border border-gray-200 block" />
            </div>
        </div>
    )
}
