'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { createApplicant, updateApplicant } from '@/app/api_handlers/api/job-applicants.api'

const JOB_TYPES = ['Remote', 'Hybrid', 'Onsite']
const JOB_NATURES = ['Full Time', 'Freelance', 'Contract', 'Volunteer']

interface Experience {
    designation: string
    company_name: string
    from_date: string
    to_date: string
    currently_working: boolean
    job_type: string
    show_job_type: boolean
    job_nature: string
    show_job_nature: boolean
}

interface Education {
    university_name: string
    degree_title: string
    start_date: string
    end_date: string
}

interface Project {
    title: string
    description: string
    link: string
    technologies: string
    start_date: string
    end_date: string
    ongoing: boolean
}

const EMPTY_EDU: Education = {
    university_name: '',
    degree_title: '',
    start_date: '',
    end_date: '',
}

const EMPTY_PROJECT: Project = {
    title: '',
    description: '',
    link: '',
    technologies: '',
    start_date: '',
    end_date: '',
    ongoing: false,
}

const EMPTY_EXP: Experience = {
    designation: '',
    company_name: '',
    from_date: '',
    to_date: '',
    currently_working: false,
    job_type: 'Remote',
    show_job_type: true,
    job_nature: 'Full Time',
    show_job_nature: true,
}

interface Props {
    applicant?: any | null
    onClose: () => void
    onSaved: () => void
}

function DynamicList({
    label, values, onChange, placeholder, type = 'text',
}: {
    label: string
    values: string[]
    onChange: (v: string[]) => void
    placeholder?: string
    type?: string
}) {
    const add = () => onChange([...values, ''])
    const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i))
    const set = (i: number, v: string) => onChange(values.map((x, idx) => idx === i ? v : x))

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-gray-400 uppercase font-medium">{label}</label>
                <button type="button" onClick={add}
                    className="flex items-center gap-0.5 text-[10px] text-teal-600 hover:text-teal-800 border border-teal-200 rounded px-1.5 py-0.5">
                    <Plus size={9} /> Add
                </button>
            </div>
            {values.length === 0 && (
                <p className="text-[10px] text-gray-400 italic">None added</p>
            )}
            <div className="space-y-1">
                {values.map((v, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                        <input
                            type={type}
                            className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-gray-500"
                            placeholder={placeholder}
                            value={v}
                            onChange={e => set(i, e.target.value)}
                        />
                        <button type="button" onClick={() => remove(i)} className="text-gray-300 hover:text-red-500 shrink-0">
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}

function ExperienceCard({
    exp, index, onChange, onRemove,
}: {
    exp: Experience
    index: number
    onChange: (e: Experience) => void
    onRemove: () => void
}) {
    const [open, setOpen] = useState(true)
    const set = (field: keyof Experience, value: any) => onChange({ ...exp, [field]: value })

    const inputCls = 'w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-gray-500'
    const labelCls = 'text-[10px] text-gray-400 uppercase font-medium mb-0.5 block'

    const title = exp.designation || exp.company_name
        ? `${exp.designation || '—'}${exp.company_name ? ` @ ${exp.company_name}` : ''}`
        : `Experience #${index + 1}`

    return (
        <div className="border border-gray-200 rounded overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer"
                onClick={() => setOpen(p => !p)}>
                <span className="text-xs font-medium text-gray-700 truncate">{title}</span>
                <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={e => { e.stopPropagation(); onRemove() }}
                        className="text-gray-300 hover:text-red-500">
                        <Trash2 size={12} />
                    </button>
                    {open ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
                </div>
            </div>

            {open && (
                <div className="p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className={labelCls}>Designation *</label>
                            <input className={inputCls} value={exp.designation}
                                onChange={e => set('designation', e.target.value)} placeholder="e.g. Senior Developer" />
                        </div>
                        <div>
                            <label className={labelCls}>Company Name *</label>
                            <input className={inputCls} value={exp.company_name}
                                onChange={e => set('company_name', e.target.value)} placeholder="e.g. Acme Ltd" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-end">
                        <div>
                            <label className={labelCls}>From Date</label>
                            <input type="month" className={inputCls} value={exp.from_date}
                                onChange={e => set('from_date', e.target.value)} />
                        </div>
                        <div>
                            <label className={labelCls}>To Date</label>
                            <input type="month" className={`${inputCls} ${exp.currently_working ? 'opacity-40 bg-gray-100' : ''}`}
                                value={exp.to_date} disabled={exp.currently_working}
                                onChange={e => set('to_date', e.target.value)} />
                        </div>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700 pb-1">
                            <input type="checkbox" className="w-3.5 h-3.5"
                                checked={exp.currently_working}
                                onChange={e => set('currently_working', e.target.checked)} />
                            Currently Working
                        </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className={labelCls}>Job Type</label>
                            <select className={inputCls} value={exp.job_type}
                                onChange={e => set('job_type', e.target.value)}>
                                {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="flex items-end pb-1">
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-600">
                                <input type="checkbox" className="w-3.5 h-3.5"
                                    checked={exp.show_job_type}
                                    onChange={e => set('show_job_type', e.target.checked)} />
                                Show Job Type on CV
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className={labelCls}>Job Nature</label>
                            <select className={inputCls} value={exp.job_nature}
                                onChange={e => set('job_nature', e.target.value)}>
                                {JOB_NATURES.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                        <div className="flex items-end pb-1">
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-600">
                                <input type="checkbox" className="w-3.5 h-3.5"
                                    checked={exp.show_job_nature}
                                    onChange={e => set('show_job_nature', e.target.checked)} />
                                Show Job Nature on CV
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function ApplicantFormModal({ applicant, onClose, onSaved }: Props) {
    const isEdit = !!applicant
    const [name, setName] = useState('')
    const [github, setGithub] = useState('')
    const [linkedin, setLinkedin] = useState('')
    const [emails, setEmails] = useState<string[]>([''])
    const [phones, setPhones] = useState<string[]>([''])
    const [portfolios, setPortfolios] = useState<string[]>([''])
    const [locations, setLocations] = useState<string[]>([''])
    const [experience, setExperience] = useState<Experience[]>([])
    const [education, setEducation] = useState<Education[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (applicant) {
            setName(applicant.name ?? '')
            setGithub(applicant.github ?? '')
            setLinkedin(applicant.linkedin ?? '')
            setEmails(applicant.emails?.length ? applicant.emails : [''])
            setPhones(applicant.phone_numbers?.length ? applicant.phone_numbers : [''])
            setPortfolios(applicant.portfolios?.length ? applicant.portfolios : [''])
            setLocations(applicant.locations?.length ? applicant.locations : [''])
            setExperience(Array.isArray(applicant.experience) ? applicant.experience : [])
            setEducation(Array.isArray(applicant.education) ? applicant.education : [])
            setProjects(Array.isArray(applicant.projects) ? applicant.projects : [])
        }
    }, [applicant])

    const addExperience = () => setExperience(e => [...e, { ...EMPTY_EXP }])
    const updateExp = (i: number, exp: Experience) => setExperience(e => e.map((x, idx) => idx === i ? exp : x))
    const removeExp = (i: number) => setExperience(e => e.filter((_, idx) => idx !== i))

    const addEducation = () => setEducation(e => [...e, { ...EMPTY_EDU }])
    const updateEdu = (i: number, edu: Education) => setEducation(e => e.map((x, idx) => idx === i ? edu : x))
    const removeEdu = (i: number) => setEducation(e => e.filter((_, idx) => idx !== i))

    const addProject = () => setProjects(p => [...p, { ...EMPTY_PROJECT }])
    const updateProject = (i: number, proj: Project) => setProjects(p => p.map((x, idx) => idx === i ? proj : x))
    const removeProject = (i: number) => setProjects(p => p.filter((_, idx) => idx !== i))

    const handleSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault()
        if (!name.trim()) return
        setSaving(true)
        try {
            const payload = {
                name: name.trim(),
                github: github.trim() || null,
                linkedin: linkedin.trim() || null,
                emails: emails.filter(Boolean),
                phone_numbers: phones.filter(Boolean),
                portfolios: portfolios.filter(Boolean),
                locations: locations.filter(Boolean),
                experience,
                education,
                projects: projects.filter(p => p.title.trim()),
            }
            if (isEdit) {
                await updateApplicant(applicant.id, payload)
            } else {
                await createApplicant(payload)
            }
            onSaved()
        } finally {
            setSaving(false)
        }
    }

    const inputCls = 'w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-gray-500'
    const labelCls = 'text-[10px] text-gray-400 uppercase font-medium mb-0.5 block'

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col"
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
                    <span className="text-sm font-semibold text-gray-800">
                        {isEdit ? 'Edit Applicant' : 'Add Applicant'}
                    </span>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-4 space-y-5">
                        {/* Basic Info */}
                        <div>
                            <label className={labelCls}>Full Name *</label>
                            <input required className={inputCls} value={name}
                                onChange={e => setName(e.target.value)} placeholder="e.g. John Smith" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>GitHub</label>
                                <input className={inputCls} value={github}
                                    onChange={e => setGithub(e.target.value)} placeholder="https://github.com/…" />
                            </div>
                            <div>
                                <label className={labelCls}>LinkedIn</label>
                                <input className={inputCls} value={linkedin}
                                    onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/…" />
                            </div>
                        </div>

                        <DynamicList label="Emails" values={emails} onChange={setEmails}
                            placeholder="email@example.com" type="email" />
                        <DynamicList label="Phone Numbers" values={phones} onChange={setPhones}
                            placeholder="+44 7700 900000" type="tel" />
                        <DynamicList label="Portfolios" values={portfolios} onChange={setPortfolios}
                            placeholder="https://…" />
                        <DynamicList label="Locations" values={locations} onChange={setLocations}
                            placeholder="e.g. Manchester, UK" />

                        {/* Experience */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] text-gray-400 uppercase font-medium">
                                    Experience ({experience.length})
                                </span>
                                <button type="button" onClick={addExperience}
                                    className="flex items-center gap-1 text-[10px] text-teal-600 hover:text-teal-800 border border-teal-200 rounded px-2 py-0.5">
                                    <Plus size={10} /> Add Experience
                                </button>
                            </div>
                            {experience.length === 0 && (
                                <p className="text-[10px] text-gray-400 italic border border-dashed border-gray-200 rounded p-3 text-center">
                                    No experience added yet.
                                </p>
                            )}
                            <div className="space-y-2">
                                {experience.map((exp, i) => (
                                    <ExperienceCard key={i} exp={exp} index={i}
                                        onChange={e => updateExp(i, e)}
                                        onRemove={() => removeExp(i)} />
                                ))}
                            </div>
                        </div>

                        {/* Education */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] text-gray-400 uppercase font-medium">
                                    Education ({education.length})
                                </span>
                                <button type="button" onClick={addEducation}
                                    className="flex items-center gap-1 text-[10px] text-teal-600 hover:text-teal-800 border border-teal-200 rounded px-2 py-0.5">
                                    <Plus size={10} /> Add Education
                                </button>
                            </div>
                            {education.length === 0 && (
                                <p className="text-[10px] text-gray-400 italic border border-dashed border-gray-200 rounded p-3 text-center">
                                    No education added yet.
                                </p>
                            )}
                            <div className="space-y-2">
                                {education.map((edu, i) => (
                                    <div key={i} className="border border-gray-200 rounded p-3 space-y-2">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-[10px] text-gray-500 font-medium">
                                                {edu.university_name || edu.degree_title
                                                    ? `${edu.degree_title || '—'}${edu.university_name ? ` · ${edu.university_name}` : ''}`
                                                    : `Education #${i + 1}`}
                                            </span>
                                            <button type="button" onClick={() => removeEdu(i)}
                                                className="text-gray-300 hover:text-red-500">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="col-span-2">
                                                <label className={labelCls}>University / Institution Name</label>
                                                <input className={inputCls} value={edu.university_name}
                                                    onChange={e => updateEdu(i, { ...edu, university_name: e.target.value })}
                                                    placeholder="e.g. University of Manchester" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className={labelCls}>Degree Title</label>
                                                <input className={inputCls} value={edu.degree_title}
                                                    onChange={e => updateEdu(i, { ...edu, degree_title: e.target.value })}
                                                    placeholder="e.g. BSc Computer Science" />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Start Date</label>
                                                <input type="month" className={inputCls} value={edu.start_date}
                                                    onChange={e => updateEdu(i, { ...edu, start_date: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>End Date</label>
                                                <input type="month" className={inputCls} value={edu.end_date}
                                                    onChange={e => updateEdu(i, { ...edu, end_date: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Projects */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] text-gray-400 uppercase font-medium">
                                    Projects ({projects.length})
                                </span>
                                <button type="button" onClick={addProject}
                                    className="flex items-center gap-1 text-[10px] text-teal-600 hover:text-teal-800 border border-teal-200 rounded px-2 py-0.5">
                                    <Plus size={10} /> Add Project
                                </button>
                            </div>
                            {projects.length === 0 && (
                                <p className="text-[10px] text-gray-400 italic border border-dashed border-gray-200 rounded p-3 text-center">
                                    No projects added yet.
                                </p>
                            )}
                            <div className="space-y-2">
                                {projects.map((proj, i) => (
                                    <div key={i} className="border border-gray-200 rounded p-3 space-y-2">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-[10px] text-gray-500 font-medium truncate">
                                                {proj.title || `Project #${i + 1}`}
                                            </span>
                                            <button type="button" onClick={() => removeProject(i)}
                                                className="text-gray-300 hover:text-red-500 shrink-0">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                        <div>
                                            <label className={labelCls}>Project Title *</label>
                                            <input className={inputCls} value={proj.title}
                                                onChange={e => updateProject(i, { ...proj, title: e.target.value })}
                                                placeholder="e.g. E-Commerce Platform" />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Description</label>
                                            <textarea rows={2} className={`${inputCls} resize-y`}
                                                value={proj.description}
                                                onChange={e => updateProject(i, { ...proj, description: e.target.value })}
                                                placeholder="Brief description of what you built and its impact…" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className={labelCls}>Project Link</label>
                                                <input className={inputCls} value={proj.link}
                                                    onChange={e => updateProject(i, { ...proj, link: e.target.value })}
                                                    placeholder="https://github.com/…" />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Technologies</label>
                                                <input className={inputCls} value={proj.technologies}
                                                    onChange={e => updateProject(i, { ...proj, technologies: e.target.value })}
                                                    placeholder="React, Node.js, PostgreSQL…" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 items-end">
                                            <div>
                                                <label className={labelCls}>Start Date</label>
                                                <input type="month" className={inputCls} value={proj.start_date}
                                                    onChange={e => updateProject(i, { ...proj, start_date: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>End Date</label>
                                                <input type="month" className={`${inputCls} ${proj.ongoing ? 'opacity-40 bg-gray-100' : ''}`}
                                                    value={proj.end_date} disabled={proj.ongoing}
                                                    onChange={e => updateProject(i, { ...proj, end_date: e.target.value })} />
                                            </div>
                                            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700 pb-1">
                                                <input type="checkbox" className="w-3.5 h-3.5"
                                                    checked={proj.ongoing}
                                                    onChange={e => updateProject(i, { ...proj, ongoing: e.target.checked })} />
                                                Ongoing
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2 shrink-0">
                        <button type="button" onClick={onClose}
                            className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={saving}
                            className="px-4 py-1.5 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50">
                            {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
