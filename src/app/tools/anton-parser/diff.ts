'use client'

/* ------------------------------------------------------------------ *
 * Unified-diff parsing. Pure data in, pure data out — the rendering
 * lives in DiffView.tsx.
 * ------------------------------------------------------------------ */

export type DiffLineType = 'add' | 'del' | 'ctx'
export interface DiffLine { type: DiffLineType; num: number | null; text: string }
export interface DiffHunk { header: string; lines: DiffLine[] }
export interface DiffFile {
    path: string
    oldPath: string
    status: 'added' | 'deleted' | 'renamed' | 'modified' | 'binary'
    additions: number
    deletions: number
    hunks: DiffHunk[]
}
export interface ParsedDiff { files: DiffFile[]; additions: number; deletions: number }

/** Does this text look like git diff output at all? */
export function looksLikeDiff(text: string): boolean {
    if (!text || !text.trim()) return false
    return /^diff --git /m.test(text) || /^@@ .* @@/m.test(text) || (/^--- /m.test(text) && /^\+\+\+ /m.test(text))
}

function stripPrefix(p: string): string {
    const cleaned = p.trim().replace(/^"(.*)"$/, '$1')
    return cleaned.replace(/^[ab]\//, '')
}

export function parseDiff(text: string): ParsedDiff {
    const files: DiffFile[] = []
    let file: DiffFile | null = null
    let hunk: DiffHunk | null = null
    let oldLine = 0
    let newLine = 0

    const startFile = (path: string, oldPath: string): DiffFile => {
        const f: DiffFile = { path, oldPath, status: 'modified', additions: 0, deletions: 0, hunks: [] }
        files.push(f)
        hunk = null
        return f
    }

    for (const raw of String(text ?? '').split('\n')) {
        const line = raw.replace(/\r$/, '')

        let m: RegExpMatchArray | null
        if ((m = line.match(/^diff --git\s+(.+?)\s+(\S+)$/))) {
            file = startFile(stripPrefix(m[2]), stripPrefix(m[1]))
            continue
        }
        if (/^(new file mode|old mode|new mode|similarity index|index )/.test(line)) {
            if (file && line.startsWith('new file mode')) file.status = 'added'
            continue
        }
        if (line.startsWith('deleted file mode')) { if (file) file.status = 'deleted'; continue }
        if (line.startsWith('rename from')) { if (file) { file.oldPath = stripPrefix(line.slice(11)); file.status = 'renamed' } continue }
        if (line.startsWith('rename to')) { if (file) { file.path = stripPrefix(line.slice(9)); file.status = 'renamed' } continue }
        if (/^Binary files? /.test(line)) {
            if (!file) file = startFile(stripPrefix(line.replace(/^Binary files? /, '').split(' and ')[0] || 'binary'), '')
            file.status = 'binary'
            continue
        }
        if (line.startsWith('--- ')) {
            const p = line.slice(4).trim()
            // A plain unified diff (no `diff --git`) starts its file here.
            if (!file || file.hunks.length) file = startFile('', p === '/dev/null' ? '' : stripPrefix(p))
            else file.oldPath = p === '/dev/null' ? '' : stripPrefix(p)
            if (p === '/dev/null') file.status = 'added'
            continue
        }
        if (line.startsWith('+++ ')) {
            const p = line.slice(4).trim()
            if (!file) file = startFile(p === '/dev/null' ? '' : stripPrefix(p), '')
            if (p === '/dev/null') file.status = 'deleted'
            else if (!file.path) file.path = stripPrefix(p)
            continue
        }
        if ((m = line.match(/^@@+\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@+(.*)$/))) {
            if (!file) file = startFile('(unknown file)', '')
            oldLine = Number(m[1])
            newLine = Number(m[3])
            hunk = { header: line, lines: [] }
            file.hunks.push(hunk)
            continue
        }
        if (!file || !hunk) continue
        if (line.startsWith('\\')) continue  // "\ No newline at end of file"

        if (line.startsWith('+')) {
            hunk.lines.push({ type: 'add', num: newLine++, text: line.slice(1) })
            file.additions++
        } else if (line.startsWith('-')) {
            hunk.lines.push({ type: 'del', num: oldLine++, text: line.slice(1) })
            file.deletions++
        } else if (line.startsWith(' ') || line === '') {
            hunk.lines.push({ type: 'ctx', num: newLine++, text: line.slice(1) })
            oldLine++
        }
    }

    // A file with no path at all is not something we can label; drop it.
    const kept = files.filter(f => f.path || f.oldPath)
    for (const f of kept) if (!f.path) f.path = f.oldPath
    return {
        files: kept,
        additions: kept.reduce((n, f) => n + f.additions, 0),
        deletions: kept.reduce((n, f) => n + f.deletions, 0),
    }
}

/** Lines of context kept either side of a change; longer runs fold. */
const CONTEXT = 3

export type Row =
    | { kind: 'line'; line: DiffLine }
    | { kind: 'fold'; count: number; lines: DiffLine[] }
    | { kind: 'hunk'; header: string }

/** Turns a hunk into display rows, folding long stretches of untouched lines. */
export function hunkRows(hunk: DiffHunk): Row[] {
    const rows: Row[] = []
    const lines = hunk.lines
    let i = 0
    while (i < lines.length) {
        if (lines[i].type !== 'ctx') { rows.push({ kind: 'line', line: lines[i] }); i++; continue }

        let j = i
        while (j < lines.length && lines[j].type === 'ctx') j++
        const run = lines.slice(i, j)
        const atStart = i === 0
        const atEnd = j === lines.length
        const head = atStart ? 0 : CONTEXT      // keep after a change
        const tail = atEnd ? 0 : CONTEXT        // keep before the next change

        if (run.length <= head + tail) {
            run.forEach(line => rows.push({ kind: 'line', line }))
        } else {
            run.slice(0, head).forEach(line => rows.push({ kind: 'line', line }))
            const hidden = run.slice(head, run.length - tail)
            rows.push({ kind: 'fold', count: hidden.length, lines: hidden })
            run.slice(run.length - tail).forEach(line => rows.push({ kind: 'line', line }))
        }
        i = j
    }
    return rows
}
