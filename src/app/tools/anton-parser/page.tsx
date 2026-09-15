'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
    ListTree, Plus, RefreshCw, X, Trash2, Upload, FileJson, Link2, ExternalLink, Pencil,
    Eye, History, ShieldAlert, User,
} from 'lucide-react'
import {
    getAntonTasks, createAntonTask, getAntonTask, updateAntonTask, deleteAntonTask,
    saveAntonTaskTrajectory, setAntonTaskStatus, setAntonTaskAssignee, getAntonAssignees,
    ANTON_TASK_STATUSES, DEFAULT_ANTON_TASK_STATUS, AntonTaskStatus,
} from '@/app/api_handlers/api/anton-parser.api'
import { listAuthUsers } from '@/app/api_handlers/api/auth.api'
import TaskTab from './TaskTab'
import SolutionTab from './SolutionTab'
import { EMPTY_FILES, readUploadedFiles, TrajectoryFilesState } from './trajectoryFiles'
import { DataVersion } from './versionDiff'
import { RubricsViewTab, DimensionsViewTab, PairwiseViewTab } from './VersionViewTabs'
import VerifyModal from './VerifyModal'
import { AnnotationSnapshot } from './verify'

/* ------------------------------------------------------------------ *
 * Types — a thin, permissive view over whatever the uploaded JSON
 * contains. `data` (the full object) is always the source of truth;
 * these are just the shapes we actively read/edit from it.
 * ------------------------------------------------------------------ */
interface TaskListItem {
    id: string; title: string; task_type: string | null; status: AntonTaskStatus
    createdAt?: string; updatedAt?: string
    // Denormalised rubric summary — see deriveRubricStats/deriveScore on the backend.
    rubrics_count?: number; yes_count_a?: number; yes_count_b?: number
    final_quality_score_a?: number | null; final_quality_score_b?: number | null
    // Assigned annotator (a userid) — admin-only to set.
    assigned_to?: string | null
}

// Assigning a task is admin-only. Admin = JWT role 'admin' or a wildcard '*' in roles
// — same rule A Parse uses for job assignment.
function isAdminUser(): boolean {
    try {
        if (localStorage.getItem('userRole') === 'admin') return true
        const roles = JSON.parse(localStorage.getItem('roles') || '[]')
        return Array.isArray(roles) && roles.includes('*')
    } catch { return false }
}

/** Badge color per workflow status — same mapping used on the list and in the editor. */
const STATUS_STYLE: Record<AntonTaskStatus, string> = {
    Seeded: 'bg-indigo-50 text-indigo-700 border-indigo-300',
    'Pre-Claim': 'bg-cyan-50 text-cyan-700 border-cyan-300',
    Claimable: 'bg-teal-50 text-teal-700 border-teal-300',
    'Need To Submit': 'bg-gray-100 text-gray-600 border-gray-300',
    'Assigned To Someone Else': 'bg-slate-100 text-slate-600 border-slate-300',
    Submitted: 'bg-blue-50 text-blue-700 border-blue-300',
    'Submit For QA': 'bg-amber-50 text-amber-700 border-amber-300',
    'Required Revision': 'bg-red-50 text-red-700 border-red-300',
    'Awaiting Audit': 'bg-purple-50 text-purple-700 border-purple-300',
    Flagged: 'bg-orange-50 text-orange-700 border-orange-300',
    Approved: 'bg-green-50 text-green-700 border-green-300',
    Rejected: 'bg-rose-100 text-rose-700 border-rose-300',
}
function StatusBadge({ status }: { status: AntonTaskStatus }) {
    return (
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border whitespace-nowrap ${STATUS_STYLE[status] || STATUS_STYLE['Need To Submit']}`}>
            {status}
        </span>
    )
}

/** YES % for one side, as a share of the task's rubric count. */
function YesPctBadge({ yesCount, total }: { yesCount?: number; total?: number }) {
    if (!total) return <span className="text-gray-300">—</span>
    const pct = Math.round(((yesCount ?? 0) / total) * 100)
    return <span className="font-mono text-gray-700">{pct}%</span>
}

/** A/B winner on final_quality_score — higher score wins, matching how the editor's
 *  own two score fields are labelled. */
function WinnerBadge({ scoreA, scoreB }: { scoreA?: number | null; scoreB?: number | null }) {
    if (scoreA == null || scoreB == null) return <span className="text-gray-300">—</span>
    if (scoreA === scoreB) return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-gray-100 text-gray-600 border-gray-300 whitespace-nowrap">Tie</span>
    const aWins = scoreA > scoreB
    return (
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border whitespace-nowrap ${aWins
            ? 'bg-blue-50 text-blue-700 border-blue-300'
            : 'bg-teal-50 text-teal-700 border-teal-300'}`}>
            {aWins ? 'A wins' : 'B wins'}
        </span>
    )
}
interface RubricRow {
    index?: number | string
    verifier_type?: string
    criteria?: string
    mapped_dimension?: string
    source?: string
    answer_a?: string
    reason_a?: string
    answer_b?: string
    reason_b?: string
    // Free-standing manual annotation — NOT bound to the original `depends_on` key.
    dependencies_note?: string
    [k: string]: any
}
interface DimensionEntry { key: string; score_a?: number | string | null; reason_a?: string; score_b?: number | string | null; reason_b?: string }

/** Dimension keys are numbered, e.g. "1_correctness", "2_architecture" — sort on that
 *  leading number rather than object insertion order. Shared by the live editable
 *  Dimensions tab and the read-only version-view tabs, so both list entries the same
 *  way regardless of which `data` object (live vs. a historical snapshot) they read. */
function buildDimensionEntries(data: any): DimensionEntry[] {
    return Object.entries(data?.dimensions || {})
        .map(([key, v]: [string, any]) => ({ key, ...(v || {}) }))
        .sort((a, b) => {
            const na = parseInt(a.key, 10), nb = parseInt(b.key, 10)
            if (!isNaN(na) && !isNaN(nb)) return na - nb
            if (!isNaN(na)) return -1
            if (!isNaN(nb)) return 1
            return a.key.localeCompare(b.key)
        })
}

/* ------------------------------------------------------------------ *
 * Small shared UI bits
 * ------------------------------------------------------------------ *
 * Copying is a View-mode affordance now (see VersionViewTabs.tsx) — Edit
 * mode's tables/fields are plain inputs, nothing here needs a copy button. */
function TextCell({ value, onChange, mono }: { value: string; onChange: (v: string) => void; mono?: boolean }) {
    return (
        <input value={value ?? ''} onChange={e => onChange(e.target.value)}
            className={`w-full text-[11px] border border-transparent hover:border-gray-300 focus:border-indigo-400 rounded px-1.5 py-1 bg-transparent focus:bg-white outline-none ${mono ? 'font-mono' : ''}`} />
    )
}
function AreaCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} rows={3}
            className="w-full text-[11px] border border-transparent hover:border-gray-300 focus:border-indigo-400 rounded px-1.5 py-1 bg-transparent focus:bg-white outline-none resize-y leading-relaxed" />
    )
}

/**
 * Optional reference link shown in the task popup's header — a URL the
 * annotator attaches to the task (the platform task page, a doc, a PR…).
 * No value: a small "Add link" button. A value: the link itself, clickable,
 * with edit/remove affordances. Saved through the same `onChange` as every
 * other field on `data`, so it rides the editor's existing autosave.
 */
function TaskLinkField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(value || '')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

    const commit = () => {
        onChange(draft.trim())
        setEditing(false)
    }
    const cancel = () => { setDraft(value || ''); setEditing(false) }

    if (editing) {
        return (
            <span className="flex items-center gap-1 shrink-0">
                <Link2 size={12} className="text-gray-400 shrink-0" />
                <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }}
                    onBlur={commit} placeholder="https://…" type="url"
                    className="text-[11px] border border-indigo-300 rounded px-1.5 py-0.5 w-56 outline-none focus:border-indigo-500" />
            </span>
        )
    }

    if (!value) {
        return (
            <button onClick={() => setEditing(true)} title="Attach a reference link to this task"
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-indigo-600 shrink-0">
                <Link2 size={12} /> Add link
            </button>
        )
    }

    return (
        <span className="flex items-center gap-1 min-w-0 shrink-0">
            <Link2 size={12} className="text-indigo-400 shrink-0" />
            <a href={value} target="_blank" rel="noopener noreferrer" title={value}
                className="text-[11px] text-indigo-600 hover:underline truncate max-w-[220px]">
                {value}
            </a>
            <a href={value} target="_blank" rel="noopener noreferrer" title="Open link"
                className="text-gray-400 hover:text-indigo-600"><ExternalLink size={11} /></a>
            <button onClick={() => setEditing(true)} title="Edit link" className="text-gray-400 hover:text-indigo-600">
                <Pencil size={11} />
            </button>
            <button onClick={() => onChange('')} title="Remove link" className="text-gray-400 hover:text-red-600">
                <X size={12} />
            </button>
        </span>
    )
}

/**
 * The task popup's title, click-to-rename. Saved through the same
 * `onChange` path as every other field on `data`, so it rides the
 * editor's existing autosave — which also re-derives the list view's
 * denormalised `title` column on that same save.
 */
function TaskNameField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(value)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => { if (!editing) setDraft(value) }, [value, editing])
    useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select() } }, [editing])

    const commit = () => { onChange(draft); setEditing(false) }
    const cancel = () => { setDraft(value); setEditing(false) }

    if (editing) {
        return (
            <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }}
                onBlur={commit}
                className="text-sm font-semibold text-gray-800 border border-indigo-300 rounded px-1.5 py-0.5 outline-none focus:border-indigo-500 w-full max-w-[360px]" />
        )
    }

    return (
        <button onClick={() => setEditing(true)} title="Click to rename this task"
            className="flex items-center gap-1.5 min-w-0 group shrink-0">
            <span className="text-sm font-semibold text-gray-800 truncate max-w-[360px]" title={value}>{value}</span>
            <Pencil size={11} className="text-gray-300 group-hover:text-indigo-500 shrink-0" />
        </button>
    )
}

/** Read/parse a File as JSON. Rejects with a readable message on bad JSON. */
function readJsonFile(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            try { resolve(JSON.parse(String(reader.result || ''))) }
            catch { reject(new Error('That file is not valid JSON.')) }
        }
        reader.onerror = () => reject(new Error('Could not read the file.'))
        reader.readAsText(file)
    })
}

/* ------------------------------------------------------------------ *
 * Task editor — full-screen, 3 tabs, autosaves the whole JSON blob.
 * ------------------------------------------------------------------ */
type Tab = 'rubrics' | 'dimensions' | 'pairwise' | 'task' | 'solution'

function TaskEditor({ taskId, onClose, onSaved }: { taskId: string; onClose: () => void; onSaved: () => void }) {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>({})
    const [tab, setTab] = useState<Tab>('rubrics')
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
    const [reuploadBusy, setReuploadBusy] = useState(false)
    const [reuploadErr, setReuploadErr] = useState('')
    const fileRef = useRef<HTMLInputElement>(null)

    // Workflow status — its own column, not part of `data`, so it is set and
    // saved directly (not through the debounced `data` autosave below).
    const [status, setStatus] = useState<AntonTaskStatus>(DEFAULT_ANTON_TASK_STATUS)
    const [statusBusy, setStatusBusy] = useState(false)
    const changeStatus = async (next: AntonTaskStatus) => {
        setStatus(next)
        setStatusBusy(true)
        try { await setAntonTaskStatus(taskId, next); onSaved() }
        finally { setStatusBusy(false) }
    }

    // Assigned annotator — its own column, editable only by an admin (server-enforced;
    // the select below is hidden from non-admins entirely, same as A Parse's job assignment).
    const [admin] = useState<boolean>(() => isAdminUser())
    const [assignedTo, setAssignedTo] = useState<string | null>(null)
    const [assigneeBusy, setAssigneeBusy] = useState(false)
    const [allUsers, setAllUsers] = useState<string[]>([])
    const changeAssignee = async (next: string) => {
        const value = next || null
        setAssignedTo(value)
        setAssigneeBusy(true)
        try { await setAntonTaskAssignee(taskId, value); onSaved() }
        finally { setAssigneeBusy(false) }
    }
    useEffect(() => {
        if (!admin) return
        listAuthUsers().then((res: any) => {
            const list = res?.data ?? res
            if (Array.isArray(list)) setAllUsers(list.map((u: any) => u.userid).filter(Boolean).sort())
        }).catch(() => { })
    }, [admin])

    // Task/Solution tabs — the six uploaded artefacts, stored in their own
    // columns on this same row and parsed by those tabs at render time.
    const [files, setFiles] = useState<TrajectoryFilesState>(EMPTY_FILES)
    const [filesBusy, setFilesBusy] = useState(false)
    const [filesNote, setFilesNote] = useState('')
    // Tabs are kept mounted once opened so their search/collapse state survives
    // a trip to another tab.
    const [opened, setOpened] = useState<Partial<Record<Tab, boolean>>>({ rubrics: true })

    // Version history for the annotation JSON (Rubrics/Dimensions/Pairwise only —
    // Task/Solution have their own separate, unversioned uploads). Edit mode always
    // works on the live `data` above; View mode is read-only and renders whichever
    // version is selected here, diffed against the one before it.
    const [mode, setMode] = useState<'edit' | 'view'>('edit')
    const [dataVersions, setDataVersions] = useState<DataVersion[]>([])
    const [selectedVersionIdx, setSelectedVersionIdx] = useState(0)
    const [showVerify, setShowVerify] = useState(false)
    // Lifted out of VerifyModal so closing/reopening the panel (toggling the Verify
    // button, Escape, the X) doesn't lose the loaded export — only leaving this task
    // or refreshing the page does, same as everything else in this editor.
    const [verifyExportRaw, setVerifyExportRaw] = useState<any>(null)
    const [verifyFileName, setVerifyFileName] = useState('')
    const [verifyRubricIndexBase, setVerifyRubricIndexBase] = useState(1)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        getAntonTask(taskId).then((res: any) => {
            if (cancelled) return
            const full = res?.data ?? res
            setData(full?.data ?? {})
            setStatus(full?.status || DEFAULT_ANTON_TASK_STATUS)
            setAssignedTo(full?.assigned_to ?? null)
            const versions: DataVersion[] = Array.isArray(full?.data_versions) ? full.data_versions : []
            setDataVersions(versions)
            setSelectedVersionIdx(Math.max(0, versions.length - 1))
            // Default to View (read-only, latest version) whenever there's something to
            // view; a freshly created task with no upload yet has nothing to show there,
            // so it opens in Edit — the only mode where the toggle would even be visible.
            setMode(versions.length > 0 ? 'view' : 'edit')
            setFiles({
                trajectory_a: full?.trajectory_a ?? null,
                trajectory_b: full?.trajectory_b ?? null,
                md_a: full?.md_a ?? null,
                md_b: full?.md_b ?? null,
                md_a_full: full?.md_a_full ?? null,
                md_b_full: full?.md_b_full ?? null,
                patch_a: full?.patch_a ?? null,
                patch_b: full?.patch_b ?? null,
            })
        }).finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [taskId])

    const openTab = (next: Tab) => { setTab(next); setOpened(o => ({ ...o, [next]: true })) }

    /**
     * One picker for all six artefacts: each file is filed by its name, and
     * everything that arrived goes up in a single write.
     */
    const handleFiles = async (list: File[]) => {
        setFilesNote('')
        setFilesBusy(true)
        try {
            const { patch, accepted, skipped, errors } = await readUploadedFiles(list)
            if (Object.keys(patch).length) {
                setFiles(f => ({ ...f, ...patch }))
                await saveAntonTaskTrajectory(taskId, patch)
            }
            const notes: string[] = []
            if (accepted.length) notes.push(`Loaded: ${accepted.join(', ')}`)
            if (skipped.length) notes.push(`Ignored (unrecognised name): ${skipped.join(', ')}`)
            if (errors.length) notes.push(errors.join(' '))
            setFilesNote(notes.join(' · '))
        } catch (e: any) {
            setFilesNote(e?.message || 'Could not read those files.')
        } finally { setFilesBusy(false) }
    }

    // Debounced autosave of the whole JSON blob whenever it changes.
    const first = useRef(true)
    const dirty = useRef(false)
    const latest = useRef(data)
    latest.current = data
    useEffect(() => {
        if (loading) return
        if (first.current) { first.current = false; return }
        dirty.current = true
        setSaveStatus('saving')
        const t = setTimeout(async () => {
            try { await updateAntonTask(taskId, latest.current); setSaveStatus('saved'); dirty.current = false; onSaved() }
            catch { setSaveStatus('idle') }
        }, 700)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, loading])
    useEffect(() => () => { if (dirty.current) updateAntonTask(taskId, latest.current) }, [taskId])

    const rubrics: RubricRow[] = Array.isArray(data.rubrics) ? data.rubrics : []
    const setRubrics = (next: RubricRow[]) => setData((d: any) => ({ ...d, rubrics: next }))
    const patchRubric = (i: number, patch: Partial<RubricRow>) => {
        const next = rubrics.slice(); next[i] = { ...next[i], ...patch }; setRubrics(next)
    }
    const addRubric = () => {
        const nextIndex = (rubrics.reduce((m, r) => Math.max(m, Number(r.index) || 0), 0)) + 1
        setRubrics([...rubrics, { index: nextIndex, verifier_type: '', criteria: '', mapped_dimension: '', source: '', dependencies_note: '', answer_a: '', reason_a: '', answer_b: '', reason_b: '' }])
    }
    const removeRubric = (i: number) => { if (confirm('Delete this rubric row?')) setRubrics(rubrics.filter((_, idx) => idx !== i)) }

    const dimensionEntries: DimensionEntry[] = buildDimensionEntries(data)
    const patchDimension = (key: string, side: 'a' | 'b', field: 'score' | 'reason', value: any) => {
        setData((d: any) => ({
            ...d,
            dimensions: {
                ...(d.dimensions || {}),
                [key]: { ...(d.dimensions?.[key] || {}), [`${field}_${side}`]: value },
            },
        }))
    }

    const setPairwise = (field: 'pairwise_evaluation' | 'comparative_rationale', value: string) =>
        setData((d: any) => ({ ...d, [field]: value }))
    const setFinalScore = (field: 'final_quality_score_a' | 'final_quality_score_b', value: number | null) =>
        setData((d: any) => ({ ...d, [field]: value }))
    // Reference link — an optional URL the annotator attaches to the task (e.g. the
    // platform task page, a doc, a PR). Lives on the same `data` blob as everything
    // else here, so it rides the existing autosave with no extra endpoint.
    const setTaskLink = (value: string) => setData((d: any) => ({ ...d, task_link: value }))
    // Task title — same `data.task_name` the list view's denormalised `title`
    // column is derived from on every save (see the backend's `deriveTitle`).
    const setTaskName = (value: string) => setData((d: any) => ({ ...d, task_name: value.trim() || 'Untitled task' }))

    // A task created via "Create" (title + link only, no rubric JSON uploaded yet) has
    // nothing in `data` beyond those two fields — nothing a JSON upload could clobber,
    // so it gets a plain "Upload JSON" (no confirm) instead of "Re-upload JSON".
    const isEmptyTask = Object.keys(data || {}).every(k => k === 'task_name' || k === 'task_link')

    const doReupload = async (file: File) => {
        setReuploadErr('')
        try {
            const parsed = await readJsonFile(file)
            if (!isEmptyTask && !confirm('Uploading a new file resets everything in this task to the new JSON. Continue?')) return
            setReuploadBusy(true)
            // task_name and task_link are pure user input, set at creation and editable
            // only via the header fields — never taken from an uploaded file, even if the
            // JSON happens to carry its own task_name. Whatever is uploaded, these two
            // always keep whatever the user already has here.
            const merged = { ...parsed, task_name: data.task_name, task_link: data.task_link }
            setData(merged)
            // Every upload is a new version, numbered by upload order — the backend
            // snapshots it and returns the task with the updated history attached.
            const res: any = await updateAntonTask(taskId, merged, { newVersion: true })
            const updated = res?.data ?? res
            const versions: DataVersion[] = Array.isArray(updated?.data_versions) ? updated.data_versions : []
            setDataVersions(versions)
            setSelectedVersionIdx(Math.max(0, versions.length - 1))
            setMode('edit')
            onSaved()
        } catch (e: any) {
            setReuploadErr(e?.message || 'Could not parse that file.')
        } finally {
            setReuploadBusy(false)
            if (fileRef.current) fileRef.current.value = ''
        }
    }

    const taskName = typeof data.task_name === 'string' ? data.task_name : 'Untitled task'
    const taskType = data?.seeded_value_checks?.field_task_type_assessed || '—'
    const modelA = data?.model_a || ''
    const modelB = data?.model_b || ''

    // View mode's selected version and the one immediately before it (comparison is
    // always against that one version, never the whole history).
    const selectedVersion = dataVersions[selectedVersionIdx]
    const previousVersion = selectedVersionIdx > 0 ? dataVersions[selectedVersionIdx - 1] : undefined
    const hasPrevVersion = !!previousVersion
    const viewData = selectedVersion?.data || {}
    const prevViewData = previousVersion?.data || {}
    const viewRubrics: RubricRow[] = Array.isArray(viewData.rubrics) ? viewData.rubrics : []
    const prevViewRubrics: RubricRow[] = Array.isArray(prevViewData.rubrics) ? prevViewData.rubrics : []
    const viewDimensionEntries = buildDimensionEntries(viewData)
    const prevViewDimensionEntries = buildDimensionEntries(prevViewData)

    // Verify always targets the version selected above — never "latest" implicitly.
    const verifySnapshot: AnnotationSnapshot = {
        rubric_count: viewData.rubric_count,
        rubrics: viewRubrics,
        dimensions: viewDimensionEntries,
        dimension_0: viewData.dimension_0,
        final_quality_score_a: viewData.final_quality_score_a,
        final_quality_score_b: viewData.final_quality_score_b,
        pairwise_evaluation: viewData.pairwise_evaluation,
        comparative_rationale: viewData.comparative_rationale,
    }

    if (loading) {
        return (
            <div className="fixed inset-0 z-[9980] bg-white flex items-center justify-center">
                <div className="flex items-center gap-2 text-gray-400 text-xs"><RefreshCw size={14} className="animate-spin" /> Loading task…</div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-[9980] bg-white flex">
            {/* Left — the editor itself. Shrinks to make room for the Verify panel
                (a real split, not an overlay) whenever that's open. */}
            <div className="flex-1 min-w-0 flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200 bg-gray-50 shrink-0 flex-wrap">
                <ListTree size={15} className="text-indigo-500 shrink-0" />
                <TaskNameField value={taskName} onChange={setTaskName} />
                <span title="Task type — read-only, derived from the JSON"
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-300 shrink-0">
                    {taskType}
                </span>
                <select value={status} disabled={statusBusy} onChange={e => changeStatus(e.target.value as AntonTaskStatus)}
                    title="Workflow status"
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 outline-none disabled:opacity-50 ${STATUS_STYLE[status] || STATUS_STYLE['Need To Submit']}`}>
                    {ANTON_TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {statusBusy && <RefreshCw size={11} className="animate-spin text-gray-400 shrink-0" />}
                {admin ? (
                    <select value={assignedTo || ''} disabled={assigneeBusy} onChange={e => changeAssignee(e.target.value)}
                        title="Assigned annotator"
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 outline-none disabled:opacity-50 bg-sky-50 text-sky-700 border-sky-300">
                        <option value="">Unassigned</option>
                        {assignedTo && !allUsers.includes(assignedTo) && <option value={assignedTo}>{assignedTo}</option>}
                        {allUsers.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                ) : assignedTo && (
                    <span title="Assigned annotator"
                        className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 bg-sky-50 text-sky-700 border-sky-300">
                        <User size={10} /> {assignedTo}
                    </span>
                )}
                {assigneeBusy && <RefreshCw size={11} className="animate-spin text-gray-400 shrink-0" />}
                {(modelA || modelB) && (
                    <span className="text-[10px] text-gray-400 shrink-0">
                        {modelA && <>A = <span className="text-blue-600 font-medium">{modelA}</span></>}
                        {modelA && modelB && ' · '}
                        {modelB && <>B = <span className="text-teal-600 font-medium">{modelB}</span></>}
                    </span>
                )}
                <TaskLinkField value={typeof data.task_link === 'string' ? data.task_link : ''} onChange={setTaskLink} />
                <div className="flex-1" />
                <span className="text-[10px] text-gray-400">
                    {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : ''}
                </span>
                <input ref={fileRef} type="file" accept="application/json,.json" hidden
                    onChange={e => { const f = e.target.files?.[0]; if (f) doReupload(f) }} />
                <button onClick={() => fileRef.current?.click()} disabled={reuploadBusy}
                    title={isEmptyTask ? 'Upload the task JSON' : 'Upload a new JSON file — replaces everything in this task'}
                    className={`flex items-center gap-1 text-[11px] rounded px-2.5 py-1 disabled:opacity-40 ${isEmptyTask
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'border border-amber-300 text-amber-700 hover:bg-amber-50'}`}>
                    {reuploadBusy ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />} {isEmptyTask ? 'Upload JSON' : 'Re-upload JSON'}
                </button>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-700 ml-1"><X size={16} /></button>
            </div>
            {reuploadErr && <div className="px-4 py-1.5 bg-red-50 text-red-700 text-[11px] border-b border-red-200">{reuploadErr}</div>}

            {/* Tabs */}
            <div className="flex items-center gap-1 px-4 py-1.5 border-b border-gray-200 bg-white shrink-0">
                {([['rubrics', 'Rubrics'], ['dimensions', 'Dimensions'], ['pairwise', 'Pairwise'], ['task', 'Task'], ['solution', 'Solution']] as [Tab, string][]).map(([key, label]) => (
                    <button key={key} onClick={() => openTab(key)}
                        className={`text-[12px] font-medium px-3 py-1.5 rounded ${tab === key ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                        {label}
                    </button>
                ))}
                {filesBusy && <span className="text-[10px] text-gray-400 ml-2">Saving files…</span>}
            </div>

            {/* Edit/View + version — Rubrics/Dimensions/Pairwise only; Task/Solution
                have their own separate, unversioned uploads. */}
            {(['rubrics', 'dimensions', 'pairwise'] as Tab[]).includes(tab) && dataVersions.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-1.5 border-b border-gray-200 bg-gray-50 shrink-0 flex-wrap">
                    <div className="flex items-center gap-0.5 bg-gray-200/60 rounded-md p-0.5">
                        <button onClick={() => setMode('edit')}
                            className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded ${mode === 'edit' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
                            <Pencil size={11} /> Edit
                        </button>
                        <button onClick={() => setMode('view')}
                            className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded ${mode === 'view' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
                            <Eye size={11} /> View
                        </button>
                    </div>
                    {mode === 'view' && (
                        <>
                            <History size={12} className="text-gray-400 shrink-0" />
                            <select value={selectedVersionIdx} onChange={e => setSelectedVersionIdx(Number(e.target.value))}
                                title="Switch between uploaded versions"
                                className="text-[11px] border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-indigo-400">
                                {dataVersions.map((v, i) => (
                                    <option key={v.version} value={i}>
                                        Version {v.version}{i === dataVersions.length - 1 ? ' (latest)' : ''}
                                    </option>
                                ))}
                            </select>
                            <span className="text-[10px] text-gray-400">
                                {selectedVersionIdx > 0
                                    ? <>changes highlighted vs. version {dataVersions[selectedVersionIdx - 1].version}</>
                                    : 'first version — nothing to compare yet'}
                            </span>
                            <button onClick={() => setShowVerify(v => !v)}
                                title="Compare a Mercor Studio export against this version of annotation.json"
                                className={`ml-auto flex items-center gap-1 text-[11px] font-semibold rounded px-2.5 py-1 ${showVerify
                                    ? 'bg-indigo-600 text-white'
                                    : 'border border-indigo-300 text-indigo-700 hover:bg-indigo-50'}`}>
                                <ShieldAlert size={12} /> Verify
                            </button>
                        </>
                    )}
                </div>
            )}

            {filesNote && (
                <div className="px-4 py-1.5 bg-indigo-50 text-indigo-800 text-[11px] border-b border-indigo-100 flex items-start gap-2">
                    <span className="flex-1">{filesNote}</span>
                    <button onClick={() => setFilesNote('')} className="text-indigo-400 hover:text-indigo-700 shrink-0">
                        <X size={12} />
                    </button>
                </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {tab === 'rubrics' && mode === 'edit' && (
                    <RubricsTab rubrics={rubrics} onPatch={patchRubric} onAdd={addRubric} onRemove={removeRubric} />
                )}
                {tab === 'rubrics' && mode === 'view' && (
                    <RubricsViewTab rubrics={viewRubrics} previousRubrics={prevViewRubrics} hasPrevVersion={hasPrevVersion} />
                )}
                {tab === 'dimensions' && mode === 'edit' && (
                    <DimensionsTab entries={dimensionEntries} onPatch={patchDimension} />
                )}
                {tab === 'dimensions' && mode === 'view' && (
                    <DimensionsViewTab entries={viewDimensionEntries} previousEntries={prevViewDimensionEntries} hasPrevVersion={hasPrevVersion} />
                )}
                {tab === 'pairwise' && mode === 'edit' && (
                    <PairwiseTab
                        pairwiseEvaluation={data.pairwise_evaluation || ''}
                        comparativeRationale={data.comparative_rationale || ''}
                        finalQualityScoreA={data.final_quality_score_a ?? null}
                        finalQualityScoreB={data.final_quality_score_b ?? null}
                        onChange={setPairwise}
                        onChangeScore={setFinalScore}
                    />
                )}
                {tab === 'pairwise' && mode === 'view' && (
                    <PairwiseViewTab
                        current={{
                            pairwise_evaluation: viewData.pairwise_evaluation,
                            comparative_rationale: viewData.comparative_rationale,
                            final_quality_score_a: viewData.final_quality_score_a,
                            final_quality_score_b: viewData.final_quality_score_b,
                        }}
                        previous={{
                            pairwise_evaluation: prevViewData.pairwise_evaluation,
                            comparative_rationale: prevViewData.comparative_rationale,
                            final_quality_score_a: prevViewData.final_quality_score_a,
                            final_quality_score_b: prevViewData.final_quality_score_b,
                        }}
                        hasPrevVersion={hasPrevVersion}
                    />
                )}
                {/* Task and Solution stay mounted once opened — they carry their own
                    search, collapse and sub-tab state. Both live in one wrapper so the
                    hidden one is not a `space-y` sibling of the visible one. */}
                {(opened.task || opened.solution) && (
                    <div>
                        {opened.task && (
                            <div className={tab === 'task' ? '' : 'hidden'}>
                                <TaskTab files={files} onFiles={handleFiles} busy={filesBusy} />
                            </div>
                        )}
                        {opened.solution && (
                            <div className={tab === 'solution' ? '' : 'hidden'}>
                                <SolutionTab files={files} onFiles={handleFiles} busy={filesBusy} />
                            </div>
                        )}
                    </div>
                )}
            </div>
            </div>

            {showVerify && selectedVersion && (
                <VerifyModal
                    annotationVersion={selectedVersion.version}
                    snapshot={verifySnapshot}
                    onClose={() => setShowVerify(false)}
                    exportRaw={verifyExportRaw}
                    fileName={verifyFileName}
                    onExportLoaded={(raw, name) => { setVerifyExportRaw(raw); setVerifyFileName(name) }}
                    rubricIndexBase={verifyRubricIndexBase}
                    onRubricIndexBaseChange={setVerifyRubricIndexBase}
                />
            )}
        </div>
    )
}

/* ------------------------------------------------------------------ *
 * Rubrics tab — three views over the same `rubrics` array.
 * ------------------------------------------------------------------ */
function RubricsTab({ rubrics, onPatch, onAdd, onRemove }: {
    rubrics: RubricRow[]
    onPatch: (i: number, patch: Partial<RubricRow>) => void
    onAdd: () => void
    onRemove: (i: number) => void
}) {
    const [selected, setSelected] = useState<number | null>(null)
    return (
        <div className="space-y-8">
            {/* Table 1 — Rubrics (full CRUD) */}
            <section>
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xs font-semibold text-gray-700">Rubrics ({rubrics.length})</h2>
                    <button onClick={onAdd} className="flex items-center gap-1 text-[11px] bg-indigo-600 text-white rounded px-2 py-1 hover:bg-indigo-700">
                        <Plus size={12} /> Add rubric
                    </button>
                </div>
                <div className="border border-gray-200 rounded overflow-x-auto">
                    <table className="w-full text-[11px] border-collapse">
                        <thead className="bg-gray-50">
                            <tr className="text-left text-gray-500">
                                <th className="px-2 py-1.5 w-12">Index</th>
                                <th className="px-2 py-1.5 w-40">Verifier Type</th>
                                <th className="px-2 py-1.5 w-40">Dependencies</th>
                                <th className="px-2 py-1.5 min-w-[280px]">Criteria</th>
                                <th className="px-2 py-1.5 w-48">Mapped Dimension</th>
                                <th className="px-2 py-1.5 w-40">Source</th>
                                <th className="px-2 py-1.5 w-8"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rubrics.map((r, i) => (
                                <tr key={i} onClick={() => setSelected(i)}
                                    className={`border-t border-gray-100 align-top cursor-pointer ${selected === i ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                                    <td className="px-1 py-0.5"><TextCell value={String(r.index ?? '')} onChange={v => onPatch(i, { index: v })} mono /></td>
                                    <td className="px-1 py-0.5"><TextCell value={r.verifier_type || ''} onChange={v => onPatch(i, { verifier_type: v })} /></td>
                                    <td className="px-1 py-0.5"><TextCell value={r.dependencies_note || ''} onChange={v => onPatch(i, { dependencies_note: v })} /></td>
                                    <td className="px-1 py-0.5"><AreaCell value={r.criteria || ''} onChange={v => onPatch(i, { criteria: v })} /></td>
                                    <td className="px-1 py-0.5"><TextCell value={r.mapped_dimension || ''} onChange={v => onPatch(i, { mapped_dimension: v })} /></td>
                                    <td className="px-1 py-0.5"><TextCell value={r.source || ''} onChange={v => onPatch(i, { source: v })} mono /></td>
                                    <td className="px-1 py-0.5 text-center">
                                        <button onClick={() => onRemove(i)} title="Delete row" className="p-0.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={12} /></button>
                                    </td>
                                </tr>
                            ))}
                            {!rubrics.length && <tr><td colSpan={7} className="px-3 py-4 text-center text-gray-300 italic">No rubrics yet.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Table 2 — Dimension Verification A */}
            <VerificationTable side="a" title="Dimension Verification A" rubrics={rubrics} onPatch={onPatch} />

            {/* Table 3 — Dimension Verification B */}
            <VerificationTable side="b" title="Dimension Verification B" rubrics={rubrics} onPatch={onPatch} />
        </div>
    )
}

function VerificationTable({ side, title, rubrics, onPatch }: {
    side: 'a' | 'b'
    title: string
    rubrics: RubricRow[]
    onPatch: (i: number, patch: Partial<RubricRow>) => void
}) {
    const answerKey = `answer_${side}` as const
    const reasonKey = `reason_${side}` as const
    const accent = side === 'a' ? 'text-blue-600' : 'text-teal-600'
    const [selected, setSelected] = useState<number | null>(null)

    // YES/NO breakdown for this side, as a share of every rubric row (not just the
    // ones actually answered YES/NO) — so an unanswered row still counts toward 100%.
    const total = rubrics.length
    const yesCount = rubrics.filter(r => String(r[answerKey] ?? '').trim().toUpperCase() === 'YES').length
    const noCount = rubrics.filter(r => String(r[answerKey] ?? '').trim().toUpperCase() === 'NO').length
    const pct = (n: number) => total ? Math.round((n / total) * 100) : 0

    return (
        <section>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-y-1.5">
                <div className="flex items-center gap-2">
                    <h2 className="text-xs font-semibold text-gray-700">{title}</h2>
                    <span title={`${yesCount} of ${total} rows answered YES, ${noCount} of ${total} answered NO`}
                        className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 whitespace-nowrap">
                        <span className="text-emerald-600 font-semibold">YES {pct(yesCount)}%</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-red-600 font-semibold">NO {pct(noCount)}%</span>
                        <span className="text-gray-400">({yesCount}/{total} · {noCount}/{total})</span>
                    </span>
                </div>
            </div>
            <div className="border border-gray-200 rounded overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                    <thead className="bg-gray-50">
                        <tr className="text-left text-gray-500">
                            <th className="px-2 py-1.5 w-12">Index</th>
                            <th className="px-2 py-1.5 min-w-[220px]">Criteria</th>
                            <th className={`px-2 py-1.5 w-24 ${accent}`}>Answer</th>
                            <th className="px-2 py-1.5 min-w-[260px]">Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rubrics.map((r, i) => (
                            <tr key={i} onClick={() => setSelected(i)}
                                className={`border-t border-gray-100 align-top cursor-pointer ${selected === i ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                                <td className="px-2 py-1.5 font-mono text-gray-400">{r.index}</td>
                                <td className="px-2 py-1.5 text-gray-500">{(r.criteria || '').slice(0, 90)}{(r.criteria || '').length > 90 ? '…' : ''}</td>
                                <td className="px-1 py-0.5"><TextCell value={String(r[answerKey] ?? '')} onChange={v => onPatch(i, { [answerKey]: v } as any)} mono /></td>
                                <td className="px-1 py-0.5"><AreaCell value={r[reasonKey] || ''} onChange={v => onPatch(i, { [reasonKey]: v } as any)} /></td>
                            </tr>
                        ))}
                        {!rubrics.length && <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-300 italic">No rubrics yet.</td></tr>}
                    </tbody>
                </table>
            </div>
        </section>
    )
}

/* ------------------------------------------------------------------ *
 * Dimensions tab — two tables, one per model, over the `dimensions` object.
 * ------------------------------------------------------------------ */
function DimensionsTab({ entries, onPatch }: {
    entries: DimensionEntry[]
    onPatch: (key: string, side: 'a' | 'b', field: 'score' | 'reason', value: any) => void
}) {
    return (
        <div className="space-y-8">
            <DimensionSideTable side="a" title="Dimensions — Model A" entries={entries} onPatch={onPatch} />
            <DimensionSideTable side="b" title="Dimensions — Model B" entries={entries} onPatch={onPatch} />
        </div>
    )
}

function DimensionSideTable({ side, title, entries, onPatch }: {
    side: 'a' | 'b'
    title: string
    entries: DimensionEntry[]
    onPatch: (key: string, side: 'a' | 'b', field: 'score' | 'reason', value: any) => void
}) {
    const accent = side === 'a' ? 'text-blue-600' : 'text-teal-600'
    const [selected, setSelected] = useState<string | null>(null)
    return (
        <section>
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-gray-700">{title}</h2>
            </div>
            <div className="border border-gray-200 rounded overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                    <thead className="bg-gray-50">
                        <tr className="text-left text-gray-500">
                            <th className="px-2 py-1.5 w-56">Dimension</th>
                            <th className={`px-2 py-1.5 w-20 ${accent}`}>Score</th>
                            <th className="px-2 py-1.5 min-w-[320px]">Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map(e => {
                            const score = side === 'a' ? e.score_a : e.score_b
                            const reason = side === 'a' ? e.reason_a : e.reason_b
                            return (
                                <tr key={e.key} onClick={() => setSelected(e.key)}
                                    className={`border-t border-gray-100 align-top cursor-pointer ${selected === e.key ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                                    <td className="px-2 py-1.5 font-mono text-gray-600">{e.key}</td>
                                    <td className="px-1 py-0.5"><TextCell value={String(score ?? '')} onChange={v => onPatch(e.key, side, 'score', v === '' ? null : Number(v))} mono /></td>
                                    <td className="px-1 py-0.5"><AreaCell value={reason || ''} onChange={v => onPatch(e.key, side, 'reason', v)} /></td>
                                </tr>
                            )
                        })}
                        {!entries.length && <tr><td colSpan={3} className="px-3 py-4 text-center text-gray-300 italic">No dimensions yet.</td></tr>}
                    </tbody>
                </table>
            </div>
        </section>
    )
}

/* ------------------------------------------------------------------ *
 * Pairwise tab
 * ------------------------------------------------------------------ */
function PairwiseTab({ pairwiseEvaluation, comparativeRationale, finalQualityScoreA, finalQualityScoreB, onChange, onChangeScore }: {
    pairwiseEvaluation: string
    comparativeRationale: string
    finalQualityScoreA: number | null
    finalQualityScoreB: number | null
    onChange: (field: 'pairwise_evaluation' | 'comparative_rationale', value: string) => void
    onChangeScore: (field: 'final_quality_score_a' | 'final_quality_score_b', value: number | null) => void
}) {
    return (
        <div className="max-w-3xl space-y-5">
            <div>
                <label className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Pairwise Evaluation</label>
                <input value={pairwiseEvaluation} onChange={e => onChange('pairwise_evaluation', e.target.value)}
                    className="mt-1 w-full text-sm font-semibold border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-400" />
            </div>
            <div className="flex items-center gap-6">
                <div>
                    <label className="text-[10px] uppercase tracking-wide text-blue-500 font-semibold">Final Quality Score A</label>
                    <input type="number" value={finalQualityScoreA ?? ''}
                        onChange={e => onChangeScore('final_quality_score_a', e.target.value === '' ? null : Number(e.target.value))}
                        className="mt-1 w-28 text-sm font-semibold border border-blue-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                    <label className="text-[10px] uppercase tracking-wide text-teal-500 font-semibold">Final Quality Score B</label>
                    <input type="number" value={finalQualityScoreB ?? ''}
                        onChange={e => onChangeScore('final_quality_score_b', e.target.value === '' ? null : Number(e.target.value))}
                        className="mt-1 w-28 text-sm font-semibold border border-teal-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-teal-500" />
                </div>
            </div>
            <div>
                <label className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Comparative Rationale</label>
                <textarea value={comparativeRationale} onChange={e => onChange('comparative_rationale', e.target.value)} rows={16}
                    className="w-full text-[12px] leading-relaxed border border-gray-300 rounded px-2.5 py-2 focus:outline-none focus:border-indigo-400 resize-y" />
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ *
 * Page — task list
 * ------------------------------------------------------------------ */
/**
 * Task creation — title + optional reference link only. The actual JSON (rubrics,
 * trajectories, etc.) is added afterward, inside the opened task, via its own
 * upload buttons — this modal only creates the empty task shell.
 */
function CreateTaskModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
    const [title, setTitle] = useState('')
    const [link, setLink] = useState('')
    const [busy, setBusy] = useState(false)
    const [err, setErr] = useState('')
    const titleRef = useRef<HTMLInputElement>(null)

    useEffect(() => { titleRef.current?.focus() }, [])

    const submit = async () => {
        const t = title.trim()
        if (!t) { setErr('Title is required.'); return }
        setErr('')
        setBusy(true)
        try {
            const res: any = await createAntonTask({ task_name: t, task_link: link.trim() })
            const created = res?.data ?? res
            if (created?.id) onCreated(created.id)
            else onClose()
        } catch (e: any) {
            setErr(e?.message || 'Could not create the task.')
            setBusy(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/40"
            onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className="bg-white border border-gray-200 rounded-xl shadow-2xl w-full max-w-[420px] overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                    <ListTree size={14} className="text-indigo-500 shrink-0" />
                    <span className="text-[13px] font-semibold text-gray-800 flex-1">Create task</span>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
                </div>
                <div className="p-4 space-y-3">
                    <label className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Title</span>
                        <input ref={titleRef} value={title} onChange={e => setTitle(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') submit() }}
                            placeholder="e.g. UV-Vis run triage"
                            className="text-[12.5px] border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-400" />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Link (optional)</span>
                        <input value={link} onChange={e => setLink(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') submit() }}
                            placeholder="https://…" type="url"
                            className="text-[12.5px] border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-400" />
                    </label>
                    {err && <div className="text-[11px] text-red-600">{err}</div>}
                </div>
                <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                    <button onClick={onClose} disabled={busy}
                        className="text-[11px] border border-gray-300 rounded px-2.5 py-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40">
                        Cancel
                    </button>
                    <button onClick={submit} disabled={busy || !title.trim()}
                        className="flex items-center gap-1 text-[11px] bg-indigo-600 text-white rounded px-3 py-1.5 hover:bg-indigo-700 disabled:opacity-40">
                        {busy ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />} Create
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function AntonParserPage() {
    const [tasks, setTasks] = useState<TaskListItem[]>([])
    const [loading, setLoading] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState<AntonTaskStatus | 'all'>('all')
    const [creating, setCreating] = useState(false)
    const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
    const [assignees, setAssignees] = useState<string[]>([])

    const visibleTasks = statusFilter === 'all' ? tasks : tasks.filter(t => t.status === statusFilter)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res: any = await getAntonTasks(assigneeFilter)
            const list = res?.data ?? res
            setTasks(Array.isArray(list) ? list : [])
        } finally { setLoading(false) }
    }, [assigneeFilter])
    useEffect(() => { load() }, [load])

    // Assignee filter options — only users tasks are actually assigned to.
    useEffect(() => {
        getAntonAssignees().then((res: any) => {
            const list = res?.data ?? res
            if (Array.isArray(list)) setAssignees(list)
        }).catch(() => { })
    }, [])

    const onTaskCreated = async (id: string) => {
        setCreating(false)
        await load()
        setEditingId(id)
    }

    const removeTask = async (id: string) => {
        if (!confirm('Delete this task?')) return
        await deleteAntonTask(id)
        load()
    }

    return (
        <div className="p-3 bg-white h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-2 shrink-0">
                <div className="flex items-center gap-2">
                    <ListTree size={14} className="text-gray-500" />
                    <h1 className="text-sm font-semibold text-gray-800">Anton Parser</h1>
                    <span className="text-[10px] text-gray-400">
                        {statusFilter === 'all'
                            ? `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`
                            : `${visibleTasks.length} of ${tasks.length} task${tasks.length !== 1 ? 's' : ''}`}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}
                        title="Filter by assigned annotator"
                        className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-600 bg-white hover:bg-gray-50 focus:outline-none focus:border-indigo-400">
                        <option value="all">All assignees</option>
                        <option value="none">Unassigned</option>
                        {assignees.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as AntonTaskStatus | 'all')}
                        title="Filter by status"
                        className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-600 bg-white hover:bg-gray-50 focus:outline-none focus:border-indigo-400">
                        <option value="all">All statuses</option>
                        {ANTON_TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={() => load()} disabled={loading}
                        className="flex items-center gap-1 text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50 text-gray-600">
                        <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button onClick={() => setCreating(true)}
                        className="flex items-center gap-1 text-xs bg-indigo-600 text-white rounded px-2.5 py-1 hover:bg-indigo-700">
                        <Plus size={13} /> Create
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 border border-gray-200 rounded">
                {loading && tasks.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-gray-400 text-xs"><RefreshCw size={14} className="animate-spin" /> Loading tasks…</div>
                ) : tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-400 text-xs">
                        <FileJson size={20} className="text-gray-300" />
                        No tasks yet. Click <span className="font-medium text-indigo-600">Create</span> to add one, then upload its files once it's open.
                    </div>
                ) : visibleTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-400 text-xs">
                        No tasks with status <span className="font-medium text-gray-600">{statusFilter}</span>.
                    </div>
                ) : (
                    <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr className="text-left text-gray-500">
                                <th className="px-3 py-1.5 font-medium">Task Name</th>
                                <th className="px-3 py-1.5 font-medium">Task Type</th>
                                <th className="px-3 py-1.5 font-medium text-right">Rubrics</th>
                                <th className="px-3 py-1.5 font-medium text-right" title="Share of rubrics answered YES, Model A">YES A</th>
                                <th className="px-3 py-1.5 font-medium text-right" title="Share of rubrics answered YES, Model B">YES B</th>
                                <th className="px-3 py-1.5 font-medium">Winner</th>
                                <th className="px-3 py-1.5 font-medium text-right">Score A</th>
                                <th className="px-3 py-1.5 font-medium text-right">Score B</th>
                                <th className="px-3 py-1.5 font-medium">Status</th>
                                <th className="px-3 py-1.5 font-medium">Assigned</th>
                                <th className="px-3 py-1.5 font-medium">Updated</th>
                                <th className="px-3 py-1.5 font-medium w-8"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleTasks.map(t => (
                                <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setEditingId(t.id)}>
                                    <td className="px-3 py-1.5 font-medium text-gray-800">{t.title}</td>
                                    <td className="px-3 py-1.5">
                                        {t.task_type
                                            ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">{t.task_type}</span>
                                            : <span className="text-gray-300">—</span>}
                                    </td>
                                    <td className="px-3 py-1.5 text-right text-gray-500">{t.rubrics_count ?? 0}</td>
                                    <td className="px-3 py-1.5 text-right"><YesPctBadge yesCount={t.yes_count_a} total={t.rubrics_count} /></td>
                                    <td className="px-3 py-1.5 text-right"><YesPctBadge yesCount={t.yes_count_b} total={t.rubrics_count} /></td>
                                    <td className="px-3 py-1.5"><WinnerBadge scoreA={t.final_quality_score_a} scoreB={t.final_quality_score_b} /></td>
                                    <td className="px-3 py-1.5 text-right font-mono text-gray-700">{t.final_quality_score_a ?? <span className="text-gray-300">—</span>}</td>
                                    <td className="px-3 py-1.5 text-right font-mono text-gray-700">{t.final_quality_score_b ?? <span className="text-gray-300">—</span>}</td>
                                    <td className="px-3 py-1.5"><StatusBadge status={t.status || DEFAULT_ANTON_TASK_STATUS} /></td>
                                    <td className="px-3 py-1.5">
                                        {t.assigned_to
                                            ? <span title="Assigned annotator" className="flex items-center gap-0.5 w-fit text-[10px] font-medium px-1.5 py-0.5 rounded border bg-sky-50 text-sky-700 border-sky-200"><User size={9} /> {t.assigned_to}</span>
                                            : <span className="text-gray-300">—</span>}
                                    </td>
                                    <td className="px-3 py-1.5 text-gray-400">{t.updatedAt ? new Date(t.updatedAt).toLocaleString() : '—'}</td>
                                    <td className="px-3 py-1.5">
                                        <button onClick={e => { e.stopPropagation(); removeTask(t.id) }} title="Delete"
                                            className="p-0.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={12} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {editingId && (
                <TaskEditor taskId={editingId} onClose={() => { setEditingId(null); load() }} onSaved={load} />
            )}
            {creating && (
                <CreateTaskModal onClose={() => setCreating(false)} onCreated={onTaskCreated} />
            )}
        </div>
    )
}
