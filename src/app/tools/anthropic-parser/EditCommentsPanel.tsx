'use client'

/* ------------------------------------------------------------------ *
 * "Edit the comments of the side you preferred" — ported from
 * task.html's renderCcList/renderCcUnit/renderAddForm/renderAddList/
 * refreshTally/buildCommentBlock. Choose a side, decide each existing
 * comment (keep/rewrite/remove) with a one-line reason, optionally add
 * comments that aren't listed, then generate the pasteable block.
 * ------------------------------------------------------------------ */

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import {
    AddedComment, buildCommentBlock, CommentUnit, defaultKind, UnitState, wrapPreview,
} from './taskLogic'
import { DFile } from './diffLogic'

function copyText(text: string) {
    try { navigator.clipboard?.writeText(text ?? '') } catch { /* ignore */ }
}

function CommentUnitCard({ unit, side, state, onChange }: {
    unit: CommentUnit
    side: 'A' | 'B'
    state: UnitState
    onChange: (patch: Partial<UnitState>) => void
}) {
    const st = state
    const ctxParts: { cls: string; text: string }[] = []
    ;(unit.context_before || []).forEach(([mark, text]) => ctxParts.push({ cls: mark === '+' ? 'add' : mark === '-' ? 'del' : '', text }))
    ;(unit.raw_lines || []).forEach(text => ctxParts.push({ cls: 'raw', text }))
    ;(unit.context_after || []).forEach(([mark, text]) => ctxParts.push({ cls: mark === '+' ? 'add' : mark === '-' ? 'del' : '', text }))

    const kind = st.editKind || defaultKind(unit)
    const previewText = wrapPreview(unit, st.newText != null ? st.newText : (unit.text || ''), kind)

    return (
        <div id={`d-${side}-${unit.id}`} className={`border border-gray-200 rounded-md mb-2.5 ${unit.existing ? 'bg-white' : ''}`}>
            <div className={`flex flex-wrap gap-2 items-baseline px-2.5 py-1.5 text-[13px] rounded-t-md border-b ${unit.existing ? 'bg-gray-100 border-gray-200' : 'bg-amber-50 border-amber-200'}`}>
                <span className="font-bold bg-amber-400 text-gray-900 rounded px-1.5">{unit.id}</span>
                <span className="text-[10.5px] uppercase tracking-wide text-gray-500 border border-gray-300 rounded-full px-2">{unit.kind === 'doc' ? 'docstring-ish' : 'comment'}</span>
                {unit.existing && <span className="text-[10.5px] uppercase tracking-wide text-gray-500 border border-gray-300 rounded-full px-2">pre-existing</span>}
                {unit.is_test && <span className="text-[10.5px] uppercase tracking-wide text-gray-500 border border-gray-300 rounded-full px-2">test file</span>}
                <span className="font-mono text-[12px] text-gray-600">{unit.file} · line{unit.line_start === unit.line_end ? ' ' : 's '}{unit.line_start}{unit.line_start === unit.line_end ? '' : `–${unit.line_end}`}</span>
            </div>
            <pre className="bg-[#0f172a] text-[#94a3b8] px-2.5 py-2 whitespace-pre-wrap break-words text-[12px] font-mono m-0">
                {ctxParts.map((p, i) => (
                    <span key={i} className={`block ${p.cls === 'raw' ? 'text-[#fde68a] bg-amber-400/10' : p.cls === 'add' ? 'text-[#86efac]' : p.cls === 'del' ? 'text-[#fca5a5]' : ''}`}>{p.text}</span>
                ))}
            </pre>
            <div className="px-2.5 py-2">
                <div className="mb-1.5">
                    {(['keep', 'rewrite', 'remove'] as const).map(act => (
                        <label key={act} className="mr-4 font-semibold text-[12.5px] cursor-pointer">
                            <input type="radio" name={`dec-${side}-${unit.id}`} checked={st.action === act}
                                onChange={() => onChange({ action: act, newText: act === 'rewrite' ? (st.newText ?? (unit.text || '')) : null })} />
                            {' '}{act.charAt(0).toUpperCase() + act.slice(1)}
                        </label>
                    ))}
                </div>
                <input type="text" maxLength={400} value={st.why || ''} onChange={e => onChange({ why: e.target.value })}
                    placeholder={st.action === 'keep' ? 'why? optional' : 'why? one line'}
                    className="w-full text-[12.5px] border border-gray-300 rounded px-2 py-1 outline-none focus:border-indigo-400" />
                {st.action === 'rewrite' && (
                    <div className="mt-2 border-t border-dashed border-gray-200 pt-2">
                        <div className="mb-1.5">
                            {(['comment', 'docstring'] as const).map(k => (
                                <label key={k} className="mr-4 text-[12.5px] cursor-pointer">
                                    <input type="radio" name={`kind-${side}-${unit.id}`} checked={kind === k} onChange={() => onChange({ editKind: k })} /> {k}
                                </label>
                            ))}
                        </div>
                        <textarea value={st.newText != null ? st.newText : (unit.text || '')} onChange={e => onChange({ newText: e.target.value })}
                            placeholder="replacement text — no comment markers or quotes, just the words"
                            className="w-full min-h-[4em] font-mono text-[12px] border border-gray-300 rounded px-2 py-1.5 outline-none focus:border-indigo-400" />
                        <pre className="bg-[#0f172a] text-[#fde68a] px-2.5 py-2 mt-1.5 whitespace-pre-wrap break-words text-[12px] font-mono rounded">{previewText}</pre>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function EditCommentsPanel({
    pairId, filesA, filesB, unitsA, unitsB, editSide, onEditSideChange,
    unitState, onUnitChange, adds, onAddsChange, ccEdits, onCcEditsChange,
}: {
    pairId: string
    filesA: DFile[]; filesB: DFile[]
    unitsA: CommentUnit[]; unitsB: CommentUnit[]
    editSide: 'A' | 'B' | null
    onEditSideChange: (side: 'A' | 'B') => void
    unitState: { A: Record<string, UnitState>; B: Record<string, UnitState> }
    onUnitChange: (side: 'A' | 'B', unitId: string, patch: Partial<UnitState>) => void
    adds: { A: AddedComment[]; B: AddedComment[] }
    onAddsChange: (side: 'A' | 'B', next: AddedComment[]) => void
    ccEdits: string
    onCcEditsChange: (block: string) => void
}) {
    const [blockOut, setBlockOut] = useState(ccEdits)
    const [genMsg, setGenMsg] = useState('')
    const [copied, setCopied] = useState(false)
    const [addFile, setAddFile] = useState('')
    const [addWhere, setAddWhere] = useState('')
    const [addText, setAddText] = useState('')
    const [addKind, setAddKind] = useState<'comment' | 'docstring'>('comment')
    const [addWhy, setAddWhy] = useState('')

    const units = editSide === 'A' ? unitsA : editSide === 'B' ? unitsB : []
    const files = editSide === 'A' ? filesA : filesB
    const sideAdds = editSide ? adds[editSide] : []
    const sideState = editSide ? unitState[editSide] : {}

    const fileOptions = Array.from(new Set(files.map(f => f.newFile || f.oldFile)))
    const currentAddFile = addFile || fileOptions[0] || ''

    let kept = 0, rewritten = 0, removed = 0, todo = 0, missWhy = 0
    units.forEach(u => {
        const s = sideState[u.id]
        if (!s) return
        if (s.action === 'keep') kept++
        else if (s.action === 'rewrite') rewritten++
        else if (s.action === 'remove') removed++
        else todo++
        if (s.action && s.action !== 'keep' && !s.why) missWhy++
    })
    sideAdds.forEach(a => { if (!a.why) missWhy++ })
    const canGenerate = editSide != null && !todo && !missWhy

    const addComment = () => {
        const text = addText.trim()
        if (!text || !editSide) return
        onAddsChange(editSide, [...sideAdds, { file: currentAddFile, where: addWhere.trim(), text, kind: addKind, why: addWhy.trim() }])
        setAddText(''); setAddWhere(''); setAddWhy('')
    }
    const removeAdd = (idx: number) => { if (editSide) onAddsChange(editSide, sideAdds.filter((_, i) => i !== idx)) }

    const generate = () => {
        if (!editSide) { setGenMsg('choose a side first.'); return }
        const block = buildCommentBlock(editSide, pairId, units, sideState, sideAdds)
        setBlockOut(block)
        onCcEditsChange(block)
        setGenMsg('block generated and copied into your "Comment edits block" answer below.')
    }
    const copyBlock = () => {
        if (!blockOut) { setGenMsg('nothing generated yet.'); return }
        copyText(blockOut); setCopied(true); setTimeout(() => setCopied(false), 1200)
        setGenMsg('copied.')
    }

    return (
        <div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-md px-3 py-2 mb-2">
                Which side&rsquo;s comments will you edit?
                <label className="ml-4 font-semibold cursor-pointer"><input type="radio" checked={editSide === 'A'} onChange={() => onEditSideChange('A')} /> A</label>
                <label className="ml-4 font-semibold cursor-pointer"><input type="radio" checked={editSide === 'B'} onChange={() => onEditSideChange('B')} /> B</label>
            </div>

            {editSide && (
                <div className="text-[13px] my-2 text-gray-700">
                    {todo ? <b className="text-amber-700">{todo} of {units.length} still need a decision</b> : <b className="text-green-700">all {units.length} decided</b>}
                    {' '}· kept {kept} · rewritten {rewritten} · removed {removed} · added {sideAdds.length}
                    {missWhy > 0 && <> · <b className="text-amber-700">{missWhy} need a reason</b></>}
                </div>
            )}

            {editSide && (
                <div>
                    {!units.length && <p className="text-gray-500 text-sm">This side has no comments to review.</p>}
                    {units.map(u => (
                        <CommentUnitCard key={u.id} unit={u} side={editSide} state={sideState[u.id] || { action: u.existing ? 'keep' : null, newText: null, editKind: defaultKind(u), why: '' }}
                            onChange={patch => onUnitChange(editSide, u.id, patch)} />
                    ))}

                    <div className="border border-dashed border-indigo-200 rounded-md px-3 py-2.5 my-2.5 bg-slate-50">
                        <h3 className="text-[14px] font-semibold mb-1.5">Add a comment not already listed</h3>
                        <label className="block text-[11px] font-semibold text-gray-500 mt-1">File</label>
                        <select value={currentAddFile} onChange={e => setAddFile(e.target.value)} className="w-full text-[13px] border border-gray-300 rounded px-2 py-1 my-0.5">
                            {fileOptions.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <label className="block text-[11px] font-semibold text-gray-500 mt-1">Where</label>
                        <input type="text" value={addWhere} onChange={e => setAddWhere(e.target.value)}
                            placeholder='where — e.g. "above def parse_gbk_source" or a line number'
                            className="w-full text-[13px] border border-gray-300 rounded px-2 py-1 my-0.5" />
                        <label className="block text-[11px] font-semibold text-gray-500 mt-1">Comment text</label>
                        <textarea rows={2} value={addText} onChange={e => setAddText(e.target.value)}
                            placeholder="comment text — no markers, just the words"
                            className="w-full text-[13px] border border-gray-300 rounded px-2 py-1 my-0.5" />
                        <div className="my-1">
                            <label className="mr-4 text-[13px]"><input type="radio" checked={addKind === 'comment'} onChange={() => setAddKind('comment')} /> comment</label>
                            <label className="text-[13px]"><input type="radio" checked={addKind === 'docstring'} onChange={() => setAddKind('docstring')} /> docstring</label>
                        </div>
                        <label className="block text-[11px] font-semibold text-gray-500 mt-1.5">Why</label>
                        <input type="text" value={addWhy} onChange={e => setAddWhy(e.target.value)} placeholder="why? one line (required)"
                            className="w-full text-[13px] border border-gray-300 rounded px-2 py-1 my-0.5" />
                        <button type="button" onClick={addComment} className="mt-1 text-[12.5px] bg-indigo-600 text-white rounded px-2.5 py-1 hover:bg-indigo-700">add</button>
                    </div>

                    {sideAdds.map((a, idx) => (
                        <div key={idx} className="flex justify-between gap-4 px-2.5 py-1.5 border border-gray-200 rounded my-1 text-[13px]">
                            <span>[{a.kind}] {a.file} · {a.where || a.line || ''} — {a.text.slice(0, 80)}</span>
                            <button type="button" onClick={() => removeAdd(idx)} className="shrink-0 text-red-500 hover:text-red-700">remove</button>
                        </div>
                    ))}

                    <div className="mt-3 flex items-center gap-2.5 flex-wrap">
                        <button type="button" disabled={!canGenerate} onClick={generate}
                            className="text-[13px] bg-indigo-600 text-white rounded px-3 py-1.5 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
                            generate block
                        </button>
                        <button type="button" onClick={copyBlock} className="flex items-center gap-1 text-[13px] border border-gray-300 rounded px-2.5 py-1.5 hover:bg-gray-50">
                            {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />} copy
                        </button>
                        <span className="text-[12.5px] text-green-700">{genMsg}</span>
                    </div>
                    {blockOut && (
                        <div className="mt-2">
                            <p className="text-[12px] text-gray-500">Paste this whole block into the form&rsquo;s &quot;Comment edits block&quot; field (also mirrored into your answers below).</p>
                            <textarea readOnly rows={6} value={blockOut} className="w-full font-mono text-[11.5px] border border-gray-300 rounded px-2 py-1.5 mt-1" />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
