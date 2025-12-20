'use client'

import { IApiParams } from "../api.interface"
import { apiClient } from "../api_client"
import { ApiMethod } from "../api_methods.enum"
import { MainProfilesAPIRoutes } from "../api_routes.enums"


export async function getALLMainProfiles() {
    return await apiClient(MainProfilesAPIRoutes.GET_ALL, ApiMethod.GET, undefined, undefined, undefined, true, false)
}

export async function createMainProfile(payload: any) {
    return await apiClient('main-profiles', ApiMethod.POST, payload, undefined, undefined, true, true);
}

export async function updateMainProfile(payload: any, id: string) {
    return await apiClient(`main-profiles/${id}`, ApiMethod.PUT, payload, undefined, undefined, true, true);
}

export async function deleteMainProfile(id: string) {
    return await apiClient(`main-profiles/${id}`, ApiMethod.DELETE, undefined, undefined, undefined, true, true);
}






