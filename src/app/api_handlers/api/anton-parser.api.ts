'use client'

import { IApiParams } from '../api.interface'
import { apiClient } from '../api_client'
import { ApiMethod } from '../api_methods.enum'
import { AntonParserAPIRoutes } from '../api_routes.enums'

// Mirrors ANTON_TASK_STATUSES on the backend (freelance-hub-api/src/anton_parser/anton-task.model.ts)
// — the workflow order the status dropdown and filter both use.
export const ANTON_TASK_STATUSES = [
    'Seeded',
    'Pre-Claim',
    'Claimable',
    'Need To Submit',
    'Assigned To Someone Else',
    'Submitted',
    'Submit For QA',
    'Required Revision',
    'Awaiting Audit',
    'Flagged',
    'Approved',
    'Rejected',
] as const
export type AntonTaskStatus = typeof ANTON_TASK_STATUSES[number]
export const DEFAULT_ANTON_TASK_STATUS: AntonTaskStatus = 'Need To Submit'

/** `assignee`: 'all' (default) → every task, 'none' → unassigned only, else a userid. */
export async function getAntonTasks(assignee: string = 'all') {
    const params: IApiParams = { query: { assignee } }
    return await apiClient(AntonParserAPIRoutes.GET_TASKS, ApiMethod.GET, undefined, params, undefined, true, false)
}

/** Distinct users tasks are actually assigned to — for the assignee filter. */
export async function getAntonAssignees() {
    return await apiClient(AntonParserAPIRoutes.GET_ASSIGNEES, ApiMethod.GET, undefined, undefined, undefined, false, false)
}

export async function createAntonTask(data: any) {
    return await apiClient(AntonParserAPIRoutes.CREATE_TASK, ApiMethod.POST, { data }, undefined, undefined, true, true)
}

export async function getAntonTask(id: string) {
    const params: IApiParams = { path: { id } }
    return await apiClient(AntonParserAPIRoutes.GET_TASK, ApiMethod.GET, undefined, params, undefined, true, false)
}

/**
 * `newVersion: true` marks this write as a fresh file upload — the backend snapshots
 * it as the next version instead of updating the current one in place. Omit it (the
 * default) for ordinary field edits/autosave.
 */
export async function updateAntonTask(id: string, data: any, opts?: { newVersion?: boolean }) {
    const params: IApiParams = { path: { id } }
    const body: any = { data }
    if (opts?.newVersion) body.new_version = true
    return await apiClient(AntonParserAPIRoutes.UPDATE_TASK, ApiMethod.PUT, body, params, undefined, false, false)
}

export async function deleteAntonTask(id: string) {
    const params: IApiParams = { path: { id } }
    return await apiClient(AntonParserAPIRoutes.DELETE_TASK, ApiMethod.DELETE, undefined, params, undefined, true, true)
}

/**
 * Task tab — saves the raw trajectory logs (model_a_log.json /
 * model_b_log.json) and their optional .patch text onto the same task
 * row, through the same update endpoint. Only the keys sent are written,
 * so this never disturbs the rubric `data` blob and the rubric autosave
 * never carries a log.
 */
export async function saveAntonTaskTrajectory(
    id: string,
    body: { trajectory_a?: any; trajectory_b?: any; patch_a?: string | null; patch_b?: string | null },
) {
    const params: IApiParams = { path: { id } }
    return await apiClient(AntonParserAPIRoutes.UPDATE_TASK, ApiMethod.PUT, body, params, undefined, true, false)
}

/**
 * Workflow status — its own column on the same task row, written directly
 * (not wrapped under `data`) through the same update endpoint.
 */
export async function setAntonTaskStatus(id: string, status: AntonTaskStatus) {
    const params: IApiParams = { path: { id } }
    return await apiClient(AntonParserAPIRoutes.UPDATE_TASK, ApiMethod.PUT, { status }, params, undefined, true, false)
}

/**
 * Assigned annotator — its own column, written directly through the same update
 * endpoint. Admin-only server-side; pass `null` to unassign.
 */
export async function setAntonTaskAssignee(id: string, assignedTo: string | null) {
    const params: IApiParams = { path: { id } }
    return await apiClient(AntonParserAPIRoutes.UPDATE_TASK, ApiMethod.PUT, { assigned_to: assignedTo }, params, undefined, true, false)
}
