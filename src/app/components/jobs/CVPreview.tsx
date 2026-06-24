'use client'

import { useMemo, useState, type ReactNode } from 'react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const STOPWORDS = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'will', 'your', 'you', 'are',
    'our', 'able', 'can', 'not', 'but', 'all', 'any', 'using', 'use', 'team', 'work', 'works',
    'working', 'role', 'job', 'years', 'year', 'experience', 'strong', 'knowledge', 'skills',
    'skill', 'required', 'requirement', 'requirements', 'must', 'plus', 'etc', 'who', 'what',
    'when', 'where', 'why', 'how', 'into', 'across', 'within', 'such', 'their', 'they', 'them',
    'has', 'had', 'was', 'were', 'been', 'being', 'than', 'then', 'also', 'about', 'each',
    'other', 'some', 'these', 'those', 'per', 'via', 'including', 'include', 'includes',
    // common short words (now reachable since min length was lowered to 2)
    'in', 'on', 'to', 'of', 'is', 'it', 'at', 'as', 'be', 'by', 'or', 'an', 'if', 'we', 'do',
    'no', 'so', 'up', 'my', 'me', 'he', 'go', 'us', 'ok',
])

// Includes "/" and "-" so compound terms like "CI/CD" and "front-end" stay as single tokens.
export const TOKEN_REGEX = /[a-zA-Z0-9+#./-]+/g

export function extractKeywords(description: string | undefined | null): Set<string> {
    if (!description?.trim()) return new Set<string>()
    const words: string[] = description.toLowerCase().match(TOKEN_REGEX) ?? []
    return new Set(words.filter(w => w.length >= 2 && !STOPWORDS.has(w)))
}

// Strips HTML tags down to plain text so rich-text job descriptions can be
// keyword-matched the same way as the plain-text raw_description.
export function stripHtml(html: string | undefined | null): string {
    if (!html) return ''
    return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
}

// Keyword set is the union of the plain-text raw_description (used for the AI prompt)
// and the rich-text job description (HTML, shown for reference only) — a word counts
// as an ATS keyword if it shows up in either source.
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

    if (fullMatch) {
        return <Mark color={FULL_MATCH_COLOR} word={skillLower} onHover={onHover}>{skill}</Mark>
    }
    if (keywords.size > 0) {
        const tokens = skill.split(SPLIT_REGEX)
        const anyTokenMatched = tokens.some(t => t.length >= 2 && keywords.has(t.toLowerCase()))
        if (anyTokenMatched) {
            return tokens.map((t, ti) => {
                const norm = t.toLowerCase()
                if (norm.length >= 2 && keywords.has(norm)) {
                    return <Mark key={ti} color={PARTIAL_MATCH_COLOR} word={norm} onHover={onHover}>{t}</Mark>
                }
                return t
            })
        }
    }
    return skill
}

function SkillsLine({
    skillsStr, descriptionLower, keywords, onReorder, onHover,
}: {
    skillsStr: string
    descriptionLower: string
    keywords: Set<string>
    onReorder?: (newSkills: string) => void
    onHover?: (word: string | null) => void
}) {
    const skillsArr = useMemo(() => skillsStr.split(',').map(s => s.trim()).filter(Boolean), [skillsStr])
    const [dragIndex, setDragIndex] = useState<number | null>(null)
    const [overIndex, setOverIndex] = useState<number | null>(null)
    const draggable = !!onReorder

    const handleDrop = (dropIndex: number) => {
        if (dragIndex === null || dragIndex === dropIndex) {
            setDragIndex(null)
            setOverIndex(null)
            return
        }
        const next = [...skillsArr]
        const [moved] = next.splice(dragIndex, 1)
        next.splice(dropIndex, 0, moved)
        setDragIndex(null)
        setOverIndex(null)
        onReorder?.(next.join(', '))
    }

    return (
        <>
            {skillsArr.map((skill, i) => (
                <span
                    key={i}
                    draggable={draggable}
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={e => { if (draggable) { e.preventDefault(); setOverIndex(i) } }}
                    onDragLeave={() => setOverIndex(prev => (prev === i ? null : prev))}
                    onDrop={e => { if (draggable) { e.preventDefault(); handleDrop(i) } }}
                    onDragEnd={() => { setDragIndex(null); setOverIndex(null) }}
                    style={{
                        cursor: draggable ? 'grab' : undefined,
                        opacity: dragIndex === i ? 0.4 : 1,
                        borderRadius: '2px',
                        outline: overIndex === i && dragIndex !== i ? '1.5px dashed #888' : 'none',
                        outlineOffset: '1px',
                    }}
                >
                    {renderSkillMatch(skill, descriptionLower, keywords, onHover)}
                    {i < skillsArr.length - 1 ? ', ' : ''}
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

export interface CVExpItem {
    designation: string
    ai_title?: string
    use_ai_title?: boolean
    company_name: string
    from_date: string
    to_date?: string | null
    currently_working?: boolean
    job_type?: string
    show_job_type?: boolean
    job_nature?: string
    show_job_nature?: boolean
    bullets?: string[]
}

export interface CVEduItem {
    university_name: string
    degree_title: string
    start_date?: string
    end_date?: string
}

export interface CVProjectItem {
    title: string
    description?: string
    link?: string
    technologies?: string
    start_date?: string
    end_date?: string
    ongoing?: boolean
}

export interface CVData {
    applicant_name?: string
    location?: string
    selected_email?: string
    selected_phone?: string
    linkedin?: string
    github?: string
    portfolios?: string[]
    summary?: string
    skills?: string
    experience_items?: CVExpItem[]
    education?: CVEduItem[]
    projects?: CVProjectItem[]
    raw_description?: string
    description_html?: string
    organization_name?: string
    sponsorship?: string
    job_link?: string
}

export interface CVFontSettings {
    body: number
    secondary: number
    sectionDivider: number
    subheading: number
    applicantName: number
}

export const DEFAULT_FONT_SETTINGS: CVFontSettings = {
    body: 11,
    secondary: 10.5,
    sectionDivider: 13,
    subheading: 12,
    applicantName: 14,
}

export const FONT_SETTING_FIELDS: { key: keyof CVFontSettings; label: string; hint: string }[] = [
    { key: 'applicantName', label: 'Applicant Name', hint: 'Top heading' },
    { key: 'sectionDivider', label: 'Section Dividers', hint: 'Summary, Skills, Work Experience…' },
    { key: 'subheading', label: 'Item Subheadings', hint: 'Job title/company, degree, project title' },
    { key: 'body', label: 'Body Text', hint: 'Summary, skills, bullets, descriptions' },
    { key: 'secondary', label: 'Secondary Metadata', hint: 'Dates, tech list' },
]

function Divider({ title, size }: { title: string; size: number }) {
    return (
        <div style={{ marginTop: '14px', marginBottom: '5px', borderBottom: '1.5px solid #111', paddingBottom: '2px' }}>
            <span style={{ fontWeight: 700, fontSize: `${size}pt`, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {title}
            </span>
        </div>
    )
}

export default function CVPreview({
    data, highlightEnabled = true, fontSettings, onSkillsReorder, onBulletEdit, onKeywordHover,
}: {
    data: CVData
    highlightEnabled?: boolean
    fontSettings?: Partial<CVFontSettings>
    onSkillsReorder?: (newSkills: string) => void
    onBulletEdit?: (expIndex: number, bulletIndex: number, value: string) => void
    onKeywordHover?: (word: string | null) => void
}) {
    const fs: CVFontSettings = { ...DEFAULT_FONT_SETTINGS, ...fontSettings }
    const [editingBullet, setEditingBullet] = useState<{ exp: number; bullet: number } | null>(null)
    const contactParts = [
        data.location,
        data.selected_email,
        data.selected_phone,
        data.linkedin,
        data.github,
        ...(data.portfolios ?? []),
    ].filter(Boolean) as string[]

    const experiences = data.experience_items ?? []
    const education = data.education ?? []

    const keywords = useMemo(
        () => (highlightEnabled ? computeKeywords(data.raw_description, data.description_html) : new Set<string>()),
        [data.raw_description, data.description_html, highlightEnabled]
    )
    const descriptionLower = highlightEnabled ? (data.raw_description ?? '').toLowerCase() : ''

    return (
        <div style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: `${fs.body}pt`,
            color: '#000',
            backgroundColor: '#fff',
            padding: '36px 44px',
            boxSizing: 'border-box',
            lineHeight: '1.45',
        }}>
            {/* Name */}
            <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                <div style={{ fontWeight: 700, fontSize: `${fs.applicantName}pt`, letterSpacing: '0.3px' }}>
                    {data.applicant_name || 'Your Name'}
                </div>
                {contactParts.length > 0 && (
                    <div style={{ fontSize: `${fs.secondary}pt`, color: '#333', marginTop: '4px' }}>
                        {contactParts.join(' | ')}
                    </div>
                )}
            </div>

            {/* Summary */}
            {data.summary?.trim() && (
                <>
                    <Divider title="Summary" size={fs.sectionDivider} />
                    <p style={{ margin: 0, textAlign: 'justify', fontSize: `${fs.body}pt` }}>{highlightWords(data.summary, keywords, onKeywordHover)}</p>
                </>
            )}

            {/* Skills */}
            {data.skills?.trim() && (
                <>
                    <Divider title="Skills" size={fs.sectionDivider} />
                    <p style={{ margin: 0, fontSize: `${fs.body}pt` }}>
                        <SkillsLine
                            skillsStr={data.skills ?? ''}
                            descriptionLower={descriptionLower}
                            keywords={keywords}
                            onReorder={onSkillsReorder}
                            onHover={onKeywordHover}
                        />
                    </p>
                </>
            )}

            {/* Work Experience */}
            {experiences.length > 0 && (
                <>
                    <Divider title="Work Experience" size={fs.sectionDivider} />
                    {experiences.map((exp, i) => {
                        const dateRange = exp.currently_working
                            ? `${fmtDate(exp.from_date)} - Present`
                            : `${fmtDate(exp.from_date)}${exp.to_date ? ` - ${fmtDate(exp.to_date)}` : ''}`

                        const meta = [
                            exp.show_job_type && exp.job_type,
                            exp.show_job_nature && exp.job_nature,
                        ].filter(Boolean).join(', ')

                        const bullets = (exp.bullets ?? [])
                            .map((b, idx) => ({ text: b, idx }))
                            .filter(x => x.text.trim())

                        return (
                            <div key={i} style={{ marginTop: i === 0 ? '4px' : '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <span style={{ fontWeight: 700, fontSize: `${fs.subheading}pt` }}>
                                        {(exp.use_ai_title && exp.ai_title) ? exp.ai_title : exp.designation}
                                        {exp.company_name ? ` | ${exp.company_name}` : ''}
                                        {meta ? ` (${meta})` : ''}
                                    </span>
                                    <span style={{ fontSize: `${fs.secondary}pt`, whiteSpace: 'nowrap', marginLeft: '10px', color: '#222' }}>
                                        {dateRange}
                                    </span>
                                </div>
                                {bullets.map(({ text, idx }) => {
                                    const isEditing = editingBullet?.exp === i && editingBullet?.bullet === idx
                                    return (
                                        <div key={idx} style={{ marginLeft: '14px', marginTop: '2px', fontSize: `${fs.body}pt`, display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                                            <span>-</span>
                                            {isEditing ? (
                                                <input
                                                    autoFocus
                                                    value={text}
                                                    onChange={e => onBulletEdit?.(i, idx, e.target.value)}
                                                    onBlur={() => setEditingBullet(null)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur()
                                                    }}
                                                    style={{
                                                        flex: 1, fontSize: `${fs.body}pt`, fontFamily: 'inherit', lineHeight: 'inherit',
                                                        border: '1px solid #999', borderRadius: '2px', padding: '0 2px', outline: 'none',
                                                    }}
                                                />
                                            ) : (
                                                <span
                                                    onClick={() => onBulletEdit && setEditingBullet({ exp: i, bullet: idx })}
                                                    style={{ flex: 1, cursor: onBulletEdit ? 'text' : undefined }}
                                                    title={onBulletEdit ? 'Click to edit' : undefined}
                                                >
                                                    {highlightWords(text, keywords, onKeywordHover)}
                                                </span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })}
                </>
            )}

            {/* Education */}
            {education.length > 0 && (
                <>
                    <Divider title="Education" size={fs.sectionDivider} />
                    {education.map((edu, i) => (
                        <div key={i} style={{ marginTop: i === 0 ? '4px' : '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <span style={{ fontWeight: 700, fontSize: `${fs.subheading}pt` }}>
                                    {edu.degree_title}
                                    {edu.university_name ? ` | ${edu.university_name}` : ''}
                                </span>
                                {(edu.start_date || edu.end_date) && (
                                    <span style={{ fontSize: `${fs.secondary}pt`, color: '#333', whiteSpace: 'nowrap', marginLeft: '10px' }}>
                                        {[fmtDate(edu.start_date), edu.end_date ? fmtDate(edu.end_date) : ''].filter(Boolean).join(' - ')}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </>
            )}

            {/* Projects */}
            {(data.projects ?? []).filter(p => p.title?.trim()).length > 0 && (
                <>
                    <Divider title="Projects" size={fs.sectionDivider} />
                    {(data.projects ?? []).filter(p => p.title?.trim()).map((proj, i) => {
                        const dateRange = proj.ongoing
                            ? `${fmtDate(proj.start_date)} - Present`
                            : [fmtDate(proj.start_date), proj.end_date ? fmtDate(proj.end_date) : ''].filter(Boolean).join(' - ')
                        return (
                            <div key={i} style={{ marginTop: i === 0 ? '4px' : '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <span style={{ fontWeight: 700, fontSize: `${fs.subheading}pt` }}>
                                        {proj.title}
                                        {proj.link ? <span style={{ fontWeight: 400, fontSize: `${fs.secondary}pt`, color: '#444', marginLeft: '6px' }}>({proj.link})</span> : ''}
                                    </span>
                                    {dateRange && (
                                        <span style={{ fontSize: `${fs.secondary}pt`, color: '#222', whiteSpace: 'nowrap', marginLeft: '10px' }}>
                                            {dateRange}
                                        </span>
                                    )}
                                </div>
                                {proj.technologies?.trim() && (
                                    <div style={{ fontSize: `${fs.secondary}pt`, color: '#333', marginTop: '1px' }}>
                                        <span style={{ fontWeight: 600 }}>Technologies:</span> {proj.technologies}
                                    </div>
                                )}
                                {proj.description?.trim() && (
                                    <div style={{ fontSize: `${fs.body}pt`, marginTop: '2px', marginLeft: '14px' }}>
                                        - {proj.description}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </>
            )}
        </div>
    )
}
