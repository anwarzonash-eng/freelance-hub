'use client'

import { IApiParams } from '../api.interface'
import { apiClient } from '../api_client'
import { ApiMethod } from '../api_methods.enum'
import { AnthropicParserAPIRoutes } from '../api_routes.enums'

// Mirrors ANTHROPIC_TASK_STATUSES on the backend (freelance-hub-api/src/anthropic_parser/anthropic-task.model.ts).
export const ANTHROPIC_TASK_STATUSES = ['Under Review', 'Failed', 'Passed'] as const
export type AnthropicTaskStatus = typeof ANTHROPIC_TASK_STATUSES[number]
export const DEFAULT_ANTHROPIC_TASK_STATUS: AnthropicTaskStatus = 'Under Review'
// Shared between the task editor's header dropdown and the list page's badge/filter.
export const ANTHROPIC_STATUS_STYLE: Record<AnthropicTaskStatus, string> = {
    'Under Review': 'bg-amber-50 text-amber-700 border-amber-300',
    Failed: 'bg-rose-50 text-rose-700 border-rose-300',
    Passed: 'bg-green-50 text-green-700 border-green-300',
}

export async function getAnthropicTasks() {
    return await apiClient(AnthropicParserAPIRoutes.GET_TASKS, ApiMethod.GET, undefined, undefined, undefined, true, false)
}

/** Creation IS the original.json upload — there's no separate title/link step,
 *  the file itself carries the title (display_title / pair_id). */
export async function createAnthropicTask(original: any) {
    return await apiClient(AnthropicParserAPIRoutes.CREATE_TASK, ApiMethod.POST, { original }, undefined, undefined, true, true)
}

export async function getAnthropicTask(id: string) {
    const params: IApiParams = { path: { id } }
    return await apiClient(AnthropicParserAPIRoutes.GET_TASK, ApiMethod.GET, undefined, params, undefined, true, false)
}

/**
 * Partial write — any of `title`, `updated` (problem_statement / test_summary
 * overrides), `answers` (the reviewer's saved form), or the tracking metadata
 * (`pair_id`, `track_time`, `submit_minutes`, `status`, `feedback`). `original`
 * is never sent here; it's write-once, set only at creation.
 */
export async function updateAnthropicTask(id: string, body: {
    title?: string
    updated?: any
    answers?: any
    pair_id?: string | null
    track_time?: number | null
    submit_minutes?: number | null
    status?: AnthropicTaskStatus
    feedback?: string | null
}) {
    const params: IApiParams = { path: { id } }
    return await apiClient(AnthropicParserAPIRoutes.UPDATE_TASK, ApiMethod.PUT, body, params, undefined, false, false)
}

/** Rename the task — its own call so the list/editor can save just this, with
 *  a normal success/error toast (unlike the silent autosave update above). */
export async function setAnthropicTaskTitle(id: string, title: string) {
    const params: IApiParams = { path: { id } }
    return await apiClient(AnthropicParserAPIRoutes.UPDATE_TASK, ApiMethod.PUT, { title }, params, undefined, true, false)
}

export async function deleteAnthropicTask(id: string) {
    const params: IApiParams = { path: { id } }
    return await apiClient(AnthropicParserAPIRoutes.DELETE_TASK, ApiMethod.DELETE, undefined, params, undefined, true, true)
}
