'use client'

import { IApiParams } from "../api.interface"
import { apiClient } from "../api_client"
import { ApiMethod } from "../api_methods.enum"
import { NewsLettersAPIRoutes } from "../api_routes.enums"

export async function getALLNewsLetters() {
    return await apiClient(NewsLettersAPIRoutes.GET_ALL, ApiMethod.GET, undefined, undefined, undefined, true, false)
}

export async function getNewsLettersByID(params: IApiParams) {
    return await apiClient(NewsLettersAPIRoutes.GET_BY_ID, ApiMethod.GET, undefined, params, undefined, true, false)
}

export async function addNewsLettersByID(payload: any) {
    return await apiClient(NewsLettersAPIRoutes.ADD, ApiMethod.POST, payload, undefined, undefined, true, false)
}

export async function updateNewsLettersByID(payload: any, params: IApiParams) {
    return await apiClient(NewsLettersAPIRoutes.UPDATE, ApiMethod.PUT, payload, params, undefined, true, false)
}

export async function deleteNewsLettersByID(params: IApiParams) {
    return await apiClient(NewsLettersAPIRoutes.DELETE, ApiMethod.DELETE, undefined, params, undefined, true, false)
}