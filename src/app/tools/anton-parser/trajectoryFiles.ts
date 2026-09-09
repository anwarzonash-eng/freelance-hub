'use client'

/* ------------------------------------------------------------------ *
 * The six artefacts fetch_project.js writes per project, and where each
 * one lands in the editor. Routing is by exact filename — the same names
 * the script produces:
 *
 *   <project>/trajectories/model_a_log.json   Task tab   · Model A · parsed
 *   <project>/trajectories/model_b_log.json   Task tab   · Model B · parsed
 *   <project>/trajectories/model_a_log.md     Task tab   · Model A · markdown
 *   <project>/trajectories/model_b_log.md     Task tab   · Model B · markdown
 *   <project>/trajectories/agent_a.patch      Solution tab · A
 *   <project>/trajectories/agent_b.patch      Solution tab · B
 *
 * One picker takes all of them at once, or a few at a time; each file
 * goes to its own tab by name, so nothing has to be assigned by hand.
 * ------------------------------------------------------------------ */

export type Side = 'a' | 'b'
export const SIDES: Side[] = ['a', 'b']
export const SIDE_LABEL: Record<Side, string> = { a: 'Model A', b: 'Model B' }

/** One key per stored column on the task row. */
export type FileKey = 'trajectory_a' | 'trajectory_b' | 'md_a' | 'md_b' | 'patch_a' | 'patch_b'

export interface TrajectoryFilesState {
    trajectory_a: any
    trajectory_b: any
    md_a: string | null
    md_b: string | null
    patch_a: string | null
    patch_b: string | null
}

export const EMPTY_FILES: TrajectoryFilesState = {
    trajectory_a: null, trajectory_b: null,
    md_a: null, md_b: null,
    patch_a: null, patch_b: null,
}

interface Route { key: FileKey; kind: 'json' | 'text'; side: Side; what: string }

/** Filename → destination. Lower-cased basenames, exactly as the script writes them. */
export const FILE_ROUTES: Record<string, Route> = {
    'model_a_log.json': { key: 'trajectory_a', kind: 'json', side: 'a', what: 'Model A log' },
    'model_b_log.json': { key: 'trajectory_b', kind: 'json', side: 'b', what: 'Model B log' },
    'model_a_log.md': { key: 'md_a', kind: 'text', side: 'a', what: 'Model A markdown' },
    'model_b_log.md': { key: 'md_b', kind: 'text', side: 'b', what: 'Model B markdown' },
    'agent_a.patch': { key: 'patch_a', kind: 'text', side: 'a', what: 'Solution A patch' },
    'agent_b.patch': { key: 'patch_b', kind: 'text', side: 'b', what: 'Solution B patch' },
}

export const ACCEPTED_FILENAMES = Object.keys(FILE_ROUTES)

/** The file input's accept list — the extensions the six names use. */
export const UPLOAD_ACCEPT = '.json,.md,.patch,.diff,application/json,text/markdown,text/plain'

/** Strips any directory part a folder-drop leaves on the name. */
function basename(name: string): string {
    return name.split(/[\\/]/).pop() || name
}

export function routeForFile(name: string): Route | null {
    return FILE_ROUTES[basename(name).toLowerCase()] || null
}

export interface UploadResult {
    /** Only the columns the dropped files actually carried. */
    patch: Partial<TrajectoryFilesState>
    accepted: string[]
    /** Files whose name is not one of the six. */
    skipped: string[]
    errors: string[]
}

/**
 * Reads a batch of dropped files and sorts them into their columns. Unknown
 * names are reported rather than guessed at — the names are the routing.
 */
export async function readUploadedFiles(files: File[]): Promise<UploadResult> {
    const result: UploadResult = { patch: {}, accepted: [], skipped: [], errors: [] }

    for (const file of files) {
        const route = routeForFile(file.name)
        if (!route) { result.skipped.push(basename(file.name)); continue }
        try {
            const text = await file.text()
            if (route.kind === 'json') {
                try {
                    result.patch[route.key] = JSON.parse(text) as any
                } catch {
                    result.errors.push(`${basename(file.name)} is not valid JSON.`)
                    continue
                }
            } else {
                result.patch[route.key] = text as any
            }
            result.accepted.push(`${basename(file.name)} → ${route.what}`)
        } catch {
            result.errors.push(`Could not read ${basename(file.name)}.`)
        }
    }
    return result
}
