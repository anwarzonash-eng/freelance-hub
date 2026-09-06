'use client'

import { useEffect, useRef, useState } from 'react'
import {
    ListTree, Plus, RefreshCw, X, Check, Trash2, Copy, Upload, FileJson,
} from 'lucide-react'
import {
    getAntonTasks, createAntonTask, getAntonTask, updateAntonTask, deleteAntonTask,
} from '@/app/api_handlers/api/anton-parser.api'

/* ------------------------------------------------------------------ *
 * Types — a thin, permissive view over whatever the uploaded JSON
 * contains. `data` (the full object) is always the source of truth;
 * these are just the shapes we actively read/edit from it.
 * ------------------------------------------------------------------ */
interface TaskListItem { id: string; title: string; task_type: string | null; createdAt?: string; updatedAt?: string }
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
    // Free-standing manual annotation — NOT bound to the original `depends_on` key.
    dependencies_note?: string
    [k: string]: any
}
interface DimensionEntry { key: string; score_a?: number | string | null; reason_a?: string; score_b?: number | string | null; reason_b?: string }

/* ------------------------------------------------------------------ *
 * Small shared UI bits
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
function TextCell({ value, onChange, mono }: { value: string; onChange: (v: string) => void; mono?: boolean }) {
    return (
        <input value={value ?? ''} onChange={e => onChange(e.target.value)}
            className={`w-full text-[11px] border border-transparent hover:border-gray-300 focus:border-indigo-400 rounded px-1.5 py-1 bg-transparent focus:bg-white outline-none ${mono ? 'font-mono' : ''}`} />
    )
}
function AreaCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} rows={3}
            className="w-full text-[11px] border border-transparent hover:border-gray-300 focus:border-indigo-400 rounded px-1.5 py-1 bg-transparent focus:bg-white outline-none resize-y leading-relaxed" />
    )
}

/** Read/parse a File as JSON. Rejects with a readable message on bad JSON. */
function readJsonFile(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            try { resolve(JSON.parse(String(reader.result || ''))) }
            catch { reject(new Error('That file is not valid JSON.')) }
        }
        reader.onerror = () => reject(new Error('Could not read the file.'))
        reader.readAsText(file)
    })
}

/* ------------------------------------------------------------------ *
 * Task editor — full-screen, 3 tabs, autosaves the whole JSON blob.
 * ------------------------------------------------------------------ */
type Tab = 'rubrics' | 'dimensions' | 'pairwise'

function TaskEditor({ taskId, onClose, onSaved }: { taskId: string; onClose: () => void; onSaved: () => void }) {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>({})
    const [tab, setTab] = useState<Tab>('rubrics')
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
    const [reuploadBusy, setReuploadBusy] = useState(false)
    const [reuploadErr, setReuploadErr] = useState('')
    const fileRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        getAntonTask(taskId).then((res: any) => {
            if (cancelled) return
            const full = res?.data ?? res
            setData(full?.data ?? {})
        }).finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [taskId])

    // Debounced autosave of the whole JSON blob whenever it changes.
    const first = useRef(true)
    const dirty = useRef(false)
    const latest = useRef(data)
    latest.current = data
    useEffect(() => {
        if (loading) return
        if (first.current) { first.current = false; return }
        dirty.current = true
        setSaveStatus('saving')
        const t = setTimeout(async () => {
            try { await updateAntonTask(taskId, latest.current); setSaveStatus('saved'); dirty.current = false; onSaved() }
            catch { setSaveStatus('idle') }
        }, 700)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, loading])
    useEffect(() => () => { if (dirty.current) updateAntonTask(taskId, latest.current) }, [taskId])

    const rubrics: RubricRow[] = Array.isArray(data.rubrics) ? data.rubrics : []
    const setRubrics = (next: RubricRow[]) => setData((d: any) => ({ ...d, rubrics: next }))
    const patchRubric = (i: number, patch: Partial<RubricRow>) => {
        const next = rubrics.slice(); next[i] = { ...next[i], ...patch }; setRubrics(next)
    }
    const addRubric = () => {
        const nextIndex = (rubrics.reduce((m, r) => Math.max(m, Number(r.index) || 0), 0)) + 1
        setRubrics([...rubrics, { index: nextIndex, verifier_type: '', criteria: '', mapped_dimension: '', source: '', dependencies_note: '', answer_a: '', reason_a: '', answer_b: '', reason_b: '' }])
    }
    const removeRubric = (i: number) => { if (confirm('Delete this rubric row?')) setRubrics(rubrics.filter((_, idx) => idx !== i)) }

    const dimensionEntries: DimensionEntry[] = Object.entries(data.dimensions || {}).map(([key, v]: [string, any]) => ({ key, ...(v || {}) }))
    const patchDimension = (key: string, side: 'a' | 'b', field: 'score' | 'reason', value: any) => {
        setData((d: any) => ({
            ...d,
            dimensions: {
                ...(d.dimensions || {}),
                [key]: { ...(d.dimensions?.[key] || {}), [`${field}_${side}`]: value },
            },
        }))
    }

    const setPairwise = (field: 'pairwise_evaluation' | 'comparative_rationale', value: string) =>
        setData((d: any) => ({ ...d, [field]: value }))
    const setFinalScore = (field: 'final_quality_score_a' | 'final_quality_score_b', value: number | null) =>
        setData((d: any) => ({ ...d, [field]: value }))

    const doReupload = async (file: File) => {
        setReuploadErr('')
        try {
            const parsed = await readJsonFile(file)
            if (!confirm('Uploading a new file resets everything in this task to the new JSON. Continue?')) return
            setReuploadBusy(true)
            setData(parsed)
            await updateAntonTask(taskId, parsed)
            onSaved()
        } catch (e: any) {
            setReuploadErr(e?.message || 'Could not parse that file.')
        } finally {
            setReuploadBusy(false)
            if (fileRef.current) fileRef.current.value = ''
        }
    }

    const taskName = typeof data.task_name === 'string' ? data.task_name : 'Untitled task'
    const taskType = data?.seeded_value_checks?.field_task_type_assessed || '—'
    const modelA = data?.model_a || ''
    const modelB = data?.model_b || ''

    if (loading) {
        return (
            <div className="fixed inset-0 z-[9980] bg-white flex items-center justify-center">
                <div className="flex items-center gap-2 text-gray-400 text-xs"><RefreshCw size={14} className="animate-spin" /> Loading task…</div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-[9980] bg-white flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200 bg-gray-50 shrink-0 flex-wrap">
                <ListTree size={15} className="text-indigo-500 shrink-0" />
                <span className="text-sm font-semibold text-gray-800 truncate max-w-[360px]" title={taskName}>{taskName}</span>
                <span title="Task type — read-only, derived from the JSON"
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-300 shrink-0">
                    {taskType}
                </span>
                {(modelA || modelB) && (
                    <span className="text-[10px] text-gray-400 shrink-0">
                        {modelA && <>A = <span className="text-blue-600 font-medium">{modelA}</span></>}
                        {modelA && modelB && ' · '}
                        {modelB && <>B = <span className="text-teal-600 font-medium">{modelB}</span></>}
                    </span>
                )}
                <div className="flex-1" />
                <span className="text-[10px] text-gray-400">
                    {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : ''}
                </span>
                <input ref={fileRef} type="file" accept="application/json,.json" hidden
                    onChange={e => { const f = e.target.files?.[0]; if (f) doReupload(f) }} />
                <button onClick={() => fileRef.current?.click()} disabled={reuploadBusy}
                    title="Upload a new JSON file — replaces everything in this task"
                    className="flex items-center gap-1 text-[11px] border border-amber-300 text-amber-700 rounded px-2.5 py-1 hover:bg-amber-50 disabled:opacity-40">
                    {reuploadBusy ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />} Re-upload JSON
                </button>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-700 ml-1"><X size={16} /></button>
            </div>
            {reuploadErr && <div className="px-4 py-1.5 bg-red-50 text-red-700 text-[11px] border-b border-red-200">{reuploadErr}</div>}

            {/* Tabs */}
            <div className="flex items-center gap-1 px-4 py-1.5 border-b border-gray-200 bg-white shrink-0">
                {([['rubrics', 'Rubrics'], ['dimensions', 'Dimensions'], ['pairwise', 'Pairwise']] as [Tab, string][]).map(([key, label]) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`text-[12px] font-medium px-3 py-1.5 rounded ${tab === key ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {tab === 'rubrics' && (
                    <RubricsTab rubrics={rubrics} onPatch={patchRubric} onAdd={addRubric} onRemove={removeRubric} />
                )}
                {tab === 'dimensions' && (
                    <DimensionsTab entries={dimensionEntries} onPatch={patchDimension} />
                )}
                {tab === 'pairwise' && (
                    <PairwiseTab
                        pairwiseEvaluation={data.pairwise_evaluation || ''}
                        comparativeRationale={data.comparative_rationale || ''}
                        finalQualityScoreA={data.final_quality_score_a ?? null}
                        finalQualityScoreB={data.final_quality_score_b ?? null}
                        onChange={setPairwise}
                        onChangeScore={setFinalScore}
                    />
                )}
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ *
 * Rubrics tab — three views over the same `rubrics` array.
 * ------------------------------------------------------------------ */
function RubricsTab({ rubrics, onPatch, onAdd, onRemove }: {
    rubrics: RubricRow[]
    onPatch: (i: number, patch: Partial<RubricRow>) => void
    onAdd: () => void
    onRemove: (i: number) => void
}) {
    const [selected, setSelected] = useState<number | null>(null)
    return (
        <div className="space-y-8">
            {/* Table 1 — Rubrics (full CRUD) */}
            <section>
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xs font-semibold text-gray-700">Rubrics ({rubrics.length})</h2>
                    <div className="flex items-center gap-2">
                        <TableCopyBtn
                            headers={['Index', 'Verifier Type', 'Dependencies', 'Criteria', 'Mapped Dimension', 'Source']}
                            rows={rubrics.map(r => [r.index, r.verifier_type, r.dependencies_note, r.criteria, r.mapped_dimension, r.source])}
                        />
                        <button onClick={onAdd} className="flex items-center gap-1 text-[11px] bg-indigo-600 text-white rounded px-2 py-1 hover:bg-indigo-700">
                            <Plus size={12} /> Add rubric
                        </button>
                    </div>
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
                                <th className="px-2 py-1.5 w-8"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rubrics.map((r, i) => (
                                <tr key={i} onClick={() => setSelected(i)}
                                    className={`border-t border-gray-100 align-top cursor-pointer ${selected === i ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                                    <td className="px-1 py-0.5"><TextCell value={String(r.index ?? '')} onChange={v => onPatch(i, { index: v })} mono /></td>
                                    <td className="px-1 py-0.5"><TextCell value={r.verifier_type || ''} onChange={v => onPatch(i, { verifier_type: v })} /></td>
                                    <td className="px-1 py-0.5"><TextCell value={r.dependencies_note || ''} onChange={v => onPatch(i, { dependencies_note: v })} /></td>
                                    <td className="px-1 py-0.5"><AreaCell value={r.criteria || ''} onChange={v => onPatch(i, { criteria: v })} /></td>
                                    <td className="px-1 py-0.5"><TextCell value={r.mapped_dimension || ''} onChange={v => onPatch(i, { mapped_dimension: v })} /></td>
                                    <td className="px-1 py-0.5"><TextCell value={r.source || ''} onChange={v => onPatch(i, { source: v })} mono /></td>
                                    <td className="px-1 py-0.5 text-center">
                                        <button onClick={() => onRemove(i)} title="Delete row" className="p-0.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={12} /></button>
                                    </td>
                                </tr>
                            ))}
                            {!rubrics.length && <tr><td colSpan={7} className="px-3 py-4 text-center text-gray-300 italic">No rubrics yet.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Table 2 — Dimension Verification A */}
            <VerificationTable side="a" title="Dimension Verification A" rubrics={rubrics} onPatch={onPatch} />

            {/* Table 3 — Dimension Verification B */}
            <VerificationTable side="b" title="Dimension Verification B" rubrics={rubrics} onPatch={onPatch} />
        </div>
    )
}

function VerificationTable({ side, title, rubrics, onPatch }: {
    side: 'a' | 'b'
    title: string
    rubrics: RubricRow[]
    onPatch: (i: number, patch: Partial<RubricRow>) => void
}) {
    const answerKey = `answer_${side}` as const
    const reasonKey = `reason_${side}` as const
    const accent = side === 'a' ? 'text-blue-600' : 'text-teal-600'
    const [selected, setSelected] = useState<number | null>(null)
    return (
        <section>
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-gray-700">{title}</h2>
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
                        {rubrics.map((r, i) => (
                            <tr key={i} onClick={() => setSelected(i)}
                                className={`border-t border-gray-100 align-top cursor-pointer ${selected === i ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                                <td className="px-2 py-1.5 font-mono text-gray-400">{r.index}</td>
                                <td className="px-2 py-1.5 text-gray-500">{(r.criteria || '').slice(0, 90)}{(r.criteria || '').length > 90 ? '…' : ''}</td>
                                <td className="px-1 py-0.5"><TextCell value={String(r[answerKey] ?? '')} onChange={v => onPatch(i, { [answerKey]: v } as any)} mono /></td>
                                <td className="px-1 py-0.5"><AreaCell value={r[reasonKey] || ''} onChange={v => onPatch(i, { [reasonKey]: v } as any)} /></td>
                                <td className="px-1 py-1 text-center"><CopyIconBtn text={r[reasonKey] || ''} title="Copy reason" /></td>
                            </tr>
                        ))}
                        {!rubrics.length && <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-300 italic">No rubrics yet.</td></tr>}
                    </tbody>
                </table>
            </div>
        </section>
    )
}

/* ------------------------------------------------------------------ *
 * Dimensions tab — two tables, one per model, over the `dimensions` object.
 * ------------------------------------------------------------------ */
function DimensionsTab({ entries, onPatch }: {
    entries: DimensionEntry[]
    onPatch: (key: string, side: 'a' | 'b', field: 'score' | 'reason', value: any) => void
}) {
    return (
        <div className="space-y-8">
            <DimensionSideTable side="a" title="Dimensions — Model A" entries={entries} onPatch={onPatch} />
            <DimensionSideTable side="b" title="Dimensions — Model B" entries={entries} onPatch={onPatch} />
        </div>
    )
}

function DimensionSideTable({ side, title, entries, onPatch }: {
    side: 'a' | 'b'
    title: string
    entries: DimensionEntry[]
    onPatch: (key: string, side: 'a' | 'b', field: 'score' | 'reason', value: any) => void
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
                        {entries.map(e => {
                            const score = side === 'a' ? e.score_a : e.score_b
                            const reason = side === 'a' ? e.reason_a : e.reason_b
                            return (
                                <tr key={e.key} onClick={() => setSelected(e.key)}
                                    className={`border-t border-gray-100 align-top cursor-pointer ${selected === e.key ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                                    <td className="px-2 py-1.5 font-mono text-gray-600">{e.key}</td>
                                    <td className="px-1 py-0.5"><TextCell value={String(score ?? '')} onChange={v => onPatch(e.key, side, 'score', v === '' ? null : Number(v))} mono /></td>
                                    <td className="px-1 py-0.5"><AreaCell value={reason || ''} onChange={v => onPatch(e.key, side, 'reason', v)} /></td>
                                    <td className="px-1 py-1 text-center"><CopyIconBtn text={reason || ''} title="Copy reason" /></td>
                                </tr>
                            )
                        })}
                        {!entries.length && <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-300 italic">No dimensions yet.</td></tr>}
                    </tbody>
                </table>
            </div>
        </section>
    )
}

/* ------------------------------------------------------------------ *
 * Pairwise tab
 * ------------------------------------------------------------------ */
function PairwiseTab({ pairwiseEvaluation, comparativeRationale, finalQualityScoreA, finalQualityScoreB, onChange, onChangeScore }: {
    pairwiseEvaluation: string
    comparativeRationale: string
    finalQualityScoreA: number | null
    finalQualityScoreB: number | null
    onChange: (field: 'pairwise_evaluation' | 'comparative_rationale', value: string) => void
    onChangeScore: (field: 'final_quality_score_a' | 'final_quality_score_b', value: number | null) => void
}) {
    return (
        <div className="max-w-3xl space-y-5">
            <div>
                <label className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Pairwise Evaluation</label>
                <input value={pairwiseEvaluation} onChange={e => onChange('pairwise_evaluation', e.target.value)}
                    className="mt-1 w-full text-sm font-semibold border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-400" />
            </div>
            <div className="flex items-center gap-6">
                <div>
                    <label className="text-[10px] uppercase tracking-wide text-blue-500 font-semibold">Final Quality Score A</label>
                    <input type="number" value={finalQualityScoreA ?? ''}
                        onChange={e => onChangeScore('final_quality_score_a', e.target.value === '' ? null : Number(e.target.value))}
                        className="mt-1 w-28 text-sm font-semibold border border-blue-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                    <label className="text-[10px] uppercase tracking-wide text-teal-500 font-semibold">Final Quality Score B</label>
                    <input type="number" value={finalQualityScoreB ?? ''}
                        onChange={e => onChangeScore('final_quality_score_b', e.target.value === '' ? null : Number(e.target.value))}
                        className="mt-1 w-28 text-sm font-semibold border border-teal-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-teal-500" />
                </div>
            </div>
            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Comparative Rationale</label>
                    <CopyIconBtn text={comparativeRationale} title="Copy full rationale" />
                </div>
                <textarea value={comparativeRationale} onChange={e => onChange('comparative_rationale', e.target.value)} rows={16}
                    className="w-full text-[12px] leading-relaxed border border-gray-300 rounded px-2.5 py-2 focus:outline-none focus:border-indigo-400 resize-y" />
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ *
 * Page — task list
 * ------------------------------------------------------------------ */
export default function AntonParserPage() {
    const [tasks, setTasks] = useState<TaskListItem[]>([])
    const [loading, setLoading] = useState(false)
    const [uploadBusy, setUploadBusy] = useState(false)
    const [uploadErr, setUploadErr] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    const load = async () => {
        setLoading(true)
        try {
            const res: any = await getAntonTasks()
            const list = res?.data ?? res
            setTasks(Array.isArray(list) ? list : [])
        } finally { setLoading(false) }
    }
    useEffect(() => { load() }, [])

    const doUpload = async (file: File) => {
        setUploadErr('')
        setUploadBusy(true)
        try {
            const parsed = await readJsonFile(file)
            const res: any = await createAntonTask(parsed)
            const created = res?.data ?? res
            await load()
            if (created?.id) setEditingId(created.id)
        } catch (e: any) {
            setUploadErr(e?.message || 'Could not create the task.')
        } finally {
            setUploadBusy(false)
            if (fileRef.current) fileRef.current.value = ''
        }
    }

    const removeTask = async (id: string) => {
        if (!confirm('Delete this task?')) return
        await deleteAntonTask(id)
        load()
    }

    return (
        <div className="p-3 bg-white h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-2 shrink-0">
                <div className="flex items-center gap-2">
                    <ListTree size={14} className="text-gray-500" />
                    <h1 className="text-sm font-semibold text-gray-800">Anton Parser</h1>
                    <span className="text-[10px] text-gray-400">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                    <input ref={fileRef} type="file" accept="application/json,.json" hidden
                        onChange={e => { const f = e.target.files?.[0]; if (f) doUpload(f) }} />
                    <button onClick={() => load()} disabled={loading}
                        className="flex items-center gap-1 text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50 text-gray-600">
                        <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button onClick={() => fileRef.current?.click()} disabled={uploadBusy}
                        className="flex items-center gap-1 text-xs bg-indigo-600 text-white rounded px-2.5 py-1 hover:bg-indigo-700 disabled:opacity-40">
                        {uploadBusy ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />} Upload JSON
                    </button>
                </div>
            </div>
            {uploadErr && <div className="mb-2 px-3 py-1.5 bg-red-50 text-red-700 text-[11px] border border-red-200 rounded shrink-0">{uploadErr}</div>}

            <div className="flex-1 overflow-y-auto min-h-0 border border-gray-200 rounded">
                {loading && tasks.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-gray-400 text-xs"><RefreshCw size={14} className="animate-spin" /> Loading tasks…</div>
                ) : tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-400 text-xs">
                        <FileJson size={20} className="text-gray-300" />
                        No tasks yet. Click <span className="font-medium text-indigo-600">Upload JSON</span> to create one.
                    </div>
                ) : (
                    <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr className="text-left text-gray-500">
                                <th className="px-3 py-1.5 font-medium">Task Name</th>
                                <th className="px-3 py-1.5 font-medium">Task Type</th>
                                <th className="px-3 py-1.5 font-medium">Updated</th>
                                <th className="px-3 py-1.5 font-medium w-8"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map(t => (
                                <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setEditingId(t.id)}>
                                    <td className="px-3 py-1.5 font-medium text-gray-800">{t.title}</td>
                                    <td className="px-3 py-1.5">
                                        {t.task_type
                                            ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">{t.task_type}</span>
                                            : <span className="text-gray-300">—</span>}
                                    </td>
                                    <td className="px-3 py-1.5 text-gray-400">{t.updatedAt ? new Date(t.updatedAt).toLocaleString() : '—'}</td>
                                    <td className="px-3 py-1.5">
                                        <button onClick={e => { e.stopPropagation(); removeTask(t.id) }} title="Delete"
                                            className="p-0.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={12} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {editingId && (
                <TaskEditor taskId={editingId} onClose={() => { setEditingId(null); load() }} onSaved={load} />
            )}
        </div>
    )
}
