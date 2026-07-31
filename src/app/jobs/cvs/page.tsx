'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, ExternalLink, Pencil, Trash2, FileText, Search, X, Link, Briefcase, Building2, SlidersHorizontal, AlignLeft, User, Layers, Clock, Eye, MessageSquare, Plus } from 'lucide-react'
import { useColResize } from '@/app/hooks/useColResize'
import { formatHistoryDate } from '@/app/utils/time'
import { JOB_DATE_OPTIONS, inJobDateRange } from '@/app/utils/jobDateFilter'

function SponsorBadge({ value }: { value: string }) {
    const v = value?.toLowerCase()
    const cls = v === 'yes' ? 'bg-green-100 text-green-700'
        : v === 'no' ? 'bg-red-100 text-red-700'
        : 'bg-gray-100 text-gray-500'
    return <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${cls}`}>{value}</span>
}

const FREELANCE_STATUS_COLORS: Record<string, string> = {
    "It's Freelance":    'bg-teal-100 text-teal-700',
    'Could be Freelance': 'bg-yellow-100 text-yellow-700',
    'Nothing Mentioned':  'bg-gray-100 text-gray-500',
}
function FreelanceBadge({ value, tooltip }: { value: string; tooltip?: string }) {
    const v = value || 'Nothing Mentioned'
    return (
        <span
            title={tooltip || undefined}
            className={`text-[9px] px-1.5 py-0.5 rounded font-medium cursor-default ${FREELANCE_STATUS_COLORS[v] ?? 'bg-gray-100 text-gray-500'} ${tooltip ? 'underline decoration-dotted' : ''}`}
        >
            {v}
        </span>
    )
}
import { getAllCVs, deleteCV, getCVHistory } from '@/app/api_handlers/api/job-cvs.api'
import { getAllApplicants } from '@/app/api_handlers/api/job-applicants.api'
import { getAllCompanies } from '@/app/api_handlers/api/sponsored-companies.api'
import { listAuthUsers } from '@/app/api_handlers/api/auth.api'
import JobCVModal from '@/app/components/jobs/JobCVModal'
import { APPLICATION_STATUS_OPTIONS } from '@/app/components/jobs/JobPreviewEdit'
import CVPreview, { CVData } from '@/app/components/jobs/CVPreview'
import ContextMenu, { ContextMenuItem } from '@/app/components/jobs/ContextMenu'

const CV_STATUSES = [
    { value: 'cv_created', label: 'CV Created', cls: 'bg-gray-100 text-gray-600' },
    { value: 'cv_ready_for_edit', label: 'Ready for Edit', cls: 'bg-sky-100 text-sky-700' },
    { value: 'cv_ready_for_review', label: 'Ready for Review', cls: 'bg-blue-100 text-blue-700' },
    { value: 'cv_reviewed', label: 'CV Reviewed', cls: 'bg-yellow-100 text-yellow-700' },
    { value: 'cv_sent', label: 'CV Sent', cls: 'bg-green-100 text-green-700' },
    { value: 'cv_required_qa', label: 'CV Required Q/A', cls: 'bg-purple-100 text-purple-700' },
    { value: 'cv_qa_review_required', label: 'CV Q/A Review Required', cls: 'bg-orange-100 text-orange-700' },
    { value: 'cv_qa_review_done', label: 'CV Q/A Review Done', cls: 'bg-teal-100 text-teal-700' },
]

function CvStatusBadge({ value }: { value: string }) {
    const s = CV_STATUSES.find(x => x.value === value)
    if (!s) return <span className="text-gray-300">—</span>
    return <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${s.cls}`}>{s.label}</span>
}

const CVS_TABLE_COLS = [
    { key: 'cv_title',      label: 'CV Title',      default: true  },
    { key: 'applicant',     label: 'Applicant',     default: true  },
    { key: 'organisation',  label: 'Organisation',  default: true  },
    { key: 'sponsorship',   label: 'Sponsorship',   default: false },
    { key: 'freelance',     label: 'Freelance',     default: false },
    { key: 'job_link',      label: 'Job Link',      default: false },
    { key: 'email',         label: 'Email',         default: false },
    { key: 'exp_yrs',       label: 'Exp (yrs)',     default: true  },
    { key: 'status',        label: 'CV Status',     default: true  },
    { key: 'created',       label: 'CV Creation',   default: true  },
    { key: 'job_created',   label: 'Job Creation Date', default: false },
    { key: 'created_by',    label: 'Created By',    default: false },
]
const CVS_DEFAULT_COLS = new Set(CVS_TABLE_COLS.filter(c => c.default).map(c => c.key))

const CVS_COL_WIDTHS: Record<string, number> = {
    actions: 160,
    cv_title: 200, applicant: 120, organisation: 140,
    sponsorship: 90, freelance: 110, job_link: 70, email: 180, exp_yrs: 70,
    status: 100, created: 90, job_created: 110, created_by: 90,
}

const EMPTY_FILTERS = {
    keyword: '',
    applicant_id: '',
    company_id: '',
    email: '',
    exp_yrs: '',
    created_by: '',
    notes_by: '',
    status: '',
    job_application_status: '',
    sponsorship_status: '',
    freelance_status: '',
    job_date: '',
    job_date_from: '',
    job_date_to: '',
}
type CvFilters = typeof EMPTY_FILTERS

function filterCvs(list: any[], f: CvFilters) {
    let out = list

    const kw = f.keyword.trim().toLowerCase()
    if (kw) {
        const kwNum = Number(kw)
        const isExactNumber = kw !== '' && Number.isInteger(kwNum)
        out = out.filter(cv =>
            cv.cv_title?.toLowerCase().includes(kw) ||
            cv.applicant_name?.toLowerCase().includes(kw) ||
            cv.organization_name?.toLowerCase().includes(kw) ||
            (cv.company_id && String(cv.company_id).toLowerCase() === kw) ||
            (isExactNumber && (cv.id === kwNum || cv.job_id === kwNum))
        )
    }

    if (f.applicant_id) {
        out = out.filter(cv => String(cv.applicant_id ?? '') === f.applicant_id)
    }

    if (f.company_id) {
        out = out.filter(cv => String(cv.company_id ?? '') === f.company_id)
    }

    if (f.email.trim()) {
        const q = f.email.trim().toLowerCase()
        out = out.filter(cv => cv.selected_email?.toLowerCase().includes(q))
    }

    if (f.exp_yrs !== '') {
        const n = Number(f.exp_yrs)
        out = out.filter(cv => cv.years_of_experience === n)
    }

    if (f.created_by) {
        out = out.filter(cv => cv.created_by === f.created_by)
    }

    if (f.notes_by) {
        out = f.notes_by === '__any__'
            ? out.filter(cv => cv.has_notes)
            : out.filter(cv => Array.isArray(cv.note_authors) && cv.note_authors.includes(f.notes_by))
    }

    if (f.job_date) {
        out = out.filter(cv => inJobDateRange(cv.job_created_at, f.job_date, f.job_date_from, f.job_date_to))
    }

    if (f.status) {
        out = out.filter(cv => (cv.status ?? 'cv_created') === f.status)
    }

    return out
}

function highlightRaw(text: string, term: string): string {
    const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    if (!term.trim()) return safe
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return safe.replace(new RegExp(`(${escaped})`, 'gi'),
        m => `<mark class="raw-hl" style="background:#fef08a;color:#713f12;border-radius:2px;padding:0 2px">${m}</mark>`)
}

const CV_FILTER_ITEMS = [
    { key: 'keyword',               label: 'Search' },
    { key: 'applicant_id',          label: 'By Applicant' },
    { key: 'company_id',            label: 'By Company' },
    { key: 'email',                 label: 'By Email' },
    { key: 'exp_yrs',               label: 'By Exp (yrs)' },
    { key: 'created_by',            label: 'Created By' },
    { key: 'notes_by',              label: 'Notes Added by' },
    { key: 'job_date',              label: 'Job Creation Date' },
    { key: 'status',                label: 'By CV Status' },
    { key: 'job_application_status', label: 'By App Status' },
    { key: 'sponsorship_status',     label: 'By Sponsorship' },
    { key: 'freelance_status',       label: 'By Freelance Status' },
]
const CV_DEFAULT_VISIBLE_FILTERS = new Set(CV_FILTER_ITEMS.map(f => f.key))

function buildQueryString(f: CvFilters): string {
    const params = new URLSearchParams()
    Object.entries(f).forEach(([k, v]) => { if (v) params.set(k, v) })
    return params.toString()
}

export default function CvsPage() {
    const router = useRouter()
    const [allData, setAllData] = useState<any[]>([])
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [editingCV, setEditingCV] = useState<any | null>(null)
    // Manual CV creation (not linked to any job).
    const [creatingCV, setCreatingCV] = useState(false)
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; row: any } | null>(null)
    const [userMap, setUserMap] = useState<Record<string, string>>({})
    const [applicants, setApplicants] = useState<{ id: string; name: string }[]>([])

    const [filters, setFilters] = useState<CvFilters>({ ...EMPTY_FILTERS })
    const [companyQuery, setCompanyQuery] = useState('')
    const [companyResults, setCompanyResults] = useState<{ id: string; name: string }[]>([])
    const [showCompanyDd, setShowCompanyDd] = useState(false)
    const [showColDd, setShowColDd] = useState(false)
    const [visibleCols, setVisibleCols] = useState<Set<string>>(() => new Set(CVS_DEFAULT_COLS))
    const [visibleFilters, setVisibleFilters] = useState<Set<string>>(() => {
        try { const s = localStorage.getItem('cvs_visible_filters'); if (s) return new Set(JSON.parse(s)) } catch {}
        return new Set(CV_DEFAULT_VISIBLE_FILTERS)
    })
    const [showFilterDd, setShowFilterDd] = useState(false)
    const filterDdRef = useRef<HTMLDivElement>(null)
    const companyDdRef = useRef<HTMLDivElement>(null)
    const colDdRef = useRef<HTMLDivElement>(null)
    const hydratedFromUrl = useRef(false)
    const { widths: colW, startResize } = useColResize(CVS_COL_WIDTHS, 'cvs_col_widths')

    const col = (key: string) => visibleCols.has(key)
    const tableWidth = (colW.actions ?? 160) + 110 + CVS_TABLE_COLS.filter(c => col(c.key)).reduce((s, c) => s + (colW[c.key] ?? CVS_COL_WIDTHS[c.key] ?? 100), 0)

    // Raw description sidebar
    const [rawSidebarRow, setRawSidebarRow] = useState<any | null>(null)
    const [rawSidebarSearch, setRawSidebarSearch] = useState('')
    const rawSidebarContentRef = useRef<HTMLDivElement>(null)
    const [rawSidebarWidth, setRawSidebarWidth] = useState<number>(() => {
        try { return Number(localStorage.getItem('cvs_rawsidebar_width')) || 340 } catch { return 340 }
    })
    const [rawFontSize, setRawFontSize] = useState<number>(() => {
        try { return Math.min(24, Math.max(8, Number(localStorage.getItem('cvs_rawsidebar_fontsize')) || 10)) } catch { return 10 }
    })
    const adjustRawFont = (delta: number) => setRawFontSize(s => {
        const next = Math.min(24, Math.max(8, s + delta))
        try { localStorage.setItem('cvs_rawsidebar_fontsize', String(next)) } catch { /* ignore */ }
        return next
    })
    const rawSidebarResizing = useRef(false)
    const rawSidebarStartX = useRef(0)
    const rawSidebarStartW = useRef(0)
    const startRawResize = (e: React.MouseEvent) => {
        e.preventDefault()
        rawSidebarResizing.current = true
        rawSidebarStartX.current = e.clientX
        rawSidebarStartW.current = rawSidebarWidth
        const onMove = (ev: MouseEvent) => {
            if (!rawSidebarResizing.current) return
            // Panel is docked on the left; dragging its right edge rightward widens it.
            const delta = ev.clientX - rawSidebarStartX.current
            const maxW = Math.max(400, window.innerWidth - 320)
            const next = Math.max(220, Math.min(maxW, rawSidebarStartW.current + delta))
            setRawSidebarWidth(next)
            try { localStorage.setItem('cvs_rawsidebar_width', String(next)) } catch {}
        }
        const onUp = () => {
            rawSidebarResizing.current = false
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    }

    useEffect(() => {
        if (!rawSidebarSearch.trim() || !rawSidebarContentRef.current) return
        const t = setTimeout(() => {
            const el = rawSidebarContentRef.current?.querySelector('.raw-hl')
            el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }, 80)
        return () => clearTimeout(t)
    }, [rawSidebarSearch])

    const rawSidebarMatchCount = useMemo(() => {
        if (!rawSidebarSearch.trim() || !rawSidebarRow?.raw_description) return 0
        const escaped = rawSidebarSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        return (rawSidebarRow.raw_description.match(new RegExp(escaped, 'gi')) || []).length
    }, [rawSidebarSearch, rawSidebarRow])

    // History side panel (read-only; notes/audio can only be added from CV Edit popup)
    const [historyRow, setHistoryRow] = useState<any | null>(null)
    const [historyEntries, setHistoryEntries] = useState<any[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)

    const loadHistory = useCallback(async (cvId: number) => {
        setHistoryLoading(true)
        try {
            const res: any = await getCVHistory(cvId)
            const entries = res?.data ?? res ?? []
            setHistoryEntries(Array.isArray(entries) ? entries : [])
        } catch { setHistoryEntries([]) }
        finally { setHistoryLoading(false) }
    }, [])

    const openHistory = (row: any) => {
        if (historyRow?.id === row.id) { setHistoryRow(null); return }
        setHistoryRow(row)
        loadHistory(row.id)
    }

    // Short view popup
    const [shortView, setShortView] = useState<{ row: any; type: 'summary' | 'full' | 'skills' | 'experience' } | null>(null)
    const shortViewRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (!shortView) return
        const handler = (e: MouseEvent) => {
            if (shortViewRef.current && !shortViewRef.current.contains(e.target as Node)) setShortView(null)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [shortView])

    const rh = (key: string) => (
        <div className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400/40 active:bg-blue-500/60 select-none"
            onMouseDown={e => startResize(key, e)} />
    )

    const load = useCallback(async (extraParams?: Record<string, string>) => {
        setLoading(true)
        try {
            const res: any = await getAllCVs(extraParams)
            const payload = res?.data ?? res
            const list = Array.isArray(payload) ? payload : []
            setAllData(list)
            return list
        } finally {
            setLoading(false)
        }
    }, [])

    // Hydrate filters from the URL on first load (so a copied link reproduces the same view).
    useEffect(() => {
        load().then(() => {
            const searchParams = new URLSearchParams(window.location.search)
            const hydratedCompanyId = searchParams.get('company_id') || ''
            const fromUrl: CvFilters = {
                keyword: searchParams.get('keyword') || searchParams.get('id') || searchParams.get('job_id') || '',
                applicant_id: searchParams.get('applicant_id') || '',
                company_id: hydratedCompanyId,
                email: searchParams.get('email') || '',
                exp_yrs: searchParams.get('exp_yrs') || '',
                created_by: searchParams.get('created_by') || '',
                notes_by: searchParams.get('notes_by') || '',
                status: searchParams.get('status') || '',
                job_application_status: searchParams.get('job_application_status') || '',
                sponsorship_status: searchParams.get('sponsorship_status') || '',
                freelance_status: searchParams.get('freelance_status') || '',
                job_date: searchParams.get('job_date') || '',
                job_date_from: searchParams.get('job_date_from') || '',
                job_date_to: searchParams.get('job_date_to') || '',
            }
            hydratedFromUrl.current = true
            setFilters(fromUrl)

            if (hydratedCompanyId) {
                getAllCompanies({ keyword: hydratedCompanyId, limit: 1 }).then((res: any) => {
                    const payload = res?.data ?? res
                    const found = (payload?.data ?? [])[0]
                    setCompanyQuery(found?.organisation_name || hydratedCompanyId)
                }).catch(() => setCompanyQuery(hydratedCompanyId))
            }
        })
    }, [])

    useEffect(() => {
        listAuthUsers().then((res: any) => {
            const list = res?.data ?? res
            if (Array.isArray(list)) {
                const map: Record<string, string> = {}
                list.forEach((u: any) => { if (u.id) map[u.id] = u.userid || u.id })
                setUserMap(map)
            }
        }).catch(() => { })

        getAllApplicants({ limit: 200 }).then((res: any) => {
            const payload = res?.data ?? res
            const list = Array.isArray(payload) ? payload : (payload?.data ?? [])
            if (Array.isArray(list)) {
                setApplicants(
                    list
                        .map((a: any) => ({ id: String(a.id), name: a.name || `Applicant #${a.id}` }))
                        .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))
                )
            }
        }).catch(() => { })
    }, [])

    useEffect(() => {
        const savedCols = localStorage.getItem('cvs_visible_cols')
        if (savedCols) setVisibleCols(new Set(JSON.parse(savedCols)))
    }, [])

    const toggleCol = (key: string) =>
        setVisibleCols(prev => {
            const s = new Set(prev)
            if (s.has(key)) s.delete(key); else s.add(key)
            localStorage.setItem('cvs_visible_cols', JSON.stringify(Array.from(s)))
            return s
        })

    const toggleFilter = (key: string) =>
        setVisibleFilters(prev => {
            const s = new Set(prev)
            if (s.has(key)) s.delete(key); else s.add(key)
            localStorage.setItem('cvs_visible_filters', JSON.stringify(Array.from(s)))
            return s
        })

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (companyDdRef.current && !companyDdRef.current.contains(e.target as Node)) setShowCompanyDd(false)
            if (colDdRef.current && !colDdRef.current.contains(e.target as Node)) setShowColDd(false)
            if (filterDdRef.current && !filterDdRef.current.contains(e.target as Node)) setShowFilterDd(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Debounced company search-as-you-type (queries the backend, same pattern as Listed Jobs).
    useEffect(() => {
        if (!showCompanyDd) return
        const q = companyQuery.trim()
        const t = setTimeout(() => {
            getAllCompanies({ keyword: q, limit: 20 }).then((res: any) => {
                const payload = res?.data ?? res
                const rows = Array.isArray(payload?.data) ? payload.data : []
                setCompanyResults(rows.map((c: any) => ({ id: c.id, name: c.organisation_name || c.id })))
            }).catch(() => setCompanyResults([]))
        }, 250)
        return () => clearTimeout(t)
    }, [companyQuery, showCompanyDd])

    // Reload from backend when any job-level filter changes (backend-side filters).
    const prevJobFilters = useRef({ job_application_status: '', sponsorship_status: '', freelance_status: '' })
    useEffect(() => {
        if (!hydratedFromUrl.current) return
        const cur = { job_application_status: filters.job_application_status, sponsorship_status: filters.sponsorship_status, freelance_status: filters.freelance_status }
        if (cur.job_application_status === prevJobFilters.current.job_application_status &&
            cur.sponsorship_status === prevJobFilters.current.sponsorship_status &&
            cur.freelance_status === prevJobFilters.current.freelance_status) return
        prevJobFilters.current = cur
        const params: Record<string, string> = {}
        if (cur.job_application_status) params.job_application_status = cur.job_application_status
        if (cur.sponsorship_status) params.sponsorship_status = cur.sponsorship_status
        if (cur.freelance_status) params.freelance_status = cur.freelance_status
        load(params)
    }, [filters.job_application_status, filters.sponsorship_status, filters.freelance_status, load])

    // Recompute the visible rows + keep the URL in sync whenever a filter changes.
    useEffect(() => {
        setData(filterCvs(allData, filters))
        if (!hydratedFromUrl.current) return
        const qs = buildQueryString(filters)
        router.replace(qs ? `/jobs/cvs?${qs}` : '/jobs/cvs')
    }, [allData, filters, router])

    const selectCompany = (c: { id: string; name: string }) => {
        setFilters(f => ({ ...f, company_id: c.id }))
        setCompanyQuery(c.name)
        setShowCompanyDd(false)
    }

    const clearCompany = () => {
        setFilters(f => ({ ...f, company_id: '' }))
        setCompanyQuery('')
    }

    const clearAllFilters = () => {
        setFilters({ ...EMPTY_FILTERS })
        setCompanyQuery('')
        router.replace('/jobs/cvs')
    }

    const activeFilterCount = Object.values(filters).filter(Boolean).length

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this CV?')) return
        await deleteCV(id)
        load()
    }

    return (
        <div className="p-3 bg-white min-h-screen flex flex-col">
            <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-2">
                <div className="flex items-center gap-2">
                    <FileText size={14} className="text-gray-500" />
                    <h1 className="text-sm font-semibold text-gray-800">CVs</h1>
                    <span className="text-[10px] text-gray-400">{data.length} / {allData.length} total</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => load()} disabled={loading}
                        className="flex items-center gap-1 text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50 text-gray-600">
                        <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button onClick={() => setCreatingCV(true)}
                        title="Create a CV manually (not linked to a job)"
                        className="flex items-center gap-1 text-xs bg-teal-600 text-white rounded px-2.5 py-1 hover:bg-teal-700">
                        <Plus size={13} /> Create CV
                    </button>
                </div>
            </div>

            {/* Filter bar */}
            <div className="border border-gray-200 rounded p-2 mb-2 bg-gray-50">
                <div className="flex items-end gap-1.5 flex-wrap">
                    {/* Filter visibility toggle */}
                    <div className="relative self-end" ref={filterDdRef}>
                        <button onClick={() => setShowFilterDd(p => !p)}
                            title="Show/hide filters"
                            className={`p-1 border rounded transition-colors relative ${showFilterDd ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-gray-300 text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                            <SlidersHorizontal size={13} />
                            {CV_FILTER_ITEMS.some(f => !visibleFilters.has(f.key)) && (
                                <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[7px] rounded-full w-2.5 h-2.5 flex items-center justify-center font-bold leading-none">·</span>
                            )}
                        </button>
                        {showFilterDd && (
                            <div className="absolute left-0 top-full mt-1 z-40 bg-white border border-gray-200 rounded shadow-lg p-2 min-w-44">
                                <p className="text-[9px] text-gray-400 uppercase font-semibold px-1 mb-1">Filters</p>
                                {CV_FILTER_ITEMS.map(({ key, label }) => (
                                    <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                                        <input type="checkbox" className="w-3 h-3"
                                            checked={visibleFilters.has(key)}
                                            onChange={() => toggleFilter(key)} />
                                        <span className="text-xs text-gray-700">{label}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className={`flex flex-col gap-0.5${visibleFilters.has('keyword') ? '' : ' hidden'}`}>
                        <label className="text-[10px] text-gray-400 uppercase">Search</label>
                        <div className="relative">
                            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                className={`border rounded pl-6 pr-2 py-1 text-xs focus:outline-none w-56 transition-colors ${filters.keyword ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}
                                placeholder="CV title, applicant, company, job/company ID…"
                                value={filters.keyword}
                                onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className={`flex flex-col gap-0.5${visibleFilters.has('applicant_id') ? '' : ' hidden'}`}>
                        <label className="text-[10px] text-gray-400 uppercase">By Applicant</label>
                        <select
                            className={`border rounded px-2 py-1 text-xs focus:outline-none min-w-[140px] transition-colors ${filters.applicant_id ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}
                            value={filters.applicant_id}
                            onChange={e => setFilters(f => ({ ...f, applicant_id: e.target.value }))}
                        >
                            <option value="">All</option>
                            {applicants.map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className={`flex flex-col gap-0.5 relative${visibleFilters.has('company_id') ? '' : ' hidden'}`} ref={companyDdRef}>
                        <label className="text-[10px] text-gray-400 uppercase">By Company</label>
                        <div className="relative">
                            <input
                                className={`border rounded pl-2 pr-6 py-1 text-xs focus:outline-none w-44 transition-colors ${filters.company_id ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}
                                placeholder="Search company by id or name…"
                                value={companyQuery}
                                onFocus={() => setShowCompanyDd(true)}
                                onChange={e => {
                                    setCompanyQuery(e.target.value)
                                    setShowCompanyDd(true)
                                    if (filters.company_id) setFilters(f => ({ ...f, company_id: '' }))
                                }}
                            />
                            {(companyQuery || filters.company_id) && (
                                <button onClick={clearCompany} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <X size={11} />
                                </button>
                            )}
                        </div>
                        {showCompanyDd && (
                            <div className="absolute z-20 top-full mt-1 left-0 bg-white border border-gray-200 rounded shadow-lg p-1 min-w-[220px] max-h-60 overflow-y-auto">
                                {companyResults.length === 0 && (
                                    <p className="text-[10px] text-gray-400 px-2 py-1">No matching companies</p>
                                )}
                                {companyResults.map(c => (
                                    <button key={c.id} type="button" onClick={() => selectCompany(c)}
                                        className="w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 rounded truncate">
                                        {c.name}
                                        <span className="text-[9px] text-gray-400 ml-1">({c.id})</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className={`flex flex-col gap-0.5${visibleFilters.has('email') ? '' : ' hidden'}`}>
                        <label className="text-[10px] text-gray-400 uppercase">By Email</label>
                        <input
                            className={`border rounded px-2 py-1 text-xs focus:outline-none w-40 transition-colors ${filters.email ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}
                            placeholder="email@example.com"
                            value={filters.email}
                            onChange={e => setFilters(f => ({ ...f, email: e.target.value }))}
                        />
                    </div>

                    <div className={`flex flex-col gap-0.5${visibleFilters.has('exp_yrs') ? '' : ' hidden'}`}>
                        <label className="text-[10px] text-gray-400 uppercase">By Exp (yrs)</label>
                        <input
                            type="number"
                            min={0}
                            className={`border rounded px-2 py-1 text-xs focus:outline-none w-20 transition-colors ${filters.exp_yrs ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}
                            placeholder="e.g. 5"
                            value={filters.exp_yrs}
                            onChange={e => setFilters(f => ({ ...f, exp_yrs: e.target.value }))}
                        />
                    </div>

                    <div className={`flex flex-col gap-0.5${visibleFilters.has('created_by') ? '' : ' hidden'}`}>
                        <label className="text-[10px] text-gray-400 uppercase">Created By</label>
                        <select
                            className={`border rounded px-2 py-1 text-xs focus:outline-none min-w-[110px] transition-colors ${filters.created_by ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}
                            value={filters.created_by}
                            onChange={e => setFilters(f => ({ ...f, created_by: e.target.value }))}
                        >
                            <option value="">All</option>
                            {Object.entries(userMap).map(([id, name]) => (
                                <option key={id} value={id}>{name}</option>
                            ))}
                        </select>
                    </div>

                    <div className={`flex flex-col gap-0.5${visibleFilters.has('notes_by') ? '' : ' hidden'}`}>
                        <label className="text-[10px] text-gray-400 uppercase">Notes Added by</label>
                        <select
                            className={`border rounded px-2 py-1 text-xs focus:outline-none min-w-[120px] transition-colors ${filters.notes_by ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}
                            value={filters.notes_by}
                            onChange={e => setFilters(f => ({ ...f, notes_by: e.target.value }))}
                        >
                            <option value="">All</option>
                            <option value="__any__">Any notes</option>
                            {Array.from(new Set(allData.flatMap((cv: any) => cv.note_authors || []))).sort().map((author: any) => (
                                <option key={author} value={author}>By {userMap[author] || author}</option>
                            ))}
                        </select>
                    </div>

                    <div className={`flex flex-col gap-0.5${visibleFilters.has('job_date') ? '' : ' hidden'}`}>
                        <label className="text-[10px] text-gray-400 uppercase">Job Creation Date</label>
                        <div className="flex items-center gap-1">
                            <select
                                className={`border rounded px-2 py-1 text-xs focus:outline-none min-w-[130px] transition-colors ${filters.job_date ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}
                                value={filters.job_date}
                                onChange={e => setFilters(f => ({ ...f, job_date: e.target.value }))}
                            >
                                <option value="">All</option>
                                {JOB_DATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            {filters.job_date === 'custom' && (
                                <>
                                    <input type="date" value={filters.job_date_from}
                                        onChange={e => setFilters(f => ({ ...f, job_date_from: e.target.value }))}
                                        className="border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none" />
                                    <span className="text-[10px] text-gray-400">→</span>
                                    <input type="date" value={filters.job_date_to}
                                        onChange={e => setFilters(f => ({ ...f, job_date_to: e.target.value }))}
                                        className="border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none" />
                                </>
                            )}
                        </div>
                    </div>

                    <div className={`flex flex-col gap-0.5${visibleFilters.has('status') ? '' : ' hidden'}`}>
                        <label className="text-[10px] text-gray-400 uppercase">By CV Status</label>
                        <select
                            className={`border rounded px-2 py-1 text-xs focus:outline-none min-w-[110px] transition-colors ${filters.status ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}
                            value={filters.status}
                            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                        >
                            <option value="">All</option>
                            {CV_STATUSES.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className={`flex flex-col gap-0.5${visibleFilters.has('job_application_status') ? '' : ' hidden'}`}>
                        <label className="text-[10px] text-gray-400 uppercase">By App Status</label>
                        <select
                            className={`border rounded px-2 py-1 text-xs focus:outline-none min-w-[130px] transition-colors ${filters.job_application_status ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}
                            value={filters.job_application_status}
                            onChange={e => setFilters(f => ({ ...f, job_application_status: e.target.value }))}
                        >
                            <option value="">All</option>
                            <option value="none">Not tracked</option>
                            {APPLICATION_STATUS_OPTIONS.filter(o => o.value).map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className={`flex flex-col gap-0.5${visibleFilters.has('sponsorship_status') ? '' : ' hidden'}`}>
                        <label className="text-[10px] text-gray-400 uppercase">By Sponsorship</label>
                        <select
                            className={`border rounded px-2 py-1 text-xs focus:outline-none min-w-[160px] transition-colors ${filters.sponsorship_status ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}
                            value={filters.sponsorship_status}
                            onChange={e => setFilters(f => ({ ...f, sponsorship_status: e.target.value }))}
                        >
                            <option value="">All</option>
                            <option value="Visa Sponsorship Available">Visa Sponsorship Available</option>
                            <option value="Working Right Required">Working Right Required</option>
                            <option value="Nothing Mentioned">Nothing Mentioned</option>
                        </select>
                    </div>

                    <div className={`flex flex-col gap-0.5${visibleFilters.has('freelance_status') ? '' : ' hidden'}`}>
                        <label className="text-[10px] text-gray-400 uppercase">By Freelance Status</label>
                        <select
                            className={`border rounded px-2 py-1 text-xs focus:outline-none min-w-[150px] transition-colors ${filters.freelance_status ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white'}`}
                            value={filters.freelance_status}
                            onChange={e => setFilters(f => ({ ...f, freelance_status: e.target.value }))}
                        >
                            <option value="">All</option>
                            <option value="It's Freelance">It's Freelance</option>
                            <option value="Could be Freelance">Could be Freelance</option>
                            <option value="Nothing Mentioned">Nothing Mentioned</option>
                        </select>
                    </div>

                    {activeFilterCount > 0 && (
                        <button onClick={clearAllFilters} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-white mt-auto">
                            Clear ({activeFilterCount})
                        </button>
                    )}

                    {activeFilterCount > 0 && (
                        <span className="text-[10px] text-gray-400 mt-auto">
                            {data.length} result{data.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex gap-0 flex-1 min-h-[60vh]">
            {/* Raw description sidebar — sticky, fills the viewport height and scrolls internally */}
            {rawSidebarRow && (
                <div className="relative flex shrink-0 self-start sticky top-2 border border-gray-200 rounded-l bg-white overflow-hidden"
                    style={{ width: rawSidebarWidth, height: 'calc(100vh - 1rem)' }}>
                    {/* Drag handle on the right edge (panel is docked left) */}
                    <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400/40 active:bg-blue-500/60 z-20 select-none"
                        onMouseDown={startRawResize} />
                    <div className="flex flex-col w-full overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 shrink-0 bg-gray-50">
                            <div className="min-w-0">
                                <p className="text-[10px] font-semibold text-gray-700 truncate">{rawSidebarRow.cv_title || rawSidebarRow.organization_name || 'Raw Description'}</p>
                                <p className="text-[9px] text-gray-400">Job Description</p>
                            </div>
                            <button onClick={() => { setRawSidebarRow(null); setRawSidebarSearch('') }} className="text-gray-400 hover:text-gray-700 shrink-0 ml-2">
                                <X size={13} />
                            </button>
                        </div>
                        {/* Search bar */}
                        <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-gray-100 shrink-0 bg-white">
                            <Search size={11} className="text-gray-400 shrink-0" />
                            <input
                                type="text"
                                value={rawSidebarSearch}
                                onChange={e => setRawSidebarSearch(e.target.value)}
                                placeholder="Search…"
                                className="flex-1 text-[11px] outline-none min-w-0"
                            />
                            {rawSidebarSearch && (
                                <>
                                    <span className="text-[9px] text-gray-400 shrink-0">{rawSidebarMatchCount} match{rawSidebarMatchCount !== 1 ? 'es' : ''}</span>
                                    <button onClick={() => setRawSidebarSearch('')} className="text-gray-300 hover:text-gray-600 shrink-0"><X size={10} /></button>
                                </>
                            )}
                            {/* Font-size control */}
                            <div className="flex items-center gap-0.5 shrink-0 border-l border-gray-200 pl-1.5 ml-0.5">
                                <button onClick={() => adjustRawFont(-1)} disabled={rawFontSize <= 8} title="Smaller font"
                                    className="w-5 h-5 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 leading-none">−</button>
                                <span className="text-[9px] text-gray-400 w-4 text-center tabular-nums">{rawFontSize}</span>
                                <button onClick={() => adjustRawFont(1)} disabled={rawFontSize >= 24} title="Larger font"
                                    className="w-5 h-5 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 leading-none">+</button>
                            </div>
                        </div>
                        <div ref={rawSidebarContentRef} className="flex-1 overflow-y-auto p-3">
                            {rawSidebarRow.raw_description
                                ? <pre className="text-gray-700 whitespace-pre-wrap" style={{ fontSize: rawFontSize, lineHeight: 1.5 }}
                                    dangerouslySetInnerHTML={{ __html: highlightRaw(rawSidebarRow.raw_description, rawSidebarSearch) }} />
                                : <p className="text-[10px] text-gray-400 italic">No raw description available.</p>
                            }
                        </div>
                    </div>
                </div>
            )}

            <div className={`border border-gray-200 ${rawSidebarRow ? 'rounded-r' : ''} ${historyRow ? 'rounded-l' : ''} ${!rawSidebarRow && !historyRow ? 'rounded' : ''} overflow-x-auto flex-1 min-w-0`}>
                <table className="text-xs border-collapse" style={{ tableLayout: 'fixed', width: tableWidth }}>
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-300">
                            <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 relative" style={{ width: colW.actions ?? 160 }}>
                                <div className="flex items-center justify-between">
                                <span>Actions</span>
                                <div className="flex items-center gap-1">

                                    <button
                                        onClick={() => setData(filterCvs(allData, filters))}
                                        disabled={loading}
                                        title="Refresh results with current filter"
                                        className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                                    >
                                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                                    </button>
                                    <div className="relative" ref={colDdRef}>
                                        <button onClick={() => setShowColDd(p => !p)}
                                            title="Show/hide columns"
                                            className={`p-0.5 hover:bg-gray-200 rounded transition-colors relative ${showColDd ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
                                            <SlidersHorizontal size={12} />
                                            {visibleCols.size !== CVS_DEFAULT_COLS.size && (
                                                <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[7px] rounded-full w-2.5 h-2.5 flex items-center justify-center font-bold leading-none">·</span>
                                            )}
                                        </button>
                                        {showColDd && (
                                            <div className="absolute left-0 top-full mt-1 z-40 bg-white border border-gray-200 rounded shadow-lg p-2 min-w-40">
                                                <p className="text-[9px] text-gray-400 uppercase font-semibold px-1 mb-1">Columns</p>
                                                {CVS_TABLE_COLS.map(({ key, label }) => (
                                                    <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                                                        <input type="checkbox" className="w-3 h-3"
                                                            checked={visibleCols.has(key)}
                                                            onChange={() => toggleCol(key)} />
                                                        <span className="text-xs text-gray-700">{label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                </div>
                                {rh('actions')}
                            </th>
                            {col('cv_title') && <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 relative overflow-hidden" style={{ width: colW.cv_title }}>CV Title{rh('cv_title')}</th>}
                            {col('applicant') && <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 relative overflow-hidden" style={{ width: colW.applicant }}>Applicant{rh('applicant')}</th>}
                            {col('organisation') && <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 relative overflow-hidden" style={{ width: colW.organisation }}>Organisation{rh('organisation')}</th>}
                            {col('sponsorship') && <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 relative overflow-hidden" style={{ width: colW.sponsorship }}>Sponsorship{rh('sponsorship')}</th>}
                            {col('freelance') && <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 relative overflow-hidden" style={{ width: colW.freelance }}>Freelance{rh('freelance')}</th>}
                            {col('job_link') && <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 relative overflow-hidden" style={{ width: colW.job_link }}>Job Link{rh('job_link')}</th>}
                            {col('email') && <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 relative overflow-hidden" style={{ width: colW.email }}>Email{rh('email')}</th>}
                            {col('exp_yrs') && <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 relative overflow-hidden" style={{ width: colW.exp_yrs }}>Exp (yrs){rh('exp_yrs')}</th>}
                            {col('status') && <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 relative overflow-hidden" style={{ width: colW.status }}>CV Status{rh('status')}</th>}
                            {col('created') && <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 relative overflow-hidden" style={{ width: colW.created }}>CV Creation{rh('created')}</th>}
                            {col('job_created') && <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 relative overflow-hidden" style={{ width: colW.job_created }}>Job Creation Date{rh('job_created')}</th>}
                            {col('created_by') && <th className="px-2 py-1.5 text-left font-medium text-gray-600 border-r border-gray-200 relative overflow-hidden" style={{ width: colW.created_by }}>Created By{rh('created_by')}</th>}
                            <th className="px-2 py-1.5 text-left font-medium text-gray-500 border-r border-gray-200" style={{ width: 110 }}>Short Views</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan={2 + visibleCols.size} className="text-center py-10 text-gray-400" style={{ minWidth: tableWidth }}>
                                <div className="flex items-center justify-center gap-2"><RefreshCw size={13} className="animate-spin" /> Loading…</div>
                            </td></tr>
                        )}
                        {!loading && data.length === 0 && (
                            <tr><td colSpan={2 + visibleCols.size} className="text-center py-10 text-gray-400">
                                {activeFilterCount > 0 ? 'No CVs match your filters.' : 'No CVs yet. Create one from the Listed Jobs page.'}
                            </td></tr>
                        )}
                        {!loading && data.map((row, idx) => (
                            <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-context-menu"
                                onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, row }) }}>
                                <td className="px-2 py-1.5 border-r border-gray-100">
                                    <div className="flex items-center gap-1">
                                        <a href={`/viewCV/${row.id}`} target="_blank" rel="noopener noreferrer"
                                            title="View CV"
                                            className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded">
                                            <ExternalLink size={12} />
                                        </a>
                                        <button onClick={() => setEditingCV(row)} title="Edit CV"
                                            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                                            <Pencil size={12} />
                                        </button>
                                        {row.job_id && (
                                            <a href={`/jobs/listed-jobs?job_id=${row.job_id}`} title="View this job"
                                                className="p-1 text-gray-500 hover:text-teal-700 hover:bg-teal-50 rounded">
                                                <Briefcase size={12} />
                                            </a>
                                        )}
                                        {row.company_id && (
                                            <a href={`/jobs/companies?id=${encodeURIComponent(row.company_id)}`} title="View this company"
                                                className="p-1 text-gray-500 hover:text-indigo-700 hover:bg-indigo-50 rounded">
                                                <Building2 size={12} />
                                            </a>
                                        )}
                                        <button onClick={() => {
                                            if (rawSidebarRow?.id === row.id) { setRawSidebarRow(null); setRawSidebarSearch('') }
                                            else { setRawSidebarRow(row); setRawSidebarSearch('') }
                                        }}
                                            title="View raw job description"
                                            className={`p-1 rounded ${rawSidebarRow?.id === row.id ? 'text-amber-600 bg-amber-50' : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'}`}>
                                            <AlignLeft size={12} />
                                        </button>
                                        <button onClick={() => openHistory(row)}
                                            title={row.has_notes ? `View history — has notes${row.note_authors?.length ? ` by ${row.note_authors.map((u: string) => userMap[u] || u).join(', ')}` : ''}` : 'View history & notes'}
                                            className={`p-1 rounded relative ${historyRow?.id === row.id ? 'text-purple-600 bg-purple-50' : row.has_notes ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'}`}>
                                            <Clock size={12} />
                                            {row.has_notes && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" />}
                                        </button>
                                        <button onClick={() => handleDelete(row.id)} title="Delete CV"
                                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </td>
                                {col('cv_title') && <td className="px-2 py-1.5 border-r border-gray-100 max-w-[200px]">
                                    <div className="truncate font-medium text-gray-800">{row.cv_title || '—'}</div>
                                </td>}
                                {col('applicant') && <td className="px-2 py-1.5 border-r border-gray-100">
                                    <div className="text-gray-700">{row.applicant_name || '—'}</div>
                                </td>}
                                {col('organisation') && <td className="px-2 py-1.5 border-r border-gray-100 max-w-[140px]">
                                    <div className="truncate text-gray-600">{row.organization_name || '—'}</div>
                                </td>}
                                {col('sponsorship') && <td className="px-2 py-1.5 border-r border-gray-100 whitespace-nowrap">
                                    {row.sponsorship ? <SponsorBadge value={row.sponsorship} /> : <span className="text-gray-300">—</span>}
                                </td>}
                                {col('freelance') && <td className="px-2 py-1.5 border-r border-gray-100 whitespace-nowrap">
                                    {row.job_freelance_status
                                        ? <FreelanceBadge value={row.job_freelance_status} tooltip={row.job_freelance_description || undefined} />
                                        : <span className="text-gray-300">—</span>}
                                </td>}
                                {col('job_link') && <td className="px-2 py-1.5 border-r border-gray-100">
                                    {row.job_link ? (
                                        <a href={row.job_link} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-0.5 text-blue-500 hover:underline text-[10px]">
                                            <Link size={9} /> Link
                                        </a>
                                    ) : <span className="text-gray-300">—</span>}
                                </td>}
                                {col('email') && <td className="px-2 py-1.5 border-r border-gray-100 max-w-[180px]">
                                    <div className="truncate text-gray-500">{row.selected_email || '—'}</div>
                                </td>}
                                {col('exp_yrs') && <td className="px-2 py-1.5 border-r border-gray-100 text-center text-gray-600">
                                    {row.years_of_experience ?? '—'}
                                </td>}
                                {col('status') && <td className="px-2 py-1.5 border-r border-gray-100 whitespace-nowrap">
                                    <CvStatusBadge value={row.status ?? 'cv_created'} />
                                </td>}
                                {col('created') && <td className="px-2 py-1.5 border-r border-gray-100 text-gray-400 text-[10px] whitespace-nowrap">
                                    {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}
                                </td>}
                                {col('job_created') && <td className="px-2 py-1.5 border-r border-gray-100 text-gray-400 text-[10px] whitespace-nowrap">
                                    {row.job_created_at ? new Date(row.job_created_at).toLocaleDateString() : '—'}
                                </td>}
                                {col('created_by') && <td className="px-2 py-1.5 border-r border-gray-100 text-gray-600 text-[10px] whitespace-nowrap">
                                    {row.created_by ? (userMap[row.created_by] || row.created_by) : '—'}
                                </td>}
                                <td className="px-2 py-1.5 border-r border-gray-100">
                                    <div className="flex items-center gap-1">
                                        {([
                                            { type: 'summary', icon: <User size={12} />, title: 'Summary', color: 'text-blue-500 hover:bg-blue-50' },
                                            { type: 'full', icon: <FileText size={12} />, title: 'Full CV', color: 'text-gray-500 hover:bg-gray-100' },
                                            { type: 'skills', icon: <Layers size={12} />, title: 'Core Skills', color: 'text-teal-500 hover:bg-teal-50' },
                                            { type: 'experience', icon: <Clock size={12} />, title: 'Experience', color: 'text-purple-500 hover:bg-purple-50' },
                                        ] as const).map(({ type, icon, title, color }) => (
                                            <button key={type} title={title}
                                                onClick={() => {
                                                    setShortView(prev => prev?.row.id === row.id && prev.type === type ? null : { row, type })
                                                }}
                                                className={`p-1 rounded transition-colors ${shortView?.row.id === row.id && shortView.type === type ? 'bg-indigo-100 text-indigo-600' : color}`}>
                                                {icon}
                                            </button>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* History sidebar (right of table) */}
            {historyRow && (() => {
                const CV_STATUS_LABELS: Record<string, string> = Object.fromEntries(CV_STATUSES.map(s => [s.value, s.label]))
                const CV_STATUS_COLORS_MAP: Record<string, string> = {
                    cv_created: 'bg-gray-100 text-gray-600',
                    cv_ready_for_edit: 'bg-sky-100 text-sky-700',
                    cv_ready_for_review: 'bg-blue-100 text-blue-700',
                    cv_reviewed: 'bg-yellow-100 text-yellow-700',
                    cv_sent: 'bg-green-100 text-green-700',
                    cv_required_qa: 'bg-purple-100 text-purple-700',
                    cv_qa_review_required: 'bg-orange-100 text-orange-700',
                    cv_qa_review_done: 'bg-teal-100 text-teal-700',
                }
                return (
                    <div className="w-72 shrink-0 border border-l-0 border-gray-200 rounded-r flex flex-col bg-white overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 shrink-0 bg-gray-50">
                            <Clock size={12} className="text-purple-500" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-semibold text-gray-700 truncate">{historyRow.cv_title || historyRow.applicant_name || 'History'}</p>
                                <p className="text-[9px] text-gray-400">Status History</p>
                            </div>
                            <button onClick={() => setHistoryRow(null)} className="text-gray-400 hover:text-gray-700 shrink-0"><X size={13} /></button>
                        </div>

                        {/* History entries */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {historyLoading ? (
                                <div className="flex items-center justify-center py-6"><RefreshCw size={14} className="animate-spin text-gray-300" /></div>
                            ) : historyEntries.length === 0 ? (
                                <p className="text-[10px] text-gray-400 text-center py-4">No history yet</p>
                            ) : historyEntries.map((entry: any) => (
                                <div key={entry.id} className="space-y-1 pb-2 border-b border-gray-100 last:border-0">
                                    {entry.event_type === 'status_change' ? (
                                        <>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {entry.from_status && (
                                                    <>
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${CV_STATUS_COLORS_MAP[entry.from_status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                            {CV_STATUS_LABELS[entry.from_status] ?? entry.from_status}
                                                        </span>
                                                        <span className="text-gray-400 text-[9px]">→</span>
                                                    </>
                                                )}
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${CV_STATUS_COLORS_MAP[entry.to_status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                    {CV_STATUS_LABELS[entry.to_status] ?? entry.to_status}
                                                </span>
                                            </div>
                                            <p className="text-[9px] text-gray-500">
                                                {entry.changed_by ? <span className="font-semibold">{entry.changed_by}</span> : <span className="italic text-gray-400">Unknown</span>}
                                                <span className="text-gray-400"> · {entry.createdAt ? formatHistoryDate(entry.createdAt) : ''}</span>
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-1">
                                                <MessageSquare size={10} className="text-purple-400 shrink-0" />
                                                <span className="text-[9px] font-semibold text-purple-600">
                                                    {entry.changed_by ?? 'Unknown'}
                                                </span>
                                                <span className="text-[9px] text-gray-400">noted</span>
                                                <span className="text-[9px] text-gray-400 ml-auto">{entry.createdAt ? formatHistoryDate(entry.createdAt) : ''}</span>
                                            </div>
                                            {entry.note && <p className="text-[11px] text-gray-700 leading-relaxed">{entry.note}</p>}
                                            {entry.audio_url && <audio controls src={entry.audio_url} className="h-7 w-full" />}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )
            })()}
            </div>{/* end flex row */}

            {/* Short view popup */}
            {shortView && (() => {
                const { row, type } = shortView
                const VIEW_TABS: { key: typeof type; label: string; icon: React.JSX.Element }[] = [
                    { key: 'summary',    label: 'Summary',     icon: <FileText size={12} /> },
                    { key: 'full',       label: 'Full CV',     icon: <Eye size={12} /> },
                    { key: 'skills',     label: 'Core Skills', icon: <Layers size={12} /> },
                    { key: 'experience', label: 'Experience',  icon: <Clock size={12} /> },
                ]
                const buildCVData = (): CVData => {
                    const base: CVData = {
                        applicant_name: row.applicant_name,
                        headline: row.headline,
                        location: row.location,
                        selected_email: row.selected_email,
                        selected_phone: row.selected_phone,
                        linkedin: row.linkedin,
                        github: row.github,
                        portfolios: row.portfolios,
                    }
                    if (type === 'full') {
                        return { ...base, summary: row.summary, skills: row.skills, core_skills: row.core_skills, experience_items: row.experience_items, education: row.education, projects: row.projects }
                    }
                    if (type === 'summary') return { ...base, summary: row.summary, skills: row.skills }
                    if (type === 'skills')  return { ...base, core_skills: row.core_skills, skills: row.skills }
                    if (type === 'experience') return { ...base, experience_items: row.experience_items, education: row.education, projects: row.projects }
                    return base
                }
                return (
                    <div className="fixed inset-0 z-[9988] flex items-center justify-center" onClick={e => { if (e.target === e.currentTarget) setShortView(null) }}>
                        <div ref={shortViewRef}
                            className="bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden"
                            style={{ width: 700, maxWidth: '95vw', height: '85vh' }}>
                            {/* Header */}
                            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 shrink-0 bg-gray-50">
                                <Eye size={13} className="text-indigo-500 shrink-0" />
                                <span className="text-[11px] font-semibold text-gray-700 flex-1 truncate">{row.cv_title || row.applicant_name || 'CV Preview'}</span>
                                {/* Section tabs */}
                                <div className="flex items-center gap-1">
                                    {VIEW_TABS.map(tab => (
                                        <button key={tab.key}
                                            onClick={() => setShortView(prev => prev ? { ...prev, type: tab.key } : null)}
                                            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${type === tab.key ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                            {tab.icon}{tab.label}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => setShortView(null)} className="text-gray-300 hover:text-gray-600 ml-1 shrink-0"><X size={13} /></button>
                            </div>
                            {/* CV Preview */}
                            <div className="flex-1 overflow-y-auto">
                                <CVPreview data={buildCVData()} highlightEnabled={false} />
                            </div>
                        </div>
                    </div>
                )
            })()}

            {ctxMenu && (() => {
                const r = ctxMenu.row
                const items: ContextMenuItem[] = [
                    { icon: <ExternalLink size={13} />, label: 'View CV', onClick: () => window.open(`/viewCV/${r.id}`, '_blank') },
                    { icon: <Pencil size={13} />, label: 'Edit CV', onClick: () => setEditingCV(r) },
                    ...(r.job_id ? [{ icon: <Briefcase size={13} />, label: 'View Job', onClick: () => window.open(`/jobs/listed-jobs?job_id=${r.job_id}`, '_blank') }] : []),
                    ...(r.company_id ? [{ icon: <Building2 size={13} />, label: 'View Company', onClick: () => window.open(`/jobs/companies?keyword=${encodeURIComponent(r.company_id)}`, '_blank') }] : []),
                    { icon: <Link size={13} />, label: 'Copy Link', separator: true, onClick: () => navigator.clipboard.writeText(`${window.location.origin}/viewCV/${r.id}`) },
                    { icon: <Trash2 size={13} />, label: 'Delete', variant: 'danger' as const, onClick: () => handleDelete(r.id) },
                ]
                return <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={items} onClose={() => setCtxMenu(null)} />
            })()}

            {editingCV && (
                <JobCVModal
                    cv={editingCV}
                    onClose={() => { setEditingCV(null); load() }}
                    onSaved={load}
                />
            )}

            {/* Manual CV creation — no job, no cv → blank form; saved CV stays unlinked (job_id null) */}
            {creatingCV && (
                <JobCVModal
                    onClose={() => { setCreatingCV(false); load() }}
                    onSaved={load}
                />
            )}
        </div>
    )
}
