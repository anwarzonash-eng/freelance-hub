'use client'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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
}

function Divider({ title }: { title: string }) {
    return (
        <div style={{ marginTop: '14px', marginBottom: '5px', borderBottom: '1.5px solid #111', paddingBottom: '2px' }}>
            <span style={{ fontWeight: 700, fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {title}
            </span>
        </div>
    )
}

export default function CVPreview({ data }: { data: CVData }) {
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

    return (
        <div style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '11px',
            color: '#000',
            backgroundColor: '#fff',
            padding: '36px 44px',
            boxSizing: 'border-box',
            lineHeight: '1.45',
        }}>
            {/* Name */}
            <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                <div style={{ fontWeight: 700, fontSize: '22px', letterSpacing: '0.3px' }}>
                    {data.applicant_name || 'Your Name'}
                </div>
                {contactParts.length > 0 && (
                    <div style={{ fontSize: '10px', color: '#333', marginTop: '4px' }}>
                        {contactParts.join(' | ')}
                    </div>
                )}
            </div>

            {/* Summary */}
            {data.summary?.trim() && (
                <>
                    <Divider title="Summary" />
                    <p style={{ margin: 0, textAlign: 'justify', fontSize: '11px' }}>{data.summary}</p>
                </>
            )}

            {/* Skills */}
            {data.skills?.trim() && (
                <>
                    <Divider title="Skills" />
                    <p style={{ margin: 0, fontSize: '11px' }}>{data.skills}</p>
                </>
            )}

            {/* Work Experience */}
            {experiences.length > 0 && (
                <>
                    <Divider title="Work Experience" />
                    {experiences.map((exp, i) => {
                        const dateRange = exp.currently_working
                            ? `${fmtDate(exp.from_date)} - Present`
                            : `${fmtDate(exp.from_date)}${exp.to_date ? ` - ${fmtDate(exp.to_date)}` : ''}`

                        const meta = [
                            exp.show_job_type && exp.job_type,
                            exp.show_job_nature && exp.job_nature,
                        ].filter(Boolean).join(', ')

                        const bullets = (exp.bullets ?? []).filter(b => b.trim())

                        return (
                            <div key={i} style={{ marginTop: i === 0 ? '4px' : '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <span style={{ fontWeight: 700, fontSize: '11px' }}>
                                        {(exp.use_ai_title && exp.ai_title) ? exp.ai_title : exp.designation}
                                        {exp.company_name ? ` | ${exp.company_name}` : ''}
                                        {meta ? ` (${meta})` : ''}
                                    </span>
                                    <span style={{ fontSize: '10.5px', whiteSpace: 'nowrap', marginLeft: '10px', color: '#222' }}>
                                        {dateRange}
                                    </span>
                                </div>
                                {bullets.map((b, bi) => (
                                    <div key={bi} style={{ marginLeft: '14px', marginTop: '2px', fontSize: '11px' }}>
                                        - {b}
                                    </div>
                                ))}
                            </div>
                        )
                    })}
                </>
            )}

            {/* Education */}
            {education.length > 0 && (
                <>
                    <Divider title="Education" />
                    {education.map((edu, i) => (
                        <div key={i} style={{ marginTop: i === 0 ? '4px' : '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <span style={{ fontWeight: 700, fontSize: '11px' }}>
                                    {edu.degree_title}
                                    {edu.university_name ? ` | ${edu.university_name}` : ''}
                                </span>
                                {(edu.start_date || edu.end_date) && (
                                    <span style={{ fontSize: '10.5px', color: '#333', whiteSpace: 'nowrap', marginLeft: '10px' }}>
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
                    <Divider title="Projects" />
                    {(data.projects ?? []).filter(p => p.title?.trim()).map((proj, i) => {
                        const dateRange = proj.ongoing
                            ? `${fmtDate(proj.start_date)} - Present`
                            : [fmtDate(proj.start_date), proj.end_date ? fmtDate(proj.end_date) : ''].filter(Boolean).join(' - ')
                        return (
                            <div key={i} style={{ marginTop: i === 0 ? '4px' : '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <span style={{ fontWeight: 700, fontSize: '11px' }}>
                                        {proj.title}
                                        {proj.link ? <span style={{ fontWeight: 400, fontSize: '10px', color: '#444', marginLeft: '6px' }}>({proj.link})</span> : ''}
                                    </span>
                                    {dateRange && (
                                        <span style={{ fontSize: '10.5px', color: '#222', whiteSpace: 'nowrap', marginLeft: '10px' }}>
                                            {dateRange}
                                        </span>
                                    )}
                                </div>
                                {proj.technologies?.trim() && (
                                    <div style={{ fontSize: '10.5px', color: '#333', marginTop: '1px' }}>
                                        <span style={{ fontWeight: 600 }}>Technologies:</span> {proj.technologies}
                                    </div>
                                )}
                                {proj.description?.trim() && (
                                    <div style={{ fontSize: '11px', marginTop: '2px', marginLeft: '14px' }}>
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
