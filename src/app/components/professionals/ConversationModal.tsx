'use client'

import { X } from 'lucide-react'

export interface ConversationMessage {
    id: string
    from: string
    to: string
    subject: string
    date: string
    snippet: string
    body: string
    isFromMe: boolean
}

function fmtDate(value: string) {
    if (!value) return ''
    const d = new Date(value)
    if (isNaN(d.getTime())) return value
    return d.toLocaleString()
}

export function ConversationMessages({ messages }: { messages: ConversationMessage[] }) {
    return (
        <div className="space-y-3">
            {messages.length === 0 && (
                <div className="text-center py-8 text-xs text-gray-400">No messages found.</div>
            )}
            {messages.map(m => {
                const isHtml = /<[a-z][\s\S]*>/i.test(m.body || '')
                return (
                    <div key={m.id} className={`border rounded p-2 ${m.isFromMe ? 'bg-teal-50 border-teal-100' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-1 gap-2">
                            <span className="text-[11px] font-medium text-gray-700 truncate">{m.isFromMe ? 'You' : m.from}</span>
                            <span className="text-[10px] text-gray-400 shrink-0">{fmtDate(m.date)}</span>
                        </div>
                        {isHtml ? (
                            <iframe
                                srcDoc={m.body}
                                className="w-full border-0 rounded bg-white"
                                style={{ height: 200 }}
                                sandbox="allow-same-origin"
                                title={`message-${m.id}`}
                            />
                        ) : (
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed font-sans max-h-60 overflow-y-auto">{m.body || m.snippet}</pre>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

export default function ConversationModal({ messages, onClose }: { messages: ConversationMessage[]; onClose: () => void }) {
    return (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
                    <span className="text-sm font-semibold text-gray-800">Conversation</span>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                    <ConversationMessages messages={messages} />
                </div>
            </div>
        </div>
    )
}
