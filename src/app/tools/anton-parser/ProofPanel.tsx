'use client'

/* ------------------------------------------------------------------ *
 * Proof — the source/answer evidence attached to a rubric, dimension or
 * the pairwise verdict (source_proof / proof_a / proof_b / pairwise_proof
 * in the uploaded JSON).
 *
 * `ProofButton` is a plain trigger: it renders nothing when there's no
 * proof for that field, otherwise a small icon that calls `onOpen` with
 * the entries to show. The open panel itself is `ProofPanel`, rendered
 * once by TaskEditor (page.tsx) as an ordinary flex sibling next to the
 * editor — same docking as the Verify panel — so it's a real side-by-side
 * split rather than an overlay, and stays open until its own close
 * button (or Escape) is used; clicking elsewhere in the editor never
 * dismisses it.
 * ------------------------------------------------------------------ */

import { useEffect } from 'react'
import { FileSearch, Hash, Lightbulb, Quote, X } from 'lucide-react'

export interface ProofEntry {
    kind?: 'quote' | 'count' | 'principle' | string
    where?: string
    find?: string
    why?: string
    visible_in_studio?: boolean
    method?: string
    result?: string
    principle?: string
    context?: string
    [k: string]: any
}

const KNOWN_KEYS = ['kind', 'where', 'find', 'why', 'visible_in_studio', 'method', 'result', 'principle', 'context']

function KindIcon({ kind }: { kind?: string }) {
    if (kind === 'quote') return <Quote size={11} />
    if (kind === 'count') return <Hash size={11} />
    if (kind === 'principle') return <Lightbulb size={11} />
    return <FileSearch size={11} />
}

function ProofEntryCard({ p }: { p: ProofEntry }) {
    // Anything beyond the fields we render explicitly, shown as a fallback so an
    // unexpected shape still surfaces instead of silently dropping data.
    const extra = Object.entries(p).filter(([k, v]) => !KNOWN_KEYS.includes(k) && v != null && v !== '')
    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border-b border-gray-100">
                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-indigo-600">
                    <KindIcon kind={p.kind} /> {p.kind || 'note'}
                </span>
                {p.where && <span className="flex-1 min-w-0 text-[10px] text-gray-400 truncate" title={p.where}>{p.where}</span>}
                {p.visible_in_studio && (
                    <span className="ml-auto shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                        Visible in Studio
                    </span>
                )}
            </div>
            <div className="px-2.5 py-2 space-y-1.5 text-[11px]">
                {p.principle && <div className="text-gray-800 font-medium leading-relaxed">{p.principle}</div>}
                {p.find && (
                    // Bleeds to the card's outer edges (-mx-2.5) then pads back in by the
                    // same amount (px-2.5), so this text starts at exactly the same left
                    // position as the plain lines above/below it instead of sitting a few
                    // pixels further in from its own box padding.
                    <div className="font-mono bg-gray-50 border-y border-gray-100 -mx-2.5 px-2.5 py-1.5 text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                        {p.find}
                    </div>
                )}
                {p.context && <div className="text-gray-600"><span className="text-gray-400">Context — </span>{p.context}</div>}
                {p.method && <div className="text-gray-600"><span className="text-gray-400">Method — </span>{p.method}</div>}
                {p.result && <div className="text-gray-600"><span className="text-gray-400">Result — </span>{p.result}</div>}
                {p.why && <div className="text-gray-500 italic leading-relaxed">{p.why}</div>}
                {extra.map(([k, v]) => (
                    <div key={k} className="text-gray-500"><span className="text-gray-400">{k} — </span>{String(v)}</div>
                ))}
            </div>
        </div>
    )
}

/**
 * The docked panel — a flex sibling of the editor's main content (see
 * TaskEditor), not a `fixed` overlay and no backdrop. It stays open until
 * `onClose` fires (its own X, or Escape) — there is nothing to click
 * through to dismiss it, same reasoning the Verify panel uses.
 */
export function ProofPanel({ proof, label, onClose }: { proof: ProofEntry[]; label: string; onClose: () => void }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    return (
        <div className="shrink-0 bg-white border-l border-gray-200 shadow-2xl flex flex-col" style={{ width: 400, maxWidth: '92vw' }}>
            <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-gray-200 bg-gray-50 shrink-0">
                <FileSearch size={14} className="text-indigo-500 shrink-0" />
                <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-gray-800 truncate">Proof</div>
                    <div className="text-[10px] text-gray-400 truncate">{label} · {proof.length} entr{proof.length === 1 ? 'y' : 'ies'}</div>
                </div>
                <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-700 shrink-0"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {proof.map((p, i) => <ProofEntryCard key={i} p={p} />)}
            </div>
        </div>
    )
}

/** The trigger — renders nothing if there's no proof to show. `label`
 *  identifies what the proof is attached to (e.g. "Rubric 3 · Source",
 *  "Rubric 3 · Answer A", "2 · Architecture · Model B", "Pairwise").
 *  `onOpen` hands the entries up to whoever owns the panel (TaskEditor). */
export default function ProofButton({ proof, label, onOpen }: { proof?: ProofEntry[] | null; label: string; onOpen: (proof: ProofEntry[], label: string) => void }) {
    if (!Array.isArray(proof) || !proof.length) return null
    return (
        <button type="button" onClick={() => onOpen(proof, label)} title={`View proof (${proof.length})`}
            className="p-0.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 shrink-0">
            <FileSearch size={12} />
        </button>
    )
}
