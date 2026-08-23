'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
    LayoutGrid, Plus, RefreshCw, X, Check, Trash2, Download, Link2, Clock,
    ClipboardPaste, User, ImageIcon, ExternalLink, BookOpen, Users,
} from 'lucide-react'

const CLAUDE_GUIDELINES_URL = 'https://claude.ai/public/artifacts/6a5b6ad0-2c4c-402c-a433-50d0c49e0422'

/** Admin = userRole 'admin' or a wildcard '*' in roles (localStorage). */
function isAdminUser(): boolean {
    try {
        if (localStorage.getItem('userRole') === 'admin') return true
        const roles = JSON.parse(localStorage.getItem('roles') || '[]')
        return Array.isArray(roles) && roles.includes('*')
    } catch { return false }
}
import {
    getDeckContributors, createDeckContributor, updateDeckContributor,
    getDeckTasks, getDeckTask, createDeckTask, updateDeckTask, deleteDeckTask,
    addDeckTaskMedia, deleteDeckTaskMedia,
} from '@/app/api_handlers/api/deck-grading.api'

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */
interface Contributor { id: string; name: string; is_available?: boolean }
interface MediaItem { id: string; name: string; dataUrl: string; _pending?: boolean; _status?: 'uploading' | 'uploaded' | 'failed' }
interface RubricSection {
    key: string
    professionalSetting: 'yes' | 'no' | ''
    visualScore: number | null
    visualReason: string
}
interface Rational { count: number; sections: RubricSection[] }
interface DeckTask {
    id: string
    title: string | null
    link: string | null
    contributor_id: string | null
    contributor_name?: string | null
    media?: MediaItem[]
    media_count?: number
    rational: Rational
    status: 'claim' | 'submitted'
    time_to_complete_mins: number | null
    started_at: string | null
    createdAt?: string
}

const STATUSES = [
    { value: 'claim', label: 'Claim', cls: 'bg-sky-100 text-sky-700 border-sky-300' },
    { value: 'submitted', label: 'Submitted', cls: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
]

/* ------------------------------------------------------------------ *
 * Rubric helpers
 * ------------------------------------------------------------------ */
const sectionKey = (i: number) => {
    // A..Z, then AA, AB… (rarely needed)
    let s = '', n = i
    do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1 } while (n >= 0)
    return s
}
const emptySection = (i: number): RubricSection => ({ key: sectionKey(i), professionalSetting: '', visualScore: null, visualReason: '' })
function buildSections(count: number, existing: RubricSection[] = []): RubricSection[] {
    return Array.from({ length: count }, (_, i) => {
        const prev = existing[i]
        return prev ? { ...prev, key: sectionKey(i) } : emptySection(i)
    })
}
function normalizeRational(raw: any): Rational {
    const count = typeof raw?.count === 'number' && raw.count > 0 ? raw.count : 1
    const sections = Array.isArray(raw?.sections) ? raw.sections : []
    return { count, sections: buildSections(count, sections) }
}

/* ------------------------------------------------------------------ *
 * ZIP (dependency-free, "stored" / no-compression — images are already
 * compressed, so this keeps it simple and reliable).
 * ------------------------------------------------------------------ */
function crc32(bytes: Uint8Array): number {
    let c = ~0
    for (let i = 0; i < bytes.length; i++) {
        c ^= bytes[i]
        for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1))
    }
    return (~c) >>> 0
}
function dataUrlToBytes(dataUrl: string): Uint8Array {
    const comma = dataUrl.indexOf(',')
    const b64 = dataUrl.slice(comma + 1)
    const bin = atob(b64)
    const arr = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
    return arr
}
function makeZip(files: { name: string; bytes: Uint8Array }[]): Blob {
    const enc = new TextEncoder()
    const chunks: Uint8Array[] = []
    const central: Uint8Array[] = []
    let offset = 0
    const u16 = (n: number) => new Uint8Array([n & 0xff, (n >> 8) & 0xff])
    const u32 = (n: number) => new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff])

    files.forEach(f => {
        const nameBytes = enc.encode(f.name)
        const crc = crc32(f.bytes)
        const size = f.bytes.length
        // Local file header
        const local = concat([
            u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
            u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0),
            nameBytes, f.bytes,
        ])
        chunks.push(local)
        // Central directory header
        central.push(concat([
            u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
            u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0),
            u32(0), u32(offset), nameBytes,
        ]))
        offset += local.length
    })
    const centralStart = offset
    let centralSize = 0
    central.forEach(c => { chunks.push(c); centralSize += c.length })
    const end = concat([
        u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
        u32(centralSize), u32(centralStart), u16(0),
    ])
    chunks.push(end)
    return new Blob(chunks as BlobPart[], { type: 'application/zip' })
}
function concat(parts: Uint8Array[]): Uint8Array {
    const total = parts.reduce((s, p) => s + p.length, 0)
    const out = new Uint8Array(total)
    let o = 0
    for (const p of parts) { out.set(p, o); o += p.length }
    return out
}
function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function extFromDataUrl(dataUrl: string): string {
    const m = /^data:image\/([a-zA-Z0-9.+-]+)/.exec(dataUrl)
    const raw = (m?.[1] || 'png').toLowerCase()
    return raw === 'jpeg' ? 'jpg' : raw.replace(/[^a-z0-9]/g, '') || 'png'
}

/* ------------------------------------------------------------------ *
 * Countdown helpers
 * ------------------------------------------------------------------ */
function remainingMs(task: { started_at: string | null; time_to_complete_mins: number | null }): number | null {
    if (!task.started_at || !task.time_to_complete_mins) return null
    const end = new Date(task.started_at).getTime() + task.time_to_complete_mins * 60_000
    return end - Date.now()
}
function fmtRemaining(ms: number): string {
    const over = ms < 0
    let s = Math.floor(Math.abs(ms) / 1000)
    const h = Math.floor(s / 3600); s -= h * 3600
    const m = Math.floor(s / 60); s -= m * 60
    const body = h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`
    return over ? `-${body} overdue` : body
}

/* ------------------------------------------------------------------ *
 * Contributor creatable dropdown
 * ------------------------------------------------------------------ */
function ContributorPicker({ contributors, value, onChange, onCreated }: {
    contributors: Contributor[]
    value: string | null
    onChange: (id: string | null) => void
    onCreated: (c: Contributor) => void
}) {
    const [adding, setAdding] = useState(false)
    const [name, setName] = useState('')
    const [busy, setBusy] = useState(false)
    const add = async () => {
        const clean = name.trim()
        if (!clean) return
        setBusy(true)
        try {
            const res: any = await createDeckContributor(clean)
            const c = res?.data ?? res
            if (c?.id) { onCreated(c); onChange(c.id) }
            setName(''); setAdding(false)
        } finally { setBusy(false) }
    }
    if (adding) return (
        <div className="flex items-center gap-1">
            <input autoFocus value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') { setAdding(false); setName('') } }}
                placeholder="New contributor name…"
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-400 w-44" />
            <button onClick={add} disabled={busy || !name.trim()} className="text-[11px] bg-indigo-600 text-white rounded px-2 py-1 hover:bg-indigo-700 disabled:opacity-40">Add</button>
            <button onClick={() => { setAdding(false); setName('') }} className="text-gray-400 hover:text-gray-700"><X size={13} /></button>
        </div>
    )
    return (
        <div className="flex items-center gap-1">
            <select value={value || ''} onChange={e => onChange(e.target.value || null)}
                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-indigo-400 min-w-[160px]">
                <option value="">— unassigned —</option>
                {contributors.map(c => <option key={c.id} value={c.id}>{c.name}{c.is_available === false ? ' (away)' : ''}</option>)}
            </select>
            <button onClick={() => setAdding(true)} title="Add new contributor"
                className="flex items-center gap-0.5 text-[11px] border border-gray-300 rounded px-1.5 py-1 text-gray-600 hover:bg-gray-50"><Plus size={12} /> New</button>
        </div>
    )
}

/* ------------------------------------------------------------------ *
 * Media paste + download
 * ------------------------------------------------------------------ */
function MediaBox({ taskId, media, onChange }: { taskId: string | null; media: MediaItem[]; onChange: (m: MediaItem[]) => void }) {
    const [active, setActive] = useState(false)
    // Keep a ref so async FileReader / upload callbacks always work off the latest list.
    const mediaRef = useRef(media); mediaRef.current = media
    const set = (m: MediaItem[]) => { mediaRef.current = m; onChange(m) }

    const patch = (id: string, p: Partial<MediaItem>) => set(mediaRef.current.map(m => m.id === id ? { ...m, ...p } : m))
    const uploadItem = (tmpId: string, name: string, dataUrl: string) => {
        if (!taskId) return
        patch(tmpId, { _status: 'uploading' })
        addDeckTaskMedia(taskId, { name, dataUrl }).then((res: any) => {
            const saved = res?.data ?? res
            if (saved?.id) {
                // Swap the temp entry for the saved one; flash "uploaded" then clear.
                set(mediaRef.current.map(m => m.id === tmpId ? { ...saved, _status: 'uploaded' } : m))
                const newId = saved.id
                setTimeout(() => patch(newId, { _status: undefined }), 1500)
            } else {
                patch(tmpId, { _status: 'failed' })
            }
        }).catch(() => patch(tmpId, { _status: 'failed' }))
    }
    const readFiles = (files: FileList | File[]) => {
        const imgs = Array.from(files).filter(f => f.type.startsWith('image/'))
        imgs.forEach(file => {
            const reader = new FileReader()
            reader.onload = () => {
                const dataUrl = String(reader.result || '')
                if (!dataUrl.startsWith('data:image/')) return
                const name = file.name || `image.${extFromDataUrl(dataUrl)}`
                const id = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
                if (taskId) {
                    // Task exists → append locally, then upload this one image (its own request).
                    set([...mediaRef.current, { id, name, dataUrl, _status: 'uploading' }])
                    uploadItem(id, name, dataUrl)
                } else {
                    // No task yet → hold locally; uploaded one-by-one after the first save.
                    set([...mediaRef.current, { id, name, dataUrl, _pending: true }])
                }
            }
            reader.readAsDataURL(file)
        })
    }
    const retry = (m: MediaItem) => uploadItem(m.id, m.name, m.dataUrl)
    const onPaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items
        if (!items) return
        const files: File[] = []
        for (const it of Array.from(items)) { if (it.type.startsWith('image/')) { const f = it.getAsFile(); if (f) files.push(f) } }
        if (files.length) { e.preventDefault(); readFiles(files) }
    }
    const removeAt = (item: MediaItem) => {
        // Delete from the server only for items that actually exist there — i.e. saved
        // (no status, or the transient "uploaded"). Skip pending / uploading / failed temps.
        const savedOnServer = taskId && !item._pending && item._status !== 'uploading' && item._status !== 'failed'
        if (savedOnServer) deleteDeckTaskMedia(taskId!, item.id).catch(() => { })
        set(media.filter(m => m.id !== item.id))
    }
    const downloadOne = (m: MediaItem, idx: number) => {
        triggerDownload(new Blob([dataUrlToBytes(m.dataUrl) as BlobPart], { type: 'application/octet-stream' }), safeName(m, idx))
    }
    const downloadAll = () => {
        if (!media.length) return
        const files = media.map((m, i) => ({ name: safeName(m, i), bytes: dataUrlToBytes(m.dataUrl) }))
        triggerDownload(makeZip(files), `deck-media-${Date.now()}.zip`)
    }
    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Media ({media.length})</span>
                <button type="button" onClick={downloadAll} disabled={!media.length}
                    className="flex items-center gap-1 text-[11px] border border-gray-300 rounded px-2 py-0.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                    <Download size={12} /> Download all (zip)
                </button>
            </div>
            <div tabIndex={0} onPaste={onPaste}
                onFocus={() => setActive(true)} onBlur={() => setActive(false)}
                className={`rounded border-2 border-dashed px-3 py-3 text-center outline-none transition-colors ${active ? 'border-indigo-400 bg-indigo-50/40' : 'border-gray-300 bg-gray-50'}`}>
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
                    <ClipboardPaste size={13} /> Click here, then press <kbd className="px-1 border rounded bg-white">Ctrl</kbd>+<kbd className="px-1 border rounded bg-white">V</kbd> to paste images
                </div>
                {!taskId && (
                    <div className="text-[10px] text-gray-400 mt-1">Images upload one-by-one after the task is first saved.</div>
                )}
            </div>
            {media.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                    {media.map((m, i) => (
                        <div key={m.id} className="relative group border border-gray-200 rounded overflow-hidden bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={m.dataUrl} alt={m.name} className="w-full h-20 object-cover" />
                            {(m._pending || m._status) && (
                                <div className={`absolute inset-0 flex flex-col items-center justify-center gap-1 text-[9px] font-medium ${m._status === 'failed' ? 'bg-red-50/80 text-red-600' : m._status === 'uploaded' ? 'bg-emerald-50/70 text-emerald-700' : 'bg-white/70 text-gray-600'}`}>
                                    {m._status === 'uploading' && <span className="flex items-center gap-1"><RefreshCw size={10} className="animate-spin" /> uploading…</span>}
                                    {m._status === 'uploaded' && <span className="flex items-center gap-1"><Check size={10} /> uploaded</span>}
                                    {m._status === 'failed' && <>
                                        <span className="flex items-center gap-1"><X size={10} /> failed</span>
                                        <button type="button" onClick={() => retry(m)} className="px-1.5 py-0.5 rounded border border-red-300 bg-white text-red-600 hover:bg-red-50">Retry</button>
                                    </>}
                                    {m._pending && !m._status && <span>pending save</span>}
                                </div>
                            )}
                            <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100">
                                <button type="button" onClick={() => downloadOne(m, i)} title="Download"
                                    className="p-0.5 rounded bg-white/90 border border-gray-200 text-gray-500 hover:text-indigo-600"><Download size={11} /></button>
                                <button type="button" onClick={() => removeAt(m)} title="Remove"
                                    className="p-0.5 rounded bg-white/90 border border-gray-200 text-red-400 hover:text-red-600"><X size={11} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
function safeName(m: MediaItem, idx: number): string {
    const ext = extFromDataUrl(m.dataUrl)
    const base = (m.name || '').replace(/\.[a-z0-9]+$/i, '').replace(/[^\w-]+/g, '_').slice(0, 40) || `image_${idx + 1}`
    return `${String(idx + 1).padStart(2, '0')}_${base}.${ext}`
}

/* ------------------------------------------------------------------ *
 * One rubric section (matches the grading form layout)
 * ------------------------------------------------------------------ */
function SectionCard({ section, onChange }: { section: RubricSection; onChange: (patch: Partial<RubricSection>) => void }) {
    return (
        <div className="border border-gray-200 rounded-lg p-3 bg-white space-y-3">
            <div className="text-[11px] font-bold text-indigo-700">Section {section.key}</div>

            <div>
                <p className="text-[11px] font-medium text-gray-700 mb-1">Could this presentation reasonably be created as part of someone&apos;s job or professional workflow? <span className="text-red-500">*</span></p>
                <div className="flex gap-2">
                    {[{ v: 'yes', l: 'Yes - professional setting' }, { v: 'no', l: 'No - personal setting' }].map(o => (
                        <button key={o.v} type="button" onClick={() => onChange({ professionalSetting: o.v as any })}
                            className={`text-[11px] px-2.5 py-1 rounded border ${section.professionalSetting === o.v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                            {o.l}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <p className="text-[11px] font-medium text-gray-700 mb-1">How would you score the slide deck&apos;s overall visual/aesthetic quality? <span className="text-red-500">*</span></p>
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6, 7].map(n => (
                        <button key={n} type="button" onClick={() => onChange({ visualScore: section.visualScore === n ? null : n })}
                            className={`w-8 py-1 text-[11px] rounded border ${section.visualScore === n ? 'bg-indigo-600 text-white border-indigo-600 font-bold' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                            {n}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <p className="text-[11px] font-medium text-gray-700 mb-1">Briefly describe your rationale. Why did you give this score?</p>
                <textarea value={section.visualReason} onChange={e => onChange({ visualReason: e.target.value })}
                    placeholder="Visual quality reason"
                    className="w-full h-24 text-[11px] border border-gray-300 rounded px-2 py-1.5 resize-y focus:outline-none focus:border-indigo-400" />
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ *
 * Task editor (full-screen modal)
 * ------------------------------------------------------------------ */
function TaskEditor({ task, contributors, onCreated, onSaved, onClose, onContributorCreated }: {
    task: DeckTask | null // null = creating
    contributors: Contributor[]
    onCreated: (t: DeckTask) => void
    onSaved: () => void
    onClose: () => void
    onContributorCreated: (c: Contributor) => void
}) {
    const [title, setTitle] = useState(task?.title || '')
    const [link, setLink] = useState(task?.link || '')
    const [contributorId, setContributorId] = useState<string | null>(task?.contributor_id || null)
    const [media, setMedia] = useState<MediaItem[]>(task?.media || [])
    const [rational, setRational] = useState<Rational>(normalizeRational(task?.rational))
    const [status, setStatus] = useState<'claim' | 'submitted'>(task?.status || 'claim')
    const [mins, setMins] = useState<string>(task?.time_to_complete_mins != null ? String(task.time_to_complete_mins) : '')
    const [savedId, setSavedId] = useState<string | null>(task?.id ?? null)
    const [startedAt, setStartedAt] = useState<string | null>(task?.started_at ?? null)
    const [saving, setSaving] = useState(false)
    const [loadingMedia, setLoadingMedia] = useState(!!task && task.media === undefined)

    // Full task (incl. media) is loaded lazily when opening an existing task.
    useEffect(() => {
        if (task && task.media === undefined) {
            getDeckTask(task.id).then((res: any) => {
                const full = res?.data ?? res
                if (full) { setMedia(Array.isArray(full.media) ? full.media : []); setRational(normalizeRational(full.rational)); setStartedAt(full.started_at ?? null) }
            }).finally(() => setLoadingMedia(false))
        }
    }, [task])

    // Live countdown
    const [, force] = useState(0)
    useEffect(() => {
        if (status === 'submitted') return
        const h = setInterval(() => force(x => x + 1), 1000)
        return () => clearInterval(h)
    }, [status])

    // Section layout + quick-jump.
    const [layout, setLayout] = useState<'vertical' | 'horizontal'>(() => {
        try { return (localStorage.getItem('deck_section_layout') as any) === 'horizontal' ? 'horizontal' : 'vertical' } catch { return 'vertical' }
    })
    useEffect(() => { try { localStorage.setItem('deck_section_layout', layout) } catch { /* ignore */ } }, [layout])
    const [activeSec, setActiveSec] = useState(0)
    const secRefs = useRef<(HTMLDivElement | null)[]>([])
    const jumpTo = (i: number) => {
        setActiveSec(i)
        secRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }

    const setCount = (count: number) => {
        setRational(r => ({ count, sections: buildSections(count, r.sections) }))
        setActiveSec(a => Math.min(a, count - 1))
    }
    const setSection = (i: number, patch: Partial<RubricSection>) =>
        setRational(r => ({ ...r, sections: r.sections.map((s, idx) => idx === i ? { ...s, ...patch } : s) }))

    // Media is managed via its own endpoints — never sent in the task payload.
    const payload = () => ({
        title: title.trim() || null,
        link: link.trim() || null,
        contributor_id: contributorId,
        rational,
        status,
        time_to_complete_mins: mins.trim() ? Number(mins) : null,
    })

    const save = async () => {
        setSaving(true)
        try {
            if (savedId) {
                await updateDeckTask(savedId, payload())
            } else {
                const res: any = await createDeckTask(payload())
                const created = res?.data ?? res
                if (created?.id) {
                    setSavedId(created.id); setStartedAt(created.started_at ?? null); onCreated(created)
                    // Upload any images pasted before the first save, one request each.
                    const pending = media.filter(m => m._pending)
                    const saved: MediaItem[] = []
                    for (const m of pending) {
                        try {
                            const r: any = await addDeckTaskMedia(created.id, { name: m.name, dataUrl: m.dataUrl })
                            const item = r?.data ?? r
                            if (item?.id) saved.push(item)
                        } catch { /* skip failed upload */ }
                    }
                    setMedia(prev => prev.filter(m => !m._pending).concat(saved))
                }
            }
            onSaved()
        } finally { setSaving(false) }
    }

    const rem = startedAt ? remainingMs({ started_at: startedAt, time_to_complete_mins: mins.trim() ? Number(mins) : null }) : null

    return (
        <div className="fixed inset-0 z-[9995] bg-white flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200 bg-gray-50 shrink-0">
                <LayoutGrid size={15} className="text-indigo-500 shrink-0" />
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title…"
                    className="text-sm font-semibold text-gray-800 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-400 w-72" />
                {/* Countdown */}
                {status === 'submitted' ? (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded border bg-emerald-100 text-emerald-700 border-emerald-300">Submitted</span>
                ) : rem != null ? (
                    <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border ${rem < 0 ? 'bg-red-100 text-red-700 border-red-300' : 'bg-amber-100 text-amber-700 border-amber-300'}`}>
                        <Clock size={11} /> {fmtRemaining(rem)}
                    </span>
                ) : !savedId ? (
                    <span className="text-[10px] text-gray-400">timer starts when saved</span>
                ) : null}
                <div className="flex-1" />
                <span className="text-[10px] text-gray-400">{saving ? 'Saving…' : ''}</span>
                <button onClick={save} disabled={saving}
                    className="flex items-center gap-1 text-[12px] bg-emerald-600 text-white rounded px-3 py-1.5 hover:bg-emerald-700 disabled:opacity-40">
                    <Check size={13} /> Save
                </button>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-700 ml-1"><X size={16} /></button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="max-w-3xl mx-auto space-y-4">
                    {/* Meta row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Contributor</span>
                            <ContributorPicker contributors={contributors} value={contributorId} onChange={setContributorId} onCreated={onContributorCreated} />
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Status</span>
                            <select value={status} onChange={e => setStatus(e.target.value as any)}
                                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-indigo-400 w-40">
                                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </label>
                        <label className="flex flex-col gap-1 sm:col-span-2">
                            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Link</span>
                            <div className="flex items-center gap-1.5">
                                <Link2 size={13} className="text-gray-400 shrink-0" />
                                <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://…"
                                    className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-400" />
                            </div>
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Time to complete (mins)</span>
                            <input type="number" min={1} value={mins} onChange={e => setMins(e.target.value)} placeholder="e.g. 30"
                                className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-400 w-40" />
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Rationale sections</span>
                            <select value={rational.count} onChange={e => setCount(Number(e.target.value))}
                                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-indigo-400 w-40">
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} section{n > 1 ? 's' : ''}</option>)}
                            </select>
                        </label>
                    </div>

                    {/* Media */}
                    {loadingMedia ? (
                        <div className="flex items-center gap-2 text-gray-400 text-xs py-2"><RefreshCw size={12} className="animate-spin" /> Loading media…</div>
                    ) : (
                        <MediaBox taskId={savedId} media={media} onChange={setMedia} />
                    )}
                    </div>

                    {/* Rationale sections — full width (uses all available horizontal space) */}
                    <div className="space-y-2 mt-4">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Rationale</span>
                            {/* Jump-to-section bar */}
                            <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
                                {rational.sections.map((s, i) => (
                                    <button key={i} type="button" onClick={() => jumpTo(i)}
                                        className={`w-7 h-6 text-[11px] rounded-md transition-colors ${activeSec === i ? 'bg-white shadow-sm text-gray-800 font-semibold' : 'text-gray-400 hover:text-gray-600'}`}>
                                        {s.key}
                                    </button>
                                ))}
                            </div>
                            <div className="flex-1" />
                            {/* Layout toggle */}
                            <div className="flex items-center gap-0.5 border border-gray-300 rounded p-0.5">
                                {(['vertical', 'horizontal'] as const).map(l => (
                                    <button key={l} type="button" onClick={() => setLayout(l)}
                                        className={`text-[10px] px-2 py-0.5 rounded capitalize ${layout === l ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {layout === 'horizontal' ? (
                            <div className="flex gap-3 overflow-x-auto pb-2">
                                {rational.sections.map((s, i) => (
                                    <div key={i} ref={el => { secRefs.current[i] = el }}
                                        className={`min-w-[320px] max-w-[360px] shrink-0 rounded-lg ${activeSec === i ? 'ring-2 ring-indigo-300' : ''}`}>
                                        <SectionCard section={s} onChange={patch => setSection(i, patch)} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {rational.sections.map((s, i) => (
                                    <div key={i} ref={el => { secRefs.current[i] = el }}
                                        className={`rounded-lg ${activeSec === i ? 'ring-2 ring-indigo-300' : ''}`}>
                                        <SectionCard section={s} onChange={patch => setSection(i, patch)} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
    )
}

/* ------------------------------------------------------------------ *
 * Page — task list
 * ------------------------------------------------------------------ */
function useCountdownTick() {
    const [, set] = useState(0)
    useEffect(() => { const h = setInterval(() => set(x => x + 1), 1000); return () => clearInterval(h) }, [])
}

export default function DeckGradingPage() {
    const [tasks, setTasks] = useState<DeckTask[]>([])
    const [contributors, setContributors] = useState<Contributor[]>([])
    const [loading, setLoading] = useState(false)
    const [contributorFilter, setContributorFilter] = useState('all')
    const [editor, setEditor] = useState<{ task: DeckTask | null } | null>(null)
    const [admin] = useState<boolean>(() => isAdminUser())
    useCountdownTick() // keep the list's remaining-time column ticking

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res: any = await getDeckTasks(contributorFilter)
            const list = res?.data ?? res
            setTasks(Array.isArray(list) ? list : [])
        } finally { setLoading(false) }
    }, [contributorFilter])
    useEffect(() => { load() }, [load])

    const loadContributors = useCallback(async () => {
        const res: any = await getDeckContributors()
        const list = res?.data ?? res
        setContributors(Array.isArray(list) ? list : [])
    }, [])
    useEffect(() => { loadContributors() }, [loadContributors])

    const onContributorCreated = (c: Contributor) => setContributors(prev => prev.some(x => x.id === c.id) ? prev : [...prev, c].sort((a, b) => a.name.localeCompare(b.name)))

    // Availability
    const [showContribs, setShowContribs] = useState(false)
    const contribsRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (!showContribs) return
        const h = (e: MouseEvent) => { if (contribsRef.current && !contribsRef.current.contains(e.target as Node)) setShowContribs(false) }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [showContribs])
    const availById = new Map(contributors.map(c => [c.id, c.is_available !== false]))
    const toggleAvailability = async (c: Contributor) => {
        const next = !(c.is_available !== false)
        setContributors(prev => prev.map(x => x.id === c.id ? { ...x, is_available: next } : x))
        try { await updateDeckContributor(c.id, { is_available: next }) } catch { loadContributors() }
    }
    const availableCount = contributors.filter(c => c.is_available !== false).length

    const removeTask = async (id: string) => {
        if (!admin) return
        if (!confirm('Delete this task?')) return
        await deleteDeckTask(id)
        load()
    }

    // Download the static guideline images (public/deck-guidelines/) as a single zip.
    const [dlBusy, setDlBusy] = useState(false)
    const downloadGuidelines = async () => {
        setDlBusy(true)
        try {
            const res = await fetch('/deck-guidelines/manifest.json', { cache: 'no-store' })
            if (!res.ok) throw new Error('manifest')
            const names: string[] = await res.json()
            if (!Array.isArray(names) || names.length === 0) {
                alert('No images yet. Drop your pictures into public/deck-guidelines/ and list their file names in manifest.json.')
                return
            }
            const files: { name: string; bytes: Uint8Array }[] = []
            for (const name of names) {
                const r = await fetch(`/deck-guidelines/${encodeURIComponent(name)}`, { cache: 'no-store' })
                if (!r.ok) continue
                files.push({ name, bytes: new Uint8Array(await r.arrayBuffer()) })
            }
            if (!files.length) { alert('Could not load any images listed in public/deck-guidelines/manifest.json.'); return }
            triggerDownload(makeZip(files), 'deck-guidelines.zip')
        } catch {
            alert('Add a public/deck-guidelines/ folder with your images and a manifest.json listing them.')
        } finally { setDlBusy(false) }
    }

    const contributorName = (id: string | null) => (id ? contributors.find(c => c.id === id)?.name ?? null : null)

    return (
        <div className="p-3 bg-white h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-2 shrink-0">
                <div className="flex items-center gap-2">
                    <LayoutGrid size={14} className="text-gray-500" />
                    <h1 className="text-sm font-semibold text-gray-800">Deck Grading Tasks</h1>
                    <span className="text-[10px] text-gray-400">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400">contributor</span>
                        <select value={contributorFilter} onChange={e => setContributorFilter(e.target.value)}
                            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-indigo-400 text-gray-700 min-w-[160px]">
                            <option value="all">All contributors</option>
                            <option value="none">Unassigned</option>
                            {contributors.map(c => <option key={c.id} value={c.id}>{c.name}{c.is_available === false ? ' (away)' : ''}</option>)}
                        </select>
                    </div>
                    {/* Contributor availability */}
                    <div className="relative" ref={contribsRef}>
                        <button onClick={() => setShowContribs(v => !v)}
                            title="Contributor availability"
                            className={`flex items-center gap-1 text-xs border rounded px-2 py-1 ${showContribs ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                            <Users size={12} /> Availability
                            <span className="text-[10px] text-emerald-600 font-semibold">{availableCount}</span>
                            <span className="text-[10px] text-gray-400">/ {contributors.length}</span>
                        </button>
                        {showContribs && (
                            <div className="absolute right-0 top-full mt-1 z-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-64 max-h-80 overflow-y-auto">
                                <div className="px-3 py-1 text-[9px] uppercase font-semibold text-gray-400">Who&apos;s available</div>
                                {contributors.length === 0 && <div className="px-3 py-2 text-[11px] text-gray-400">No contributors yet.</div>}
                                {contributors.map(c => {
                                    const avail = c.is_available !== false
                                    return (
                                        <div key={c.id} className={`flex items-center gap-2 px-3 py-1.5 ${avail ? '' : 'bg-gray-50'}`}>
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${avail ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                            <span className={`flex-1 text-[11px] truncate ${avail ? 'text-gray-800' : 'text-gray-400 line-through'}`}>{c.name}</span>
                                            <button onClick={() => toggleAvailability(c)}
                                                className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${avail ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                                                {avail ? 'Available' : 'Away'}
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                    <a href={CLAUDE_GUIDELINES_URL} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs border border-amber-300 text-amber-700 rounded px-2 py-1 hover:bg-amber-50">
                        <BookOpen size={12} /> Claude Guidelines <ExternalLink size={10} />
                    </a>
                    <button onClick={downloadGuidelines} disabled={dlBusy}
                        title="Download Tasks Guidlines Pictures"
                        className="flex items-center gap-1 text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50 text-gray-600">
                        {dlBusy ? <RefreshCw size={11} className="animate-spin" /> : <Download size={12} />} Download Guidlines
                    </button>
                    <button onClick={() => load()} disabled={loading}
                        className="flex items-center gap-1 text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50 text-gray-600">
                        <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button onClick={() => setEditor({ task: null })}
                        className="flex items-center gap-1 text-xs bg-indigo-600 text-white rounded px-2.5 py-1 hover:bg-indigo-700">
                        <Plus size={13} /> New Task
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 border border-gray-200 rounded">
                {loading && tasks.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-gray-400 text-xs"><RefreshCw size={14} className="animate-spin" /> Loading tasks…</div>
                ) : tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-400 text-xs">
                        <LayoutGrid size={20} className="text-gray-300" />
                        No tasks yet. Click <span className="font-medium text-indigo-600">New Task</span> to start.
                    </div>
                ) : (
                    <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr className="text-left text-gray-500">
                                <th className="px-3 py-1.5 font-medium">Title</th>
                                <th className="px-3 py-1.5 font-medium">Contributor</th>
                                <th className="px-3 py-1.5 font-medium">Sections</th>
                                <th className="px-3 py-1.5 font-medium">Media</th>
                                <th className="px-3 py-1.5 font-medium">Status</th>
                                <th className="px-3 py-1.5 font-medium">Time left</th>
                                <th className="px-3 py-1.5 font-medium w-8"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map(t => {
                                const st = STATUSES.find(s => s.value === t.status)
                                const rem = t.status === 'submitted' ? null : remainingMs(t)
                                return (
                                    <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                                        onClick={() => setEditor({ task: t })}>
                                        <td className="px-3 py-1.5 font-medium text-gray-800">{t.title || <span className="text-gray-300">Untitled</span>}</td>
                                        <td className="px-3 py-1.5">
                                            {t.contributor_name || contributorName(t.contributor_id)
                                                ? (() => {
                                                    const avail = t.contributor_id ? availById.get(t.contributor_id) !== false : true
                                                    return (
                                                        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${avail ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}
                                                            title={avail ? 'Available' : 'Away'}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${avail ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                                            {t.contributor_name || contributorName(t.contributor_id)}
                                                        </span>
                                                    )
                                                })()
                                                : <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="px-3 py-1.5 text-gray-500">{t.rational?.count ?? 1}</td>
                                        <td className="px-3 py-1.5 text-gray-500">
                                            {t.media_count ? <span className="inline-flex items-center gap-0.5"><ImageIcon size={11} /> {t.media_count}</span> : <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="px-3 py-1.5">
                                            {st && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${st.cls}`}>{st.label}</span>}
                                        </td>
                                        <td className="px-3 py-1.5">
                                            {t.status === 'submitted'
                                                ? <span className="text-emerald-600">—</span>
                                                : rem != null
                                                    ? <span className={rem < 0 ? 'text-red-600 font-medium' : 'text-amber-600'}>{fmtRemaining(rem)}</span>
                                                    : <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="px-3 py-1.5">
                                            {admin && (
                                                <button onClick={e => { e.stopPropagation(); removeTask(t.id) }} title="Delete"
                                                    className="p-0.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={12} /></button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {editor && (
                <TaskEditor
                    task={editor.task}
                    contributors={contributors}
                    onContributorCreated={onContributorCreated}
                    onCreated={() => { /* keep editor open after first save */ }}
                    onSaved={load}
                    onClose={() => { setEditor(null); load() }}
                />
            )}
        </div>
    )
}
