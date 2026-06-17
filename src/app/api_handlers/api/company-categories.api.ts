'use client'

import { apiClient } from '../api_client'
import { ApiMethod } from '../api_methods.enum'
import { CompanyCategoriesAPIRoutes } from '../api_routes.enums'

export async function getCompanyCategories() {
    return apiClient(CompanyCategoriesAPIRoutes.GET_ALL, ApiMethod.GET)
}

export async function createCompanyCategory(body: { name: string }) {
    return apiClient(CompanyCategoriesAPIRoutes.CREATE, ApiMethod.POST, body, undefined, {}, true)
}

export async function updateCompanyCategory(id: string, body: { name: string }) {
    return apiClient(CompanyCategoriesAPIRoutes.UPDATE, ApiMethod.PUT, body, { path: { id } }, {}, true)
}

export async function deleteCompanyCategory(id: string) {
    return apiClient(CompanyCategoriesAPIRoutes.DELETE, ApiMethod.DELETE, undefined, { path: { id } }, {}, true)
}
