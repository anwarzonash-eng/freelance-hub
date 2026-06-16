'use client'

import { apiClient } from '../api_client'
import { ApiMethod } from '../api_methods.enum'
import { SponsoredCompaniesAPIRoutes } from '../api_routes.enums'

export async function getAllCompanies(filters?: any) {
    return apiClient(SponsoredCompaniesAPIRoutes.GET_ALL, ApiMethod.GET, undefined, { query: filters })
}

export async function getDistinctCompanyValues() {
    return apiClient(SponsoredCompaniesAPIRoutes.GET_DISTINCT, ApiMethod.GET)
}

export async function createCompany(data: any) {
    return apiClient(SponsoredCompaniesAPIRoutes.CREATE, ApiMethod.POST, data, undefined, {}, true, true)
}

export async function updateCompany(id: string, data: any) {
    return apiClient(SponsoredCompaniesAPIRoutes.UPDATE, ApiMethod.PUT, data, { path: { id } }, {}, true, true)
}

export async function deleteCompany(id: string) {
    return apiClient(SponsoredCompaniesAPIRoutes.DELETE, ApiMethod.DELETE, undefined, { path: { id } }, {}, true)
}

export async function upsertCompaniesFromJson(companies: any[]) {
    return apiClient(SponsoredCompaniesAPIRoutes.UPSERT_JSON, ApiMethod.POST, { companies }, undefined, {}, true)
}
