'use client'

/* ------------------------------------------------------------------ *
 * "Your answers" side panel — schema-driven form (renderAnswers/
 * renderAnswerField), plus "copy all as text" / "download answers.json".
 * Ported from task.html. Autosave/debounce lives in TaskEditor; this
 * component is just the form + the two export actions.
 * ------------------------------------------------------------------ */

import { X } from 'lucide-react'
import { PAD_LINKED_FIELDS, SchemaSection } from './taskLogic'

function copyText(text: string) {
    try { navigator.clipboard?.writeText(text ?? '') } catch { /* ignore */ }
}

export default function AnswersPanel({
    schema, answers, onAnswerChange, saveStatus, pairId, onClose, width, downloadPayload,
}: {
    schema: SchemaSection[]
    answers: Record<string, any>
    onAnswerChange: (id: string, val: string) => void
    saveStatus: string
    pairId: string
    onClose: () => void
    width: number
    /** The full saved bundle (answers + unitState + adds + editSide) — matches what
     *  the "download answers.json" button in task.html exports. */
    downloadPayload: Record<string, any>
}) {
    const exportText = () => {
        const lines: string[] = [`CoAT answers — pair ${pairId}`]
        schema.forEach(sec => {
            lines.push(''); lines.push(`## ${sec.title}`)
            sec.fields.forEach(f => lines.push(`${f.label}: ${answers[f.id] || '(blank)'}`))
        })
        copyText(lines.join('\n'))
    }
    const downloadJson = () => {
        const payload = { pair_id: pairId, ...downloadPayload }
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = 'answers.json'
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    return (
        <div className="shrink-0 h-full overflow-y-auto bg-white border-l border-gray-200 px-4" style={{ width, maxWidth: '75vw' }}>
            <div className="sticky top-0 bg-white pt-3.5 pb-2.5 border-b border-gray-200 flex items-center gap-2.5 mb-2 z-10">
                <h2 className="text-[15px] font-semibold flex-1">Your answers</h2>
                <span className="text-[12px] text-gray-500">{saveStatus}</span>
                <button onClick={onClose} title="Close" className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
            </div>

            {schema.map(section => (
                <div key={section.title} className="border border-gray-200 rounded-md px-3.5 py-2.5 my-2.5">
                    <h3 className="text-[15px] font-semibold mt-0">{section.title}</h3>
                    {section.subtitle && <p className="text-[12.5px] text-gray-500 mb-2.5">{section.subtitle}</p>}
                    {section.fields.map(f => {
                        const linked = PAD_LINKED_FIELDS[f.id]
                        const val = answers[f.id]
                        return (
                            <div key={f.id} className="my-2.5">
                                <label className="block font-semibold text-[13px] mb-1">
                                    {f.label}{f.required ? ' *' : ''}
                                    {linked && <span className="font-normal text-gray-500"> — written in {linked}, mirrored here read-only</span>}
                                </label>
                                {f.type === 'radio' ? (
                                    <div>
                                        {(f.options || []).map(opt => (
                                            <label key={opt} className="mr-4 inline-block mb-0.5 cursor-pointer text-[13px]">
                                                <input type="radio" name={`ans-${f.id}`} checked={val === opt} onChange={() => onAnswerChange(f.id, opt)} /> {opt}
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <textarea rows={f.rows || 3} readOnly={!!linked} value={val || ''}
                                        onChange={e => !linked && onAnswerChange(f.id, e.target.value)}
                                        className={`w-full text-[13px] border border-gray-300 rounded px-2 py-1.5 font-inherit ${linked ? 'bg-gray-50 text-gray-500' : ''}`} />
                                )}
                            </div>
                        )
                    })}
                </div>
            ))}

            <div className="sticky bottom-0 bg-white border-t border-gray-200 py-2.5 flex gap-2.5 flex-wrap mt-2.5">
                <button onClick={exportText} className="text-[12.5px] border border-gray-300 rounded px-2.5 py-1.5 hover:bg-gray-50">copy all as text</button>
                <button onClick={downloadJson} className="text-[12.5px] border border-gray-300 rounded px-2.5 py-1.5 hover:bg-gray-50">download answers.json</button>
            </div>
        </div>
    )
}
