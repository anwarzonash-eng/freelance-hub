'use client'

/* ------------------------------------------------------------------ *
 * The one picker for every trajectory artefact. Takes any of the eight
 * files in a single go or a few at a time, and each one is filed by its
 * name — see trajectoryFiles.ts for the routing table.
 * ------------------------------------------------------------------ */

import { useRef } from 'react'
import { Upload, RefreshCw } from 'lucide-react'
import { CANONICAL_FILENAMES, UPLOAD_ACCEPT } from './trajectoryFiles'

export default function UploadFilesButton({ onFiles, busy, label = 'Upload files', primary = true, className = '' }: {
    onFiles: (files: File[]) => void
    busy?: boolean
    label?: string
    primary?: boolean
    className?: string
}) {
    const ref = useRef<HTMLInputElement>(null)
    return (
        <>
            <input ref={ref} type="file" multiple accept={UPLOAD_ACCEPT} hidden
                onChange={e => {
                    const files = Array.from(e.target.files || [])
                    if (files.length) onFiles(files)
                    if (ref.current) ref.current.value = ''
                }} />
            <button type="button" onClick={() => ref.current?.click()} disabled={busy}
                title={`Pick any of: ${CANONICAL_FILENAMES.join(', ')} — each file goes to its own tab by name`}
                className={`flex items-center gap-1 rounded-md font-semibold disabled:opacity-40 ${primary
                    ? 'text-[12.5px] bg-[#6C4CE0] text-white px-3 py-1.5 hover:brightness-95'
                    : 'text-[11px] bg-white text-[#4F36B0] border border-[#6C4CE0] px-2.5 py-1 hover:bg-[#F1ECFE]'} ${className}`}>
                {busy ? <RefreshCw size={12} className="animate-spin" /> : <Upload size={12} />} {label}
            </button>
        </>
    )
}
