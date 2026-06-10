'use client'

import { useState, useEffect } from 'react'
import { X, Wifi } from 'lucide-react'
import { getAllGmailGateways } from '@/app/api_handlers/api/gmail-gateways.api'
import { assignGatewayToProfessionals } from '@/app/api_handlers/api/professionals.api'
import { showAppNotification } from '@/utils/notificationService'

interface Props {
    selectedProfessionals: any[]
    onClose: () => void
    onComplete: () => void
}

export default function AssignGatewayModal({ selectedProfessionals, onClose, onComplete }: Props) {
    const [gateways, setGateways] = useState<any[]>([])
    const [selectedGatewayId, setSelectedGatewayId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        getAllGmailGateways().then((res: any) => {
            const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
            setGateways(list)
        })
    }, [])

    const handleSave = async () => {
        setSaving(true)
        try {
            const ids = selectedProfessionals.map(p => p.id)
            await assignGatewayToProfessionals(ids, selectedGatewayId)
            showAppNotification('success', 'Gateway Assigned', `Assigned to ${ids.length} professional${ids.length !== 1 ? 's' : ''}.`)
            onComplete()
        } catch {
            showAppNotification('error', 'Error', 'Failed to assign gateway.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <Wifi size={14} className="text-indigo-600" />
                        <span className="text-sm font-semibold text-gray-800">Assign Email Gateway</span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={15} /></button>
                </div>

                {/* Body */}
                <div className="p-4">
                    <p className="text-xs text-gray-500 mb-3">
                        Assign a gateway to <span className="font-medium text-gray-700">{selectedProfessionals.length} professional{selectedProfessionals.length !== 1 ? 's' : ''}</span>.
                    </p>

                    <div className="space-y-1 max-h-64 overflow-y-auto">
                        {/* None option */}
                        <label className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded hover:bg-gray-50">
                            <input
                                type="radio"
                                name="gateway"
                                checked={selectedGatewayId === null}
                                onChange={() => setSelectedGatewayId(null)}
                                className="w-3.5 h-3.5"
                            />
                            <span className="text-xs text-gray-500 italic">None (remove assignment)</span>
                        </label>

                        {gateways.length === 0 && (
                            <p className="text-xs text-gray-400 px-2 py-2">No gateways found. Add one in Settings → Email Gateways.</p>
                        )}

                        {gateways.map(gw => (
                            <label key={gw.id} className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded hover:bg-gray-50">
                                <input
                                    type="radio"
                                    name="gateway"
                                    checked={selectedGatewayId === gw.id}
                                    onChange={() => setSelectedGatewayId(gw.id)}
                                    className="w-3.5 h-3.5"
                                />
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium text-gray-800">{gw.label}</span>
                                    {gw.email && <span className="text-[10px] text-gray-400">{gw.email}</span>}
                                </div>
                                {gw.is_authorized && (
                                    <span className="ml-auto text-[9px] bg-green-100 text-green-700 px-1 rounded">Authorized</span>
                                )}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100">
                    <button onClick={onClose} className="text-xs px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : 'Assign'}
                    </button>
                </div>
            </div>
        </div>
    )
}
