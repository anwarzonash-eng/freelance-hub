'use client'

/* ------------------------------------------------------------------ *
 * Editable Problem statement / Test summary panel — raw or Markdown
 * view, an Edit button that reveals a textarea, Save writes to the
 * `updated` column (never `original`). Ported from task.html's
 * mountEditableText.
 * ------------------------------------------------------------------ */

import { useEffect, useState } from 'react'
import { mdRender } from './markdown'

export default function EditableTextPanel({ value, onSave }: { value: string; onSave: (text: string) => void }) {
    const [renderMd, setRenderMd] = useState(true)
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(value)
    const [msg, setMsg] = useState('')

    useEffect(() => { if (!editing) setDraft(value) }, [value, editing])

    const save = () => {
        onSave(draft)
        setEditing(false)
        setMsg('saved')
        setTimeout(() => setMsg(''), 1500)
    }

    return (
        <div>
            <div className="flex items-center gap-4 mb-2">
                <label className="text-[13px] cursor-pointer"><input type="checkbox" checked={renderMd} onChange={e => setRenderMd(e.target.checked)} /> render as Markdown</label>
                {!editing && <button type="button" onClick={() => { setDraft(value); setEditing(true) }} className="ml-auto text-[12.5px] border border-gray-300 rounded px-2.5 py-1 hover:bg-gray-50">edit</button>}
            </div>
            {renderMd
                ? <div className="text-[13px] leading-relaxed max-h-[26em] overflow-auto bg-gray-50 rounded p-3" dangerouslySetInnerHTML={{ __html: mdRender(value) }} />
                : <pre className="bg-gray-50 rounded p-3 max-h-[26em] overflow-auto whitespace-pre-wrap break-words font-mono text-[12px]">{value}</pre>}
            {editing && (
                <div className="mt-2">
                    <textarea value={draft} onChange={e => setDraft(e.target.value)}
                        className="w-full min-h-[10em] font-mono text-[12px] border border-gray-300 rounded px-2.5 py-2 outline-none focus:border-indigo-400" />
                    <div className="mt-1.5 flex items-center gap-2">
                        <button type="button" onClick={save} className="text-[12.5px] bg-indigo-600 text-white rounded px-2.5 py-1 hover:bg-indigo-700">save</button>
                        <button type="button" onClick={() => setEditing(false)} className="text-[12.5px] border border-gray-300 rounded px-2.5 py-1 hover:bg-gray-50">cancel</button>
                        {msg && <span className="text-[12px] text-green-700">{msg}</span>}
                    </div>
                </div>
            )}
        </div>
    )
}
