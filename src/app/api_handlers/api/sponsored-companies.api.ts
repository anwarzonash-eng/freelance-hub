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

export async function manualCheckCompany(id: string, body: any) {
    return apiClient(SponsoredCompaniesAPIRoutes.MANUAL_CHECK, ApiMethod.PATCH, body, { path: { id } }, {}, true)
}

export async function assignCompanies(body: { filters: any; assignments: { userId: string; count: number }[] }) {
    return apiClient(SponsoredCompaniesAPIRoutes.ASSIGN, ApiMethod.POST, body, undefined, {}, true)
}

export async function rawQueryCompanies(body: { where_clause?: string; page?: number; limit?: number; export_all?: boolean }) {
    return apiClient(SponsoredCompaniesAPIRoutes.RAW_QUERY, ApiMethod.POST, body)
}

export async function rawQueryCompaniesOrError(body: { where_clause?: string; page?: number; limit?: number; export_all?: boolean }): Promise<{ payload: any; error: string | null }> {
    const base = (process.env.NEXT_PUBLIC_API_PATH ?? '').replace(/\/$/, '')
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
    try {
        const res = await fetch(`${base}/${SponsoredCompaniesAPIRoutes.RAW_QUERY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify(body),
        })
        const json = await res.json()
        if (!res.ok || json.APIStatus === 'error') {
            return { payload: null, error: json.message || 'SQL error' }
        }
        return { payload: json, error: null }
    } catch (e: any) {
        return { payload: null, error: e?.message || 'Network error' }
    }
}
