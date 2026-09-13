'use client'

/* ------------------------------------------------------------------ *
 * "Verify" side panel — pick a Studio export (task-export-*.json),
 * compare it field by field against the currently selected
 * annotation.json version, and show mismatches/missing/matched, plus
 * the fields Studio simply never exports (check those manually).
 *
 * Rendered by TaskEditor (page.tsx) as an ordinary flex sibling next to
 * the editor, not a `fixed`-position overlay — the editor's own
 * `flex-1 min-w-0` wrapper shrinks to make room, so this is a real
 * side-by-side split rather than something floating on top of the page.
 * The version dropdown that drives it stays reachable on the left while
 * this is open. Width is user-resizable by dragging the left edge,
 * remembered in localStorage across opens.
 * ------------------------------------------------------------------ */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
    X, Upload, RefreshCw, Check, Copy, ChevronDown, AlertTriangle, ShieldAlert, FileWarning,
} from 'lucide-react'
import {
    AnnotationSnapshot, buildReportText, diffStrings, FieldRow,
    verifyExportAgainstAnnotation, VerifyResult,
} from './verify'

const WIDTH_KEY = 'anton_verify_panel_width'
const DEFAULT_WIDTH = 560
const MIN_WIDTH = 380

function loadWidth(): number {
    try {
        const v = Number(localStorage.getItem(WIDTH_KEY))
        return Number.isFinite(v) && v >= MIN_WIDTH ? v : DEFAULT_WIDTH
    } catch { return DEFAULT_WIDTH }
}

function readJson(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            try { resolve(JSON.parse(String(reader.result || ''))) }
            catch { reject(new Error(`${file.name} is not valid JSON.`)) }
        }
        reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
        reader.readAsText(file)
    })
}

function fmtDate(iso: string | null): string {
    if (!iso) return '—'
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

function display(v: string | number | null): string {
    return v === null || v === undefined ? '' : String(v)
}

/** A mismatched string value, common-prefix/suffix collapsed around the differing
 *  middle — the "first differing position" the spec asks for. Numbers and short
 *  values just render as plain text (nothing to collapse). */
function ValueDiff({ annotationValue, exportValue, kind }: { annotationValue: string | number | null; exportValue: string | number | null; kind: 'string' | 'number' }) {
    if (kind === 'number' || annotationValue === null || exportValue === null) {
        return (
            <div className="grid grid-cols-2 gap-2">
                <div className="text-[11px]"><span className="text-gray-400">annotation.json:</span> <span className="font-mono text-gray-800">{display(annotationValue) || '—'}</span></div>
                <div className="text-[11px]"><span className="text-gray-400">export:</span> <span className="font-mono text-gray-800">{display(exportValue) || '—'}</span></div>
            </div>
        )
    }
    const d = diffStrings(String(annotationValue), String(exportValue))
    const short = d.prefix.length + d.suffix.length > 160
    const prefix = short ? '…' + d.prefix.slice(-40) : d.prefix
    const suffix = short ? d.suffix.slice(0, 40) + '…' : d.suffix
    return (
        <div className="space-y-1.5">
            <div className="text-[11px] leading-relaxed">
                <span className="text-gray-400 font-semibold">annotation.json: </span>
                <span className="text-gray-500">{prefix}</span>
                <mark className="bg-red-100 text-red-800 rounded-[2px] px-0.5">{d.annotationMid || '∅'}</mark>
                <span className="text-gray-500">{suffix}</span>
            </div>
            <div className="text-[11px] leading-relaxed">
                <span className="text-gray-400 font-semibold">export: </span>
                <span className="text-gray-500">{prefix}</span>
                <mark className="bg-emerald-100 text-emerald-800 rounded-[2px] px-0.5">{d.exportMid || '∅'}</mark>
                <span className="text-gray-500">{suffix}</span>
            </div>
        </div>
    )
}

function FieldRowView({ row }: { row: FieldRow }) {
    return (
        <div className="px-3 py-2 border-t border-gray-100 first:border-t-0">
            <div className="text-[11.5px] font-semibold text-gray-800 mb-1">{row.label}</div>
            {row.status === 'missing_export' && (
                <div className="text-[11px] text-amber-700">missing in export{row.annotationValue !== null && <> — annotation.json has <span className="font-mono">{display(row.annotationValue)}</span></>}</div>
            )}
            {row.status === 'missing_annotation' && (
                <div className="text-[11px] text-amber-700">missing in annotation.json{row.exportValue !== null && <> — export has <span className="font-mono">{display(row.exportValue)}</span></>}</div>
            )}
            {row.status === 'mismatch' && <ValueDiff annotationValue={row.annotationValue} exportValue={row.exportValue} kind={row.kind} />}
        </div>
    )
}

function Section({ title, count, tone, defaultOpen, children }: {
    title: string; count: number; tone: 'red' | 'amber' | 'gray' | 'blue'; defaultOpen: boolean; children: React.ReactNode
}) {
    const [open, setOpen] = useState(defaultOpen)
    const toneCls = {
        red: 'text-red-700 bg-red-50 border-red-200',
        amber: 'text-amber-700 bg-amber-50 border-amber-200',
        gray: 'text-gray-600 bg-gray-50 border-gray-200',
        blue: 'text-blue-700 bg-blue-50 border-blue-200',
    }[tone]
    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
            <button onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left ${toneCls}`}>
                <ChevronDown size={13} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
                <span className="text-[12px] font-semibold flex-1">{title}</span>
                <span className="text-[11px] font-mono">{count}</span>
            </button>
            {open && <div className="bg-white">{children}</div>}
        </div>
    )
}

export default function VerifyModal({
    annotationVersion, snapshot, onClose,
    exportRaw, fileName, onExportLoaded,
    rubricIndexBase, onRubricIndexBaseChange,
}: {
    annotationVersion: number
    snapshot: AnnotationSnapshot
    onClose: () => void
    /**
     * The loaded export and the rubric-numbering setting — owned by TaskEditor, not
     * this component, so closing and reopening the panel (this component unmounting
     * and remounting) doesn't lose them. Only leaving the task or refreshing the page
     * does, same as every other field in this editor.
     */
    exportRaw: any
    fileName: string
    onExportLoaded: (raw: any, fileName: string) => void
    rubricIndexBase: number
    onRubricIndexBaseChange: (base: number) => void
}) {
    const [busy, setBusy] = useState(false)
    const [err, setErr] = useState('')
    const [copied, setCopied] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    // Re-run automatically whenever the selected version changes while the panel is
    // open — `snapshot` is a new object each time the parent's selectedVersionIdx
    // changes, so this effect re-fires without the user re-uploading anything. Same
    // for rubricIndexBase, changed via the toggle below.
    const result: VerifyResult | null = useMemo(() => {
        if (!exportRaw) return null
        return verifyExportAgainstAnnotation(exportRaw, snapshot, { rubricIndexBase })
    }, [exportRaw, snapshot, rubricIndexBase])

    const onPick = async (file: File) => {
        setErr('')
        setBusy(true)
        try {
            const parsed = await readJson(file)
            onExportLoaded(parsed, file.name)
        } catch (e: any) {
            setErr(e?.message || 'Could not read that file.')
        } finally {
            setBusy(false)
            if (fileRef.current) fileRef.current.value = ''
        }
    }

    const copyReport = () => {
        if (!result) return
        try { navigator.clipboard?.writeText(buildReportText(result, annotationVersion)) } catch { /* ignore */ }
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
    }

    const mismatched = result?.rows.filter(r => r.status === 'mismatch') || []
    const missing = result?.rows.filter(r => r.status === 'missing_export' || r.status === 'missing_annotation') || []
    const matched = result?.rows.filter(r => r.status === 'match') || []

    // Width — draggable from the panel's left edge, clamped to [MIN_WIDTH, 95vw],
    // remembered across opens.
    const [width, setWidth] = useState(DEFAULT_WIDTH)
    useEffect(() => { setWidth(loadWidth()) }, [])
    const resizing = useRef(false)
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!resizing.current) return
            const next = Math.min(Math.max(window.innerWidth - e.clientX, MIN_WIDTH), window.innerWidth * 0.95)
            setWidth(next)
        }
        const onUp = () => {
            if (!resizing.current) return
            resizing.current = false
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
            try { localStorage.setItem(WIDTH_KEY, String(width)) } catch { /* ignore */ }
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    }, [width])
    const startResize = () => {
        resizing.current = true
        document.body.style.cursor = 'ew-resize'
        document.body.style.userSelect = 'none'
    }

    // Escape closes it, same as clicking the X — there's no backdrop to click through
    // to, since this docks beside the page rather than blocking it.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    return (
        <div className="relative shrink-0 bg-white border-l border-gray-200 shadow-2xl flex flex-col"
            style={{ width, maxWidth: '95vw' }}>
            <div onMouseDown={startResize} title="Drag to resize"
                className="absolute left-0 top-0 bottom-0 w-1.5 -ml-0.5 cursor-ew-resize hover:bg-indigo-300 active:bg-indigo-400 z-10" />

            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50 shrink-0">
                <ShieldAlert size={15} className="text-indigo-500 shrink-0" />
                <span className="text-[12.5px] font-semibold text-gray-800">Verify export against annotation.json v{annotationVersion}</span>
                <div className="flex-1" />
                {result && (
                    <button onClick={copyReport}
                        className="flex items-center gap-1 text-[11px] border border-gray-300 rounded px-2 py-1 text-gray-600 hover:bg-gray-100">
                        {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />} {copied ? 'Copied' : 'Copy report'}
                    </button>
                )}
                <button onClick={onClose} className="text-gray-400 hover:text-gray-700 ml-1"><X size={16} /></button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3">
                    {/* Picker / export meta */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <input ref={fileRef} type="file" accept="application/json,.json" hidden
                            onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f) }} />
                        <button onClick={() => fileRef.current?.click()} disabled={busy}
                            className="flex items-center gap-1 text-[12px] font-semibold bg-indigo-600 text-white rounded-md px-3 py-1.5 hover:bg-indigo-700 disabled:opacity-40">
                            {busy ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />} {exportRaw ? 'Replace export file' : 'Load Studio export'}
                        </button>
                        {fileName && <span className="text-[11px] text-gray-500 font-mono truncate max-w-[280px]" title={fileName}>{fileName}</span>}

                        <div className="flex items-center gap-1.5 ml-auto">
                            <span className="text-[11px] text-gray-500" title="Affects only which task_verifiers[] entry (and so which criteria) counts as verifier N when matching it to a rubric row. field_ta_rubric_NN_* field names, dimensions, final scores, pairwise evaluation and everything else are keyed by their own fixed names/indexes and never shift. Studio's verifier_index starts from 0 on some exports and 1 on others, with nothing in the file to tell them apart, so this has to be set by hand.">
                                Export rubric numbering starts at
                            </span>
                            <div className="flex items-center gap-0.5 bg-gray-100 rounded-md p-0.5">
                                {[0, 1].map(n => (
                                    <button key={n} onClick={() => onRubricIndexBaseChange(n)}
                                        className={`px-2.5 py-0.5 rounded text-[11px] font-semibold ${rubricIndexBase === n ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    {rubricIndexBase !== 1 && (
                        <div className="text-[10.5px] text-amber-700">
                            Adjusted: export verifier_index {rubricIndexBase} is being matched to annotation.json's rubric 1 (and so on from there) for the criteria comparison only.
                            field_ta_rubric_NN_* field names stay keyed by each rubric's own index — unaffected, same as dimensions and every other field.
                        </div>
                    )}
                    {err && <div className="px-3 py-1.5 bg-red-50 text-red-700 text-[11px] border border-red-200 rounded">{err}</div>}

                    {!result ? (
                        <div className="text-center py-14 text-gray-400">
                            <ShieldAlert size={22} className="mx-auto mb-2 text-gray-300" />
                            <div className="text-[13px] font-semibold text-gray-600 mb-1">No export loaded yet</div>
                            <div className="text-[12px]">Load a <code className="font-mono">task-export-…json</code> file to compare it against v{annotationVersion}.</div>
                        </div>
                    ) : (
                        <>
                            <div className="text-[11.5px] text-gray-500 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <div><span className="text-gray-400">Task:</span> {result.exportMeta.taskName || '—'}</div>
                                <div><span className="text-gray-400">task_version:</span> {result.exportMeta.taskVersion ?? '—'}</div>
                                <div><span className="text-gray-400">export updated_at:</span> {fmtDate(result.exportMeta.updatedAt)}</div>
                            </div>

                            <div className="text-[13px] font-semibold text-gray-800">
                                {result.summary.matched} of {result.summary.total} fields match — {result.summary.mismatched} mismatched — {result.summary.missing} missing
                            </div>

                            {!result.countCheck.consistent && (
                                <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-300 rounded-lg text-[11.5px] text-red-800">
                                    <FileWarning size={14} className="shrink-0 mt-0.5" />
                                    <div>
                                        <b>Rubric count mismatch</b> — field_rubric_count says {result.countCheck.fieldRubricCount ?? '—'},
                                        the export has {result.countCheck.verifierCount} task_verifiers, but annotation.json v{annotationVersion} has {result.countCheck.annotationRubricCount} rubric rows.
                                        Rows were likely added or removed.
                                    </div>
                                </div>
                            )}

                            <Section title="Mismatched" count={mismatched.length} tone="red" defaultOpen={mismatched.length > 0}>
                                {mismatched.length
                                    ? mismatched.map(r => <FieldRowView key={r.key} row={r} />)
                                    : <div className="px-3 py-3 text-[11.5px] text-gray-400 italic">No mismatches.</div>}
                            </Section>

                            <Section title="Missing (present on only one side)" count={missing.length} tone="amber" defaultOpen={missing.length > 0}>
                                {missing.length
                                    ? missing.map(r => <FieldRowView key={r.key} row={r} />)
                                    : <div className="px-3 py-3 text-[11.5px] text-gray-400 italic">Nothing missing.</div>}
                            </Section>

                            <Section title="Matched" count={matched.length} tone="gray" defaultOpen={false}>
                                <div className="px-3 py-2 flex flex-wrap gap-x-3 gap-y-1">
                                    {matched.map(r => (
                                        <span key={r.key} title={`annotation.json: ${display(r.annotationValue)}`}
                                            className="text-[10.5px] text-gray-500 font-mono">{r.label}</span>
                                    ))}
                                </div>
                            </Section>

                            <Section title="Not verifiable from the export — check these manually in Studio" count={result.unverifiable.length} tone="blue" defaultOpen>
                                <div className="px-1 py-1">
                                    {result.unverifiable.map(u => (
                                        <div key={u.key} className="flex items-start gap-2 px-2 py-1.5 border-t border-gray-100 first:border-t-0 text-[11.5px] text-gray-700">
                                            <AlertTriangle size={12} className="text-blue-400 shrink-0 mt-0.5" />
                                            {u.label}
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        </>
                    )}
            </div>
        </div>
    )
}
