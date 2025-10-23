'use client'

import { IApiParams } from "../api.interface"
import { apiClient } from "../api_client"
import { ApiMethod } from "../api_methods.enum"
import { MainProfilesAPIRoutes } from "../api_routes.enums"

export async function getALLMainProfiles() {
    return await apiClient(MainProfilesAPIRoutes.GET_ALL, ApiMethod.GET, undefined, undefined, undefined, true, false)
}






