'use client'

import { IApiParams } from '../api.interface'
import { apiClient } from '../api_client'
import { ApiMethod } from '../api_methods.enum'
import { ProfessionalsAPIRoutes } from '../api_routes.enums'

export async function getAllProfessionals(filters?: any) {
    const params: IApiParams = {}

    if (filters) {
        params.query = {}
        const keys = ['search_name', 'search_email', 'search_phone', 'designation', 'qualification', 'status', 'country', 'is_email_verified', 'page', 'limit']
        keys.forEach((k) => {
            if (filters[k] !== undefined && filters[k] !== null && filters[k] !== '') {
                params.query![k] = filters[k]
            }
        })
    }

    return await apiClient(ProfessionalsAPIRoutes.GET_ALL, ApiMethod.GET, undefined, params, undefined, true, false)
}

export async function createProfessional(payload: any) {
    return await apiClient(ProfessionalsAPIRoutes.CREATE, ApiMethod.POST, payload, undefined, undefined, true, true)
}

export async function updateProfessional(payload: any, id: string) {
    const params: IApiParams = { path: { id } }
    return await apiClient(ProfessionalsAPIRoutes.UPDATE, ApiMethod.PUT, payload, params, undefined, true, true)
}

export async function deleteProfessional(id: string) {
    const params: IApiParams = { path: { id } }
    return await apiClient(ProfessionalsAPIRoutes.DELETE, ApiMethod.DELETE, undefined, params, undefined, true, true)
}
