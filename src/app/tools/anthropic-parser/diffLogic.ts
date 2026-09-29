'use client'

/* ------------------------------------------------------------------ *
 * Unified-diff parsing + A/B comment-site alignment — ported 1:1 from
 * task.html's parseUnifiedDiff / lcsOps / buildDiffBlocks (CoAT local
 * reviewer). Compares diff_a and diff_b by content (not line numbers,
 * which drift once the two sides inject different numbers of comment
 * lines) to find the "sites" where the two sides' injected comments
 * differ, for the dual-pane diff view.
 * ------------------------------------------------------------------ */

export type DLineType = 'add' | 'del' | 'ctx'
export interface DLine { type: DLineType; text: string }
export interface DHunk { oldStart: number; oldLen: number; newStart: number; newLen: number; section: string; lines: DLine[] }
export interface DFile { oldFile: string; newFile: string; hunks: DHunk[] }

export function parseUnifiedDiff(text: string): DFile[] {
    const lines = String(text || '').replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n')
    const files: DFile[] = []
    let cur: DFile | null = null
    let hunk: DHunk | null = null
    for (let i = 0; i < lines.length; i++) {
        const l = lines[i]
        const fm = /^diff --git a\/(.*) b\/(.*)$/.exec(l)
        if (fm) { cur = { oldFile: fm[1], newFile: fm[2], hunks: [] }; files.push(cur); hunk = null; continue }
        if (!cur) continue
        if (l.indexOf('index ') === 0 || l.indexOf('--- ') === 0 || l.indexOf('+++ ') === 0 ||
            l.indexOf('new file mode') === 0 || l.indexOf('deleted file mode') === 0 ||
            l.indexOf('similarity index') === 0 || l.indexOf('rename ') === 0) continue
        const hm = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@ ?(.*)$/.exec(l)
        if (hm) {
            hunk = {
                oldStart: +hm[1], oldLen: hm[2] !== undefined ? +hm[2] : 1,
                newStart: +hm[3], newLen: hm[4] !== undefined ? +hm[4] : 1,
                section: hm[5] || '', lines: [],
            }
            cur.hunks.push(hunk)
            continue
        }
        if (!hunk) continue
        if (l.length === 0) { hunk.lines.push({ type: 'ctx', text: '' }); continue }
        const c = l.charAt(0)
        if (c === '+') hunk.lines.push({ type: 'add', text: l.slice(1) })
        else if (c === '-') hunk.lines.push({ type: 'del', text: l.slice(1) })
        else if (c === ' ') hunk.lines.push({ type: 'ctx', text: l.slice(1) })
        else if (c === '\\') { /* "\ No newline at end of file" */ }
        else hunk.lines.push({ type: 'ctx', text: l })
    }
    return files
}

function lineKey(ln: DLine): string { return (ln.type === 'add' ? '+' : ln.type === 'del' ? '-' : ' ') + ln.text }

type LcsOp = { t: 'eq' | 'a' | 'b'; line: DLine }
function lcsOps(A: DLine[], B: DLine[]): LcsOp[] {
    const n = A.length, m = B.length
    const dp: Int32Array[] = new Array(n + 1)
    for (let i = 0; i <= n; i++) dp[i] = new Int32Array(m + 1)
    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            dp[i][j] = lineKey(A[i]) === lineKey(B[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
        }
    }
    const ops: LcsOp[] = []
    let i = 0, j = 0
    while (i < n && j < m) {
        if (lineKey(A[i]) === lineKey(B[j])) { ops.push({ t: 'eq', line: A[i] }); i++; j++ }
        else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ t: 'a', line: A[i] }); i++ }
        else { ops.push({ t: 'b', line: B[j] }); j++ }
    }
    while (i < n) { ops.push({ t: 'a', line: A[i] }); i++ }
    while (j < m) { ops.push({ t: 'b', line: B[j] }); j++ }
    return ops
}

export type DiffBlock =
    | { type: 'file'; name: string }
    | { type: 'hunk'; section: string; oldStart: number }
    | { type: 'line'; cls: DLineType; text: string }
    | { type: 'site'; id: string; aLines: DLine[]; bLines: DLine[]; label: string; file: string }

export interface DiffData { blocks: DiffBlock[]; siteCount: number }

export function buildDiffBlocks(filesA: DFile[], filesB: DFile[]): DiffData {
    const blocks: DiffBlock[] = []
    let siteN = 0
    const usedB = filesB.map(() => false)
    filesA.forEach(fa => {
        const fbIdx = filesB.findIndex((fb, idx) => !usedB[idx] && fb.newFile === fa.newFile)
        const fb = fbIdx >= 0 ? filesB[fbIdx] : null
        if (fbIdx >= 0) usedB[fbIdx] = true
        blocks.push({ type: 'file', name: fa.newFile || fa.oldFile })
        const hunksB = fb ? fb.hunks : []
        const usedH = hunksB.map(() => false)
        fa.hunks.forEach(ha => {
            const hbIdx = hunksB.findIndex((hb, idx) => !usedH[idx] && hb.oldStart === ha.oldStart && hb.oldLen === ha.oldLen)
            const hb = hbIdx >= 0 ? hunksB[hbIdx] : null
            if (hbIdx >= 0) usedH[hbIdx] = true
            blocks.push({ type: 'hunk', section: ha.section || (hb && hb.section) || '', oldStart: ha.oldStart })
            if (!hb) {
                ha.lines.forEach(ln => blocks.push({ type: 'line', cls: ln.type, text: ln.text }))
                return
            }
            const ops = lcsOps(ha.lines, hb.lines)
            let k = 0
            while (k < ops.length) {
                if (ops[k].t === 'eq') { blocks.push({ type: 'line', cls: ops[k].line.type, text: ops[k].line.text }); k++; continue }
                const aBuf: DLine[] = [], bBuf: DLine[] = []
                while (k < ops.length && ops[k].t !== 'eq') {
                    if (ops[k].t === 'a') aBuf.push(ops[k].line); else bBuf.push(ops[k].line)
                    k++
                }
                let label: string | null = null
                for (let s = k; s < ops.length; s++) { if (ops[s].t === 'eq') { label = ops[s].line.text.trim(); break } }
                if (!label) { for (let s2 = blocks.length - 1; s2 >= 0; s2--) { const b = blocks[s2]; if (b.type === 'line' && b.text.trim()) { label = b.text.trim(); break } } }
                siteN++
                blocks.push({ type: 'site', id: 'S' + siteN, aLines: aBuf, bLines: bBuf, label: label || '(end of this hunk)', file: fa.newFile || fa.oldFile })
            }
        })
    })
    return { blocks, siteCount: siteN }
}

/* ---------- word-level diff, for the A/B highlight toggle ---------- */
function tokenize(s: string): string[] { return String(s || '').match(/\s+|[^\s]+/g) || [] }

export type WordTok = [boolean, string] // [sameOnBothSides, text]

export function wordDiffTokens(a: string, b: string): { a: WordTok[]; b: WordTok[] } {
    const ta = tokenize(a), tb = tokenize(b)
    const n = ta.length, m = tb.length
    const dp: Int32Array[] = new Array(n + 1)
    for (let i = 0; i <= n; i++) dp[i] = new Int32Array(m + 1)
    for (let i = n - 1; i >= 0; i--) { for (let j = m - 1; j >= 0; j--) { dp[i][j] = ta[i] === tb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]) } }
    const outA: WordTok[] = [], outB: WordTok[] = []
    let i = 0, j = 0
    while (i < n && j < m) {
        if (ta[i] === tb[j]) { outA.push([true, ta[i]]); outB.push([true, tb[j]]); i++; j++ }
        else if (dp[i + 1][j] >= dp[i][j + 1]) { outA.push([false, ta[i]]); i++ }
        else { outB.push([false, tb[j]]); j++ }
    }
    while (i < n) { outA.push([false, ta[i]]); i++ }
    while (j < m) { outB.push([false, tb[j]]); j++ }
    return { a: outA, b: outB }
}
