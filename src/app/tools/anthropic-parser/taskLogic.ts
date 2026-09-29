'use client'

/* ------------------------------------------------------------------ *
 * Everything from task.html (CoAT local reviewer) that isn't diff
 * parsing or markdown rendering: prop extraction, the default answers
 * schema, the rubric reference text, comment-unit style helpers, the
 * heuristic faithfulness flags, and the "generate block" format.
 * Ported 1:1 for identical behaviour.
 * ------------------------------------------------------------------ */

/* ---------- types ---------- */
export interface CommentUnit {
    id: string
    file: string
    kind: string
    is_test?: boolean
    line_start: number
    line_end: number
    text: string
    raw_lines?: string[]
    existing?: boolean
    context_before?: [string, string][]
    context_after?: [string, string][]
}
export interface TaskProps {
    pair_id?: string
    display_title?: string
    html_url?: string
    problem_statement?: string
    diff_a: string
    diff_b: string
    comment_units_a?: CommentUnit[]
    comment_units_b?: CommentUnit[]
    commit_a?: string
    commit_b?: string
    pr_a?: string
    pr_b?: string
    test_summary?: string
    task_prompt?: string
    feedback_schema?: SchemaSection[]
    [k: string]: any
}
export interface SchemaField {
    id: string
    type: 'radio' | 'textarea'
    label: string
    options?: string[]
    rows?: number
    required?: boolean
    placeholder?: string
}
export interface SchemaSection { title: string; subtitle?: string; fields: SchemaField[] }

export interface UnitState { action: 'keep' | 'rewrite' | 'remove' | null; newText: string | null; editKind: string; why: string }
export interface AddedComment { file: string; line?: string; where?: string; text: string; kind: string; why: string }

/* ---------- extracting props from either JSON shape ---------- */
export function extractProps(json: any): { props: TaskProps; task: any; stage: any } {
    if (json && typeof json === 'object' && 'problem_statement' in json && 'diff_a' in json) return { props: json, task: null, stage: null }
    try {
        const props = json.stage.input_data.previousStages.InitialLoad.properties
        if (props && 'diff_a' in props) return { props, task: json.task, stage: json.stage }
    } catch { /* fall through */ }
    let found: any = null
    const walk = (o: any, depth: number) => {
        if (found || !o || typeof o !== 'object' || depth > 8) return
        if ('diff_a' in o && 'problem_statement' in o) { found = o; return }
        for (const k in o) { walk(o[k], depth + 1); if (found) return }
    }
    walk(json, 0)
    if (found) return { props: found, task: json.task || null, stage: json.stage || null }
    throw new Error('Could not find task properties (expected fields like problem_statement, diff_a, diff_b, comment_units_a...) in original.json.')
}

/* ---------- default answers schema (used when original.json carries none) ---------- */
export const DEFAULT_SCHEMA: SchemaSection[] = [
    {
        title: 'Code comments', subtitle: "Say which side's comments you would rather see land, and why; then edit that side's comments in the page and paste the block.",
        fields: [
            { id: 'cc_overall_preference', type: 'radio', label: "Code comments — overall: which side's comments would you rather see land?", options: ['A — strongly', 'A — moderately', 'A — slightly', 'Tie', 'B — slightly', 'B — moderately', 'B — strongly'], required: true },
            { id: 'cc_preference_justification', type: 'textarea', label: 'Why?', rows: 3, required: true },
            { id: 'cc_edits', type: 'textarea', label: 'Comment edits block for the side you preferred', rows: 6, required: true },
        ],
    },
    {
        title: 'Commit message', subtitle: 'Rate A first, then B, on each dimension (4 = best). Then give your overall preference, what could be improved, and a reference rewrite.',
        fields: [
            { id: 'commit_content_a', type: 'radio', label: 'A — Content', options: ['4', '3', '2', '1', '0'], required: true },
            { id: 'commit_readability_a', type: 'radio', label: 'A — Readability', options: ['4', '3', '2', '1', '0'], required: true },
            { id: 'commit_faithfulness_a', type: 'radio', label: 'A — Faithfulness', options: ['4', '3', '2', '1', '0'], required: true },
            { id: 'commit_dims_a_justification', type: 'textarea', label: 'A — justification', rows: 2, required: true },
            { id: 'commit_content_b', type: 'radio', label: 'B — Content', options: ['4', '3', '2', '1', '0'], required: true },
            { id: 'commit_readability_b', type: 'radio', label: 'B — Readability', options: ['4', '3', '2', '1', '0'], required: true },
            { id: 'commit_faithfulness_b', type: 'radio', label: 'B — Faithfulness', options: ['4', '3', '2', '1', '0'], required: true },
            { id: 'commit_dims_b_justification', type: 'textarea', label: 'B — justification', rows: 2, required: true },
            { id: 'commit_overall_preference', type: 'radio', label: 'Overall preference', options: ['A — strongly', 'A — moderately', 'A — slightly', 'Tie', 'B — slightly', 'B — moderately', 'B — strongly'], required: true },
            { id: 'commit_preference_justification', type: 'textarea', label: 'Why?', rows: 3, required: true },
            { id: 'commit_improvements', type: 'textarea', label: 'What could be improved about the preferred side', rows: 3, required: true },
            { id: 'commit_rewrite', type: 'textarea', label: 'Reference rewrite', rows: 5, required: true },
        ],
    },
    {
        title: 'PR description', subtitle: 'Same set of answers as the commit message, for the two PR descriptions.',
        fields: [
            { id: 'pr_content_a', type: 'radio', label: 'A — Content', options: ['4', '3', '2', '1', '0'], required: true },
            { id: 'pr_readability_a', type: 'radio', label: 'A — Readability', options: ['4', '3', '2', '1', '0'], required: true },
            { id: 'pr_faithfulness_a', type: 'radio', label: 'A — Faithfulness', options: ['4', '3', '2', '1', '0'], required: true },
            { id: 'pr_dims_a_justification', type: 'textarea', label: 'A — justification', rows: 2, required: true },
            { id: 'pr_content_b', type: 'radio', label: 'B — Content', options: ['4', '3', '2', '1', '0'], required: true },
            { id: 'pr_readability_b', type: 'radio', label: 'B — Readability', options: ['4', '3', '2', '1', '0'], required: true },
            { id: 'pr_faithfulness_b', type: 'radio', label: 'B — Faithfulness', options: ['4', '3', '2', '1', '0'], required: true },
            { id: 'pr_dims_b_justification', type: 'textarea', label: 'B — justification', rows: 2, required: true },
            { id: 'pr_overall_preference', type: 'radio', label: 'Overall preference', options: ['A — strongly', 'A — moderately', 'A — slightly', 'Tie', 'B — slightly', 'B — moderately', 'B — strongly'], required: true },
            { id: 'pr_preference_justification', type: 'textarea', label: 'Why?', rows: 3, required: true },
            { id: 'pr_improvements', type: 'textarea', label: 'What could be improved about the preferred side', rows: 3, required: true },
            { id: 'pr_rewrite', type: 'textarea', label: 'Reference rewrite', rows: 5, required: true },
        ],
    },
]

// Read-only fields whose value is actually authored somewhere else on the page
// (a drafting pad, or the edit-comments panel's "generate block") — the
// Answers-form box for them mirrors that value rather than being typed into.
export const PAD_LINKED_FIELDS: Record<string, string> = {
    commit_rewrite: 'the drafting pad above',
    pr_rewrite: 'the drafting pad above',
    cc_edits: '"generate block" in the edit-comments panel above',
}

export const RUBRIC_HTML =
    '<p class="sub">Condensed reference — see the full labeling instructions for details. The code itself is never scored, only the writing.</p>' +
    '<h3>1. Code comments</h3>' +
    '<p>Priority when a version is better: (1) a wrong/outdated comment is the worst fault, (2) a needed explanation is missing, (3) restates the code / describes the editing process / addresses the requester / is much longer than the file’s norm, (4) fit with the file’s usual style. Comment count does not decide it.</p>' +
    '<h3>2 &amp; 3. Commit message / PR description — score Content, Readability, Faithfulness 0–4 for A then B</h3>' +
    '<table class="triage"><tr><th>Score</th><th>Content</th><th>Readability</th><th>Faithfulness</th></tr>' +
    '<tr><td>4</td><td>Everything the reader needs, however brief</td><td>Clear on first read, nothing to cut</td><td>Every claim supported by the materials</td></tr>' +
    '<tr><td>3</td><td>Present, one aspect could be fuller</td><td>Clear overall, minor friction somewhere</td><td>Minor imprecision, doesn’t affect understanding</td></tr>' +
    '<tr><td>2</td><td>Something expected is missing</td><td>Reader must work through clutter/repetition</td><td>An inaccuracy, but overall understanding still correct</td></tr>' +
    '<tr><td>1</td><td>Most needed info absent</td><td>Poor ordering/unclear wording forces reconstruction</td><td>An inaccuracy leaves the reader wrong about part of it</td></tr>' +
    '<tr><td>0</td><td>Reader learns nothing beyond the file list</td><td>Long but useless, or pure private notation</td><td>False about something central</td></tr>' +
    '</table>' +
    '<p>Don’t double-count: missing info → Content; unnecessary detail/repetition → Readability; unsupported/false claim → Faithfulness. Overall preference (A/B strongly…slightly…Tie) is a holistic judgment, not an average of the three scores, and must agree with your written justification.</p>' +
    '<p>Never state a test was <i>run</i> unless a command and its output are shown — a summary that only lists tests as passing supports "tests pass", not "the author ran the suite". If no run is recorded, say so explicitly.</p>'

/* ---------- comment-unit style helpers ---------- */
interface Style { marker: string; indent: string; docStyle: 'triple' | 'triple_slash' | 'javadoc' | null; isDoc: boolean }
export function guessStyle(unit: CommentUnit): Style {
    const raw0 = (unit.raw_lines && unit.raw_lines[0]) || ''
    const trimmed = raw0.replace(/^\s+/, '')
    const indent = raw0.slice(0, raw0.length - trimmed.length)
    if (/^("""|''')/.test(trimmed)) return { marker: '"""', indent, docStyle: 'triple', isDoc: true }
    if (/^\/\/\//.test(trimmed)) return { marker: '///', indent, docStyle: 'triple_slash', isDoc: true }
    if (/^\/\*\*/.test(trimmed)) return { marker: '/**', indent, docStyle: 'javadoc', isDoc: true }
    if (/^#/.test(trimmed)) return { marker: '#', indent, docStyle: null, isDoc: false }
    if (/^\/\//.test(trimmed)) return { marker: '//', indent, docStyle: null, isDoc: false }
    if (/^\/\*/.test(trimmed)) return { marker: '/*', indent, docStyle: null, isDoc: false }
    const file = unit.file || ''
    if (/\.(py|rb|sh|pl|yml|yaml)$/.test(file)) return { marker: '#', indent: indent || '    ', docStyle: null, isDoc: false }
    return { marker: '//', indent: indent || '    ', docStyle: null, isDoc: false }
}
export function defaultKind(unit: CommentUnit): 'comment' | 'docstring' {
    if (unit.kind !== 'doc') return 'comment'
    return guessStyle(unit).isDoc ? 'docstring' : 'comment'
}
export function wrapPreview(unit: CommentUnit, text: string, kind: string): string {
    const st = guessStyle(unit)
    const lines = String(text).split('\n')
    if (kind === 'docstring' && st.docStyle === 'triple') {
        const first = (unit.raw_lines && unit.raw_lines[0] || '').replace(/^\s+/, '')
        const qm = /^("""|''')/.exec(first)
        const q = qm ? qm[0] : '"""'
        if (lines.length === 1) return st.indent + q + lines[0] + q
        return [st.indent + q + lines[0]].concat(lines.slice(1).map(l => l ? st.indent + l : '')).concat([st.indent + q]).join('\n')
    }
    if (kind === 'docstring' && st.docStyle === 'triple_slash') {
        return lines.map(l => st.indent + '///' + (l ? ' ' + l : '')).join('\n')
    }
    if (kind === 'docstring' && st.docStyle === 'javadoc') {
        if (lines.length === 1) return st.indent + '/** ' + lines[0] + ' */'
        return [st.indent + '/**'].concat(lines.map(l => st.indent + ' *' + (l ? ' ' + l : ''))).concat([st.indent + ' */']).join('\n')
    }
    const marker = st.marker === '"""' ? '#' : st.marker // never emit a bare docstring marker for a plain comment
    return lines.map(l => st.indent + marker + (l ? ' ' + l : '')).join('\n')
}

/* ---------- heuristic faithfulness flags (local, unverified) ---------- */
export function heuristicFindings(text: string, testSummary: string): string[] {
    const t = text || '', ts = testSummary || ''
    const hasRunEvidence = /\$\s|>>>\s|passed|failed|PASSED|FAILED|pytest|npm test|go test|cargo test|\d+\s+(passed|failed)/i.test(ts)
    const checks: { re: RegExp; msg: string }[] = [
        { re: /\ball tests? pass(?:es|ed)?\b/i, msg: 'claims "all tests pass" — check the test summary actually shows a run, not just a list of tests that pass' },
        { re: /\b(?:tests?|suite) (?:were|was|has been) run\b/i, msg: 'claims the suite was run — needs a shown command + output, not just a pass/fail list' },
        { re: /\bmanually tested\b/i, msg: 'claims manual testing — check the materials actually describe manual steps taken' },
        { re: /\bno regressions?\b/i, msg: 'claims no regressions — check this is backed by an actual comparison, not assumed' },
        { re: /\bverified\b/i, msg: 'uses "verified" — check what specifically was verified and against what evidence' },
        { re: /\bconfirmed\b/i, msg: 'uses "confirmed" — check what was confirmed and how' },
        { re: /\bworks? correctly\b/i, msg: 'claims correct behavior — check this is demonstrated, not asserted' },
        { re: /\bbackwards? compatible\b/i, msg: 'claims backwards compatibility — check the diff/tests actually establish this' },
    ]
    const hits: string[] = []
    checks.forEach(c => { if (c.re.test(t)) hits.push(c.msg + (c.msg.indexOf('run') >= 0 && !hasRunEvidence ? ' (the given test summary shows no run command/output)' : '')) })
    return hits
}

/* ---------- "generate block" — mirrors the live task page's own format ---------- */
function hashHex(s: string): string {
    let h = 0
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
    return h.toString(16)
}
export function buildCommentBlock(
    side: 'A' | 'B', pairId: string, units: CommentUnit[], unitState: Record<string, UnitState>, adds: AddedComment[],
): string {
    const order = units.filter(u => !u.existing).map(u => u.id)
    const existingTouched = units.filter(u => u.existing && unitState[u.id]?.action && unitState[u.id].action !== 'keep').map(u => u.id)
    const payload: any = { v: 2, pair_id: pairId, base: side, n_units: order.length, units: {}, adds: [], existing: {} }
    const rec = (u: CommentUnit) => {
        const s = unitState[u.id]
        const r: any = { a: s.action, k: s.editKind || defaultKind(u), y: s.why || '' }
        if (s.action === 'rewrite') r.t = s.newText
        return r
    }
    order.forEach(id => { payload.units[id] = rec(units.find(u => u.id === id) as CommentUnit) })
    existingTouched.forEach(id => { payload.existing[id] = rec(units.find(u => u.id === id) as CommentUnit) })
    adds.forEach(a => payload.adds.push({ file: a.file, line: a.where || a.line || '', t: a.text, k: a.kind, y: a.why }))
    const s = JSON.stringify(payload)
    return '=== COMMENT EDITS v2 · side ' + side + ' (paste this whole block into the form) ===\n' + s + '\ncheck=' + hashHex(s) + '\n=== END COMMENT EDITS ==='
}

/* ---------- misc ---------- */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export function formatLocal(iso: string): string {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    const h = d.getHours(), ampm = h >= 12 ? 'PM' : 'AM', h12 = h % 12 || 12
    const min = (d.getMinutes() < 10 ? '0' : '') + d.getMinutes()
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ', ' + h12 + ':' + min + ' ' + ampm
}
