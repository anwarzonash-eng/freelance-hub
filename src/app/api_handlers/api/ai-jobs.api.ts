'use client'

import { IApiParams } from '../api.interface'
import { apiClient } from '../api_client'
import { ApiMethod } from '../api_methods.enum'
import { AiJobsAPIRoutes } from '../api_routes.enums'

export async function getAllAiJobs(filters?: any) {
    const params: IApiParams = {}
    if (filters) {
        params.query = {}
        const keys = ['source', 'status', 'is_active', 'referral_enabled', 'category', 'work_arrangement', 'commitment', 'search', 'page', 'limit', 'date_filter', 'date_from', 'date_to']
        keys.forEach((k) => {
            if (filters[k] !== undefined && filters[k] !== null && filters[k] !== '') {
                params.query![k] = filters[k]
            }
        })
    }
    return await apiClient(AiJobsAPIRoutes.GET_ALL, ApiMethod.GET, undefined, params, undefined, true, false)
}

export async function getAiJob(id: string) {
    const params: IApiParams = { path: { id } }
    return await apiClient(AiJobsAPIRoutes.GET_BY_ID, ApiMethod.GET, undefined, params, undefined, true, false)
}

export async function createAiJob(payload: any) {
    return await apiClient(AiJobsAPIRoutes.CREATE, ApiMethod.POST, payload, undefined, undefined, true, true)
}

export async function updateAiJob(id: string, payload: any) {
    const params: IApiParams = { path: { id } }
    return await apiClient(AiJobsAPIRoutes.UPDATE, ApiMethod.PUT, payload, params, undefined, true, true)
}

export async function deleteAiJob(id: string) {
    const params: IApiParams = { path: { id } }
    return await apiClient(AiJobsAPIRoutes.DELETE, ApiMethod.DELETE, undefined, params, undefined, true, true)
}

export async function importMercorJobs(payload: any) {
    return await apiClient(AiJobsAPIRoutes.IMPORT_MERCOR, ApiMethod.POST, payload, undefined, undefined, true, false)
}

export async function importAlignerJobs(payload: any) {
    return await apiClient(AiJobsAPIRoutes.IMPORT_ALIGNER, ApiMethod.POST, payload, undefined, undefined, true, false)
}

export async function syncMercorReferrals(token: string) {
    return await apiClient(AiJobsAPIRoutes.SYNC_MERCOR, ApiMethod.POST, { token }, undefined, undefined, true, false)
}
