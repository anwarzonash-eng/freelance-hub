'use client'

import { IApiParams } from "../api.interface"
import { apiClient } from "../api_client"
import { ApiMethod } from "../api_methods.enum"
import { CategoriesAPIRoutes } from "../api_routes.enums"



export async function addCategory(payload: any) {
    return await apiClient(CategoriesAPIRoutes.ADD, ApiMethod.POST, payload, undefined, undefined, true, true)
}




