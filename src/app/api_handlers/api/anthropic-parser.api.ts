'use client'

import { IApiParams } from '../api.interface'
import { apiClient } from '../api_client'
import { ApiMethod } from '../api_methods.enum'
import { AnthropicParserAPIRoutes } from '../api_routes.enums'

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
 * Partial write — `title` and/or `updated` (problem_statement / test_summary
 * overrides) and/or `answers` (the reviewer's saved form). `original` is never
 * sent here; it's write-once, set only at creation.
 */
export async function updateAnthropicTask(id: string, body: { title?: string; updated?: any; answers?: any }) {
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
