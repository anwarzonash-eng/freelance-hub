'use client'

/* ------------------------------------------------------------------ *
 * Task tab — the standalone trajectory_viewer.html ported into the
 * Anton Parser task editor.
 *
 * Same feature set as that page: pick a model, then read its run as
 * PROMPT / FINAL ANSWER / DIFF / LOGS accordions, where LOGS is the
 * assistant turns rebuilt into "Step N" cards carrying their tool calls
 * with input and output — searchable, collapsible, copyable.
 *
 * Two views per model: the parsed view above, built at render time from
 * the stored model_?_log.json, and the markdown transcript from
 * model_?_log.md when that file has been uploaded too.
 * ------------------------------------------------------------------ */

import { ReactNode, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Copy, Check, Search, Pencil, FileJson } from 'lucide-react'
import DiffView from './DiffView'
import UploadFilesButton from './UploadFilesButton'
import { renderMarkdown } from './markdown'
import { Side, SIDES, SIDE_LABEL, TrajectoryFilesState } from './trajectoryFiles'
import { buildSteps, getFinalAnswerText, getPromptText, Step } from './trajectory'

/* ------------------------------------------------------------------ *
 * Small UI atoms
 * ------------------------------------------------------------------ */

function copyText(text: string) {
    try { navigator.clipboard?.writeText(text ?? '') } catch { /* ignore */ }
}

function CopyBtn({ text, label = 'copy', stopPropagation }: { text: string; label?: string; stopPropagation?: boolean }) {
    const [copied, setCopied] = useState(false)
    return (
        <button type="button" title="Copy"
            onClick={e => {
                if (stopPropagation) e.stopPropagation()
                copyText(text); setCopied(true); setTimeout(() => setCopied(false), 900)
            }}
            className="flex items-center gap-1 text-[11px] opacity-70 hover:opacity-100 shrink-0">
            {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? 'copied' : label}
        </button>
    )
}

/** Wraps every case-insensitive hit of `query` in a <mark>, as the viewer did. */
function Highlighted({ text, query }: { text: string; query: string }) {
    const value = String(text ?? '')
    const nodes = useMemo<ReactNode[]>(() => {
        if (!query) return [value]
        let re: RegExp
        try { re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig') } catch { return [value] }
        const out: ReactNode[] = []
        let last = 0
        let m: RegExpExecArray | null
        let k = 0
        while ((m = re.exec(value)) !== null) {
            if (m[0] === '') { re.lastIndex++; continue }
            if (m.index > last) out.push(value.slice(last, m.index))
            out.push(<mark key={k++} className="bg-[#FDE68A] rounded-[2px] px-[1px]">{m[0]}</mark>)
            last = m.index + m[0].length
        }
        out.push(value.slice(last))
        return out
    }, [value, query])
    return <>{nodes}</>
}

const LINE_LIMIT = 14

/** Text block truncated to `limit` lines with a "Show N more lines" reveal. */
function TextBlock({ text, query, limit = LINE_LIMIT, mono = true }: {
    text: string; query: string; limit?: number; mono?: boolean
}) {
    const [expanded, setExpanded] = useState(false)
    const full = String(text ?? '')
    const lines = full.split('\n')
    const truncated = !expanded && lines.length > limit
    const shown = truncated ? lines.slice(0, limit).join('\n') : full
    return (
        <>
            <pre className={`m-0 whitespace-pre-wrap break-words text-[#1F2430] ${mono
                ? 'font-mono text-[12px] leading-[1.5]'
                : 'font-sans text-[12.5px] leading-[1.6]'}`}>
                <Highlighted text={shown} query={query} />
            </pre>
            {truncated && (
                <span onClick={() => setExpanded(true)}
                    className="inline-block mt-1 text-[11.5px] font-semibold text-[#6C4CE0] cursor-pointer hover:underline">
                    Show {lines.length - limit} more lines
                </span>
            )}
        </>
    )
}

/** PROMPT / FINAL ANSWER / DIFF / LOGS accordion shell. */
function Section({ title, sub, copyValue, collapsed, onToggle, children }: {
    title: string
    sub?: string
    copyValue?: string
    collapsed: boolean
    onToggle: () => void
    children: ReactNode
}) {
    return (
        <div className="bg-white border border-[#E5E7EB] rounded-[10px] mb-3.5 overflow-hidden">
            <div onClick={onToggle}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-[#F5F5F7] hover:bg-[#EFEFF2] cursor-pointer select-none">
                <ChevronDown size={13} className={`text-[#6B7280] transition-transform ${collapsed ? '-rotate-90' : ''}`} />
                <span className="text-[11.5px] font-bold tracking-[0.05em] uppercase text-[#4B5563]">{title}</span>
                {sub && <span className="text-[11.5px] text-[#6B7280]">{sub}</span>}
                {copyValue !== undefined && (
                    <span className="ml-auto text-[#4B5563]"><CopyBtn text={copyValue} stopPropagation /></span>
                )}
            </div>
            {!collapsed && <div className="p-3.5">{children}</div>}
        </div>
    )
}

/* ------------------------------------------------------------------ *
 * LOGS — one card per assistant turn
 * ------------------------------------------------------------------ */

function StepCard({ step, query, collapsed, onToggle }: {
    step: Step; query: string; collapsed: boolean; onToggle: () => void
}) {
    const toolCount = step.items.filter(i => i.kind === 'tool').length
    return (
        <div className="bg-white border border-[#E5E7EB] rounded-[10px] mb-3 overflow-hidden">
            <div onClick={onToggle}
                className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer select-none hover:bg-[#FAFAFC]">
                <ChevronDown size={14} className={`text-[#6B7280] shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
                <span className="font-mono text-[11.5px] text-[#6B7280] min-w-[34px] shrink-0">{step.num}.0</span>
                <span className="w-5 h-5 rounded-[5px] bg-[#EAF1FF] text-[#6C4CE0] flex items-center justify-center shrink-0">
                    <Pencil size={11} />
                </span>
                <span className="text-[13px] font-semibold text-[#1F2430]">
                    <Highlighted text={step.header} query={query} />
                </span>
                <span className="ml-auto text-[11px] text-[#6B7280] shrink-0 pl-2">{toolCount} tool call(s)</span>
            </div>

            {!collapsed && (
                <div className="pl-10 pr-3.5 pb-3.5">
                    {step.items.map((item, i) => {
                        const isLast = i === step.items.length - 1
                        return (
                            <div key={i}
                                className={`relative ml-0.5 py-2 pl-[18px] border-l-2 ${isLast ? 'border-transparent' : 'border-[#EDEAFB]'}`}>
                                <span className="absolute -left-[5px] top-3.5 w-2 h-2 rounded-full bg-white border-2 border-[#6C4CE0]" />
                                {item.kind === 'response' ? (
                                    <>
                                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                            <span className="font-mono text-[11px] text-[#6B7280] min-w-[52px]">{step.num}.{item.subIdx}</span>
                                            <span className="inline-flex items-center px-2 py-px rounded-full text-[10.5px] font-bold uppercase tracking-[0.02em] bg-[#DCFCE7] text-[#15803D]">response</span>
                                        </div>
                                        <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-[12.5px] leading-[1.55] whitespace-pre-wrap break-words">
                                            <Highlighted text={item.text || ''} query={query} />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                            <span className="font-mono text-[11px] text-[#6B7280] min-w-[52px]">{step.num}.{item.subIdx}</span>
                                            <span className="inline-flex items-center px-2 py-px rounded-full text-[10.5px] font-bold uppercase tracking-[0.02em] bg-[#EDE4FF] text-[#4F36B0]">tool_call</span>
                                            <span className="inline-flex items-center px-2 py-px rounded-full text-[10.5px] font-bold uppercase tracking-[0.02em] bg-[#F3F4F6] text-[#374151]">{item.toolName}</span>
                                            <span className="text-[12.5px] font-semibold text-[#1F2430]">Calling tool {item.toolName}</span>
                                        </div>
                                        <div className="rounded-lg border border-[#CFE0FF] bg-[#EAF1FF] mt-1.5 overflow-hidden">
                                            <div className="flex items-center justify-between px-2.5 py-1.5 text-[10.5px] font-bold tracking-[0.04em] uppercase text-[#1D4ED8]">
                                                Input <CopyBtn text={item.input || ''} />
                                            </div>
                                            <div className="px-2.5 pb-2.5"><TextBlock text={item.input || '{}'} query={query} /></div>
                                        </div>
                                        <div className="rounded-lg border border-[#DED2FB] bg-[#F1ECFE] mt-1.5 overflow-hidden">
                                            <div className="flex items-center justify-between px-2.5 py-1.5 text-[10.5px] font-bold tracking-[0.04em] uppercase text-[#4F36B0]">
                                                Output <CopyBtn text={item.output || ''} />
                                            </div>
                                            <div className="px-2.5 pb-2.5"><TextBlock text={item.output || ''} query={query} /></div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

/* ------------------------------------------------------------------ *
 * Parsed view of one trajectory
 * ------------------------------------------------------------------ */

function TrajectoryView({ side, data, patch }: { side: Side; data: any; patch: string | null }) {
    const steps = useMemo(() => buildSteps(data?.trajectory_messages || []), [data])
    const [query, setQuery] = useState('')
    const [collapsedSteps, setCollapsedSteps] = useState<Record<number, boolean>>({})
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

    const toggleSection = (id: string) => setCollapsedSections(s => ({ ...s, [id]: !s[id] }))

    const q = query.trim().toLowerCase()
    const visible = useMemo(() => steps.filter(step => {
        if (!q) return true
        const hay = [step.header, ...step.items.map(i => [i.text, i.input, i.output].filter(Boolean).join(' '))]
            .join(' ').toLowerCase()
        return hay.includes(q)
    }), [steps, q])

    const promptText = useMemo(() => getPromptText(data), [data])
    const finalText = useMemo(() => getFinalAnswerText(data), [data])

    const status = data?.trajectory_status || 'unknown'
    const messageCount = (data?.trajectory_messages || []).length

    return (
        <div>
            {/* Header — task, status and run metadata */}
            <div className="bg-white border border-[#E5E7EB] rounded-[10px] px-4 py-3 mb-3.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-[16px] font-bold text-[#1F2430]">
                        {data?.task_name || data?.task_id || 'Untitled task'}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${status === 'completed' ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#FEF3C7] text-[#B45309]'}`}>
                        {status}
                    </span>
                    <span className="text-[11px] text-[#6B7280]">({SIDE_LABEL[side]})</span>
                </div>
                <div className="mt-2 flex gap-[18px] flex-wrap text-[12.5px] text-[#6B7280]">
                    <span><b className="text-[#1F2430] font-semibold">{data?.agent_name || data?.agent_id || '-'}</b> agent</span>
                    <span>world: <b className="text-[#1F2430] font-semibold">{data?.world_name || data?.world_id || '-'}</b></span>
                    <span>trajectory: <b className="text-[#1F2430] font-semibold">{data?.trajectory_id || '-'}</b></span>
                    <span>messages: <b className="text-[#1F2430] font-semibold">{messageCount}</b></span>
                    <span>created: <b className="text-[#1F2430] font-semibold">{data?.created_at ? new Date(data.created_at).toLocaleString() : '-'}</b></span>
                </div>
            </div>

            {/* PROMPT */}
            <Section title="PROMPT" copyValue={promptText}
                collapsed={!!collapsedSections.prompt} onToggle={() => toggleSection('prompt')}>
                <div className="text-[11px] font-bold uppercase text-[#6B7280] mb-1.5">User</div>
                <TextBlock text={promptText} query="" limit={20} mono={false} />
            </Section>

            {/* FINAL ANSWER */}
            <Section title="FINAL ANSWER" copyValue={finalText}
                collapsed={!!collapsedSections.final} onToggle={() => toggleSection('final')}>
                <div className="text-[12.5px] leading-[1.6] whitespace-pre-wrap break-words">{finalText}</div>
            </Section>

            {/* DIFF — the patch this run produced; uploaded as agent_?.patch and
                shown in full on the Solution tab. */}
            <Section title="DIFF" sub={`(agent_${side}.patch)`}
                collapsed={!!collapsedSections.diff} onToggle={() => toggleSection('diff')}>
                {patch
                    ? <DiffView patch={patch} label={`field_patch_${side}`} />
                    : (
                        <div className="text-[11.5px] text-[#6B7280] bg-[#FAFAF5] border border-dashed border-[#E5E7EB] rounded-md px-2.5 py-2">
                            No patch loaded for {SIDE_LABEL[side]}. Upload <code>agent_{side}.patch</code> with the picker
                            above — it lands here and on the Solution tab.
                        </div>
                    )}
            </Section>

            {/* LOGS */}
            <Section title="LOGS" sub={`(${steps.length} steps)`}
                collapsed={!!collapsedSections.logs} onToggle={() => toggleSection('logs')}>
                <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
                    <div className="relative flex-1 min-w-[220px] max-w-[420px]">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search logs..."
                            className="w-full pl-[30px] pr-2.5 py-1.5 border border-[#E5E7EB] rounded-md text-[12.5px] outline-none focus:border-[#6C4CE0]" />
                    </div>
                    <button onClick={() => setCollapsedSteps(Object.fromEntries(steps.map(s => [s.num, true])))}
                        className="px-2.5 py-1.5 border border-[#E5E7EB] bg-white rounded-md text-[12px] text-[#1F2430] hover:bg-[#F3F4F6]">
                        Collapse all
                    </button>
                    <button onClick={() => setCollapsedSteps({})}
                        className="px-2.5 py-1.5 border border-[#E5E7EB] bg-white rounded-md text-[12px] text-[#1F2430] hover:bg-[#F3F4F6]">
                        Expand all
                    </button>
                    <span className="ml-auto text-[12px] text-[#6B7280]">{visible.length} / {steps.length} step(s)</span>
                </div>

                {visible.length === 0 ? (
                    <div className="text-center py-12 text-[#6B7280]">
                        <div className="text-[15px] font-semibold text-[#1F2430]">No matching steps</div>
                    </div>
                ) : visible.map(step => (
                    <StepCard key={step.num} step={step} query={q}
                        collapsed={!!collapsedSteps[step.num]}
                        onToggle={() => setCollapsedSteps(s => ({ ...s, [step.num]: !s[step.num] }))} />
                ))}
            </Section>
        </div>
    )
}

/* ------------------------------------------------------------------ *
 * Markdown view of one trajectory (model_?_log.md)
 * ------------------------------------------------------------------ */

function MarkdownView({ side, md }: { side: Side; md: string | null }) {
    const [raw, setRaw] = useState(false)
    const html = useMemo(() => (md ? renderMarkdown(md) : ''), [md])

    if (!md) {
        return (
            <div className="text-center py-20 text-[#6B7280]">
                <div className="text-[15px] font-semibold text-[#1F2430] mb-1.5">No markdown transcript</div>
                <div className="text-[12.5px]">
                    Upload <code>model_{side}_log.md</code> with the picker above to read this run as a document.
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white border border-[#E5E7EB] rounded-[10px] overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 py-2 bg-[#F5F5F7] border-b border-[#E5E7EB]">
                <span className="text-[11.5px] font-bold tracking-[0.05em] uppercase text-[#4B5563]">Markdown transcript</span>
                <span className="text-[11px] font-mono text-[#6B7280]">model_{side}_log.md</span>
                <div className="ml-auto flex items-center gap-3">
                    <button onClick={() => setRaw(r => !r)}
                        className="text-[11px] border border-[#E5E7EB] bg-white rounded px-2 py-0.5 text-[#4B5563] hover:bg-gray-50">
                        {raw ? 'Rendered' : 'Raw'}
                    </button>
                    <CopyBtn text={md} />
                </div>
            </div>
            <div className="p-4 max-h-[75vh] overflow-y-auto">
                {raw
                    ? <pre className="m-0 font-mono text-[11.5px] leading-[1.55] whitespace-pre-wrap break-words text-[#1F2430]">{md}</pre>
                    : <div className="text-[12.5px] text-gray-700" dangerouslySetInnerHTML={{ __html: html }} />}
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ *
 * Task tab
 * ------------------------------------------------------------------ */

type ViewMode = 'parsed' | 'markdown'

export default function TaskTab({ files, onFiles, busy }: {
    files: TrajectoryFilesState
    onFiles: (list: File[]) => void
    busy?: boolean
}) {
    const logs: Record<Side, any> = { a: files.trajectory_a, b: files.trajectory_b }
    const mds: Record<Side, string | null> = { a: files.md_a, b: files.md_b }
    const patches: Record<Side, string | null> = { a: files.patch_a, b: files.patch_b }

    const [active, setActive] = useState<Side>(!files.trajectory_a && files.trajectory_b ? 'b' : 'a')
    const [view, setView] = useState<ViewMode>('parsed')

    // Follow the side that actually has something loaded.
    useEffect(() => {
        const other: Side = active === 'a' ? 'b' : 'a'
        const has = (s: Side) => !!logs[s] || !!mds[s]
        if (!has(active) && has(other)) setActive(other)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [files.trajectory_a, files.trajectory_b, files.md_a, files.md_b])

    const anyLoaded = SIDES.some(s => logs[s] || mds[s])

    return (
        <div className="bg-[#FAFAFB] -m-4 p-4 min-h-full">
            {/* Top bar — brand, crumb and the one picker */}
            <div className="bg-white border border-[#E5E7EB] rounded-[10px] px-4 py-2.5 mb-3.5 flex items-center gap-2.5 flex-wrap">
                <span className="text-[14px] font-bold text-[#4F36B0]">● Trajectory Viewer</span>
                <span className="text-[13px] text-[#6B7280]">
                    {anyLoaded ? <b className="text-[#1F2430] font-semibold">{SIDE_LABEL[active]}</b> : 'No file loaded'}
                </span>
                <div className="ml-auto">
                    <UploadFilesButton onFiles={onFiles} busy={busy}
                        label={anyLoaded ? 'Upload / replace files' : 'Upload files'} />
                </div>
            </div>

            {/* Model A / Model B, then the view for that model */}
            {anyLoaded && (
                <div className="flex items-center gap-[22px] px-3.5 mb-3.5 border border-[#E5E7EB] bg-white rounded-[10px]">
                    {SIDES.map(s => (
                        <div key={s} onClick={() => setActive(s)}
                            className={`px-0.5 py-3 text-[13.5px] font-semibold cursor-pointer border-b-2 ${active === s
                                ? 'text-[#6C4CE0] border-[#6C4CE0]'
                                : 'text-[#6B7280] border-transparent hover:text-[#4F36B0]'}`}>
                            {SIDE_LABEL[s]}
                            {!logs[s] && !mds[s] && <span className="ml-1 text-[10px] font-normal text-gray-300">not loaded</span>}
                        </div>
                    ))}
                    <div className="ml-auto flex items-center gap-1 py-2">
                        {([['parsed', 'Parsed logs'], ['markdown', 'Markdown']] as [ViewMode, string][]).map(([key, label]) => (
                            <button key={key} onClick={() => setView(key)}
                                className={`text-[11.5px] font-semibold px-2.5 py-1 rounded ${view === key
                                    ? 'bg-[#6C4CE0] text-white'
                                    : 'text-[#6B7280] hover:bg-gray-100'}`}>
                                {label}
                                {key === 'markdown' && !mds[active] && <span className="ml-1 font-normal opacity-60">—</span>}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {!anyLoaded ? (
                <div className="text-center py-[90px] text-[#6B7280]">
                    <FileJson size={22} className="mx-auto mb-2 text-gray-300" />
                    <div className="text-[15px] font-semibold text-[#1F2430] mb-1.5">No trajectory loaded</div>
                    <div className="text-[12.5px]">
                        Click <span className="font-semibold text-[#6C4CE0]">Upload files</span> above and pick{' '}
                        <code>model_a_log.json</code>, <code>model_b_log.json</code>, <code>model_a_log.md</code>,{' '}
                        <code>model_b_log.md</code>, <code>agent_a.patch</code>, <code>agent_b.patch</code> — all at once
                        or a few at a time.
                    </div>
                    <div className="text-[11.5px] mt-1">
                        Each file is filed by its name, and stored on this task so it is still here next time.
                    </div>
                </div>
            ) : view === 'markdown' ? (
                <MarkdownView key={`md-${active}`} side={active} md={mds[active]} />
            ) : logs[active] ? (
                <TrajectoryView key={`json-${active}`} side={active} data={logs[active]} patch={patches[active]} />
            ) : (
                <div className="text-center py-[90px] text-[#6B7280]">
                    <div className="text-[15px] font-semibold text-[#1F2430] mb-1.5">No {SIDE_LABEL[active]} log</div>
                    <div className="text-[12.5px]">Upload <code>model_{active}_log.json</code> to read this run parsed.</div>
                </div>
            )}
        </div>
    )
}
