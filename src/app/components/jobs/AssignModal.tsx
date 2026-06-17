'use client'

import { useState, useEffect } from 'react'
import { X, Users } from 'lucide-react'
import { assignCompanies } from '@/app/api_handlers/api/sponsored-companies.api'

const SYSTEM_USER = '00000000-0000-0000-0000-000000000001'

interface User {
    id: string
    userid: string
}

interface Assignment {
    userId: string
    count: number
}

interface Props {
    filters: any
    totalFiltered: number
    users: User[]
    onClose: () => void
    onDone: () => void
}

export default function AssignModal({ filters, totalFiltered, users, onClose, onDone }: Props) {
    const eligible = users.filter(u => u.id !== SYSTEM_USER)

    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [counts, setCounts] = useState<Record<string, number>>({})
    const [saving, setSaving] = useState(false)

    const toggleUser = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    // Recalculate equal distribution whenever selection changes
    useEffect(() => {
        const ids = Array.from(selected)
        if (ids.length === 0) { setCounts({}); return }
        const base = Math.floor(totalFiltered / ids.length)
        const remainder = totalFiltered % ids.length
        const next: Record<string, number> = {}
        ids.forEach((id, i) => { next[id] = base + (i < remainder ? 1 : 0) })
        setCounts(next)
    }, [selected, totalFiltered])

    const setCount = (id: string, value: number) => {
        setCounts(prev => ({ ...prev, [id]: Math.max(0, value) }))
    }

    const totalAssigned = Array.from(selected).reduce((s, id) => s + (counts[id] ?? 0), 0)

    const handleSubmit = async () => {
        if (selected.size === 0) return
        setSaving(true)
        try {
            const assignments: Assignment[] = Array.from(selected).map(id => ({
                userId: id,
                count: counts[id] ?? 0,
            }))
            await assignCompanies({ filters, assignments })
            onDone()
        } finally {
            setSaving(false)
        }
    }

    const inputCls = 'border border-gray-300 rounded px-2 py-0.5 text-xs w-20 text-right focus:outline-none focus:border-gray-500'

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
                    <div className="flex items-center gap-2">
                        <Users size={15} className="text-indigo-500" />
                        <span className="text-sm font-semibold text-gray-800">Assign Companies</span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
                </div>

                <div className="px-4 py-3 border-b border-gray-100 shrink-0">
                    <p className="text-xs text-gray-500">
                        Distributing <span className="font-semibold text-gray-800">{totalFiltered.toLocaleString()}</span> filtered companies to selected users.
                        First <span className="font-semibold text-gray-800">{totalAssigned.toLocaleString()}</span> companies will be assigned.
                        {totalAssigned < totalFiltered && (
                            <span className="text-amber-600 ml-1">({(totalFiltered - totalAssigned).toLocaleString()} will remain unassigned)</span>
                        )}
                        {totalAssigned > totalFiltered && (
                            <span className="text-red-500 ml-1">(total exceeds available — reduce counts)</span>
                        )}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                    {eligible.length === 0 && (
                        <p className="text-xs text-gray-400 italic text-center py-6">No users available.</p>
                    )}
                    {eligible.map(u => {
                        const isSelected = selected.has(u.id)
                        return (
                            <div key={u.id}
                                className={`flex items-center gap-3 p-2 rounded border transition-colors cursor-pointer ${isSelected ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                                onClick={() => toggleUser(u.id)}>
                                <input type="checkbox" readOnly checked={isSelected}
                                    className="w-3.5 h-3.5 accent-indigo-600 shrink-0" />
                                <span className="flex-1 text-xs text-gray-800 truncate">{u.userid}</span>
                                {isSelected && (
                                    <input
                                        type="number"
                                        min={0}
                                        max={totalFiltered}
                                        className={inputCls}
                                        value={counts[u.id] ?? 0}
                                        onClick={e => e.stopPropagation()}
                                        onChange={e => setCount(u.id, Number(e.target.value))}
                                    />
                                )}
                            </div>
                        )
                    })}
                </div>

                <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2 shrink-0">
                    <button type="button" onClick={onClose}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50">
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={selected.size === 0 || totalAssigned === 0 || totalAssigned > totalFiltered || saving}
                        onClick={handleSubmit}
                        className="px-4 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
                        {saving ? 'Assigning…' : `Assign (${totalAssigned.toLocaleString()})`}
                    </button>
                </div>
            </div>
        </div>
    )
}
