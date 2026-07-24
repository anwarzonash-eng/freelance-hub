'use client'

import { IApiParams } from '../api.interface'
import { apiClient } from '../api_client'
import { ApiMethod } from '../api_methods.enum'
import { AParseAPIRoutes } from '../api_routes.enums'

// ── Jobs ────────────────────────────────────────────────────────────────────
export async function getAParseJobs() {
    return await apiClient(AParseAPIRoutes.GET_JOBS, ApiMethod.GET, undefined, undefined, undefined, true, false)
}

export async function createAParseJob(name: string, model_link?: string, status?: string) {
    return await apiClient(AParseAPIRoutes.CREATE_JOB, ApiMethod.POST, { name, model_link, status }, undefined, undefined, true, true)
}

export async function updateAParseJob(id: string, payload: { name?: string; model_link?: string; status?: string }) {
    const params: IApiParams = { path: { id } }
    return await apiClient(AParseAPIRoutes.UPDATE_JOB, ApiMethod.PUT, payload, params, undefined, true, true)
}

export async function deleteAParseJob(id: string) {
    const params: IApiParams = { path: { id } }
    return await apiClient(AParseAPIRoutes.DELETE_JOB, ApiMethod.DELETE, undefined, params, undefined, true, true)
}

// ── Turns ───────────────────────────────────────────────────────────────────
export async function getAParseTurns(jobId: string) {
    const params: IApiParams = { path: { jobId } }
    return await apiClient(AParseAPIRoutes.GET_TURNS, ApiMethod.GET, undefined, params, undefined, true, false)
}

export async function createAParseTurn(jobId: string, title?: string) {
    const params: IApiParams = { path: { jobId } }
    return await apiClient(AParseAPIRoutes.CREATE_TURN, ApiMethod.POST, { title }, params, undefined, true, true)
}

export async function getAParseTurn(id: string) {
    const params: IApiParams = { path: { id } }
    return await apiClient(AParseAPIRoutes.GET_TURN, ApiMethod.GET, undefined, params, undefined, true, false)
}

export async function updateAParseTurn(id: string, payload: any) {
    const params: IApiParams = { path: { id } }
    return await apiClient(AParseAPIRoutes.UPDATE_TURN, ApiMethod.PUT, payload, params, undefined, false, false)
}

export async function deleteAParseTurn(id: string) {
    const params: IApiParams = { path: { id } }
    return await apiClient(AParseAPIRoutes.DELETE_TURN, ApiMethod.DELETE, undefined, params, undefined, true, true)
}
