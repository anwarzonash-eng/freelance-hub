'use client'

import { useMemo, useState, useRef, useEffect, type ReactNode } from 'react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const STOPWORDS = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'will', 'your', 'you', 'are',
    'our', 'able', 'can', 'not', 'but', 'all', 'any', 'using', 'use', 'team', 'work', 'works',
    'working', 'role', 'job', 'years', 'year', 'experience', 'strong', 'knowledge', 'skills',
    'skill', 'required', 'requirement', 'requirements', 'must', 'plus', 'etc', 'who', 'what',
    'when', 'where', 'why', 'how', 'into', 'across', 'within', 'such', 'their', 'they', 'them',
    'has', 'had', 'was', 'were', 'been', 'being', 'than', 'then', 'also', 'about', 'each',
    'other', 'some', 'these', 'those', 'per', 'via', 'including', 'include', 'includes',
    'in', 'on', 'to', 'of', 'is', 'it', 'at', 'as', 'be', 'by', 'or', 'an', 'if', 'we', 'do',
    'no', 'so', 'up', 'my', 'me', 'he', 'go', 'us', 'ok',
])

export const TOKEN_REGEX = /[a-zA-Z0-9+#./-]+/g

export function extractKeywords(description: string | undefined | null): Set<string> {
    if (!description?.trim()) return new Set<string>()
    const words: string[] = description.toLowerCase().match(TOKEN_REGEX) ?? []
    return new Set(words.filter(w => w.length >= 2 && !STOPWORDS.has(w)))
}

export function stripHtml(html: string | undefined | null): string {
    if (!html) return ''
    return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
}

export function computeKeywords(rawDescription: string | undefined | null, descriptionHtml: string | undefined | null): Set<string> {
    const fromRaw = extractKeywords(rawDescription)
    const fromHtml = extractKeywords(stripHtml(descriptionHtml))
    for (const w of fromHtml) fromRaw.add(w)
    return fromRaw
}

export const FULL_MATCH_COLOR = '#fff066'
export const PARTIAL_MATCH_COLOR = '#ffc266'

function Mark({ color, word, onHover, children }: { color: string; word?: string; onHover?: (word: string | null) => void; children: ReactNode }) {
    return (
        <mark
            style={{ backgroundColor: color, padding: '0 1px', borderRadius: '2px', color: '#000', cursor: onHover ? 'help' : undefined }}
            onMouseEnter={onHover && word ? () => onHover(word) : undefined}
            onMouseLeave={onHover ? () => onHover(null) : undefined}
        >
            {children}
        </mark>
    )
}

const SPLIT_REGEX = new RegExp(`(${TOKEN_REGEX.source})`, 'g')

export function highlightWords(text: string | undefined | null, keywords: Set<string>, onHover?: (word: string | null) => void): ReactNode {
    if (!text) return text
    if (keywords.size === 0) return text
    const parts = text.split(SPLIT_REGEX)
    return parts.map((part, i) => {
        const norm = part.toLowerCase()
        if (norm.length >= 2 && keywords.has(norm)) {
            return <Mark key={i} color={FULL_MATCH_COLOR} word={norm} onHover={onHover}>{part}</Mark>
        }
        return part
    })
}

function renderSkillMatch(skill: string, descriptionLower: string, keywords: Set<string>, onHover?: (word: string | null) => void): ReactNode {
    const skillLower = skill.toLowerCase()
    const fullMatch = descriptionLower.length > 0 && descriptionLower.includes(skillLower)
    if (fullMatch) return <Mark color={FULL_MATCH_COLOR} word={skillLower} onHover={onHover}>{skill}</Mark>
    if (keywords.size > 0) {
        const tokens = skill.split(SPLIT_REGEX)
        if (tokens.some(t => t.length >= 2 && keywords.has(t.toLowerCase()))) {
            return tokens.map((t, ti) => {
                const norm = t.toLowerCase()
                if (norm.length >= 2 && keywords.has(norm))
                    return <Mark key={ti} color={PARTIAL_MATCH_COLOR} word={norm} onHover={onHover}>{t}</Mark>
                return t
            })
        }
    }
    return skill
}

function SkillsLine({ skillsStr, descriptionLower, keywords, onReorder, onHover }: {
    skillsStr: string; descriptionLower: string; keywords: Set<string>
    onReorder?: (newSkills: string) => void; onHover?: (word: string | null) => void
}) {
    const skillsArr = useMemo(() => skillsStr.split(',').map(s => s.trim()).filter(Boolean), [skillsStr])
    const [dragIndex, setDragIndex] = useState<number | null>(null)
    const [overIndex, setOverIndex] = useState<number | null>(null)
    const draggable = !!onReorder
    const handleDrop = (dropIndex: number) => {
        if (dragIndex === null || dragIndex === dropIndex) { setDragIndex(null); setOverIndex(null); return }
        const next = [...skillsArr]; const [moved] = next.splice(dragIndex, 1); next.splice(dropIndex, 0, moved)
        setDragIndex(null); setOverIndex(null); onReorder?.(next.join(', '))
    }
    return (
        <>
            {skillsArr.map((skill, i) => (
                <span key={i} draggable={draggable}
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={e => { if (draggable) { e.preventDefault(); setOverIndex(i) } }}
                    onDragLeave={() => setOverIndex(prev => (prev === i ? null : prev))}
                    onDrop={e => { if (draggable) { e.preventDefault(); handleDrop(i) } }}
                    onDragEnd={() => { setDragIndex(null); setOverIndex(null) }}
                    style={{ cursor: draggable ? 'grab' : undefined, opacity: dragIndex === i ? 0.4 : 1, borderRadius: '2px', outline: overIndex === i && dragIndex !== i ? '1.5px dashed #888' : 'none', outlineOffset: '1px' }}>
                    {renderSkillMatch(skill, descriptionLower, keywords, onHover)}
                    {i < skillsArr.length - 1 ? ', ' : ''}
                </span>
            ))}
        </>
    )
}

function CategorySkillsLine({ skills, descriptionLower, keywords, onHover }: {
    skills: string[]; descriptionLower: string; keywords: Set<string>; onHover?: (word: string | null) => void
}) {
    return (
        <>
            {skills.map((skill, i) => (
                <span key={i}>
                    {renderSkillMatch(skill, descriptionLower, keywords, onHover)}
                    {i < skills.length - 1 ? ', ' : ''}
                </span>
            ))}
        </>
    )
}

function fmtDate(d: string | null | undefined): string {
    if (!d) return ''
    const [y, m] = d.split('-')
    const idx = parseInt(m) - 1
    return `${MONTHS[idx] ?? m} ${y}`
}

// ─── Inline edit helpers ──────────────────────────────────────────────────────

const EDIT_HOVER_BG = '#f0f4ff'
const EDIT_INPUT_STYLE: React.CSSProperties = {
    background: EDIT_HOVER_BG, border: '1px solid #93b4d6', borderRadius: '2px',
    padding: '0 3px', outline: 'none', fontFamily: 'inherit', lineHeight: 'inherit',
}

function InlineText({ value, onSave, style, placeholder = 'Click to edit' }: {
    value: string; onSave?: (v: string) => void; style?: React.CSSProperties; placeholder?: string
}) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState('')
    if (!onSave) return <span style={style}>{value || ''}</span>
    if (editing) return (
        <input autoFocus value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => { onSave(draft); setEditing(false) }}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
            style={{ ...style, ...EDIT_INPUT_STYLE, width: Math.max(120, (draft.length + 2) * 9) + 'px' }}
        />
    )
    return (
        <span onClick={() => { setDraft(value); setEditing(true) }} title="Click to edit"
            style={{ ...style, cursor: 'text', borderRadius: '2px', transition: 'background 0.1s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = EDIT_HOVER_BG }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
            {value || <span style={{ color: '#aaa', fontStyle: 'italic' }}>{placeholder}</span>}
        </span>
    )
}

function InlineArea({ value, onSave, style, placeholder = 'Click to edit', rows = 3 }: {
    value: string; onSave?: (v: string) => void; style?: React.CSSProperties; placeholder?: string; rows?: number
}) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState('')
    if (!onSave) return <span style={style}>{value || ''}</span>
    if (editing) return (
        <textarea autoFocus value={draft} rows={rows}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => { onSave(draft); setEditing(false) }}
            onKeyDown={e => { if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
            style={{ ...style, ...EDIT_INPUT_STYLE, width: '100%', resize: 'vertical', display: 'block' }}
        />
    )
    return (
        <span onClick={() => { setDraft(value); setEditing(true) }} title="Click to edit"
            style={{ ...style, display: 'block', cursor: 'text', borderRadius: '2px', whiteSpace: 'pre-wrap', transition: 'background 0.1s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = EDIT_HOVER_BG }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
            {value || <span style={{ color: '#aaa', fontStyle: 'italic' }}>{placeholder}</span>}
        </span>
    )
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const CUR_YEAR = new Date().getFullYear()
const YEARS_DESC = Array.from({ length: CUR_YEAR - 1984 }, (_, i) => String(CUR_YEAR - i))

function parseDateParts(v: string) {
    const [y = '', m = ''] = (v ?? '').split('-')
    return { y, m }
}
function fmtDateDisplay(v: string) {
    if (v === '__present__') return 'Present'
    const { y, m } = parseDateParts(v)
    const mName = m ? MONTH_NAMES[parseInt(m, 10) - 1] : ''
    return [mName, y].filter(Boolean).join(' ')
}

function InlineDateSelect({ value, onSave, onPresent, allowPresent, style }: {
    value: string; onSave?: (v: string) => void
    onPresent?: () => void; allowPresent?: boolean; style?: React.CSSProperties
}) {
    const [open, setOpen] = useState(false)
    const [y, setY] = useState('')
    const [m, setM] = useState('')
    const ref = useRef<HTMLSpanElement>(null)

    useEffect(() => {
        if (!open) return
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [open])

    const commit = (newY: string, newM: string) => {
        if (newY && newM) { onSave?.(`${newY}-${newM.padStart(2, '0')}`); setOpen(false) }
    }

    if (!onSave) return <span style={style}>{fmtDateDisplay(value) || ''}</span>

    const display = fmtDateDisplay(value) || <span style={{ color: '#bbb', fontStyle: 'italic' }}>—</span>

    return (
        <span ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
            <span onClick={() => { const p = parseDateParts(value); setY(p.y); setM(p.m); setOpen(true) }}
                title="Click to change date"
                style={{ ...style, cursor: 'pointer', borderRadius: '2px', transition: 'background 0.1s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,152,219,0.08)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                {display}
            </span>
            {open && (
                <span className="no-print" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 9999, background: '#fff', border: '1px solid #ddd', borderRadius: '6px', boxShadow: '0 4px 16px rgba(0,0,0,0.13)', padding: '6px 8px', display: 'flex', gap: '4px', alignItems: 'center', whiteSpace: 'nowrap', marginTop: '2px' }}>
                    <select value={m} autoFocus
                        onChange={e => { const v = e.target.value; if (v === '__present__') { onPresent?.(); setOpen(false) } else { setM(v); commit(y, v) } }}
                        style={{ fontSize: '11px', border: '1px solid #ccc', borderRadius: '4px', padding: '2px 4px', cursor: 'pointer' }}>
                        <option value="">Month</option>
                        {allowPresent && <option value="__present__">Present</option>}
                        {MONTH_NAMES.map((mn, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{mn}</option>)}
                    </select>
                    <select value={y}
                        onChange={e => { setY(e.target.value); commit(e.target.value, m) }}
                        style={{ fontSize: '11px', border: '1px solid #ccc', borderRadius: '4px', padding: '2px 4px', cursor: 'pointer' }}>
                        <option value="">Year</option>
                        {YEARS_DESC.map(yr => <option key={yr} value={yr}>{yr}</option>)}
                    </select>
                </span>
            )}
        </span>
    )
}

// Wraps any CV row and shows a small floating action pill on hover (hidden from print).
// Keeps the CV layout clean — buttons never take up space in the normal flow.
type HoverAction = { label: string; onClick: () => void; color?: string }
function HoverActions({ children, actions, style }: {
    children: ReactNode; actions: HoverAction[]; style?: React.CSSProperties
}) {
    const [show, setShow] = useState(false)
    if (!actions.length) return <>{children}</>
    return (
        <div style={{ position: 'relative', ...style }}
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}>
            {children}
            {show && (
                <div className="no-print" style={{
                    position: 'absolute', top: 0, left: 0,
                    display: 'flex', gap: '2px', alignItems: 'center',
                    background: 'rgba(255,255,255,0.97)',
                    border: '1px solid #ddd', borderRadius: '5px',
                    padding: '2px 5px', boxShadow: '0 1px 6px rgba(0,0,0,0.14)', zIndex: 20,
                }}>
                    {actions.map((a, i) => (
                        <button key={i} type="button"
                            onClick={e => { e.stopPropagation(); a.onClick() }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f5f5f5' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
                            style={{ fontSize: '10px', color: a.color ?? '#444', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 5px', borderRadius: '3px', lineHeight: '1.6', whiteSpace: 'nowrap' }}>
                            {a.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Export types ─────────────────────────────────────────────────────────────

export interface CVEditCallbacks {
    name?: (v: string) => void
    headline?: (v: string) => void
    summary?: (v: string) => void
    // Contact fields
    location?: (v: string) => void
    email?: (v: string) => void
    phone?: (v: string) => void
    linkedin?: (v: string) => void
    github?: (v: string) => void
    // Core skills
    skillsCategoryRename?: (i: number, v: string) => void
    skillsCategorySkills?: (i: number, skills: string[]) => void
    skillsCategoryAdd?: () => void
    skillsCategoryDelete?: (i: number) => void
    // Experience
    expField?: (ei: number, field: string, v: any) => void
    expBulletEdit?: (ei: number, bi: number, v: string) => void
    expBulletAdd?: (ei: number) => void
    expBulletDelete?: (ei: number, bi: number) => void
    expAdd?: () => void
    expDelete?: (ei: number) => void
    // Education
    eduField?: (ei: number, field: string, v: string) => void
    eduAdd?: () => void
    eduDelete?: (ei: number) => void
    // Projects
    projField?: (pi: number, field: string, v: string) => void
    projAdd?: () => void
    projDelete?: (pi: number) => void
}

export interface CVExpItem {
    designation: string; ai_title?: string; use_ai_title?: boolean; company_name: string
    from_date: string; to_date?: string | null; currently_working?: boolean
    job_type?: string; show_job_type?: boolean; job_nature?: string; show_job_nature?: boolean; bullets?: string[]
}

export interface CVEduItem {
    university_name: string; degree_title: string; start_date?: string; end_date?: string
}

export interface CVProjectItem {
    title: string; description?: string; link?: string; technologies?: string
    start_date?: string; end_date?: string; ongoing?: boolean
}

export interface CVData {
    applicant_name?: string; headline?: string; location?: string; selected_email?: string
    selected_phone?: string; linkedin?: string; github?: string; portfolios?: string[]
    summary?: string; skills?: string; core_skills?: { category: string; skills: string[] }[]
    experience_items?: CVExpItem[]; education?: CVEduItem[]; projects?: CVProjectItem[]
    raw_description?: string; description_html?: string; organization_name?: string
    sponsorship?: string; job_link?: string
}

export interface CVFontSettings {
    // Name block
    applicantName: number
    headline: number
    contactLine: number
    // Section headings (SUMMARY, SKILLS, WORK EXPERIENCE, EDUCATION, PROJECTS)
    sectionHeading: number
    // Work Experience
    expDesignation: number
    expCompany: number
    expDates: number
    expBullet: number
    // Education
    eduDegree: number
    eduInstitution: number
    eduDates: number
}

export const DEFAULT_FONT_SETTINGS: CVFontSettings = {
    applicantName: 21,
    headline: 11.25,
    contactLine: 9,
    sectionHeading: 11,
    expDesignation: 10.5,
    expCompany: 10.5,
    expDates: 9,
    expBullet: 10.5,
    eduDegree: 10.5,
    eduInstitution: 10.5,
    eduDates: 9,
}

export const FONT_SETTING_GROUPS: { group: string; fields: { key: keyof CVFontSettings; label: string }[] }[] = [
    {
        group: 'Name Block',
        fields: [
            { key: 'applicantName', label: 'Applicant Name' },
            { key: 'headline', label: 'Headline' },
            { key: 'contactLine', label: 'Contact Line' },
        ],
    },
    {
        group: 'Sections',
        fields: [
            { key: 'sectionHeading', label: 'Section Headings' },
        ],
    },
    {
        group: 'Work Experience',
        fields: [
            { key: 'expDesignation', label: 'Job Title' },
            { key: 'expCompany', label: 'Company Name' },
            { key: 'expDates', label: 'Dates' },
            { key: 'expBullet', label: 'Bullet Points' },
        ],
    },
    {
        group: 'Education',
        fields: [
            { key: 'eduDegree', label: 'Degree' },
            { key: 'eduInstitution', label: 'Institution' },
            { key: 'eduDates', label: 'Dates' },
        ],
    },
]

// Flat list for backward compat with any existing per-field usage
export const FONT_SETTING_FIELDS: { key: keyof CVFontSettings; label: string; hint: string }[] =
    FONT_SETTING_GROUPS.flatMap(g => g.fields.map(f => ({ ...f, hint: g.group })))

const NAVY = '#1F3864'
const SLATE = '#44546A'
const TEXT_COLOR = '#262626'

function Divider({ title, size, onAdd }: { title: string; size: number; onAdd?: () => void }) {
    const [hovered, setHovered] = useState(false)
    return (
        <div style={{ marginTop: '16px', marginBottom: '6px', borderBottom: `1px solid ${NAVY}`, paddingBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}>
            <span style={{ fontWeight: 700, fontSize: `${size}pt`, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                {title}
            </span>
            {onAdd && hovered && (
                <button className="no-print" type="button" onClick={e => { e.stopPropagation(); onAdd() }}
                    style={{ fontSize: '10px', color: '#27ae60', background: 'rgba(255,255,255,0.97)', border: '1px solid #27ae60', borderRadius: '4px', padding: '1px 8px', cursor: 'pointer', lineHeight: '1.6' }}>
                    +
                </button>
            )}
        </div>
    )
}

export default function CVPreview({
    data, highlightEnabled = true, fontSettings, onEdit, forceKeywords,
    onSkillsReorder, onBulletEdit, onKeywordHover,
}: {
    data: CVData
    highlightEnabled?: boolean
    /** When provided, overrides the internally computed keyword set (used for single-word hover highlight). */
    forceKeywords?: Set<string>
    fontSettings?: Partial<CVFontSettings>
    onEdit?: CVEditCallbacks
    // Legacy props kept for backward compat with viewCV page
    onSkillsReorder?: (newSkills: string) => void
    onBulletEdit?: (expIndex: number, bulletIndex: number, value: string) => void
    onKeywordHover?: (word: string | null) => void
}) {
    const fs: CVFontSettings = { ...DEFAULT_FONT_SETTINGS, ...fontSettings }

    const contactParts: { label: string; href: string | null }[] = [
        ...[data.location, data.selected_email, data.selected_phone].filter(Boolean).map(v => ({
            label: v as string,
            href: (v as string).includes('@') ? `mailto:${v}` : null,
        })),
        ...(data.linkedin ? [{ label: data.linkedin.replace(/^https?:\/\/(www\.)?/, ''), href: data.linkedin.startsWith('http') ? data.linkedin : `https://${data.linkedin}` }] : []),
        ...(data.github ? [{ label: data.github.replace(/^https?:\/\/(www\.)?/, ''), href: data.github.startsWith('http') ? data.github : `https://${data.github}` }] : []),
        ...(data.portfolios ?? []).filter(Boolean).map(v => ({ label: v, href: v.startsWith('http') ? v : `https://${v}` })),
    ]

    const experiences = data.experience_items ?? []
    const education = data.education ?? []

    const computedKeywords = useMemo(
        () => (highlightEnabled ? extractKeywords(data.raw_description) : new Set<string>()),
        [data.raw_description, highlightEnabled]
    )
    const keywords = forceKeywords ?? computedKeywords
    // When forceKeywords is active (hover-highlight mode), suppress descriptionLower so
    // renderSkillMatch's phrase-inclusion check doesn't fire for every skill that happens
    // to appear in the raw description — we only want the single hovered token highlighted.
    const descriptionLower = !forceKeywords && keywords.size > 0 ? (data.raw_description ?? '').toLowerCase() : ''

    // Resolve bullet edit — onEdit.expBulletEdit takes priority, falls back to legacy onBulletEdit
    const handleBulletEdit = onEdit?.expBulletEdit ?? onBulletEdit

    return (
        <div style={{ fontFamily: 'Calibri, Arial, system-ui, sans-serif', fontSize: `${fs.expBullet}pt`, color: TEXT_COLOR, backgroundColor: '#fff', padding: '48px 58px', boxSizing: 'border-box', lineHeight: '1.4' }}>

            {/* ── Name block ── */}
            <div>
                <div style={{ fontWeight: 700, fontSize: `${fs.applicantName}pt`, color: NAVY, letterSpacing: '0.5px' }}>
                    <InlineText value={data.applicant_name || ''} onSave={onEdit?.name}
                        style={{ fontWeight: 700, fontSize: `${fs.applicantName}pt`, color: NAVY, letterSpacing: '0.5px' }}
                        placeholder="Your Name" />
                </div>
                <div style={{ fontStyle: 'italic', fontSize: `${fs.headline}pt`, color: SLATE, marginTop: '2px', minHeight: onEdit?.headline ? '1em' : undefined }}>
                    <InlineText value={data.headline || ''} onSave={onEdit?.headline}
                        style={{ fontStyle: 'italic', fontSize: `${fs.headline}pt`, color: SLATE }}
                        placeholder={onEdit?.headline ? 'Add headline…' : ''} />
                </div>
                <div style={{ fontSize: `${fs.contactLine}pt`, color: SLATE, marginTop: '4px' }}>
                    {onEdit ? (
                        /* Edit mode: individual inline inputs for each contact field */
                        <span>
                            <InlineText value={data.location || ''} onSave={onEdit.location} style={{ fontSize: `${fs.contactLine}pt`, color: SLATE }} placeholder="Location" />
                            {' | '}
                            <InlineText value={data.selected_email || ''} onSave={onEdit.email} style={{ fontSize: `${fs.contactLine}pt`, color: SLATE }} placeholder="Email" />
                            {' | '}
                            <InlineText value={data.selected_phone || ''} onSave={onEdit.phone} style={{ fontSize: `${fs.contactLine}pt`, color: SLATE }} placeholder="Phone" />
                            {' | '}
                            <InlineText value={data.linkedin || ''} onSave={onEdit.linkedin} style={{ fontSize: `${fs.contactLine}pt`, color: SLATE }} placeholder="LinkedIn URL" />
                            {' | '}
                            <InlineText value={data.github || ''} onSave={onEdit.github} style={{ fontSize: `${fs.contactLine}pt`, color: SLATE }} placeholder="GitHub URL" />
                        </span>
                    ) : (
                        /* View mode: pipe-separated, links clickable */
                        contactParts.map((part, i) => (
                            <span key={i}>
                                {i > 0 && ' | '}
                                {part.href
                                    ? <a href={part.href} target="_blank" rel="noopener noreferrer" style={{ color: NAVY, textDecoration: 'underline' }}>{part.label}</a>
                                    : part.label}
                            </span>
                        ))
                    )}
                </div>
            </div>

            {/* ── Summary ── */}
            {(data.summary?.trim() || onEdit?.summary) && (
                <>
                    <Divider title="Summary" size={fs.sectionHeading} />
                    {onEdit?.summary
                        ? <InlineArea value={data.summary || ''} onSave={onEdit.summary}
                            style={{ fontSize: `${fs.expBullet}pt`, lineHeight: '1.4' }}
                            placeholder="Write a professional summary…" rows={4} />
                        : <p style={{ margin: 0, fontSize: `${fs.expBullet}pt`, lineHeight: '1.4' }}>{highlightWords(data.summary, keywords, onKeywordHover)}</p>
                    }
                </>
            )}

            {/* ── Core Skills (categorized) ── */}
            {(data.core_skills && data.core_skills.length > 0) || onEdit?.skillsCategoryAdd ? (
                <>
                    <Divider title="Core Skills" size={fs.sectionHeading} onAdd={onEdit?.skillsCategoryAdd} />
                    {(data.core_skills ?? []).map((group, gi) => (
                        <HoverActions key={gi} style={{ margin: gi === 0 ? 0 : '4px 0 0' }}
                            actions={onEdit?.skillsCategoryDelete ? [{ label: '×', onClick: () => onEdit.skillsCategoryDelete!(gi), color: '#e74c3c' }] : []}>
                            <p style={{ margin: 0, fontSize: `${fs.expBullet}pt` }}>
                                <span style={{ fontWeight: 700, color: SLATE }}>
                                    <InlineText value={group.category} onSave={onEdit?.skillsCategoryRename ? v => onEdit.skillsCategoryRename!(gi, v) : undefined}
                                        style={{ fontWeight: 700, color: SLATE }} placeholder="Category" />
                                </span>
                                {': '}
                                {onEdit?.skillsCategorySkills
                                    ? <InlineText value={group.skills.join(', ')}
                                        onSave={v => onEdit.skillsCategorySkills!(gi, v.split(',').map(s => s.trim()).filter(Boolean))}
                                        style={{ color: TEXT_COLOR }} placeholder="skill1, skill2…" />
                                    : <CategorySkillsLine skills={group.skills} descriptionLower={descriptionLower} keywords={keywords} onHover={onKeywordHover} />
                                }
                            </p>
                        </HoverActions>
                    ))}
                </>
            ) : data.skills?.trim() ? (
                <>
                    <Divider title="Skills" size={fs.sectionHeading} />
                    <p style={{ margin: 0, fontSize: `${fs.expBullet}pt` }}>
                        <SkillsLine skillsStr={data.skills ?? ''} descriptionLower={descriptionLower} keywords={keywords} onReorder={onSkillsReorder} onHover={onKeywordHover} />
                    </p>
                </>
            ) : null}

            {/* ── Work Experience ── */}
            {(experiences.length > 0 || onEdit?.expAdd) && (
                <>
                    <Divider title="Work Experience" size={fs.sectionHeading} onAdd={onEdit?.expAdd} />
                    {experiences.map((exp, i) => {
                        const meta = [exp.show_job_type && exp.job_type, exp.show_job_nature && exp.job_nature].filter(Boolean).join(', ')
                        const bullets = (exp.bullets ?? []).map((b, idx) => ({ text: b, idx }))
                        return (
                            <HoverActions key={i} style={{ marginTop: i === 0 ? '6px' : '14px' }}
                                actions={onEdit?.expDelete ? [{ label: '×', onClick: () => onEdit.expDelete!(i), color: '#e74c3c' }] : []}>
                                {/* Title row */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <span style={{ flex: 1 }}>
                                        <InlineText value={(exp.use_ai_title && exp.ai_title) ? exp.ai_title : exp.designation}
                                            onSave={onEdit?.expField ? v => onEdit.expField!(i, 'designation', v) : undefined}
                                            style={{ fontWeight: 700, fontSize: `${fs.expDesignation}pt`, color: NAVY }} placeholder="Job Title" />
                                        {exp.company_name ? <span style={{ fontWeight: 700, fontSize: `${fs.expCompany}pt`, color: NAVY }}> | </span> : ''}
                                        {exp.company_name && <InlineText value={exp.company_name}
                                            onSave={onEdit?.expField ? v => onEdit.expField!(i, 'company_name', v) : undefined}
                                            style={{ fontWeight: 700, fontSize: `${fs.expCompany}pt`, color: NAVY }} placeholder="Company" />}
                                        {(exp.show_job_type && exp.job_type) || (exp.show_job_nature && exp.job_nature) ? (
                                            <span style={{ fontWeight: 700, fontSize: `${fs.expCompany}pt`, color: NAVY }}>
                                                {' ('}
                                                {exp.show_job_type && exp.job_type && (
                                                    <InlineText value={exp.job_type}
                                                        onSave={onEdit?.expField ? v => onEdit.expField!(i, 'job_type', v) : undefined}
                                                        style={{ fontWeight: 700, fontSize: `${fs.expCompany}pt`, color: NAVY }} placeholder="Type" />
                                                )}
                                                {exp.show_job_type && exp.job_type && exp.show_job_nature && exp.job_nature ? ', ' : ''}
                                                {exp.show_job_nature && exp.job_nature && (
                                                    <InlineText value={exp.job_nature}
                                                        onSave={onEdit?.expField ? v => onEdit.expField!(i, 'job_nature', v) : undefined}
                                                        style={{ fontWeight: 700, fontSize: `${fs.expCompany}pt`, color: NAVY }} placeholder="Nature" />
                                                )}
                                                {')'}
                                            </span>
                                        ) : ''}
                                    </span>
                                    <span style={{ fontStyle: 'italic', fontSize: `${fs.expDates}pt`, color: SLATE, whiteSpace: 'nowrap', marginLeft: '10px' }}>
                                        <InlineDateSelect value={exp.from_date ?? ''}
                                            onSave={onEdit?.expField ? v => onEdit.expField!(i, 'from_date', v) : undefined}
                                            style={{ fontStyle: 'italic', fontSize: `${fs.expDates}pt`, color: SLATE }} />
                                        {' – '}
                                        {exp.currently_working
                                            ? <InlineDateSelect value="__present__"
                                                onSave={onEdit?.expField ? v => { onEdit.expField!(i, 'currently_working', false as any); onEdit.expField!(i, 'to_date', v) } : undefined}
                                                onPresent={undefined}
                                                allowPresent={false}
                                                style={{ fontStyle: 'italic', fontSize: `${fs.expDates}pt`, color: SLATE }} />
                                            : <InlineDateSelect value={exp.to_date ?? ''}
                                                onSave={onEdit?.expField ? v => onEdit.expField!(i, 'to_date', v) : undefined}
                                                onPresent={onEdit?.expField ? () => onEdit.expField!(i, 'currently_working', true as any) : undefined}
                                                allowPresent={!!onEdit?.expField}
                                                style={{ fontStyle: 'italic', fontSize: `${fs.expDates}pt`, color: SLATE }} />
                                        }
                                    </span>
                                </div>

                                {/* Bullets */}
                                <ul style={{ margin: '4px 0 0', paddingLeft: '18px', listStyleType: 'disc' }}>
                                    {bullets.map(({ text, idx }) => (
                                        <HoverActions key={idx}
                                            actions={onEdit?.expBulletDelete ? [{ label: '×', onClick: () => onEdit.expBulletDelete!(i, idx), color: '#e74c3c' }] : []}>
                                            <li style={{ fontSize: `${fs.expBullet}pt`, marginTop: idx === 0 ? 0 : '4px' }}>
                                                {handleBulletEdit
                                                    ? <InlineArea value={text} onSave={v => handleBulletEdit(i, idx, v)}
                                                        style={{ fontSize: `${fs.expBullet}pt` }} placeholder="Bullet point…" rows={2} />
                                                    : highlightWords(text, keywords, onKeywordHover)
                                                }
                                            </li>
                                        </HoverActions>
                                    ))}
                                    {onEdit?.expBulletAdd && (
                                        <li className="no-print" style={{ listStyle: 'none', marginTop: '4px' }}>
                                            <button type="button" onClick={() => onEdit.expBulletAdd!(i)}
                                                style={{ fontSize: '10px', color: '#27ae60', background: 'none', border: '1px solid #27ae60', borderRadius: '4px', padding: '1px 8px', cursor: 'pointer', lineHeight: '1.6' }}>
                                                +
                                            </button>
                                        </li>
                                    )}
                                </ul>
                            </HoverActions>
                        )
                    })}
                </>
            )}

            {/* ── Education ── */}
            {(education.length > 0 || onEdit?.eduAdd) && (
                <>
                    <Divider title="Education" size={fs.sectionHeading} onAdd={onEdit?.eduAdd} />
                    {education.map((edu, i) => (
                        <HoverActions key={i} style={{ marginTop: i === 0 ? '4px' : '6px' }}
                            actions={onEdit?.eduDelete ? [{ label: '×', onClick: () => onEdit.eduDelete!(i), color: '#e74c3c' }] : []}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <span>
                                    <InlineText value={edu.degree_title}
                                        onSave={onEdit?.eduField ? v => onEdit.eduField!(i, 'degree_title', v) : undefined}
                                        style={{ fontWeight: 700, fontSize: `${fs.eduDegree}pt`, color: NAVY }} placeholder="Degree" />
                                    {edu.university_name ? <span style={{ fontWeight: 700, fontSize: `${fs.eduInstitution}pt`, color: NAVY }}> | </span> : ''}
                                    {edu.university_name && <InlineText value={edu.university_name}
                                        onSave={onEdit?.eduField ? v => onEdit.eduField!(i, 'university_name', v) : undefined}
                                        style={{ fontWeight: 700, fontSize: `${fs.eduInstitution}pt`, color: NAVY }} placeholder="Institution" />}
                                </span>
                                <span style={{ fontStyle: 'italic', fontSize: `${fs.eduDates}pt`, color: SLATE, whiteSpace: 'nowrap', marginLeft: '10px' }}>
                                    <InlineText value={edu.start_date ?? ''}
                                        onSave={onEdit?.eduField ? v => onEdit.eduField!(i, 'start_date', v) : undefined}
                                        style={{ fontStyle: 'italic', fontSize: `${fs.eduDates}pt`, color: SLATE }} placeholder="YYYY-MM" />
                                    {' – '}
                                    <InlineText value={edu.end_date ?? ''}
                                        onSave={onEdit?.eduField ? v => onEdit.eduField!(i, 'end_date', v) : undefined}
                                        style={{ fontStyle: 'italic', fontSize: `${fs.eduDates}pt`, color: SLATE }} placeholder="YYYY-MM" />
                                </span>
                            </div>
                        </HoverActions>
                    ))}
                </>
            )}

            {/* ── Projects ── */}
            {(data.projects ?? []).some(p => p.title?.trim()) && (
                <>
                    <Divider title="Projects" size={fs.sectionHeading} onAdd={onEdit?.projAdd} />
                    {(data.projects ?? []).map((proj, i) => {
                        const dateRange = proj.ongoing
                            ? `${fmtDate(proj.start_date)} – Present`
                            : [fmtDate(proj.start_date), proj.end_date ? fmtDate(proj.end_date) : ''].filter(Boolean).join(' – ')
                        return (
                            <HoverActions key={i} style={{ marginTop: i === 0 ? '6px' : '14px' }}
                                actions={onEdit?.projDelete ? [{ label: '×', onClick: () => onEdit.projDelete!(i), color: '#e74c3c' }] : []}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <span style={{ fontWeight: 700, fontSize: `${fs.expDesignation}pt`, color: NAVY }}>
                                        <InlineText value={proj.title}
                                            onSave={onEdit?.projField ? v => onEdit.projField!(i, 'title', v) : undefined}
                                            style={{ fontWeight: 700, fontSize: `${fs.expDesignation}pt`, color: NAVY }} placeholder="Project Title" />
                                    </span>
                                    <span style={{ fontStyle: 'italic', fontSize: `${fs.expDates}pt`, color: SLATE, whiteSpace: 'nowrap', marginLeft: '10px' }}>
                                        {onEdit?.projField ? <>
                                            <InlineText value={proj.start_date ?? ''} onSave={v => onEdit.projField!(i, 'start_date', v)}
                                                style={{ fontStyle: 'italic', fontSize: `${fs.expDates}pt`, color: SLATE }} placeholder="YYYY-MM" />
                                            {' – '}
                                            <InlineText value={proj.end_date ?? ''} onSave={v => onEdit.projField!(i, 'end_date', v)}
                                                style={{ fontStyle: 'italic', fontSize: `${fs.expDates}pt`, color: SLATE }} placeholder="YYYY-MM" />
                                        </> : dateRange}
                                    </span>
                                </div>
                                {(proj.technologies || onEdit?.projField) && (
                                    <div style={{ fontSize: `${fs.expDates}pt`, color: SLATE, marginTop: '2px' }}>
                                        <span style={{ fontWeight: 700 }}>Technologies:</span>{' '}
                                        <InlineText value={proj.technologies ?? ''}
                                            onSave={onEdit?.projField ? v => onEdit.projField!(i, 'technologies', v) : undefined}
                                            style={{ fontSize: `${fs.expDates}pt`, color: SLATE }} placeholder="React, Node.js…" />
                                    </div>
                                )}
                                {(proj.description || onEdit?.projField) && (
                                    <ul style={{ margin: '4px 0 0', paddingLeft: '18px', listStyleType: 'disc' }}>
                                        <li style={{ fontSize: `${fs.expBullet}pt` }}>
                                            <InlineText value={proj.description ?? ''}
                                                onSave={onEdit?.projField ? v => onEdit.projField!(i, 'description', v) : undefined}
                                                style={{ fontSize: `${fs.expBullet}pt` }} placeholder="Describe the project…" />
                                        </li>
                                    </ul>
                                )}
                            </HoverActions>
                        )
                    })}
                </>
            )}
        </div>
    )
}
