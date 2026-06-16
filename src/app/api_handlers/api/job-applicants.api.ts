'use client'

import { apiClient } from '../api_client'
import { ApiMethod } from '../api_methods.enum'
import { JobApplicantsAPIRoutes } from '../api_routes.enums'

export async function getAllApplicants(filters?: any) {
    return apiClient(JobApplicantsAPIRoutes.GET_ALL, ApiMethod.GET, undefined, { query: filters })
}

export async function getApplicantById(id: number) {
    return apiClient(JobApplicantsAPIRoutes.GET_BY_ID.replace(':id', String(id)), ApiMethod.GET)
}

export async function createApplicant(data: any) {
    return apiClient(JobApplicantsAPIRoutes.CREATE, ApiMethod.POST, data, undefined, {}, true, true)
}

export async function updateApplicant(id: number, data: any) {
    return apiClient(JobApplicantsAPIRoutes.UPDATE.replace(':id', String(id)), ApiMethod.PUT, data, undefined, {}, true, true)
}

export async function deleteApplicant(id: number) {
    return apiClient(JobApplicantsAPIRoutes.DELETE.replace(':id', String(id)), ApiMethod.DELETE, undefined, undefined, {}, true)
}
