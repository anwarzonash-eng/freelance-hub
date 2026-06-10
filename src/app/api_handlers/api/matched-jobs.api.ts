'use client'

import { IApiParams } from '../api.interface'
import { apiClient } from '../api_client'
import { ApiMethod } from '../api_methods.enum'
import { MatchedJobsAPIRoutes } from '../api_routes.enums'

export async function saveBatchMatches(payload: { professional_id: string; matches: any[] }) {
    return await apiClient(MatchedJobsAPIRoutes.SAVE_BATCH, ApiMethod.POST, payload, undefined, undefined, true, true)
}

export async function getMatchedJobsByProfessional(professional_id: string) {
    const params: IApiParams = { query: { professional_id } }
    return await apiClient(MatchedJobsAPIRoutes.GET_BY_PROFESSIONAL, ApiMethod.GET, undefined, params, undefined, true, false)
}

export async function deleteMatchedJob(id: string) {
    const params: IApiParams = { path: { id } }
    return await apiClient(MatchedJobsAPIRoutes.DELETE, ApiMethod.DELETE, undefined, params, undefined, true, true)
}
