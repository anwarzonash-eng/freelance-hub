'use client'

import { IApiParams } from '../api.interface'
import { apiClient } from '../api_client'
import { ApiMethod } from '../api_methods.enum'
import { EmailNotificationsAPIRoutes } from '../api_routes.enums'

export async function getRecentNotifications(limit = 10) {
    const params: IApiParams = { query: { limit } }
    return await apiClient(EmailNotificationsAPIRoutes.GET_RECENT, ApiMethod.GET, undefined, params, undefined, true, false)
}

export async function getAllNotifications(filters?: any) {
    const params: IApiParams = {}
    if (filters) {
        params.query = {}
        const keys = ['type', 'email_type', 'page', 'limit']
        keys.forEach(k => {
            if (filters[k] !== undefined && filters[k] !== null && filters[k] !== '') {
                params.query![k] = filters[k]
            }
        })
    }
    return await apiClient(EmailNotificationsAPIRoutes.GET_ALL, ApiMethod.GET, undefined, params, undefined, true, false)
}

export async function markNotificationsRead() {
    return await apiClient(EmailNotificationsAPIRoutes.MARK_READ, ApiMethod.PATCH, {}, undefined, undefined, true, false)
}
