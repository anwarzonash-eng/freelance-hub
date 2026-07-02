'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'

export function useColResize(defaults: Record<string, number>, storageKey: string) {
    const [widths, setWidths] = useState<Record<string, number>>(defaults)
    const widthsRef = useRef(defaults)
    widthsRef.current = widths

    useEffect(() => {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
            try { setWidths(prev => ({ ...prev, ...JSON.parse(saved) })) } catch {}
        }
    }, [storageKey])

    const startResize = useCallback((key: string, e: ReactMouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const startX = e.clientX
        const startWidth = widthsRef.current[key] ?? defaults[key] ?? 100

        const onMove = (ev: MouseEvent) => {
            const newWidth = Math.max(40, startWidth + ev.clientX - startX)
            setWidths(prev => {
                const next = { ...prev, [key]: newWidth }
                localStorage.setItem(storageKey, JSON.stringify(next))
                return next
            })
        }
        const onUp = () => {
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
    }, [storageKey]) // defaults is module-level constant, stable

    return { widths, startResize }
}
