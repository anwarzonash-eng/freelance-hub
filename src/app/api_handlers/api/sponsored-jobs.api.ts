'use client'

import { apiClient } from '../api_client'
import { ApiMethod } from '../api_methods.enum'
import { SponsoredJobsAPIRoutes } from '../api_routes.enums'

export async function getAllJobs(filters?: any) {
    return apiClient(SponsoredJobsAPIRoutes.GET_ALL, ApiMethod.GET, undefined, { query: filters })
}

export async function getDistinctJobValues() {
    return apiClient(SponsoredJobsAPIRoutes.GET_DISTINCT, ApiMethod.GET)
}

export async function upsertJobsForCompany(companyId: string, payload: any) {
    return apiClient(
        SponsoredJobsAPIRoutes.UPSERT_FOR_COMPANY.replace(':companyId', companyId),
        ApiMethod.POST,
        payload,
        undefined,
        {},
        true,
    )
}

export async function updateJob(jobId: number, payload: any) {
    return apiClient(
        SponsoredJobsAPIRoutes.UPDATE.replace(':id', String(jobId)),
        ApiMethod.PUT,
        payload,
        undefined,
        {},
        true,
    )
}

export async function assignJobs(body: { filters: any; assignments: { userId: string; count: number }[] }) {
    return apiClient(SponsoredJobsAPIRoutes.ASSIGN, ApiMethod.POST, body, undefined, {}, true)
}
