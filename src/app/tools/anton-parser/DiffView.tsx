'use client'

/* ------------------------------------------------------------------ *
 * Unified-diff parser + GitHub-style renderer.
 *
 * Reads the `agent_a.patch` / `agent_b.patch` files as git produced them
 * (`diff --git`, `---`/`+++`, `@@` hunks) and renders one collapsible
 * card per file: a line-number gutter, deleted lines in red, added lines
 * in green, and runs of untouched context folded behind a
 * "N unmodified lines" bar that expands on click.
 * ------------------------------------------------------------------ */

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, FileDiff } from 'lucide-react'
import { DiffFile, DiffLine, hunkRows, looksLikeDiff, parseDiff, Row } from './diff'

export * from './diff'

function LineRow({ line }: { line: DiffLine }) {
    const bg = line.type === 'add' ? 'bg-[#E6FFEC]' : line.type === 'del' ? 'bg-[#FFEBE9]' : 'bg-white'
    const numColor = line.type === 'add' ? 'text-[#1A7F37]' : line.type === 'del' ? 'text-[#CF222E]' : 'text-gray-400'
    const marker = line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '
    const markerColor = line.type === 'add' ? 'text-[#1A7F37]' : 'text-[#CF222E]'
    return (
        <div className={`flex font-mono text-[11.5px] leading-[1.6] ${bg}`}>
            <span className={`select-none shrink-0 w-12 text-right pr-2 ${numColor}`}>{line.num ?? ''}</span>
            <span className={`select-none shrink-0 w-3 ${markerColor}`}>{marker}</span>
            <span className="whitespace-pre-wrap break-words pr-3 text-gray-800">{line.text || ' '}</span>
        </div>
    )
}

function FoldRow({ row }: { row: Extract<Row, { kind: 'fold' }> }) {
    const [open, setOpen] = useState(false)
    if (open) return <>{row.lines.map((line, i) => <LineRow key={i} line={line} />)}</>
    return (
        <div onClick={() => setOpen(true)} title="Show these lines"
            className="bg-[#F6F8FA] border-y border-gray-200 text-[11px] text-gray-500 px-4 py-1.5 cursor-pointer hover:bg-[#EEF1F5]">
            {row.count} unmodified line{row.count === 1 ? '' : 's'}
        </div>
    )
}

const STATUS_STYLE: Record<DiffFile['status'], string> = {
    added: 'bg-[#DAFBE1] text-[#1A7F37] border-[#B6EFC4]',
    deleted: 'bg-[#FFEBE9] text-[#CF222E] border-[#FFCECB]',
    renamed: 'bg-[#DDF4FF] text-[#0969DA] border-[#B6E3FF]',
    modified: 'bg-gray-100 text-gray-600 border-gray-200',
    binary: 'bg-gray-100 text-gray-600 border-gray-200',
}

function FileCard({ file }: { file: DiffFile }) {
    const [collapsed, setCollapsed] = useState(false)
    const rows = useMemo(() => file.hunks.map(h => ({ header: h.header, rows: hunkRows(h) })), [file])

    return (
        <div className="border border-gray-200 rounded-md overflow-hidden mb-3 bg-white">
            <div onClick={() => setCollapsed(c => !c)}
                className="flex items-center gap-2 px-3 py-2 bg-[#F6F8FA] border-b border-gray-200 cursor-pointer select-none hover:bg-[#EEF1F5]">
                {collapsed ? <ChevronRight size={13} className="text-gray-500 shrink-0" /> : <ChevronDown size={13} className="text-gray-500 shrink-0" />}
                <FileDiff size={13} className="text-[#0969DA] shrink-0" />
                <span className="font-mono text-[12px] text-gray-800 break-all">
                    {file.status === 'renamed' && file.oldPath && file.oldPath !== file.path
                        ? <>{file.oldPath} <span className="text-gray-400">→</span> {file.path}</>
                        : file.path}
                </span>
                {file.status !== 'modified' && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border capitalize ${STATUS_STYLE[file.status]}`}>
                        {file.status}
                    </span>
                )}
                <span className="ml-auto shrink-0 font-mono text-[11px]">
                    <span className="text-[#CF222E]">-{file.deletions}</span>{' '}
                    <span className="text-[#1A7F37]">+{file.additions}</span>
                </span>
            </div>

            {!collapsed && (
                file.status === 'binary' ? (
                    <div className="px-4 py-3 text-[11.5px] text-gray-500 italic">Binary file not shown.</div>
                ) : !file.hunks.length ? (
                    <div className="px-4 py-3 text-[11.5px] text-gray-500 italic">No content changes recorded for this file.</div>
                ) : (
                    <div className="overflow-x-auto">
                        {rows.map((h, hi) => (
                            <div key={hi}>
                                {hi > 0 && (
                                    <div className="bg-[#F6F8FA] border-y border-gray-200 text-[11px] font-mono text-gray-400 px-4 py-1.5">
                                        {h.header}
                                    </div>
                                )}
                                {h.rows.map((row, ri) =>
                                    row.kind === 'fold'
                                        ? <FoldRow key={ri} row={row} />
                                        : row.kind === 'hunk'
                                            ? null
                                            : <LineRow key={ri} line={row.line} />,
                                )}
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    )
}

/**
 * Renders a patch. `label` names the source in the "not a diff" message,
 * the way the annotation tool reports an unrenderable field.
 */
export default function DiffView({ patch, label }: { patch: string | null; label: string }) {
    const parsed = useMemo(() => (patch && looksLikeDiff(patch) ? parseDiff(patch) : null), [patch])

    if (!patch || !patch.trim()) {
        return <div className="text-[12px] text-gray-400 italic py-6">No patch loaded.</div>
    }
    if (!parsed || !parsed.files.length) {
        return (
            <div className="text-[12.5px] text-gray-600 leading-relaxed py-4">
                The value on <span className="font-mono text-gray-800">{label}</span> is not a unified diff, so there is
                nothing to render. Expected <span className="font-mono">git diff</span> output
                (<span className="font-mono">diff --git</span>, <span className="font-mono">---/+++</span>, or{' '}
                <span className="font-mono">@@</span> hunk headers).
            </div>
        )
    }

    return (
        <div>
            <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="text-[11px] text-gray-600 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
                    {parsed.files.length} file{parsed.files.length === 1 ? '' : 's'} changed
                </span>
                <span className="text-[11px] font-semibold text-[#1A7F37] bg-[#DAFBE1] border border-[#B6EFC4] rounded-full px-2.5 py-0.5">
                    +{parsed.additions}
                </span>
                <span className="text-[11px] font-semibold text-[#CF222E] bg-[#FFEBE9] border border-[#FFCECB] rounded-full px-2.5 py-0.5">
                    −{parsed.deletions}
                </span>
            </div>
            {parsed.files.map((f, i) => <FileCard key={`${f.path}-${i}`} file={f} />)}
        </div>
    )
}
