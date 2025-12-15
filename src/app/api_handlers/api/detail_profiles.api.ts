'use client'

import { IApiParams } from "../api.interface"
import { apiClient } from "../api_client"
import { ApiMethod } from "../api_methods.enum"
import { DetailProfilesAPIRoutes } from "../api_routes.enums"

export async function getAllDetailProfiles() {
    return await apiClient(DetailProfilesAPIRoutes.GET_ALL, ApiMethod.GET, undefined, undefined, undefined, true, true, process.env.NEXT_PUBLIC_API_PATH)
}

export async function getDetailProfileByID(params: IApiParams) {
    return await apiClient(DetailProfilesAPIRoutes.GET_BY_ID, ApiMethod.GET, undefined, params, undefined, true, true, process.env.NEXT_PUBLIC_API_PATH)
}

export async function createDetailProfile(payload: any) {
    return await apiClient(DetailProfilesAPIRoutes.CREATE, ApiMethod.POST, payload, undefined, undefined, true, true, process.env.NEXT_PUBLIC_API_PATH)
}

export async function updateDetailProfile(payload: any, params: IApiParams) {
    return await apiClient(DetailProfilesAPIRoutes.UPDATE, ApiMethod.PUT, payload, params, undefined, true, true, process.env.NEXT_PUBLIC_API_PATH)
}

export async function generatePDF(payload: any) {
    return await apiClient(DetailProfilesAPIRoutes.GENERATE_PDF, ApiMethod.POST, payload, undefined, undefined, true, true, process.env.NEXT_PUBLIC_API_PATH_SERVER_2)
}