'use client'

/* ------------------------------------------------------------------ *
 * "Verify" modal — pick a Studio export (task-export-*.json), compare
 * it field by field against the currently selected annotation.json
 * version, and show mismatches/missing/matched, plus the fields Studio
 * simply never exports (check those manually).
 * ------------------------------------------------------------------ */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
    X, Upload, RefreshCw, Check, Copy, ChevronDown, AlertTriangle, ShieldAlert, FileWarning,
} from 'lucide-react'
import {
    AnnotationSnapshot, buildReportText, diffStrings, FieldRow,
    verifyExportAgainstAnnotation, VerifyResult,
} from './verify'

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

export default function VerifyModal({ annotationVersion, snapshot, onClose }: {
    annotationVersion: number
    snapshot: AnnotationSnapshot
    onClose: () => void
}) {
    const [exportRaw, setExportRaw] = useState<any>(null)
    const [fileName, setFileName] = useState('')
    const [busy, setBusy] = useState(false)
    const [err, setErr] = useState('')
    const [copied, setCopied] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    // Re-run automatically whenever the selected version changes while the modal is
    // open — `snapshot` is a new object each time the parent's selectedVersionIdx
    // changes, so this effect re-fires without the user re-uploading anything.
    const result: VerifyResult | null = useMemo(() => {
        if (!exportRaw) return null
        return verifyExportAgainstAnnotation(exportRaw, snapshot)
    }, [exportRaw, snapshot])

    const onPick = async (file: File) => {
        setErr('')
        setBusy(true)
        try {
            const parsed = await readJson(file)
            setExportRaw(parsed)
            setFileName(file.name)
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

    // Lock background scroll while open, same convention as the other modals here.
    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = '' }
    }, [])

    return (
        <div className="fixed inset-0 z-[9995] flex items-center justify-center bg-black/40"
            onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className="bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden"
                style={{ width: 760, maxWidth: '95vw', maxHeight: '92vh' }}>
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

                <div className="p-4 overflow-y-auto space-y-3">
                    {/* Picker / export meta */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <input ref={fileRef} type="file" accept="application/json,.json" hidden
                            onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f) }} />
                        <button onClick={() => fileRef.current?.click()} disabled={busy}
                            className="flex items-center gap-1 text-[12px] font-semibold bg-indigo-600 text-white rounded-md px-3 py-1.5 hover:bg-indigo-700 disabled:opacity-40">
                            {busy ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />} {exportRaw ? 'Replace export file' : 'Load Studio export'}
                        </button>
                        {fileName && <span className="text-[11px] text-gray-500 font-mono truncate max-w-[280px]" title={fileName}>{fileName}</span>}
                    </div>
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
        </div>
    )
}
