'use client'

/* ------------------------------------------------------------------ *
 * Read-only field renderer used by the version-view tabs. Unchanged
 * values render plain; a changed value gets an amber tint and a hover
 * card showing the previous value vs. this one (red/green, matching the
 * same convention DiffView.tsx uses for patch diffs). A value with no
 * counterpart in the previous version (a brand-new rubric/dimension row)
 * renders with a green "new" tint instead — nothing to compare it to.
 *
 * The hover card is portaled to <body> and positioned from the trigger's
 * bounding rect, so it always escapes the surrounding table's
 * `overflow-x-auto` instead of being clipped by it.
 * ------------------------------------------------------------------ */

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { valuesEqual } from './versionDiff'

const TOOLTIP_WIDTH = 320

function display(v: any): string {
    if (v === null || v === undefined) return ''
    return String(v)
}

export default function DiffCell({ value, prevValue, hasPrevVersion, isNewRow, mono, area, className = '' }: {
    value: any
    /** The matched field's value in the previous version, if any. */
    prevValue?: any
    /** False when there's no previous version at all (e.g. this is version 1) —
     *  suppresses diffing entirely regardless of the other props. */
    hasPrevVersion: boolean
    /** True when the whole row/entry this cell belongs to has no counterpart in the
     *  previous version — rendered as "new" rather than "changed". */
    isNewRow?: boolean
    mono?: boolean
    /** Multi-line values (reasons, rationale) — a block instead of an inline span. */
    area?: boolean
    className?: string
}) {
    const [open, setOpen] = useState(false)
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
    const ref = useRef<HTMLDivElement>(null)

    const changed = hasPrevVersion && (isNewRow || !valuesEqual(value, prevValue))
    const text = display(value)

    const onEnter = () => {
        if (!changed) return
        const r = ref.current?.getBoundingClientRect()
        if (!r) return
        setPos({
            top: r.bottom + 6,
            left: Math.min(Math.max(8, r.left), window.innerWidth - TOOLTIP_WIDTH - 8),
        })
        setOpen(true)
    }

    const tint = changed ? (isNewRow ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-amber-50 ring-1 ring-amber-200') : ''

    return (
        <div ref={ref} onMouseEnter={onEnter} onMouseLeave={() => setOpen(false)}
            className={`relative rounded px-1.5 py-1 ${area ? '' : 'min-h-[26px] flex items-center'} ${tint} ${className}`}>
            {text
                ? <span className={`${mono ? 'font-mono' : ''} ${area ? 'whitespace-pre-wrap leading-relaxed' : ''} text-gray-800`}>{text}</span>
                : <span className="text-gray-300">—</span>}
            {changed && (
                <span className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${isNewRow ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            )}
            {open && changed && pos && createPortal(
                <div style={{ position: 'fixed', top: pos.top, left: pos.left, width: TOOLTIP_WIDTH }}
                    className="z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden text-[11px] pointer-events-none">
                    {isNewRow ? (
                        <div className="px-2.5 py-2 bg-emerald-50 text-emerald-700 font-semibold">New in this version</div>
                    ) : (
                        <>
                            <div className="px-2.5 py-1.5 bg-red-50 border-b border-red-100">
                                <div className="text-[9px] font-bold uppercase tracking-wide text-red-500 mb-0.5">Previous</div>
                                <div className="text-red-700 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                                    {display(prevValue) || <span className="italic text-red-300">(empty)</span>}
                                </div>
                            </div>
                            <div className="px-2.5 py-1.5 bg-emerald-50">
                                <div className="text-[9px] font-bold uppercase tracking-wide text-emerald-600 mb-0.5">Now</div>
                                <div className="text-emerald-800 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                                    {text || <span className="italic text-emerald-300">(empty)</span>}
                                </div>
                            </div>
                        </>
                    )}
                </div>,
                document.body,
            )}
        </div>
    )
}
