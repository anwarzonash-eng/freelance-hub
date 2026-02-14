
'use client'

import { IApiParams } from "../api.interface"
import { apiClient } from "../api_client"
import { ApiMethod } from "../api_methods.enum"
import { AuthAPIRoutes } from "../api_routes.enums"

export async function login(payload: any) {
    return await apiClient(AuthAPIRoutes.LOGIN, ApiMethod.POST, payload, undefined, undefined, true, false)
}

export async function listAuthUsers() {
    return await apiClient(AuthAPIRoutes.LIST, ApiMethod.GET, undefined, undefined, undefined, true, false);
}

export async function addAuthUser(payload: any) {
    return await apiClient(AuthAPIRoutes.ADD, ApiMethod.POST, payload, undefined, undefined, true, false);
}

export async function updateAuthUser(payload: any, params: IApiParams) {
    return await apiClient(AuthAPIRoutes.UPDATE, ApiMethod.PUT, payload, params, undefined, true, false);
}

export async function deleteAuthUser(params: IApiParams) {
    return await apiClient(AuthAPIRoutes.DELETE, ApiMethod.DELETE, undefined, params, undefined, true, false);
}

