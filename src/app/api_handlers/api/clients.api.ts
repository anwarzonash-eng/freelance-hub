'use client'

import { IApiParams } from '../api.interface'
import { apiClient } from '../api_client'
import { ApiMethod } from '../api_methods.enum'
import { ClientsAPIRoutes } from '../api_routes.enums'

export async function getAllClients(filters?: any) {
    const params: IApiParams = {}
    if (filters) {
        params.query = {}
        const keys = ['search_name', 'search_company', 'search_email', 'source', 'contract_status', 'country', 'date_filter', 'date_from', 'date_to', 'page', 'limit']
        keys.forEach((k) => {
            if (filters[k] !== undefined && filters[k] !== null && filters[k] !== '') {
                params.query![k] = filters[k]
            }
        })
    }
    return await apiClient(ClientsAPIRoutes.GET_ALL, ApiMethod.GET, undefined, params, undefined, true, false)
}

export async function createClient(payload: any) {
    return await apiClient(ClientsAPIRoutes.CREATE, ApiMethod.POST, payload, undefined, undefined, true, true)
}

export async function updateClient(payload: any, id: string) {
    const params: IApiParams = { path: { id } }
    return await apiClient(ClientsAPIRoutes.UPDATE, ApiMethod.PUT, payload, params, undefined, true, true)
}

export async function logClientFollowup(id: string, payload: { message: string; notes: string }) {
    const params: IApiParams = { path: { id } }
    return await apiClient(ClientsAPIRoutes.LOG_FOLLOWUP, ApiMethod.POST, payload, params, undefined, true, true)
}

export async function deleteClient(id: string) {
    const params: IApiParams = { path: { id } }
    return await apiClient(ClientsAPIRoutes.DELETE, ApiMethod.DELETE, undefined, params, undefined, true, true)
}
