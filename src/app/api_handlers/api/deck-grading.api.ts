'use client'

import { IApiParams } from '../api.interface'
import { apiClient } from '../api_client'
import { ApiMethod } from '../api_methods.enum'
import { DeckGradingAPIRoutes } from '../api_routes.enums'

// ── Contributors ──────────────────────────────────────────────────────────────
export async function getDeckContributors() {
    return await apiClient(DeckGradingAPIRoutes.GET_CONTRIBUTORS, ApiMethod.GET, undefined, undefined, undefined, true, false)
}

export async function createDeckContributor(name: string) {
    return await apiClient(DeckGradingAPIRoutes.CREATE_CONTRIBUTOR, ApiMethod.POST, { name }, undefined, undefined, true, false)
}

// ── Tasks ─────────────────────────────────────────────────────────────────────
export async function getDeckTasks(contributor: string = 'all') {
    const params: IApiParams = { query: { contributor } }
    return await apiClient(DeckGradingAPIRoutes.GET_TASKS, ApiMethod.GET, undefined, params, undefined, true, false)
}

export async function getDeckTask(id: string) {
    const params: IApiParams = { path: { id } }
    return await apiClient(DeckGradingAPIRoutes.GET_TASK, ApiMethod.GET, undefined, params, undefined, true, false)
}

export async function createDeckTask(payload: any) {
    return await apiClient(DeckGradingAPIRoutes.CREATE_TASK, ApiMethod.POST, payload, undefined, undefined, true, true)
}

export async function updateDeckTask(id: string, payload: any) {
    const params: IApiParams = { path: { id } }
    return await apiClient(DeckGradingAPIRoutes.UPDATE_TASK, ApiMethod.PUT, payload, params, undefined, false, false)
}

export async function deleteDeckTask(id: string) {
    const params: IApiParams = { path: { id } }
    return await apiClient(DeckGradingAPIRoutes.DELETE_TASK, ApiMethod.DELETE, undefined, params, undefined, true, true)
}

// ── Media (one image per request) ───────────────────────────────────────────────
export async function addDeckTaskMedia(id: string, item: { name: string; dataUrl: string }) {
    const params: IApiParams = { path: { id } }
    return await apiClient(DeckGradingAPIRoutes.ADD_TASK_MEDIA, ApiMethod.POST, item, params, undefined, true, false)
}

export async function deleteDeckTaskMedia(id: string, mediaId: string) {
    const params: IApiParams = { path: { id, mediaId } }
    return await apiClient(DeckGradingAPIRoutes.DELETE_TASK_MEDIA, ApiMethod.DELETE, undefined, params, undefined, true, false)
}
