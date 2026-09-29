'use client'

/* ------------------------------------------------------------------ *
 * The "Code change (given)" diff pane — dark, GitHub-diff-style, with an
 * amber "site" card wherever the two sides' injected comments differ,
 * shown as a two-column A/B comparison right there in the flow. Ported
 * from task.html's renderDiff/renderDiffLineHTML.
 * ------------------------------------------------------------------ */

import { DiffBlock, DiffData, DLine } from './diffLogic'

function DiffLineRow({ line }: { line: { cls: DLine['type']; text: string } }) {
    const mk = line.cls === 'add' ? '+' : line.cls === 'del' ? '-' : ' '
    const color = line.cls === 'add' ? 'text-[#86efac]' : line.cls === 'del' ? 'text-[#fca5a5]' : 'text-[#e2e8f0]'
    return (
        <div className="flex px-4 font-mono text-[12px] leading-[1.5]">
            <span className={`shrink-0 w-[1.6ch] select-none ${color}`}>{mk}</span>
            <span className={`whitespace-pre-wrap break-words flex-1 ${color}`}>{line.text}</span>
        </div>
    )
}

export default function DiffPane({ diffData }: { diffData: DiffData }) {
    const navItems: { id: string; file: string; label: string }[] = []
    diffData.blocks.forEach(b => { if (b.type === 'site') navItems.push({ id: b.id, file: b.file, label: b.label }) })

    return (
        <div>
            <nav className="text-[13px] border border-gray-200 rounded-md px-3 py-2 bg-gray-50 mb-2">
                {diffData.siteCount ? (
                    <>
                        <b>{diffData.siteCount} place{diffData.siteCount === 1 ? '' : 's'} where the comments differ</b>
                        <ol className="mt-1 space-y-0.5 pl-4 list-decimal">
                            {navItems.map(n => (
                                <li key={n.id}>
                                    <a href={`#site-${n.id}`} className="text-blue-700 hover:underline">{n.id}</a>{' '}
                                    · <code className="font-mono text-[11px]">{n.file}</code> · above <code className="font-mono text-[11px]">{n.label}</code>
                                </li>
                            ))}
                        </ol>
                    </>
                ) : <b>The two sides&rsquo; comments are identical everywhere in this diff.</b>}
            </nav>
            <div className="bg-[#0f172a] text-[#e2e8f0] rounded-md py-2.5 max-h-[70vh] overflow-y-auto overflow-x-hidden">
                {diffData.blocks.map((b: DiffBlock, i: number) => {
                    if (b.type === 'file') {
                        return <div key={i} className="text-[#fde68a] font-bold font-mono text-[12px] px-4 pt-2 pb-0.5 border-t border-[#1e293b] first:border-t-0">{b.name}</div>
                    }
                    if (b.type === 'hunk') {
                        return <div key={i} className="text-[#93c5fd] font-mono text-[12px] px-4 py-0.5 opacity-85">@@ near original line {b.oldStart} @@{b.section ? ' ' + b.section : ''}</div>
                    }
                    if (b.type === 'line') {
                        return <DiffLineRow key={i} line={b} />
                    }
                    // site
                    return (
                        <div key={i} id={`site-${b.id}`} className="border border-[#f59e0b] rounded-[5px] bg-[#111827] mx-4 my-2 overflow-hidden">
                            <div className="bg-[#78350f] text-[#fef3c7] px-2.5 py-1.5 text-[11px] leading-[1.5]">
                                <b className="bg-[#fbbf24] text-[#0f172a] rounded px-1.5 mr-2">{b.id}</b>
                                the two sides&rsquo; comments differ here · above <code>{b.label}</code>
                            </div>
                            <div className="grid grid-cols-2">
                                <div className="py-1.5 min-w-0">
                                    <span className="font-bold text-[11px] leading-[1.6] px-2.5 block text-[#93c5fd]">A</span>
                                    {b.aLines.length ? b.aLines.map((ln, li) => <DiffLineRow key={li} line={{ cls: ln.type, text: ln.text }} />)
                                        : <div className="text-[#64748b] italic px-2.5 font-mono text-[12px]">(no comment here)</div>}
                                </div>
                                <div className="py-1.5 min-w-0 border-l border-[#f59e0b]">
                                    <span className="font-bold text-[11px] leading-[1.6] px-2.5 block text-[#f9a8d4]">B</span>
                                    {b.bLines.length ? b.bLines.map((ln, li) => <DiffLineRow key={li} line={{ cls: ln.type, text: ln.text }} />)
                                        : <div className="text-[#64748b] italic px-2.5 font-mono text-[12px]">(no comment here)</div>}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
