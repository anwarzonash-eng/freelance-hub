'use client'

import { IApiParams } from "../api.interface"
import { apiClient } from "../api_client"
import { ApiMethod } from "../api_methods.enum"
import { AuthAPIRoutes } from "../api_routes.enums"

export async function login(payload: any) {
    return await apiClient(AuthAPIRoutes.LOGIN, ApiMethod.POST, payload, undefined, undefined, true, false)
}

