'use client'

import { X, AlertTriangle, MessageCircle } from 'lucide-react'
import { ConversationMessages } from '../professionals/ConversationModal'

function fmtDate(iso: string) {
    if (!iso) return ''
    return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function NotificationDetailModal({ notification, onClose }: { notification: any; onClose: () => void }) {
    const isFailed = notification.type === 'email_failed'
    const meta = notification.metadata || {}

    return (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className={isFailed ? 'text-red-500' : 'text-purple-500'}>
                            {isFailed ? <AlertTriangle size={16} /> : <MessageCircle size={16} />}
                        </span>
                        <span className="text-sm font-semibold text-gray-800">{notification.title}</span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
                </div>

                <div className="px-4 py-2 border-b border-gray-100 shrink-0 space-y-1 text-xs">
                    <div className="text-gray-700">{notification.message}</div>
                    <div className="text-[10px] text-gray-400">{fmtDate(notification.createdAt)}</div>
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                    {isFailed ? (
                        <div className="bg-red-50 border border-red-100 rounded p-3 space-y-2 text-xs">
                            {meta.subject && (
                                <div className="flex gap-2">
                                    <span className="text-red-500 w-20 shrink-0 font-medium">Subject</span>
                                    <span className="text-red-700">{meta.subject}</span>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <span className="text-red-500 w-20 shrink-0 font-medium">Reason</span>
                                <span className="text-red-700">{meta.error_message || 'Unknown error'}</span>
                            </div>
                            {typeof meta.attempts === 'number' && (
                                <div className="flex gap-2">
                                    <span className="text-red-500 w-20 shrink-0 font-medium">Attempts</span>
                                    <span className="text-red-700">{meta.attempts}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <ConversationMessages messages={Array.isArray(meta.conversation) ? meta.conversation : []} />
                    )}
                </div>
            </div>
        </div>
    )
}
