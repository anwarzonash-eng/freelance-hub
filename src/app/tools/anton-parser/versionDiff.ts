'use client'

/* ------------------------------------------------------------------ *
 * Version history — pure helpers.
 *
 * A task's annotation JSON (rubrics/dimensions/pairwise) is versioned by
 * upload order: the first file uploaded is version 1, the next upload is
 * version 2, and so on — never by timestamp. `AntonTask.data_versions`
 * (see the backend model) holds one entry per upload; the last entry is
 * always kept in sync with the live, editable `data` blob.
 *
 * Comparison is always version N against version N-1 only — never the
 * whole history — and is field-level: each rubric/dimension/pairwise
 * value is compared to its counterpart in the previous version, not the
 * JSON blobs as a whole.
 * ------------------------------------------------------------------ */

export interface DataVersion {
    version: number
    data: any
    uploaded_at: string
}

/** Rubrics are matched across versions by their own `index` field (stable even if
 *  rows are reordered or others are inserted/removed), falling back to array
 *  position only when a row has no usable index. */
function rubricKey(r: any, fallbackPos: number): string {
    const idx = r?.index
    if (idx !== undefined && idx !== null && String(idx).trim() !== '') return `idx:${String(idx).trim()}`
    return `pos:${fallbackPos}`
}

/** For each row in `current`, finds its counterpart in `previous` (or undefined if
 *  this row didn't exist yet in the previous version). Parallel to `current`. */
export function matchPreviousRubrics(current: any[], previous: any[]): (any | undefined)[] {
    const byKey = new Map<string, any>()
    ;(previous || []).forEach((r, i) => byKey.set(rubricKey(r, i), r))
    return (current || []).map((r, i) => byKey.get(rubricKey(r, i)))
}

/** Dimensions are keyed by their dimension key (e.g. "1_correctness") — stable by
 *  construction, no fallback needed. Parallel to `current`. */
export function matchPreviousDimensions(current: { key: string }[], previous: { key: string }[]): (any | undefined)[] {
    const byKey = new Map((previous || []).map(e => [e.key, e]))
    return (current || []).map(e => byKey.get(e.key))
}

/** Normalises a value for comparison so e.g. `undefined`, `null` and `''` all count
 *  as "no answer" rather than showing up as a spurious change, and numbers/strings
 *  compare on their printed form. */
function normalize(v: any): string {
    if (v === null || v === undefined) return ''
    if (typeof v === 'number') return String(v)
    return String(v).trim()
}

export function valuesEqual(a: any, b: any): boolean {
    return normalize(a) === normalize(b)
}
