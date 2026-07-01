'use client'

import { useEffect, useRef, type ReactNode } from 'react'

export interface ContextMenuItem {
    icon: ReactNode
    label: string
    onClick: () => void
    separator?: boolean
    variant?: 'default' | 'danger'
}

interface Props {
    x: number
    y: number
    items: ContextMenuItem[]
    onClose: () => void
}

export default function ContextMenu({ x, y, items, onClose }: Props) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent | KeyboardEvent) => {
            if (e instanceof KeyboardEvent) { if (e.key === 'Escape') onClose(); return }
            if (ref.current && !ref.current.contains(e.target as Node)) onClose()
        }
        document.addEventListener('mousedown', handler)
        document.addEventListener('keydown', handler)
        return () => {
            document.removeEventListener('mousedown', handler)
            document.removeEventListener('keydown', handler)
        }
    }, [onClose])

    // Clamp to viewport so menu never renders off-screen
    const style: React.CSSProperties = {
        position: 'fixed',
        top: Math.min(y, window.innerHeight - 250),
        left: Math.min(x, window.innerWidth - 200),
        zIndex: 9999,
    }

    return (
        <div ref={ref} style={style}
            className="bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[180px] text-xs">
            {items.map((item, i) => (
                <div key={i}>
                    {item.separator && i > 0 && <div className="border-t border-gray-100 my-1" />}
                    <button
                        type="button"
                        onClick={() => { item.onClick(); onClose() }}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-gray-50 transition-colors ${item.variant === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}`}
                    >
                        <span className="shrink-0 opacity-60">{item.icon}</span>
                        {item.label}
                    </button>
                </div>
            ))}
        </div>
    )
}
