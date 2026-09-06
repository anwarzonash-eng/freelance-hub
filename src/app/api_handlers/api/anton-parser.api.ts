'use client'

import { IApiParams } from '../api.interface'
import { apiClient } from '../api_client'
import { ApiMethod } from '../api_methods.enum'
import { AntonParserAPIRoutes } from '../api_routes.enums'

export async function getAntonTasks() {
    return await apiClient(AntonParserAPIRoutes.GET_TASKS, ApiMethod.GET, undefined, undefined, undefined, true, false)
}

export async function createAntonTask(data: any) {
    return await apiClient(AntonParserAPIRoutes.CREATE_TASK, ApiMethod.POST, { data }, undefined, undefined, true, true)
}

export async function getAntonTask(id: string) {
    const params: IApiParams = { path: { id } }
    return await apiClient(AntonParserAPIRoutes.GET_TASK, ApiMethod.GET, undefined, params, undefined, true, false)
}

export async function updateAntonTask(id: string, data: any) {
    const params: IApiParams = { path: { id } }
    return await apiClient(AntonParserAPIRoutes.UPDATE_TASK, ApiMethod.PUT, { data }, params, undefined, false, false)
}

export async function deleteAntonTask(id: string) {
    const params: IApiParams = { path: { id } }
    return await apiClient(AntonParserAPIRoutes.DELETE_TASK, ApiMethod.DELETE, undefined, params, undefined, true, true)
}
