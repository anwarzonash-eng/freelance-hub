'use client'

import { apiClient } from '../api_client'
import { ApiMethod } from '../api_methods.enum'
import { JobCVsAPIRoutes } from '../api_routes.enums'

export async function getAllCVs(filters?: any) {
    return apiClient(JobCVsAPIRoutes.GET_ALL, ApiMethod.GET, undefined, { query: filters })
}

export async function getCVById(id: number) {
    return apiClient(JobCVsAPIRoutes.GET_BY_ID.replace(':id', String(id)), ApiMethod.GET)
}

export async function createCV(data: any) {
    return apiClient(JobCVsAPIRoutes.CREATE, ApiMethod.POST, data, undefined, {}, true, true)
}

export async function updateCV(id: number, data: any) {
    return apiClient(JobCVsAPIRoutes.UPDATE.replace(':id', String(id)), ApiMethod.PUT, data, undefined, {}, true, true)
}

// Silent variant used by auto-save — no toast notifications.
export async function updateCVSilent(id: number, data: any) {
    return apiClient(JobCVsAPIRoutes.UPDATE.replace(':id', String(id)), ApiMethod.PUT, data, undefined, {}, false, false)
}

export async function deleteCV(id: number) {
    return apiClient(JobCVsAPIRoutes.DELETE.replace(':id', String(id)), ApiMethod.DELETE, undefined, undefined, {}, true)
}
