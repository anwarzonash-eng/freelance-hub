'use client'

import { IApiParams } from "../api.interface"
import { apiClient } from "../api_client"
import { ApiMethod } from "../api_methods.enum"
import { FAQAPIRoutes, NewsLettersAPIRoutes } from "../api_routes.enums"

export async function getALLFAQs() {
    return await apiClient(FAQAPIRoutes.GET_ALL, ApiMethod.GET, undefined, undefined, undefined, true, false)
}

export async function addFAQs(payload: any) {
    return await apiClient(FAQAPIRoutes.ADD, ApiMethod.POST, payload, undefined, undefined, true, false)
}

export async function updateFAQsByID(payload: any, params: IApiParams) {

    return await apiClient(FAQAPIRoutes.UPDATE, ApiMethod.PUT, payload, params, undefined, true, false)
}

export async function deleteFAQsByID(params: IApiParams) {
    return await apiClient(FAQAPIRoutes.DELETE, ApiMethod.DELETE, undefined, params, undefined, true, false)
}