'use client'

import { useState, useEffect } from 'react'
import { X, Mail, Loader2, MessageCircle } from 'lucide-react'
import { getEmailsByProfessional } from '@/app/api_handlers/api/email-campaigns.api'
import { getAllGmailGateways } from '@/app/api_handlers/api/gmail-gateways.api'
import EmailDetailModal from './EmailDetailModal'
import ConversationModal from './ConversationModal'

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
    email_sending: 'bg-blue-100 text-blue-700',
    email_sent: 'bg-green-100 text-green-700',
    email_failed: 'bg-red-100 text-red-700',
    email_bounced: 'bg-red-100 text-red-600',
    email_replied: 'bg-purple-100 text-purple-700',
    email_positive_response: 'bg-emerald-100 text-emerald-700',
    email_negative_response: 'bg-red-100 text-red-700',
}

function fmt(s: string) {
    return (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
function fmtDate(iso: string) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
}

export default function EmailCampaignsViewer({ professional, onClose }: { professional: any; onClose: () => void }) {
    const [emails, setEmails] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [gateways, setGateways] = useState<any[]>([])
    const [selectedEmail, setSelectedEmail] = useState<any>(null)
    const [conversation, setConversation] = useState<any[] | null>(null)

    useEffect(() => {
        Promise.all([
            getEmailsByProfessional(professional.id),
            getAllGmailGateways(),
        ]).then(([emailRes, gwRes]: any[]) => {
            setEmails(Array.isArray(emailRes?.data) ? emailRes.data : [])
            const gwList = Array.isArray(gwRes?.data) ? gwRes.data : Array.isArray(gwRes) ? gwRes : []
            setGateways(gwList)
            setLoading(false)
        })
    }, [professional.id])

    const gateway = gateways.find(g => g.id === professional.email_gateway_id)
    const toEmail = Array.isArray(professional.emails) && professional.emails[0]?.email
    const fromEmail = gateway?.email

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
                        <div className="flex items-center gap-2">
                            <Mail size={14} className="text-gray-500" />
                            <span className="text-sm font-semibold text-gray-800">
                                {professional.first_name} {professional.last_name}
                            </span>
                            <span className="text-xs text-gray-400">Email Campaigns</span>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                        {loading && (
                            <div className="flex items-center justify-center py-8 text-xs text-gray-400">
                                <Loader2 size={14} className="animate-spin mr-2" /> Loading…
                            </div>
                        )}
                        {!loading && emails.length === 0 && (
                            <div className="text-center py-8 text-xs text-gray-400">No email campaigns found.</div>
                        )}
                        {!loading && emails.map((email: any) => (
                            <button
                                key={email.id}
                                onClick={() => setSelectedEmail(email)}
                                className="w-full text-left border border-gray-200 rounded px-3 py-2 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                            >
                                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${TYPE_COLORS[email.email_type] ?? 'bg-gray-100 text-gray-600'}`}>
                                        {fmt(email.email_type)}
                                    </span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${STATUS_COLORS[email.status] ?? 'bg-gray-100 text-gray-500'}`}>
                                        {fmt(email.status)}
                                    </span>
                                    {email.status === 'email_replied' && Array.isArray(email.conversation) && email.conversation.length > 0 && (
                                        <span
                                            onClick={(e) => { e.stopPropagation(); setConversation(email.conversation) }}
                                            title="View conversation"
                                            className="text-purple-500 hover:text-purple-700"
                                        >
                                            <MessageCircle size={11} />
                                        </span>
                                    )}
                                    <span className="text-[9px] text-gray-400 ml-auto">{fmtDate(email.createdAt)}</span>
                                </div>
                                <div className="text-xs font-medium text-gray-700 truncate">{email.subject}</div>
                                {toEmail && <div className="text-[10px] text-gray-400 truncate">To: {toEmail}</div>}
                                {email.status === 'email_replied' && email.reply_snippet && (
                                    <div className="text-[10px] text-purple-600 truncate mt-0.5">Reply: {email.reply_snippet}</div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {selectedEmail && (
                <EmailDetailModal
                    email={selectedEmail}
                    toEmail={toEmail || undefined}
                    fromEmail={fromEmail || undefined}
                    professionalName={`${professional.first_name} ${professional.last_name}`}
                    onClose={() => setSelectedEmail(null)}
                />
            )}

            {conversation && (
                <ConversationModal messages={conversation} onClose={() => setConversation(null)} />
            )}
        </>
    )
}
