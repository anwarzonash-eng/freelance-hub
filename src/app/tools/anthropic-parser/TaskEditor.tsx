'use client'

/* ------------------------------------------------------------------ *
 * Anthropic Parser task editor — a 1:1 port of task.html's "CoAT local
 * reviewer" app, backed by the database instead of local original.json/
 * updated.json/answers.json files. `original` is write-once (set at
 * creation); every edit here goes to the `updated` or `answers` column.
 * ------------------------------------------------------------------ */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Pencil, RefreshCw } from 'lucide-react'
import { getAnthropicTask, setAnthropicTaskTitle, updateAnthropicTask } from '@/app/api_handlers/api/anthropic-parser.api'
import { buildDiffBlocks, parseUnifiedDiff } from './diffLogic'
import { MD_CONTENT_CLASS } from './markdown'
import {
    AddedComment, DEFAULT_SCHEMA, RUBRIC_HTML, UnitState, defaultKind, extractProps, formatLocal,
} from './taskLogic'
import DiffPane from './DiffPane'
import EditCommentsPanel from './EditCommentsPanel'
import EditableTextPanel from './EditableTextPanel'
import PairView from './PairView'
import DraftingPads from './DraftingPads'
import AnswersPanel from './AnswersPanel'

function copyText(text: string) {
    try { navigator.clipboard?.writeText(text ?? '') } catch { /* ignore */ }
}

/**
 * The task's title — its own DB column, independent of original.display_title/
 * pair_id (which is read-only, part of the write-once `original`). Click to
 * rename, same interaction as Anton Parser's task name field.
 */
function TaskTitleField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(value)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => { if (!editing) setDraft(value) }, [value, editing])
    useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select() } }, [editing])

    const commit = () => { onChange(draft); setEditing(false) }
    const cancel = () => { setDraft(value); setEditing(false) }

    if (editing) {
        return (
            <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }}
                onBlur={commit}
                className="font-bold text-gray-800 border border-indigo-300 rounded px-1.5 py-0.5 outline-none focus:border-indigo-500 min-w-0 max-w-[360px]" />
        )
    }
    return (
        <button type="button" onClick={() => setEditing(true)} title="Click to rename this task" className="flex items-center gap-1.5 min-w-0 group">
            <span className="font-bold text-gray-800 truncate max-w-[360px]" title={value}>{value}</span>
            <Pencil size={11} className="text-gray-300 group-hover:text-indigo-500 shrink-0" />
        </button>
    )
}

function IdChip({ label, value }: { label: string; value: string }) {
    const [copied, setCopied] = useState(false)
    return (
        <span title={value} className="inline-flex items-center border border-indigo-200 rounded-full pl-2.5 pr-1 py-0.5 mr-1.5 bg-white text-[12px] text-gray-700 whitespace-nowrap">
            {label}
            <button type="button" title={`copy ${label}`} onClick={() => { copyText(value); setCopied(true); setTimeout(() => setCopied(false), 1200) }}
                className={`ml-1 px-1 ${copied ? 'text-green-600' : 'text-gray-400 hover:text-indigo-600'}`}>
                {copied ? <Check size={11} /> : '⎘'}
            </button>
        </span>
    )
}

const ANSWERS_PANEL_WIDTH_KEY = 'anthropic_answers_panel_width'
const DEFAULT_ANSWERS_WIDTH = 440

interface AnswersBundle {
    answers: Record<string, string>
    unitState: { A: Record<string, UnitState>; B: Record<string, UnitState> }
    adds: { A: AddedComment[]; B: AddedComment[] }
    editSide: 'A' | 'B' | null
}

export default function TaskEditor({ taskId, onClose }: { taskId: string; onClose: () => void }) {
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState('')
    const [row, setRow] = useState<any>(null)
    const [updated, setUpdated] = useState<any>({})
    const [bundle, setBundle] = useState<AnswersBundle>({ answers: {}, unitState: { A: {}, B: {} }, adds: { A: [], B: [] }, editSide: null })
    const [viewMode, setViewMode] = useState<'original' | 'updated'>('original')
    const [showAnswers, setShowAnswers] = useState(false)
    const [answersWidth, setAnswersWidth] = useState(DEFAULT_ANSWERS_WIDTH)
    const [saveStatus, setSaveStatus] = useState('not saved yet')

    useEffect(() => {
        try {
            const v = Number(localStorage.getItem(ANSWERS_PANEL_WIDTH_KEY))
            if (Number.isFinite(v) && v >= 280) setAnswersWidth(v)
        } catch { /* ignore */ }
    }, [])

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setLoadError('')
        getAnthropicTask(taskId).then((res: any) => {
            if (cancelled) return
            const full = res?.data ?? res
            if (!full) { setLoadError('Could not load this task.'); return }
            setRow(full)
            setUpdated(full.updated || {})
            const af = full.answers
            if (af && af.answers) {
                setBundle({
                    answers: af.answers || {},
                    unitState: af.unitState || { A: {}, B: {} },
                    adds: af.adds || { A: [], B: [] },
                    editSide: af.editSide || null,
                })
            }
            setViewMode((full.updated?.problem_statement != null || full.updated?.test_summary != null) ? 'updated' : 'original')
        }).catch(() => { if (!cancelled) setLoadError('Could not load this task.') })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [taskId])

    const extracted = useMemo(() => {
        if (!row?.original) return null
        try { return extractProps(row.original) } catch (e: any) { return { error: e?.message || 'Could not extract task properties.' } as any }
    }, [row])

    const props = extracted && !('error' in extracted) ? extracted.props : null
    const task = extracted && !('error' in extracted) ? extracted.task : null
    const stage = extracted && !('error' in extracted) ? extracted.stage : null
    const pairId = props?.pair_id || props?.display_title || 'unknown'
    const schema = (Array.isArray(props?.feedback_schema) && props!.feedback_schema!.length) ? props!.feedback_schema! : DEFAULT_SCHEMA

    const filesA = useMemo(() => parseUnifiedDiff(props?.diff_a || ''), [props])
    const filesB = useMemo(() => parseUnifiedDiff(props?.diff_b || ''), [props])
    const diffData = useMemo(() => buildDiffBlocks(filesA, filesB), [filesA, filesB])
    const unitsA = props?.comment_units_a || []
    const unitsB = props?.comment_units_b || []

    // Autosave `updated` (problem_statement / test_summary overrides), debounced.
    const firstUpdated = useRef(true)
    useEffect(() => {
        if (loading) return
        if (firstUpdated.current) { firstUpdated.current = false; return }
        const t = setTimeout(() => { updateAnthropicTask(taskId, { updated }) }, 500)
        return () => clearTimeout(t)
    }, [updated, loading, taskId])

    // Autosave the answers bundle, debounced — mirrors saveAnswers()/saveAnswersFile().
    const firstBundle = useRef(true)
    useEffect(() => {
        if (loading) return
        if (firstBundle.current) { firstBundle.current = false; return }
        setSaveStatus('saving…')
        const t = setTimeout(() => {
            updateAnthropicTask(taskId, { answers: { pair_id: pairId, ...bundle } }).then(() => {
                setSaveStatus('saved ' + new Date().toLocaleTimeString())
            })
        }, 400)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bundle, loading, taskId])

    const currentText = (field: 'problem_statement' | 'test_summary') => {
        if (viewMode === 'updated' && updated?.[field] != null) return updated[field]
        return props?.[field] || ''
    }
    const saveField = (field: 'problem_statement' | 'test_summary', text: string) => {
        setUpdated((u: any) => ({ ...u, [field]: text }))
        setViewMode('updated')
    }

    const saveTitle = (next: string) => {
        const title = next.trim() || 'Untitled task'
        setRow((r: any) => ({ ...r, title }))
        setAnthropicTaskTitle(taskId, title)
    }

    const setAnswer = (id: string, val: string) => setBundle(b => ({ ...b, answers: { ...b.answers, [id]: val } }))
    const setEditSide = (side: 'A' | 'B') => setBundle(b => ({ ...b, editSide: side }))
    const onUnitChange = (side: 'A' | 'B', unitId: string, patch: Partial<UnitState>) => {
        setBundle(b => {
            const units = side === 'A' ? unitsA : unitsB
            const unit = units.find((u: any) => u.id === unitId)
            const existing = b.unitState[side][unitId] || { action: unit?.existing ? 'keep' : null, newText: null, editKind: unit ? defaultKind(unit) : 'comment', why: '' }
            return { ...b, unitState: { ...b.unitState, [side]: { ...b.unitState[side], [unitId]: { ...existing, ...patch } } } }
        })
    }
    const onAddsChange = (side: 'A' | 'B', next: AddedComment[]) => setBundle(b => ({ ...b, adds: { ...b.adds, [side]: next } }))

    const toggleAnswers = () => setShowAnswers(v => !v)

    // Answers-panel resize (drag the divider).
    const resizing = useRef(false)
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!resizing.current) return
            const w = Math.min(Math.max(window.innerWidth - e.clientX, 280), window.innerWidth * 0.75)
            setAnswersWidth(w)
        }
        const onUp = () => {
            if (!resizing.current) return
            resizing.current = false
            document.body.style.userSelect = ''
            try { localStorage.setItem(ANSWERS_PANEL_WIDTH_KEY, String(answersWidth)) } catch { /* ignore */ }
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    const startResize = () => { resizing.current = true; document.body.style.userSelect = 'none' }

    if (loading) {
        return (
            <div className="fixed inset-0 z-[9980] bg-white flex items-center justify-center">
                <div className="flex items-center gap-2 text-gray-400 text-xs"><RefreshCw size={14} className="animate-spin" /> Loading task…</div>
            </div>
        )
    }
    if (loadError || !props) {
        return (
            <div className="fixed inset-0 z-[9980] bg-white flex items-center justify-center p-6">
                <div className="max-w-md text-center">
                    <div className="text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm whitespace-pre-wrap">
                        {(extracted && 'error' in extracted && extracted.error) || loadError || 'Could not load this task.'}
                    </div>
                    <button onClick={onClose} className="mt-4 text-sm border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50">Close</button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-[9980] bg-white flex text-[14px] text-gray-800">
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                {/* Top bar */}
                <div className="sticky top-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-1.5 bg-indigo-50 border-b border-indigo-200 px-5 py-2 text-[13px] shrink-0">
                    <TaskTitleField value={row?.title || props.display_title || props.pair_id || 'Untitled task'} onChange={saveTitle} />
                    <span>
                        {task?.id && <IdChip label="taskID" value={task.id} />}
                        {stage?.id && <IdChip label="stageID" value={stage.id} />}
                        {stage?.expires_at && <span className="text-gray-500" title={stage.expires_at}>expires {formatLocal(stage.expires_at)}</span>}
                    </span>
                    <span className="w-px self-stretch bg-indigo-200" />
                    <span>
                        <label className="font-semibold cursor-pointer mr-3"><input type="radio" checked={viewMode === 'original'} onChange={() => setViewMode('original')} /> Original</label>
                        <label className="font-semibold cursor-pointer"><input type="radio" checked={viewMode === 'updated'} onChange={() => setViewMode('updated')} /> Updated</label>
                    </span>
                    <span className="w-px self-stretch bg-indigo-200" />
                    <nav className="flex flex-wrap gap-x-3.5">
                        <a href="#problem" className="text-blue-700 hover:underline">problem</a>
                        <a href="#diff" className="text-blue-700 hover:underline">diff</a>
                        <a href="#editc" className="text-blue-700 hover:underline">edit comments</a>
                        <a href="#tests" className="text-blue-700 hover:underline">tests</a>
                        <a href="#rubric" className="text-blue-700 hover:underline">rubric</a>
                        <a href="#pair" className="text-blue-700 hover:underline">A vs B</a>
                        <a href="#draftpad" className="text-blue-700 hover:underline">drafting pad</a>
                    </nav>
                    <span className="flex-1" />
                    <button type="button" onClick={toggleAnswers} title="Show/hide your answers panel"
                        className={`text-[13px] rounded px-2.5 py-1 ${showAnswers ? 'bg-indigo-600 text-white' : 'border border-gray-300 hover:bg-white'}`}>
                        &#128221; answers
                    </button>
                    <button type="button" onClick={onClose} className="text-[13px] border border-gray-300 rounded px-2.5 py-1 hover:bg-white">close</button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-3">
                    <details className="border border-gray-200 rounded-md my-2.5" id="problem" open>
                        <summary className="cursor-pointer px-3 py-2 font-semibold bg-gray-50 rounded-t-md select-none">Problem statement</summary>
                        <div className="px-3.5 py-2.5">
                            <EditableTextPanel value={currentText('problem_statement')} onSave={t => saveField('problem_statement', t)} />
                        </div>
                    </details>

                    <details className="border border-gray-200 rounded-md my-2.5" id="diff" open>
                        <summary className="cursor-pointer px-3 py-2 font-semibold bg-gray-50 rounded-t-md select-none">Code change (given) — with both versions of the comments</summary>
                        <div className="px-3.5 py-2.5">
                            <DiffPane diffData={diffData} />
                        </div>
                    </details>

                    <details className="border border-gray-200 rounded-md my-2.5" id="editc" open>
                        <summary className="cursor-pointer px-3 py-2 font-semibold bg-gray-50 rounded-t-md select-none">Edit the comments of the side you preferred</summary>
                        <div className="px-3.5 py-2.5">
                            <EditCommentsPanel
                                pairId={pairId} filesA={filesA} filesB={filesB} unitsA={unitsA} unitsB={unitsB}
                                editSide={bundle.editSide} onEditSideChange={setEditSide}
                                unitState={bundle.unitState} onUnitChange={onUnitChange}
                                adds={bundle.adds} onAddsChange={onAddsChange}
                                ccEdits={bundle.answers.cc_edits || ''} onCcEditsChange={block => setAnswer('cc_edits', block)} />
                        </div>
                    </details>

                    <details className="border border-gray-200 rounded-md my-2.5" id="tests" open>
                        <summary className="cursor-pointer px-3 py-2 font-semibold bg-gray-50 rounded-t-md select-none">Test &amp; verification summary (given)</summary>
                        <div className="px-3.5 py-2.5">
                            <EditableTextPanel value={currentText('test_summary')} onSave={t => saveField('test_summary', t)} />
                        </div>
                    </details>

                    <details className="border border-gray-200 rounded-md my-2.5" id="rubric">
                        <summary className="cursor-pointer px-3 py-2 font-semibold bg-gray-50 rounded-t-md select-none">Rubric quick reference</summary>
                        <div className={`px-3.5 py-2.5 text-[13px] leading-relaxed ${MD_CONTENT_CLASS}`}
                            dangerouslySetInnerHTML={{ __html: RUBRIC_HTML }} />
                    </details>

                    <h2 id="pair" className="text-[17px] font-semibold mt-5 mb-1">Commit message &amp; PR description</h2>
                    <PairView commitA={props.commit_a || ''} commitB={props.commit_b || ''} prA={props.pr_a || ''} prB={props.pr_b || ''} testSummary={props.test_summary || ''} />

                    <details className="border border-gray-200 rounded-md my-2.5" id="draftpad" open>
                        <summary className="cursor-pointer px-3 py-2 font-semibold bg-gray-50 rounded-t-md select-none">Drafting pads</summary>
                        <div className="px-3.5 py-2.5">
                            <DraftingPads
                                commitRewrite={bundle.answers.commit_rewrite || ''} onCommitRewriteChange={v => setAnswer('commit_rewrite', v)}
                                prRewrite={bundle.answers.pr_rewrite || ''} onPrRewriteChange={v => setAnswer('pr_rewrite', v)} />
                        </div>
                    </details>
                </div>
            </div>

            {showAnswers && (
                <>
                    <div onMouseDown={startResize} title="Drag to resize" className="w-1.5 shrink-0 cursor-col-resize hover:bg-indigo-300 bg-gray-200" />
                    <AnswersPanel schema={schema} answers={bundle.answers} onAnswerChange={setAnswer} saveStatus={saveStatus}
                        pairId={pairId} onClose={() => setShowAnswers(false)} width={answersWidth}
                        downloadPayload={{ answers: bundle.answers, unitState: bundle.unitState, adds: bundle.adds, editSide: bundle.editSide }} />
                </>
            )}
        </div>
    )
}
