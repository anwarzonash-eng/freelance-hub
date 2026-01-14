'use client'

import { IApiParams } from "../api.interface"
import { apiClient } from "../api_client"
import { ApiMethod } from "../api_methods.enum"
import { LeadsAPIRoutes } from "../api_routes.enums"

export async function getALLLeads(queryParam: IApiParams) {
    return await apiClient(LeadsAPIRoutes.GET_ALL, ApiMethod.GET, undefined, queryParam, undefined, true, false)
}
export async function addNewLead(payload: any) {
    return await apiClient(LeadsAPIRoutes.ADD, ApiMethod.POST, payload, undefined, undefined, true, true)
}
export async function addBulkNewLead(payload: any) {
    return await apiClient(LeadsAPIRoutes.ADD_BULK, ApiMethod.POST, payload, undefined, undefined, true, true)
}
export async function deleteBulkLead(payload: any) {
    return await apiClient(LeadsAPIRoutes.DELETE_BULK, ApiMethod.DELETE, payload, undefined, undefined, true, true)
}