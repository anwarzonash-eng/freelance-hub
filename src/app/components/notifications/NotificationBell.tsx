'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Bell, RefreshCw, X, AlertTriangle, MessageCircle, Loader2, ArrowRight } from 'lucide-react'
import { getRecentNotifications, markNotificationsRead } from '@/app/api_handlers/api/email-notifications.api'
import NotificationDetailModal from './NotificationDetailModal'

function fmtRelative(iso: string) {
    if (!iso) return ''
    const d = new Date(iso)
    const diffMs = Date.now() - d.getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export default function NotificationBell() {
    const [open, setOpen] = useState(false)
    const [items, setItems] = useState<any[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(false)
    const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null)
    const [selected, setSelected] = useState<any>(null)
    const btnRef = useRef<HTMLButtonElement>(null)
    const router = useRouter()

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res: any = await getRecentNotifications(10)
            const payload = res?.data ?? res
            setItems(Array.isArray(payload?.data) ? payload.data : [])
            setUnreadCount(payload?.unreadCount ?? 0)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
        const interval = setInterval(load, 60000)
        return () => clearInterval(interval)
    }, [load])

    const handleToggle = () => {
        if (!open) {
            const rect = btnRef.current?.getBoundingClientRect()
            if (rect) {
                const popupHeight = 320
                const spaceBelow = window.innerHeight - rect.top
                if (spaceBelow < popupHeight) {
                    setPos({ bottom: window.innerHeight - rect.bottom, left: rect.right + 8 })
                } else {
                    setPos({ top: rect.top, left: rect.right + 8 })
                }
            }
            load()
            if (unreadCount > 0) {
                markNotificationsRead().then(() => setUnreadCount(0)).catch(() => { })
            }
        }
        setOpen(p => !p)
    }

    const handleSeeAll = () => {
        setOpen(false)
        router.push('/notifications')
    }

    return (
        <>
            <button ref={btnRef} onClick={handleToggle}
                className="relative p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                aria-label="Notifications" title="Notifications">
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] leading-none rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && pos && createPortal(
                <>
                    <div className="fixed inset-0 z-[55]" onClick={() => setOpen(false)} />
                    <div
                        className="fixed z-[60] w-80 bg-white rounded shadow-2xl border border-gray-200 flex flex-col max-h-[70vh] min-h-[220px]"
                        style={{ top: pos.top, bottom: pos.bottom, left: pos.left }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 shrink-0">
                            <span className="text-sm font-semibold text-gray-800">Notifications</span>
                            <div className="flex items-center gap-2">
                                <button onClick={load} disabled={loading} title="Refresh notifications" className="text-gray-400 hover:text-gray-700 disabled:opacity-50">
                                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                                </button>
                                <button onClick={() => setOpen(false)} title="Close" className="text-gray-400 hover:text-gray-700">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {loading && items.length === 0 && (
                                <div className="flex items-center justify-center h-full py-6 text-xs text-gray-400 gap-2">
                                    <Loader2 size={13} className="animate-spin" /> Loading…
                                </div>
                            )}
                            {!loading && items.length === 0 && (
                                <div className="flex items-center justify-center h-full py-6 text-xs text-gray-400">No notifications.</div>
                            )}
                            {items.map(n => (
                                <button key={n.id} onClick={() => { setSelected(n); setOpen(false) }}
                                    className="w-full text-left px-3 py-2 border-b border-gray-50 hover:bg-gray-50 flex items-start gap-2">
                                    <span className={`mt-0.5 shrink-0 ${n.type === 'email_failed' ? 'text-red-500' : 'text-purple-500'}`}>
                                        {n.type === 'email_failed' ? <AlertTriangle size={13} /> : <MessageCircle size={13} />}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-medium text-gray-800 truncate">{n.title}</div>
                                        <div className="text-[11px] text-gray-500 truncate">{n.message}</div>
                                        <div className="text-[10px] text-gray-400 mt-0.5">{fmtRelative(n.createdAt)}</div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <button onClick={handleSeeAll}
                            className="flex items-center justify-center gap-1 text-xs text-teal-600 hover:bg-gray-50 py-2 border-t border-gray-100 shrink-0 font-medium">
                            See all <ArrowRight size={12} />
                        </button>
                    </div>
                </>,
                document.body
            )}

            {selected && <NotificationDetailModal notification={selected} onClose={() => setSelected(null)} />}
        </>
    )
}
