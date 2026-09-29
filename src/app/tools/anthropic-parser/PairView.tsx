'use client'

/* ------------------------------------------------------------------ *
 * Commit message & PR description pair view — raw or word-diff-highlighted,
 * raw or Markdown-rendered, each with local heuristic "findings". Ported
 * from task.html's refreshPairView/wordDiffHTML/renderFindings.
 * ------------------------------------------------------------------ */

import { ReactNode, useState } from 'react'
import { wordDiffTokens, WordTok } from './diffLogic'
import { MD_CONTENT_CLASS, mdRender } from './markdown'
import { heuristicFindings } from './taskLogic'

function renderWordDiff(toks: WordTok[], markClass: string): ReactNode {
    const out: ReactNode[] = []
    let run = ''
    let k = 0
    const flush = () => { if (run) { out.push(<mark key={k++} className={markClass}>{run}</mark>); run = '' } }
    toks.forEach(([same, text]) => {
        if (same) { flush(); out.push(<span key={k++}>{text}</span>) }
        else run += text
    })
    flush()
    return out
}

function Findings({ hits }: { hits: string[] }) {
    return (
        <div className="mt-1.5 px-2.5 py-2 bg-stone-50 border border-dashed border-gray-200 rounded text-[12.5px]">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">&#9888; heuristic findings — please verify before trusting</div>
            {hits.length ? (
                <ul className="list-disc pl-5 space-y-0.5">{hits.map((h, i) => <li key={i}>{h}</li>)}</ul>
            ) : <div className="text-gray-400 italic">none flagged (this does not mean every claim is supported — check anyway)</div>}
        </div>
    )
}

export default function PairView({ commitA, commitB, prA, prB, testSummary }: {
    commitA: string; commitB: string; prA: string; prB: string; testSummary: string
}) {
    const [wd, setWd] = useState(false)
    const [md, setMd] = useState(true)
    const wdB = wordDiffTokens(commitA, commitB)
    const prWd = wordDiffTokens(prA, prB)

    return (
        <div>
            <p className="text-[13px] text-gray-500 mb-2">
                The findings under each text are a local heuristic (simple phrase-matching), not verified facts and not what production&rsquo;s own
                auto-findings check — confirm anything flagged against the diff and test summary yourself, and don&rsquo;t assume &quot;nothing
                flagged&quot; means every claim is supported.
            </p>
            <div className="text-[13px] mb-2 flex gap-6 flex-wrap">
                <label className="cursor-pointer"><input type="checkbox" checked={wd} onChange={e => setWd(e.target.checked)} /> highlight A/B word-level differences</label>
                <label className="cursor-pointer"><input type="checkbox" checked={md} onChange={e => setMd(e.target.checked)} /> render A/B as Markdown</label>
            </div>

            <h3 className="text-[15px] font-semibold mt-4 mb-1">Commit message</h3>
            <table className="w-full border-collapse table-fixed">
                <thead><tr>
                    <th className="w-1/2 bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 text-left">A</th>
                    <th className="w-1/2 bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 text-left">B</th>
                </tr></thead>
                <tbody><tr>
                    <td className="border border-gray-200 p-2.5 align-top">
                        {md ? <div className={`text-[12.5px] leading-relaxed ${MD_CONTENT_CLASS}`} dangerouslySetInnerHTML={{ __html: mdRender(commitA) }} />
                            : wd ? <pre className="bg-gray-50 p-3 rounded text-[12px] whitespace-pre-wrap break-words font-mono">{renderWordDiff(wdB.a, 'bg-blue-100')}</pre>
                                : <pre className="bg-gray-50 p-3 rounded text-[12px] whitespace-pre-wrap break-words font-mono">{commitA}</pre>}
                        <Findings hits={heuristicFindings(commitA, testSummary)} />
                    </td>
                    <td className="border border-gray-200 p-2.5 align-top">
                        {md ? <div className={`text-[12.5px] leading-relaxed ${MD_CONTENT_CLASS}`} dangerouslySetInnerHTML={{ __html: mdRender(commitB) }} />
                            : wd ? <pre className="bg-gray-50 p-3 rounded text-[12px] whitespace-pre-wrap break-words font-mono">{renderWordDiff(wdB.b, 'bg-pink-100')}</pre>
                                : <pre className="bg-gray-50 p-3 rounded text-[12px] whitespace-pre-wrap break-words font-mono">{commitB}</pre>}
                        <Findings hits={heuristicFindings(commitB, testSummary)} />
                    </td>
                </tr></tbody>
            </table>

            <h3 className="text-[15px] font-semibold mt-4 mb-1">PR description</h3>
            <table className="w-full border-collapse table-fixed">
                <thead><tr>
                    <th className="w-1/2 bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 text-left">A</th>
                    <th className="w-1/2 bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 text-left">B</th>
                </tr></thead>
                <tbody><tr>
                    <td className="border border-gray-200 p-2.5 align-top">
                        {md ? <div className={`text-[12.5px] leading-relaxed ${MD_CONTENT_CLASS}`} dangerouslySetInnerHTML={{ __html: mdRender(prA) }} />
                            : wd ? <pre className="bg-gray-50 p-3 rounded text-[12px] whitespace-pre-wrap break-words font-mono">{renderWordDiff(prWd.a, 'bg-blue-100')}</pre>
                                : <pre className="bg-gray-50 p-3 rounded text-[12px] whitespace-pre-wrap break-words font-mono">{prA}</pre>}
                        <Findings hits={heuristicFindings(prA, testSummary)} />
                    </td>
                    <td className="border border-gray-200 p-2.5 align-top">
                        {md ? <div className={`text-[12.5px] leading-relaxed ${MD_CONTENT_CLASS}`} dangerouslySetInnerHTML={{ __html: mdRender(prB) }} />
                            : wd ? <pre className="bg-gray-50 p-3 rounded text-[12px] whitespace-pre-wrap break-words font-mono">{renderWordDiff(prWd.b, 'bg-pink-100')}</pre>
                                : <pre className="bg-gray-50 p-3 rounded text-[12px] whitespace-pre-wrap break-words font-mono">{prB}</pre>}
                        <Findings hits={heuristicFindings(prB, testSummary)} />
                    </td>
                </tr></tbody>
            </table>
        </div>
    )
}
