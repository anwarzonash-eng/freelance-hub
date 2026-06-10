'use client'

import { X, Copy } from 'lucide-react'
import { showAppNotification } from '@/utils/notificationService'

const TYPE_COLORS: Record<string, string> = {
    courtesy_email: 'bg-blue-100 text-blue-700',
    mercor_platform_join: 'bg-violet-100 text-violet-700',
    micro1_platform_join: 'bg-sky-100 text-sky-800',
    aligner_platform_join: 'bg-teal-100 text-teal-700',
    outlier_platform_join: 'bg-orange-100 text-orange-700',
    mercor_job: 'bg-violet-200 text-violet-800',
    aligner_job: 'bg-teal-200 text-teal-800',
}

const STATUS_COLORS: Record<string, string> = {
    email_created: 'bg-gray-100 text-gray-600',
    email_in_queue: 'bg-yellow-100 text-yellow-700',
    email_sent: 'bg-green-100 text-green-700',
    email_bounced: 'bg-red-100 text-red-600',
    email_positive_response: 'bg-emerald-100 text-emerald-700',
    email_negative_response: 'bg-red-100 text-red-700',
}

function fmt(s: string) {
    return (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function fmtDate(iso: string) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

interface Props {
    email: any
    toEmail?: string
    fromEmail?: string
    professionalName?: string
    onClose: () => void
}

export default function EmailDetailModal({ email, toEmail, fromEmail, professionalName, onClose }: Props) {
    const isHtml = /<[a-z][\s\S]*>/i.test(email.body || '')

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${TYPE_COLORS[email.email_type] ?? 'bg-gray-100 text-gray-600'}`}>
                            {fmt(email.email_type)}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${STATUS_COLORS[email.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {fmt(email.status)}
                        </span>
                        <span className="text-[9px] text-gray-400">{fmtDate(email.createdAt)}</span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 ml-2 shrink-0"><X size={16} /></button>
                </div>

                {/* Meta fields */}
                <div className="px-4 pt-3 pb-2 border-b border-gray-100 shrink-0 space-y-1.5 text-xs">
                    {professionalName && (
                        <div className="flex gap-2">
                            <span className="text-gray-400 w-14 shrink-0">Contact</span>
                            <span className="text-gray-800 font-medium">{professionalName}</span>
                        </div>
                    )}
                    {toEmail && (
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400 w-14 shrink-0">To</span>
                            <span className="text-gray-700">{toEmail}</span>
                            <button onClick={() => { navigator.clipboard.writeText(toEmail); showAppNotification('success', 'Copied', toEmail) }}
                                className="text-gray-300 hover:text-gray-600"><Copy size={10} /></button>
                        </div>
                    )}
                    {fromEmail && (
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400 w-14 shrink-0">From</span>
                            <span className="text-gray-700">{fromEmail}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400 w-14 shrink-0">Subject</span>
                        <span className="text-gray-800 font-medium flex-1">{email.subject}</span>
                        <button onClick={() => { navigator.clipboard.writeText(email.subject); showAppNotification('success', 'Copied', 'Subject copied.') }}
                            className="text-gray-300 hover:text-gray-600 shrink-0"><Copy size={10} /></button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    <div className="flex items-center justify-between px-4 py-1.5 border-b border-gray-100 shrink-0">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wide">Body {isHtml ? '(HTML)' : '(Text)'}</span>
                        <button onClick={() => { navigator.clipboard.writeText(email.body || ''); showAppNotification('success', 'Copied', 'Body copied.') }}
                            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-700">
                            <Copy size={10} /> Copy
                        </button>
                    </div>
                    {isHtml ? (
                        <iframe
                            srcDoc={email.body}
                            className="flex-1 w-full border-0"
                            sandbox="allow-same-origin"
                            title="Email body"
                        />
                    ) : (
                        <div className="flex-1 overflow-y-auto p-4">
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">{email.body}</pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
