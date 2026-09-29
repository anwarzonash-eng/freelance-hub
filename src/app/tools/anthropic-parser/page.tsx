'use client'

import { useEffect, useRef, useState } from 'react'
import { ListTree, Plus, RefreshCw, Trash2, Upload } from 'lucide-react'
import { getAnthropicTasks, createAnthropicTask, deleteAnthropicTask } from '@/app/api_handlers/api/anthropic-parser.api'
import TaskEditor from './TaskEditor'

interface TaskListItem {
    id: string
    title: string
    created_by?: string | null
    updated_by?: string | null
    createdAt?: string
    updatedAt?: string
}

function readJsonFile(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            try { resolve(JSON.parse(String(reader.result || ''))) }
            catch { reject(new Error(`${file.name} is not valid JSON.`)) }
        }
        reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
        reader.readAsText(file)
    })
}

export default function AnthropicParserPage() {
    const [tasks, setTasks] = useState<TaskListItem[]>([])
    const [loading, setLoading] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [uploadBusy, setUploadBusy] = useState(false)
    const [uploadErr, setUploadErr] = useState('')
    const fileRef = useRef<HTMLInputElement>(null)

    const load = async () => {
        setLoading(true)
        try {
            const res: any = await getAnthropicTasks()
            const list = res?.data ?? res
            setTasks(Array.isArray(list) ? list : [])
        } finally { setLoading(false) }
    }
    useEffect(() => { load() }, [])

    const onFile = async (file: File) => {
        setUploadErr('')
        setUploadBusy(true)
        try {
            const original = await readJsonFile(file)
            const res: any = await createAnthropicTask(original)
            const created = res?.data ?? res
            if (created?.id) { await load(); setEditingId(created.id) }
            else setUploadErr('Could not create the task — check original.json has the expected fields (problem_statement, diff_a, diff_b, ...).')
        } catch (e: any) {
            setUploadErr(e?.message || 'Could not read/parse that file.')
        } finally {
            setUploadBusy(false)
            if (fileRef.current) fileRef.current.value = ''
        }
    }

    const removeTask = async (id: string) => {
        if (!confirm('Delete this task?')) return
        await deleteAnthropicTask(id)
        load()
    }

    return (
        <div className="p-3 bg-white h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-2 shrink-0">
                <div className="flex items-center gap-2">
                    <ListTree size={14} className="text-gray-500" />
                    <h1 className="text-sm font-semibold text-gray-800">Anthropic Parser</h1>
                    <span className="text-[10px] text-gray-400">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => load()} disabled={loading}
                        className="flex items-center gap-1 text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50 text-gray-600">
                        <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <input ref={fileRef} type="file" accept="application/json,.json" hidden
                        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
                    <button onClick={() => fileRef.current?.click()} disabled={uploadBusy}
                        title="Upload original.json — creates the task"
                        className="flex items-center gap-1 text-xs bg-indigo-600 text-white rounded px-2.5 py-1 hover:bg-indigo-700 disabled:opacity-50">
                        {uploadBusy ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />} Upload original.json
                    </button>
                </div>
            </div>

            {uploadErr && (
                <div className="mb-2 px-3 py-1.5 bg-red-50 text-red-700 text-[11px] border border-red-200 rounded shrink-0">{uploadErr}</div>
            )}

            <div className="flex-1 overflow-y-auto min-h-0 border border-gray-200 rounded">
                {loading && tasks.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-gray-400 text-xs"><RefreshCw size={14} className="animate-spin" /> Loading tasks…</div>
                ) : tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-400 text-xs">
                        <Upload size={20} className="text-gray-300" />
                        No tasks yet. Click <span className="font-medium text-indigo-600">Upload original.json</span> to add one.
                    </div>
                ) : (
                    <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr className="text-left text-gray-500">
                                <th className="px-3 py-1.5 font-medium">Task</th>
                                <th className="px-3 py-1.5 font-medium">Created by</th>
                                <th className="px-3 py-1.5 font-medium">Updated by</th>
                                <th className="px-3 py-1.5 font-medium">Updated</th>
                                <th className="px-3 py-1.5 font-medium w-8"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map(t => (
                                <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setEditingId(t.id)}>
                                    <td className="px-3 py-1.5 font-medium text-gray-800">{t.title}</td>
                                    <td className="px-3 py-1.5 text-gray-500">{t.created_by || <span className="text-gray-300">—</span>}</td>
                                    <td className="px-3 py-1.5 text-gray-500">{t.updated_by || <span className="text-gray-300">—</span>}</td>
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
                <TaskEditor taskId={editingId} onClose={() => { setEditingId(null); load() }} />
            )}
        </div>
    )
}
