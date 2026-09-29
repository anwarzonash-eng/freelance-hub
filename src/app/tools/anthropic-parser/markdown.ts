'use client'

/* ------------------------------------------------------------------ *
 * Minimal markdown renderer — ported 1:1 from task.html's mdEsc/mdInline/
 * mdRender (CoAT local reviewer), used for the problem statement, test
 * summary, commit message, PR description and the two drafting pads.
 * ------------------------------------------------------------------ */

/**
 * mdRender()'s output is bare `<h1>`/`<ul>`/`<strong>`/`<code>`/... tags with
 * no classes of their own — in task.html that was fine, since the page had no
 * CSS reset and browsers style those elements by default (bold+large
 * headings, indented bullets, monospace code). This app's Tailwind preflight
 * strips exactly that default styling, so every `dangerouslySetInnerHTML`
 * that renders `mdRender()` output needs this class on its wrapper — without
 * it the whole document collapses to same-size unstyled paragraphs.
 */
export const MD_CONTENT_CLASS =
    '[&_h1]:text-[17px] [&_h1]:font-bold [&_h1]:text-gray-900 [&_h1]:mt-3 [&_h1]:mb-1.5 ' +
    '[&_h2]:text-[15px] [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-3 [&_h2]:mb-1.5 ' +
    '[&_h3]:text-[13.5px] [&_h3]:font-bold [&_h3]:text-gray-900 [&_h3]:mt-2.5 [&_h3]:mb-1 ' +
    '[&_h4]:text-[13px] [&_h4]:font-bold [&_h5]:text-[13px] [&_h5]:font-bold [&_h6]:text-[13px] [&_h6]:font-bold [&_h4]:my-1 [&_h5]:my-1 [&_h6]:my-1 ' +
    '[&_p]:my-1.5 [&_p:first-child]:mt-0 ' +
    '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_li>ul]:my-0.5 [&_li>ol]:my-0.5 ' +
    '[&_strong]:font-semibold [&_strong]:text-gray-900 [&_em]:italic [&_del]:line-through [&_del]:text-gray-500 ' +
    '[&_code]:font-mono [&_code]:text-[0.9em] [&_code]:bg-gray-100 [&_code]:text-pink-700 [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 ' +
    '[&_pre.md-code]:bg-gray-900 [&_pre.md-code]:text-gray-100 [&_pre.md-code]:rounded-md [&_pre.md-code]:p-2.5 [&_pre.md-code]:overflow-x-auto [&_pre.md-code]:my-2 [&_pre.md-code_code]:bg-transparent [&_pre.md-code_code]:text-inherit [&_pre.md-code_code]:p-0 ' +
    '[&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-2.5 [&_blockquote]:text-gray-600 [&_blockquote]:italic [&_blockquote]:my-1.5 ' +
    '[&_hr]:my-3 [&_hr]:border-gray-200 ' +
    '[&_table]:border-collapse [&_table]:my-2 [&_th]:border [&_td]:border [&_th]:border-gray-200 [&_td]:border-gray-200 [&_th]:px-2 [&_td]:px-2 [&_th]:py-1 [&_td]:py-1 [&_th]:bg-gray-50 [&_th]:text-left [&_th]:font-semibold ' +
    '[&_.md-link]:text-indigo-600 [&_.md-link]:underline [&_.md-link]:decoration-dotted [&_.md-link]:cursor-help ' +
    '[&_.md-img]:text-gray-400 [&_.md-img]:italic'

function mdEsc(s: string): string {
    return String(s).replace(/\u0000/g, '�').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function mdInline(raw: string): string {
    const spans: string[] = []
    const stash = (html: string) => { spans.push(html); return '\u0000' + (spans.length - 1) + '\u0000' }
    let s = mdEsc(raw)
    s = s.replace(/(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g, (_m, _t, c: string) => stash('<code>' + c.replace(/^ (?=\S)/, '').replace(/(\S) $/, '$1') + '</code>'))
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]*)(?:\s+[^)]*)?\)/g, (_m, alt: string) => stash('<span class="md-img">[image: ' + (alt || 'no alt text') + ']</span>'))
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+[^)]*)?\)/g, (_m, t: string, u: string) => stash('<span class="md-link" title="' + u + '">' + t + '</span>'))
    s = s.replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, '<strong>$2</strong>')
    s = s.replace(/(^|[^\w*])\*(?=\S)([^*]*?\S)\*(?!\w)/g, '$1<em>$2</em>')
    s = s.replace(/(^|[^\w_])_(?=\S)([^_]*?\S)_(?!\w)/g, '$1<em>$2</em>')
    s = s.replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>')
    s = s.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => spans[+i])
    return s
}

const ITEM_RE = /^(\s*)([-*+]|\d{1,9}[.)])(\s+|$)(.*)$/
const SEP_RE = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/
function indentOf(l: string): number { return (l.match(/^\s*/) as RegExpMatchArray)[0].length }
function splitRow(r: string): string[] {
    r = r.trim()
    if (r.charAt(0) === '|') r = r.slice(1)
    if (r.charAt(r.length - 1) === '|') r = r.slice(0, -1)
    return r.replace(/\\\|/g, '\u0001').split('|').map(c => c.replace(/\u0001/g, '|').trim())
}

export function mdRender(src: string): string {
    const lines = String(src).replace(/\r\n?/g, '\n').split('\n')
    const n = lines.length
    let i = 0
    const out: string[] = []
    let buf: string[] = []
    const flush = () => { if (buf.length) { out.push('<p>' + buf.map(mdInline).join('<br>') + '</p>'); buf = [] } }

    function list(start: number): number {
        interface Item { head: string[]; sub: string[] }
        const items: Item[] = []
        let base: number | null = null
        let ordered = false
        let j = start
        while (j < n) {
            const l = lines[j]
            const m = l.match(ITEM_RE)
            if (m) {
                const ind = m[1].length
                if (base === null) { base = ind; ordered = /^\d/.test(m[2]) }
                if (ind < base) break
                if (ind === base) {
                    if (ordered !== /^\d/.test(m[2])) break
                    items.push({ head: [m[4]], sub: [] }); j++; continue
                }
                items[items.length - 1].sub.push(l); j++; continue
            }
            if (/^\s*$/.test(l)) {
                let k = j
                while (k < n && /^\s*$/.test(lines[k])) k++
                if (k >= n) break
                const km = lines[k].match(ITEM_RE)
                const kind = indentOf(lines[k])
                if (kind >= (base as number) + 2) { items[items.length - 1].sub.push(''); j = k; continue }
                if (km && km[1].length === base) { j = k; continue }
                break
            }
            if (indentOf(l) >= (base as number) + 2) { items[items.length - 1].sub.push(l); j++; continue }
            if (items[items.length - 1].sub.length === 0) { items[items.length - 1].head.push(l.trim()); j++; continue }
            break
        }
        out.push('<' + (ordered ? 'ol' : 'ul') + '>' + items.map(it => {
            const head = it.head.join(' ')
            const task = head.match(/^\[([ xX])\]\s+(.*)$/)
            const h = task ? '<span class="md-task">' + (task[1] === ' ' ? '☐' : '☑') + '</span> ' + mdInline(task[2]) : mdInline(head)
            let sub = ''
            if (it.sub.length) {
                let min = Infinity
                it.sub.forEach(s => { if (s.trim()) min = Math.min(min, indentOf(s)) })
                sub = mdRender(it.sub.map(s => s.slice(Math.min(min, s.length))).join('\n'))
            }
            return '<li>' + h + sub + '</li>'
        }).join('') + '</' + (ordered ? 'ol' : 'ul') + '>')
        return j
    }

    while (i < n) {
        const l = lines[i]
        let m: RegExpMatchArray | null
        if (/^\s*$/.test(l)) { flush(); i++; continue }
        if ((m = l.match(/^\s*(`{3,}|~{3,})\s*([^`\s]*)[^`]*$/))) {
            flush()
            const ch = m[1].charAt(0), len = m[1].length, lang = m[2]
            const code: string[] = []
            i++
            while (i < n) {
                const f = lines[i].match(/^\s*(`{3,}|~{3,})\s*$/)
                if (f && f[1].charAt(0) === ch && f[1].length >= len) break
                code.push(lines[i]); i++
            }
            i++
            out.push('<pre class="md-code"' + (lang ? ' data-lang="' + mdEsc(lang) + '"' : '') + '><code>' + mdEsc(code.join('\n')) + '</code></pre>')
            continue
        }
        if ((m = l.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/))) { flush(); out.push('<h' + m[1].length + '>' + mdInline(m[2]) + '</h' + m[1].length + '>'); i++; continue }
        if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(l)) { flush(); out.push('<hr>'); i++; continue }
        if (/^\s{0,3}>/.test(l)) {
            flush()
            const q: string[] = []
            while (i < n && /^\s{0,3}>/.test(lines[i])) { q.push(lines[i].replace(/^\s{0,3}>\s?/, '')); i++ }
            out.push('<blockquote>' + mdRender(q.join('\n')) + '</blockquote>')
            continue
        }
        if (ITEM_RE.test(l)) { flush(); i = list(i); continue }
        if (i + 1 < n && l.indexOf('|') >= 0 && lines[i + 1].indexOf('---') >= 0 && SEP_RE.test(lines[i + 1]) && splitRow(l).length === splitRow(lines[i + 1]).length) {
            flush()
            const head = splitRow(l)
            const rows: string[][] = []
            i += 2
            while (i < n && lines[i].indexOf('|') >= 0 && !/^\s*$/.test(lines[i])) { rows.push(splitRow(lines[i])); i++ }
            out.push('<table><thead><tr>' + head.map(c => '<th>' + mdInline(c) + '</th>').join('') + '</tr></thead><tbody>' +
                rows.map(r => { while (r.length < head.length) r.push(''); return '<tr>' + r.slice(0, head.length).map(c => '<td>' + mdInline(c) + '</td>').join('') + '</tr>' }).join('') + '</tbody></table>')
            continue
        }
        buf.push(l); i++
    }
    flush()
    return out.join('\n')
}
