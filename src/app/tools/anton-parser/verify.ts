'use client'

/* ------------------------------------------------------------------ *
 * "Verify" — compares a Mercor Studio export (task-export-*.json)
 * field by field against one version of this task's annotation.json,
 * so a transcription slip in Studio (wrong paste, stale value, a
 * previous annotator's answer left behind) gets caught before Final
 * Submit — something the analysis itself can never catch, since
 * annotation.json was correct all along.
 *
 * Everything here is pure data in, pure data out; VerifyModal.tsx does
 * the rendering.
 * ------------------------------------------------------------------ */

export interface RubricRow {
    index?: number | string
    criteria?: string
    answer_a?: string
    reason_a?: string
    answer_b?: string
    reason_b?: string
    [k: string]: any
}
export interface DimensionEntry {
    key: string
    score_a?: number | string | null
    reason_a?: string
    score_b?: number | string | null
    reason_b?: string
}
export interface AnnotationSnapshot {
    rubric_count?: number | string
    rubrics: RubricRow[]
    dimensions: DimensionEntry[]
    dimension_0?: { a?: { status?: string; reason?: string }; b?: { status?: string; reason?: string } }
    final_quality_score_a?: number | string | null
    final_quality_score_b?: number | string | null
    pairwise_evaluation?: string
    comparative_rationale?: string
}

export type FieldStatus = 'match' | 'mismatch' | 'missing_export' | 'missing_annotation'

export interface FieldRow {
    key: string
    label: string
    kind: 'string' | 'number'
    status: FieldStatus
    annotationValue: string | number | null
    exportValue: string | number | null
}

export interface UnverifiableRow { key: string; label: string }

export interface CountCheck {
    fieldRubricCount: number | null
    verifierCount: number
    annotationRubricCount: number
    consistent: boolean
}

export interface ExportMeta {
    taskName: string | null
    taskVersion: number | null
    updatedAt: string | null
}

export interface VerifyResult {
    exportMeta: ExportMeta
    countCheck: CountCheck
    rows: FieldRow[]
    unverifiable: UnverifiableRow[]
    summary: { total: number; matched: number; mismatched: number; missing: number }
    rubricIndexBase: number
}

export interface VerifyOptions {
    /**
     * What number the export's rubric numbering starts counting from — both
     * `task_verifiers[].verifier_index` and the `field_ta_rubric_NN_*` suffix. This
     * app's own `rubrics[].index` is always 1-based; Studio's own convention has been
     * seen to vary per export (sometimes 0-based, sometimes 1-based) with nothing in
     * the file itself to tell them apart, so this is a manual correction, not
     * something the parser can detect. Defaults to 1 (no adjustment).
     */
    rubricIndexBase?: number
}

/* ------------------------------------------------------------------ *
 * Reading the export
 * ------------------------------------------------------------------ */

interface TaskVerifier {
    verifier_index?: number
    config_input?: { criteria?: string }
    [k: string]: any
}

interface ParsedExport {
    taskName: string | null
    taskVersion: number | null
    updatedAt: string | null
    customFields: Record<string, any>
    verifiers: TaskVerifier[]
}

/** The export's top level may be a single object or a one-element array. */
export function parseExportRoot(raw: any): ParsedExport {
    const root = Array.isArray(raw) ? raw[0] : raw
    return {
        taskName: typeof root?.task_name === 'string' ? root.task_name : null,
        taskVersion: typeof root?.task_version === 'number' ? root.task_version : null,
        updatedAt: typeof root?.updated_at === 'string' ? root.updated_at : null,
        customFields: (root?.custom_fields && typeof root.custom_fields === 'object') ? root.custom_fields : {},
        verifiers: Array.isArray(root?.task_verifiers) ? root.task_verifiers : [],
    }
}

/* ------------------------------------------------------------------ *
 * Value normalisation / comparison
 * ------------------------------------------------------------------ */

function isMissing(v: any): boolean {
    return v === null || v === undefined || v === ''
}

/** Trim, then collapse internal whitespace runs (including newlines) to one space.
 *  Deliberately does NOT normalise quotes/dashes — a pasted character difference is
 *  a real mismatch the user needs to see, not noise to smooth over. */
function normalizeStr(v: any): string {
    return String(v).trim().replace(/\s+/g, ' ')
}

/** Zero-padded two-digit rubric field suffix: 1 -> "01", 13 -> "13". */
function pad2(n: number): string {
    return String(n).padStart(2, '0')
}

function compareOne(
    key: string, label: string, kind: 'string' | 'number',
    annotationValue: any, exportValue: any,
): FieldRow {
    const annMissing = isMissing(annotationValue)
    const expMissing = isMissing(exportValue)
    let status: FieldStatus
    if (annMissing && expMissing) status = 'match'
    else if (annMissing) status = 'missing_annotation'
    else if (expMissing) status = 'missing_export'
    else if (kind === 'number') {
        const a = Number(annotationValue), e = Number(exportValue)
        status = (Number.isNaN(a) || Number.isNaN(e)) ? 'mismatch' : (a === e ? 'match' : 'mismatch')
    } else {
        status = normalizeStr(annotationValue) === normalizeStr(exportValue) ? 'match' : 'mismatch'
    }
    return {
        key, label, kind, status,
        annotationValue: annMissing ? null : annotationValue,
        exportValue: expMissing ? null : exportValue,
    }
}

/** Rows 15/16: a hardcoded, hashed field name. If the key isn't present in the export
 *  at all, that's reported distinctly rather than silently treated as a normal blank. */
function compareHashField(
    key: string, label: string, fieldName: string, customFields: Record<string, any>, annotationValue: any,
): FieldRow {
    if (!(fieldName in customFields)) {
        return { key, label, kind: 'string', status: 'missing_export', annotationValue: isMissing(annotationValue) ? null : annotationValue, exportValue: null }
    }
    return compareOne(key, label, 'string', annotationValue, customFields[fieldName])
}

/* ------------------------------------------------------------------ *
 * Main comparison
 * ------------------------------------------------------------------ */

const DIMENSION_RANGE = [2, 3, 4, 5, 6, 7, 8, 9]

// The two hashed custom-field names for pairwise_evaluation / comparative_rationale.
// Verified stable across two unrelated exports — hardcoded per the spec.
const FIELD_PAIRWISE_EVALUATION = 'field_e511999a150a45c2b7145f808103d78c'
const FIELD_COMPARATIVE_RATIONALE = 'field_1e32bd048d564685ba8ec51f9af11c70'

export function verifyExportAgainstAnnotation(exportRaw: any, annotation: AnnotationSnapshot, options: VerifyOptions = {}): VerifyResult {
    const rubricIndexBase = Number.isFinite(options.rubricIndexBase) ? (options.rubricIndexBase as number) : 1
    const exp = parseExportRoot(exportRaw)
    const cf = exp.customFields

    const rubricsByIndex = new Map<number, RubricRow>()
    for (const r of annotation.rubrics || []) {
        const n = Number(r?.index)
        if (Number.isFinite(n)) rubricsByIndex.set(n, r)
    }
    // The offset applies to exactly one thing: which task_verifiers[] entry (and so
    // which criteria) counts as "verifier N" when matching it against rubrics[].index.
    // field_ta_rubric_NN_* field names are never touched by it — those are always keyed
    // by the rubric's own index, 1-based, regardless of what verifier_index starts at.
    const toAnnotationIndex = (exportVerifierIndex: number) => exportVerifierIndex - rubricIndexBase + 1

    const verifierByIndex = new Map<number, TaskVerifier>()
    for (const v of exp.verifiers) {
        if (typeof v?.verifier_index === 'number') verifierByIndex.set(toAnnotationIndex(v.verifier_index), v)
    }
    const dimByNum = new Map<number, DimensionEntry>()
    for (const d of annotation.dimensions || []) {
        const m = /^(\d+)_/.exec(d.key)
        if (m) dimByNum.set(parseInt(m[1], 10), d)
    }

    const rows: FieldRow[] = []

    // Row 1 — rubric count.
    rows.push(compareOne('rubric_count', 'Rubric count', 'number', annotation.rubric_count, cf.field_rubric_count))

    // Rows 2-6 — per rubric row, matched by index (annotation) / verifier_index (export),
    // never by array position. Union of both sides so an added/removed row still shows.
    // verifierByIndex is already keyed in this app's own 1-based numbering (translated
    // above via the offset), so it compares directly against rubricsByIndex — but the
    // field_ta_rubric_NN_* suffix is the rubric's own raw index, always, unaffected by
    // the offset.
    const allRubricIndices = new Set<number>([...rubricsByIndex.keys(), ...verifierByIndex.keys()])
    for (const idx of [...allRubricIndices].sort((a, b) => a - b)) {
        const rubric = rubricsByIndex.get(idx)
        const verifier = verifierByIndex.get(idx)
        const nn = pad2(idx)
        rows.push(compareOne(`rubric_${idx}_criteria`, `Rubric ${idx} — criteria`, 'string',
            rubric?.criteria, verifier?.config_input?.criteria))
        rows.push(compareOne(`rubric_${idx}_answer_a`, `Rubric ${idx} — answer (A)`, 'string',
            rubric?.answer_a, cf[`field_ta_rubric_${nn}_answer_a`]))
        rows.push(compareOne(`rubric_${idx}_reason_a`, `Rubric ${idx} — reason (A)`, 'string',
            rubric?.reason_a, cf[`field_ta_rubric_${nn}_reason_a`]))
        rows.push(compareOne(`rubric_${idx}_answer_b`, `Rubric ${idx} — answer (B)`, 'string',
            rubric?.answer_b, cf[`field_ta_rubric_${nn}_answer_b`]))
        rows.push(compareOne(`rubric_${idx}_reason_b`, `Rubric ${idx} — reason (B)`, 'string',
            rubric?.reason_b, cf[`field_ta_rubric_${nn}_reason_b`]))
    }

    // Rows 7-10 — per dimension 2-9. Dimension 1 is never in this loop (unverifiable).
    for (const n of DIMENSION_RANGE) {
        const dim = dimByNum.get(n)
        rows.push(compareOne(`dim_${n}_score_a`, `Dimension ${n} — score (A)`, 'number',
            dim?.score_a, cf[`field_ta_dim${n}_score_a`]))
        rows.push(compareOne(`dim_${n}_reason_a`, `Dimension ${n} — reason (A)`, 'string',
            dim?.reason_a, cf[`field_ta_dim${n}_reason_a`]))
        rows.push(compareOne(`dim_${n}_score_b`, `Dimension ${n} — score (B)`, 'number',
            dim?.score_b, cf[`field_ta_dim${n}_score_b`]))
        rows.push(compareOne(`dim_${n}_reason_b`, `Dimension ${n} — reason (B)`, 'string',
            dim?.reason_b, cf[`field_ta_dim${n}_reason_b`]))
    }

    // Rows 11-12 — final quality scores.
    rows.push(compareOne('final_quality_score_a', 'Final quality score (A)', 'number',
        annotation.final_quality_score_a, cf.field_ta_final_quality_score_a))
    rows.push(compareOne('final_quality_score_b', 'Final quality score (B)', 'number',
        annotation.final_quality_score_b, cf.field_ta_final_quality_score_b))

    // Rows 13-14 — dimension_0 status only (reason is unverifiable, listed separately).
    rows.push(compareOne('dimension_0_status_a', 'Dimension 0 — status (A)', 'string',
        annotation.dimension_0?.a?.status, cf.field_part1_a))
    rows.push(compareOne('dimension_0_status_b', 'Dimension 0 — status (B)', 'string',
        annotation.dimension_0?.b?.status, cf.field_part1_b))

    // Rows 15-16 — the two hardcoded hashed fields.
    rows.push(compareHashField('pairwise_evaluation', 'Pairwise evaluation', FIELD_PAIRWISE_EVALUATION, cf, annotation.pairwise_evaluation))
    rows.push(compareHashField('comparative_rationale', 'Comparative rationale', FIELD_COMPARATIVE_RATIONALE, cf, annotation.comparative_rationale))

    // Not verifiable from the export at all — listed once per field family, not once
    // per rubric row, so the list stays readable; every row is affected identically.
    const unverifiable: UnverifiableRow[] = [
        { key: 'dim1', label: 'Dimension 1 — score & reason (both sides): no field_ta_dim1_* fields exist in the export' },
        { key: 'dim0_reason_a', label: 'Dimension 0 — reason (A): only the status is exported' },
        { key: 'dim0_reason_b', label: 'Dimension 0 — reason (B): only the status is exported' },
        { key: 'mapped_dimension', label: 'Rubrics — mapped_dimension (every row): verifier_custom_field_values is empty in the export' },
        { key: 'mapped_dimension_a', label: 'Rubrics — mapped_dimension_a (every row): verifier_custom_field_values is empty in the export' },
        { key: 'mapped_dimension_b', label: 'Rubrics — mapped_dimension_b (every row): verifier_custom_field_values is empty in the export' },
        { key: 'source', label: 'Rubrics — source (every row): verifier_custom_field_values is empty in the export' },
        { key: 'depends_on', label: 'Rubrics — depends_on (every row): verifier_custom_field_values is empty in the export' },
    ]

    // Count consistency — surfaced separately/prominently, in addition to row 1's own
    // field-level comparison (which checks field_rubric_count against annotation's
    // *rubric_count field*, not rubrics.length).
    const fieldRubricCount = isMissing(cf.field_rubric_count) ? null : Number(cf.field_rubric_count)
    const verifierCount = exp.verifiers.length
    const annotationRubricCount = (annotation.rubrics || []).length
    const countCheck: CountCheck = {
        fieldRubricCount, verifierCount, annotationRubricCount,
        consistent: fieldRubricCount !== null && !Number.isNaN(fieldRubricCount)
            && fieldRubricCount === verifierCount && verifierCount === annotationRubricCount,
    }

    const matched = rows.filter(r => r.status === 'match').length
    const mismatched = rows.filter(r => r.status === 'mismatch').length
    const missing = rows.filter(r => r.status === 'missing_export' || r.status === 'missing_annotation').length

    return {
        exportMeta: { taskName: exp.taskName, taskVersion: exp.taskVersion, updatedAt: exp.updatedAt },
        countCheck,
        rows,
        unverifiable,
        summary: { total: rows.length, matched, mismatched, missing },
        rubricIndexBase,
    }
}

/* ------------------------------------------------------------------ *
 * Character-level "first differing position" highlight for the mismatch
 * view: common prefix, the differing middle on each side, common suffix.
 * ------------------------------------------------------------------ */
export interface DiffSpan { prefix: string; annotationMid: string; exportMid: string; suffix: string }

export function diffStrings(a: string, b: string): DiffSpan {
    const sa = String(a ?? ''), sb = String(b ?? '')
    const minLen = Math.min(sa.length, sb.length)
    let start = 0
    while (start < minLen && sa[start] === sb[start]) start++
    let aEnd = sa.length, bEnd = sb.length
    while (aEnd > start && bEnd > start && sa[aEnd - 1] === sb[bEnd - 1]) { aEnd--; bEnd-- }
    return { prefix: sa.slice(0, start), annotationMid: sa.slice(start, aEnd), exportMid: sb.slice(start, bEnd), suffix: sa.slice(aEnd) }
}

/* ------------------------------------------------------------------ *
 * Plain-text report for "Copy report".
 * ------------------------------------------------------------------ */
export function buildReportText(result: VerifyResult, annotationVersion: number): string {
    const lines: string[] = []
    lines.push(`Verify report — annotation.json v${annotationVersion} vs export` +
        (result.exportMeta.taskVersion != null ? ` (task_version ${result.exportMeta.taskVersion})` : ''))
    lines.push(`${result.summary.matched} of ${result.summary.total} fields match — ${result.summary.mismatched} mismatched — ${result.summary.missing} missing`)
    if (result.rubricIndexBase !== 1) {
        lines.push(`(export rubric numbering treated as starting at ${result.rubricIndexBase})`)
    }
    if (!result.countCheck.consistent) {
        lines.push('')
        lines.push(`COUNT MISMATCH: field_rubric_count=${result.countCheck.fieldRubricCount ?? '—'}, task_verifiers=${result.countCheck.verifierCount}, rubrics.length=${result.countCheck.annotationRubricCount}`)
    }
    const mismatches = result.rows.filter(r => r.status === 'mismatch')
    if (mismatches.length) {
        lines.push('')
        lines.push('MISMATCHED')
        for (const r of mismatches) {
            lines.push(`- ${r.label}`)
            lines.push(`    annotation.json: ${JSON.stringify(r.annotationValue)}`)
            lines.push(`    export:          ${JSON.stringify(r.exportValue)}`)
        }
    }
    const missing = result.rows.filter(r => r.status === 'missing_export' || r.status === 'missing_annotation')
    if (missing.length) {
        lines.push('')
        lines.push('MISSING')
        for (const r of missing) {
            lines.push(`- ${r.label}: ${r.status === 'missing_export' ? 'missing in export' : 'missing in annotation.json'}`)
        }
    }
    lines.push('')
    lines.push('NOT VERIFIABLE FROM THE EXPORT (check manually in Studio)')
    for (const u of result.unverifiable) lines.push(`- ${u.label}`)
    return lines.join('\n')
}
