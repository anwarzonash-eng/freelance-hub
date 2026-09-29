'use client'

/* ------------------------------------------------------------------ *
 * Drafting pads — commit message / PR description rewrite, each a
 * textarea with a live Markdown preview and char/line stats, mirrored
 * into the answers panel's read-only `commit_rewrite`/`pr_rewrite`
 * fields. Ported from task.html's wirePad.
 * ------------------------------------------------------------------ */

import { mdRender } from './markdown'

function Pad({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    const stats = value ? `${value.length.toLocaleString()} chars · ${value.split('\n').length} lines` : ''
    return (
        <div>
            <h3 className="text-[15px] font-semibold mt-3 mb-1">{label}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={'Subject line\n\nBody...'}
                    className="w-full min-h-[14em] font-mono text-[12px] border border-gray-300 rounded px-2.5 py-2 outline-none focus:border-indigo-400" />
                <div>
                    <div className="border border-gray-200 rounded px-3 py-2.5 min-h-[14em] overflow-auto bg-gray-50 text-[12.5px] leading-relaxed">
                        {value.trim() ? <div dangerouslySetInnerHTML={{ __html: mdRender(value) }} /> : <span className="text-gray-400 italic">preview</span>}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">{stats}</div>
                </div>
            </div>
        </div>
    )
}

export default function DraftingPads({ commitRewrite, onCommitRewriteChange, prRewrite, onPrRewriteChange }: {
    commitRewrite: string; onCommitRewriteChange: (v: string) => void
    prRewrite: string; onPrRewriteChange: (v: string) => void
}) {
    return (
        <div>
            <Pad label="Commit message rewrite" value={commitRewrite} onChange={onCommitRewriteChange} />
            <Pad label="PR description rewrite" value={prRewrite} onChange={onPrRewriteChange} />
        </div>
    )
}
