'use client'

/* ------------------------------------------------------------------ *
 * Solution tab — the patch each rollout produced, as a GitHub-style
 * diff. Two sub-tabs, A and B, reading `agent_a_solution.patch` /
 * `agent_b_solution.patch` from the task row (the pre-rename
 * `agent_a.patch` / `agent_b.patch` still uploads fine — see
 * trajectoryFiles.ts — this label just always shows the current name).
 * ------------------------------------------------------------------ */

import { useEffect, useState } from 'react'
import { Copy, Check, FileDiff } from 'lucide-react'
import DiffView from './DiffView'
import UploadFilesButton from './UploadFilesButton'
import { Side, SIDES, TrajectoryFilesState } from './trajectoryFiles'

const PATCH_FILE: Record<Side, string> = { a: 'agent_a_solution.patch', b: 'agent_b_solution.patch' }

function CopyPatchBtn({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)
    return (
        <button type="button"
            onClick={() => {
                try { navigator.clipboard?.writeText(text) } catch { /* ignore */ }
                setCopied(true); setTimeout(() => setCopied(false), 1200)
            }}
            className="flex items-center gap-1 text-[11px] border border-gray-300 rounded px-2 py-1 text-gray-600 hover:bg-gray-50">
            {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />} {copied ? 'Copied' : 'Copy patch'}
        </button>
    )
}

export default function SolutionTab({ files, onFiles, busy }: {
    files: TrajectoryFilesState
    onFiles: (list: File[]) => void
    busy?: boolean
}) {
    const patches: Record<Side, string | null> = { a: files.patch_a, b: files.patch_b }
    const [active, setActive] = useState<Side>(!files.patch_a && files.patch_b ? 'b' : 'a')
    const [raw, setRaw] = useState(false)

    // Follow the side that actually has a patch when one arrives.
    useEffect(() => {
        const other: Side = active === 'a' ? 'b' : 'a'
        if (!patches[active] && patches[other]) setActive(other)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [files.patch_a, files.patch_b])

    const patch = patches[active]
    const upper = active.toUpperCase()

    return (
        <div>
            {/* A / B */}
            <div className="flex items-center gap-1 mb-3 border-b border-gray-200">
                {SIDES.map(s => (
                    <button key={s} onClick={() => setActive(s)}
                        className={`text-[12.5px] font-semibold px-4 py-2 border-b-2 -mb-px ${active === s
                            ? 'text-[#0969DA] border-[#0969DA]'
                            : 'text-gray-500 border-transparent hover:text-gray-800'}`}>
                        {s.toUpperCase()}
                        {!patches[s] && <span className="ml-1.5 text-[10px] font-normal text-gray-300">no patch</span>}
                    </button>
                ))}
            </div>

            {/* Heading — mirrors the annotation tool's solution section */}
            <div className="flex items-start gap-2 mb-1 flex-wrap">
                <FileDiff size={15} className="text-[#0969DA] mt-0.5 shrink-0" />
                <div>
                    <div className="text-[14px] font-semibold text-gray-900">
                        Agent solution {upper} · Trajectory {upper}
                    </div>
                    <div className="text-[12px] text-gray-500">The patch this rollout produced.</div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    {patch && (
                        <>
                            <button onClick={() => setRaw(r => !r)}
                                className="text-[11px] border border-gray-300 rounded px-2 py-1 text-gray-600 hover:bg-gray-50">
                                {raw ? 'Rendered diff' : 'Raw patch'}
                            </button>
                            <CopyPatchBtn text={patch} />
                        </>
                    )}
                    <UploadFilesButton onFiles={onFiles} busy={busy} primary={false}
                        label={patch ? 'Replace files' : 'Upload files'} />
                </div>
            </div>
            <div className="text-[11px] text-gray-400 font-mono mb-3">{PATCH_FILE[active]}</div>

            {!patch ? (
                <div className="text-center py-20 text-gray-400">
                    <FileDiff size={22} className="mx-auto mb-2 text-gray-300" />
                    <div className="text-[13px] font-semibold text-gray-600 mb-1">No patch for solution {upper}</div>
                    <div className="text-[12px]">
                        Upload <code className="font-mono">{PATCH_FILE[active]}</code> — the picker takes it alongside the
                        log files, and each one lands on its own tab.
                    </div>
                </div>
            ) : raw ? (
                <pre className="bg-[#F6F8FA] border border-gray-200 rounded-md px-3 py-2.5 font-mono text-[11.5px] leading-[1.55] whitespace-pre-wrap break-words max-h-[70vh] overflow-auto text-gray-800">
                    {patch}
                </pre>
            ) : (
                <DiffView patch={patch} label={`field_patch_${active}`} />
            )}
        </div>
    )
}
