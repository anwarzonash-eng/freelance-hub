'use client'

import { IApiParams } from "../api.interface"
import { apiClient } from "../api_client"
import { ApiMethod } from "../api_methods.enum"
import { CategoriesAPIRoutes } from "../api_routes.enums"

export async function addCategory(payload: any) {
    return await apiClient(CategoriesAPIRoutes.ADD, ApiMethod.POST, payload, undefined, undefined, true, true)
}

export async function addBulkCategories(payload: any[]) {
    return await apiClient(CategoriesAPIRoutes.ADD_BULK, ApiMethod.POST, payload, undefined, undefined, true, true)
}

export async function getAllCategories() {
    return await apiClient(CategoriesAPIRoutes.GET_ALL, ApiMethod.GET, undefined, undefined, undefined, true, false)
}

export async function getCategoryByID(params: IApiParams) {
    return await apiClient(CategoriesAPIRoutes.GET_BY_ID, ApiMethod.GET, undefined, params, undefined, true, false)
}

export async function updateCategoryByID(payload: any, params: IApiParams) {
    return await apiClient(CategoriesAPIRoutes.UPDATE, ApiMethod.PUT, payload, params, undefined, true, true)
}

export async function deleteCategoryByID(params: IApiParams) {
    return await apiClient(CategoriesAPIRoutes.DELETE, ApiMethod.DELETE, undefined, params, undefined, true, true)
}

export async function hardDeleteCategoryByID(params: IApiParams) {
    return await apiClient(CategoriesAPIRoutes.HARD_DELETE, ApiMethod.DELETE, undefined, params, undefined, true, true)
}




