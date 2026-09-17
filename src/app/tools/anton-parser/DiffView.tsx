'use client'

/* ------------------------------------------------------------------ *
 * Unified-diff parser + GitHub-style renderer.
 *
 * Reads the `agent_a_solution.patch` / `agent_b_solution.patch` files as git produced them
 * (`diff --git`, `---`/`+++`, `@@` hunks) and renders one collapsible
 * card per file: a line-number gutter, deleted lines in red, added lines
 * in green, and runs of untouched context folded behind a
 * "N unmodified lines" bar that expands on click.
 *
 * A search box above the file list searches every line across every file
 * (including lines hidden behind a fold). Enter jumps to the next match:
 * collapses every file except the one the match is in, opens the fold it's
 * inside if any, and scrolls it into view — Enter again (Shift+Enter for
 * back) cycles through the rest, wrapping around.
 * ------------------------------------------------------------------ */

import { ReactNode, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, ChevronUp, FileDiff, Search } from 'lucide-react'
import { DiffFile, DiffLine, hunkRows, looksLikeDiff, parseDiff, Row } from './diff'

export * from './diff'

/** Wraps every case-insensitive hit of `query` in a <mark>, same convention as the
 *  Task tab's log viewer. */
function HighlightedText({ text, query }: { text: string; query: string }) {
    const value = text || ' '
    if (!query) return <>{value}</>
    let re: RegExp
    try { re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig') } catch { return <>{value}</> }
    const out: ReactNode[] = []
    let last = 0
    let m: RegExpExecArray | null
    let k = 0
    while ((m = re.exec(value)) !== null) {
        if (m[0] === '') { re.lastIndex++; continue }
        if (m.index > last) out.push(value.slice(last, m.index))
        out.push(<mark key={k++} className="bg-yellow-200 rounded-[2px] px-0.5">{m[0]}</mark>)
        last = m.index + m[0].length
    }
    if (!out.length) return <>{value}</>
    out.push(value.slice(last))
    return <>{out}</>
}

function LineRow({ line, id, query, isCurrent }: { line: DiffLine; id?: string; query?: string; isCurrent?: boolean }) {
    const bg = line.type === 'add' ? 'bg-[#E6FFEC]' : line.type === 'del' ? 'bg-[#FFEBE9]' : 'bg-white'
    const numColor = line.type === 'add' ? 'text-[#1A7F37]' : line.type === 'del' ? 'text-[#CF222E]' : 'text-gray-400'
    const marker = line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '
    const markerColor = line.type === 'add' ? 'text-[#1A7F37]' : 'text-[#CF222E]'
    return (
        <div id={id} className={`flex font-mono text-[11.5px] leading-[1.6] ${bg} ${isCurrent ? 'ring-2 ring-inset ring-orange-400' : ''}`}>
            <span className={`select-none shrink-0 w-12 text-right pr-2 ${numColor}`}>{line.num ?? ''}</span>
            <span className={`select-none shrink-0 w-3 ${markerColor}`}>{marker}</span>
            <span className="whitespace-pre-wrap break-words pr-3 text-gray-800">
                {query ? <HighlightedText text={line.text} query={query} /> : (line.text || ' ')}
            </span>
        </div>
    )
}

function FoldRow({ row, id, open, onToggle, query, activeMatchId }: {
    row: Extract<Row, { kind: 'fold' }>
    id: string
    open: boolean
    onToggle: () => void
    query: string
    activeMatchId: string | null
}) {
    if (open) {
        return (
            <>
                {row.lines.map((line, i) => {
                    const lineId = `${id}-${i}`
                    return <LineRow key={i} id={lineId} line={line} query={query} isCurrent={lineId === activeMatchId} />
                })}
            </>
        )
    }
    return (
        <div onClick={onToggle} title="Show these lines"
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

function FileCard({ file, fileIdx, hunks, collapsed, onToggle, query, activeMatchId, openFolds, onToggleFold }: {
    file: DiffFile
    fileIdx: number
    hunks: { header: string; rows: Row[] }[]
    collapsed: boolean
    onToggle: () => void
    query: string
    activeMatchId: string | null
    openFolds: Record<string, boolean>
    onToggleFold: (foldId: string) => void
}) {
    return (
        <div className="border border-gray-200 rounded-md overflow-hidden mb-3 bg-white">
            <div onClick={onToggle}
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
                        {hunks.map((h, hunkIdx) => (
                            <div key={hunkIdx}>
                                {hunkIdx > 0 && (
                                    <div className="bg-[#F6F8FA] border-y border-gray-200 text-[11px] font-mono text-gray-400 px-4 py-1.5">
                                        {h.header}
                                    </div>
                                )}
                                {h.rows.map((row, rowIdx) => {
                                    const id = `df-${fileIdx}-${hunkIdx}-${rowIdx}`
                                    return row.kind === 'fold'
                                        ? <FoldRow key={rowIdx} row={row} id={id} open={!!openFolds[id]}
                                            onToggle={() => onToggleFold(id)} query={query} activeMatchId={activeMatchId} />
                                        : row.kind === 'hunk'
                                            ? null
                                            : <LineRow key={rowIdx} id={id} line={row.line} query={query} isCurrent={id === activeMatchId} />
                                })}
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    )
}

interface MatchLoc { fileIdx: number; id: string; foldId?: string }

/**
 * Renders a patch. `label` names the source in the "not a diff" message,
 * the way the annotation tool reports an unrenderable field.
 */
export default function DiffView({ patch, label }: { patch: string | null; label: string }) {
    const parsed = useMemo(() => (patch && looksLikeDiff(patch) ? parseDiff(patch) : null), [patch])
    // Row data per file, computed once here (rather than inside FileCard) so the
    // search index below can be built from the same rows that get rendered.
    const filesData = useMemo(() => (parsed?.files ?? []).map(f => ({
        file: f,
        hunks: f.hunks.map(h => ({ header: h.header, rows: hunkRows(h) })),
    })), [parsed])

    // Per-file collapse overrides, keyed by index — absent means collapsed (the
    // default). Per-fold open state, keyed by the fold's own row id.
    const [collapsed, setCollapsed] = useState<Record<number, boolean>>({})
    const [openFolds, setOpenFolds] = useState<Record<string, boolean>>({})
    const [query, setQuery] = useState('')
    const [currentMatch, setCurrentMatch] = useState(-1)

    // A different patch (switching the A/B sub-tab, or a fresh upload) starts clean.
    useEffect(() => { setCollapsed({}); setOpenFolds({}); setQuery(''); setCurrentMatch(-1) }, [patch])

    const q = query.trim()
    const matches: MatchLoc[] = useMemo(() => {
        if (!q) return []
        const needle = q.toLowerCase()
        const out: MatchLoc[] = []
        filesData.forEach(({ hunks }, fileIdx) => {
            hunks.forEach((h, hunkIdx) => {
                h.rows.forEach((row, rowIdx) => {
                    const id = `df-${fileIdx}-${hunkIdx}-${rowIdx}`
                    if (row.kind === 'line') {
                        if (row.line.text.toLowerCase().includes(needle)) out.push({ fileIdx, id })
                    } else if (row.kind === 'fold') {
                        row.lines.forEach((line, li) => {
                            if (line.text.toLowerCase().includes(needle)) out.push({ fileIdx, id: `${id}-${li}`, foldId: id })
                        })
                    }
                })
            })
        })
        return out
    }, [filesData, q])

    // A new search term starts unselected — nothing jumps until Enter.
    useEffect(() => { setCurrentMatch(-1) }, [q])

    const goToMatch = (idx: number) => {
        if (!matches.length) return
        const n = ((idx % matches.length) + matches.length) % matches.length
        const m = matches[n]
        setCurrentMatch(n)
        // Expand only the file this match is in; open its fold if it's inside one.
        setCollapsed(Object.fromEntries(filesData.map((_, i) => [i, i !== m.fileIdx])))
        if (m.foldId) setOpenFolds(f => ({ ...f, [m.foldId as string]: true }))
    }

    useEffect(() => {
        if (currentMatch < 0 || !matches[currentMatch]) return
        const id = matches[currentMatch].id
        const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 30)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentMatch])

    const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return
        e.preventDefault()
        goToMatch(currentMatch + (e.shiftKey ? -1 : 1))
    }

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

                <div className="relative min-w-[140px] max-w-[240px] flex-1">
                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={onSearchKeyDown}
                        placeholder="Search diff, Enter to jump…"
                        className="w-full pl-6 pr-2 py-1 text-[11px] border border-gray-300 rounded outline-none focus:border-indigo-400" />
                </div>
                {q && (
                    <span className="flex items-center gap-0.5 text-[11px] text-gray-500 shrink-0">
                        {matches.length ? `${currentMatch >= 0 ? currentMatch + 1 : 0}/${matches.length}` : 'No matches'}
                        {matches.length > 0 && (
                            <>
                                <button onClick={() => goToMatch(currentMatch - 1)} title="Previous match (Shift+Enter)"
                                    className="p-0.5 rounded hover:text-indigo-600 hover:bg-indigo-50"><ChevronUp size={12} /></button>
                                <button onClick={() => goToMatch(currentMatch + 1)} title="Next match (Enter)"
                                    className="p-0.5 rounded hover:text-indigo-600 hover:bg-indigo-50"><ChevronDown size={12} /></button>
                            </>
                        )}
                    </span>
                )}

                <button onClick={() => setCollapsed({})}
                    className="ml-auto text-[11px] border border-gray-300 rounded px-2 py-0.5 text-gray-600 hover:bg-gray-50">
                    Collapse all
                </button>
                <button onClick={() => setCollapsed(Object.fromEntries(filesData.map((_, i) => [i, false])))}
                    className="text-[11px] border border-gray-300 rounded px-2 py-0.5 text-gray-600 hover:bg-gray-50">
                    Expand all
                </button>
            </div>
            {filesData.map(({ file, hunks }, fileIdx) => (
                <FileCard key={`${file.path}-${fileIdx}`} file={file} fileIdx={fileIdx} hunks={hunks}
                    collapsed={collapsed[fileIdx] ?? true}
                    onToggle={() => setCollapsed(c => ({ ...c, [fileIdx]: !(c[fileIdx] ?? true) }))}
                    query={q} activeMatchId={matches[currentMatch]?.id ?? null}
                    openFolds={openFolds} onToggleFold={foldId => setOpenFolds(f => ({ ...f, [foldId]: !f[foldId] }))} />
            ))}
        </div>
    )
}
