'use client'

/* ------------------------------------------------------------------ *
 * Lightweight Markdown → HTML, no dependency.
 *
 * Covers what the trajectory transcripts (model_a_log.md / model_b_log.md)
 * and the task prompts embedded in them actually use: headings, bold and
 * italics, inline and fenced code, rules, block quotes, ordered and
 * unordered lists, links, and pipe tables. Everything is escaped first,
 * so the markdown is rendered, never executed.
 * ------------------------------------------------------------------ */

export function escapeHtml(s: string): string {
    return String(s ?? '').replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
    ))
}

function inline(t: string): string {
    let s = escapeHtml(t)
    s = s.replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-pink-700 rounded px-1 py-0.5 text-[11px] font-mono">$1</code>')
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    s = s.replace(/__([^_]+)__/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">$1</a>')
    return s
}

function isTableSeparator(line: string): boolean {
    return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line)
}

function splitRow(line: string): string[] {
    return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim())
}

export function renderMarkdown(md: string): string {
    if (!md || !md.trim()) return ''

    // Pull fenced code blocks out first so their contents aren't reprocessed.
    const blocks: string[] = []
    const src = md.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, _lang, code: string) => {
        const idx = blocks.length
        blocks.push(
            `<pre class="bg-gray-900 text-gray-100 rounded px-3 py-2.5 overflow-x-auto text-[11px] leading-[1.5] font-mono my-2 whitespace-pre-wrap break-words">` +
            `<code>${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`,
        )
        return `@@CB${idx}@@`
    })

    const lines = src.split('\n')
    const out: string[] = []
    let listType: 'ul' | 'ol' | null = null
    const closeList = () => { if (listType) { out.push(`</${listType}>`); listType = null } }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        const cb = line.match(/^@@CB(\d+)@@$/)
        if (cb) { closeList(); out.push(blocks[Number(cb[1])]); continue }
        if (/^\s*$/.test(line)) { closeList(); continue }

        // Pipe table: a header row followed by a --- separator row.
        if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
            closeList()
            const head = splitRow(line)
            const body: string[][] = []
            let j = i + 2
            while (j < lines.length && lines[j].includes('|') && lines[j].trim()) {
                body.push(splitRow(lines[j])); j++
            }
            i = j - 1
            out.push(
                '<div class="overflow-x-auto my-2"><table class="text-[11px] border-collapse border border-gray-200">' +
                '<thead class="bg-gray-50"><tr>' +
                head.map(h => `<th class="border border-gray-200 px-2 py-1 text-left font-semibold text-gray-600">${inline(h)}</th>`).join('') +
                '</tr></thead><tbody>' +
                body.map(r => '<tr>' + r.map(c => `<td class="border border-gray-200 px-2 py-1 align-top text-gray-700">${inline(c)}</td>`).join('') + '</tr>').join('') +
                '</tbody></table></div>',
            )
            continue
        }

        let m: RegExpMatchArray | null
        if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
            closeList()
            const lvl = Math.min(6, m[1].length)
            const size = lvl <= 1 ? 'text-[15px]' : lvl === 2 ? 'text-[13.5px]' : 'text-[12.5px]'
            out.push(`<div class="${size} font-bold text-gray-900 mt-3 mb-1.5">${inline(m[2])}</div>`)
            continue
        }
        if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { closeList(); out.push('<hr class="my-3 border-gray-200"/>'); continue }
        if ((m = line.match(/^\s*>\s?(.*)$/))) {
            closeList()
            out.push(`<blockquote class="border-l-2 border-gray-300 pl-2.5 text-gray-600 italic my-1.5">${inline(m[1])}</blockquote>`)
            continue
        }
        if ((m = line.match(/^\s*[-*+]\s+(.*)$/))) {
            if (listType !== 'ul') { closeList(); out.push('<ul class="list-disc pl-5 my-1.5 space-y-0.5">'); listType = 'ul' }
            out.push(`<li>${inline(m[1])}</li>`)
            continue
        }
        if ((m = line.match(/^\s*\d+\.\s+(.*)$/))) {
            if (listType !== 'ol') { closeList(); out.push('<ol class="list-decimal pl-5 my-1.5 space-y-0.5">'); listType = 'ol' }
            out.push(`<li>${inline(m[1])}</li>`)
            continue
        }
        closeList()
        out.push(`<p class="my-1 leading-relaxed">${inline(line)}</p>`)
    }
    closeList()
    return out.join('')
}

/**
 * Wraps every case-insensitive hit of `query` in `<mark>`, without touching markup —
 * splits on tags first and only searches the text segments between them, so a query
 * that happens to match inside an href or a class name is left alone. Used for search
 * over an already-rendered markdown document, where the text isn't one plain string.
 */
export function highlightHtml(html: string, query: string): string {
    const q = query.trim()
    if (!q) return html
    let re: RegExp
    try { re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi') } catch { return html }
    return html
        .split(/(<[^>]+>)/g)
        .map(part => part.startsWith('<') ? part : part.replace(re, m => `<mark class="bg-yellow-200 rounded-[2px] px-0.5">${m}</mark>`))
        .join('')
}
