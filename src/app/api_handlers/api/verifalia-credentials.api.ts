'use client'

import { IApiParams } from '../api.interface'
import { apiClient } from '../api_client'
import { ApiMethod } from '../api_methods.enum'
import { VerifaliaCredentialsAPIRoutes } from '../api_routes.enums'

export async function getAllVerifaliaCredentials() {
    return await apiClient(VerifaliaCredentialsAPIRoutes.GET_ALL, ApiMethod.GET, undefined, undefined, undefined, true, false)
}

export async function createVerifaliaCredential(payload: { label: string; username: string; password: string; priority?: number }) {
    return await apiClient(VerifaliaCredentialsAPIRoutes.CREATE, ApiMethod.POST, payload, undefined, undefined, true, true)
}

export async function updateVerifaliaCredential(id: string, payload: { label?: string; username?: string; password?: string; priority?: number; is_active?: boolean }) {
    const params: IApiParams = { path: { id } }
    return await apiClient(VerifaliaCredentialsAPIRoutes.UPDATE, ApiMethod.PUT, payload, params, undefined, true, true)
}

export async function deleteVerifaliaCredential(id: string) {
    const params: IApiParams = { path: { id } }
    return await apiClient(VerifaliaCredentialsAPIRoutes.DELETE, ApiMethod.DELETE, undefined, params, undefined, true, true)
}

export async function checkVerifaliaBalance(id: string) {
    const params: IApiParams = { path: { id } }
    return await apiClient(VerifaliaCredentialsAPIRoutes.CHECK_BALANCE, ApiMethod.POST, {}, params, undefined, true, true)
}
