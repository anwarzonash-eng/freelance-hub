'use client'

import { IApiParams } from '../api.interface'
import { apiClient } from '../api_client'
import { ApiMethod } from '../api_methods.enum'
import { EmailCampaignsAPIRoutes } from '../api_routes.enums'

export async function queueEmailBatch(ids: string[]) {
    return await apiClient(EmailCampaignsAPIRoutes.QUEUE_BATCH, ApiMethod.POST, { ids }, undefined, undefined, true, true)
}

export async function rebalanceEmailQueue() {
    return await apiClient(EmailCampaignsAPIRoutes.REBALANCE_QUEUE, ApiMethod.POST, {}, undefined, undefined, true, true)
}

export async function getEmailCampaignStats() {
    return await apiClient(EmailCampaignsAPIRoutes.GET_STATS, ApiMethod.GET, undefined, undefined, undefined, true, false)
}

export async function getAllEmailCampaigns(filters?: any) {
    const params: IApiParams = {}
    if (filters) {
        params.query = {}
        const keys = ['email_type', 'status', 'email_gateway_ids', 'page', 'limit']
        keys.forEach(k => {
            if (filters[k] !== undefined && filters[k] !== null && filters[k] !== '') {
                params.query![k] = filters[k]
            }
        })
    }
    return await apiClient(EmailCampaignsAPIRoutes.GET_ALL, ApiMethod.GET, undefined, params, undefined, true, false)
}

export async function saveBatchEmails(payload: { emails: any[] }) {
    return await apiClient(EmailCampaignsAPIRoutes.SAVE_BATCH, ApiMethod.POST, payload, undefined, undefined, true, true)
}

export async function getEmailsByProfessional(professional_id: string) {
    const params: IApiParams = { query: { professional_id } }
    return await apiClient(EmailCampaignsAPIRoutes.GET_BY_PROFESSIONAL, ApiMethod.GET, undefined, params, undefined, true, false)
}

export async function updateEmailStatus(id: string, status: string) {
    const params: IApiParams = { path: { id } }
    return await apiClient(EmailCampaignsAPIRoutes.UPDATE_STATUS, ApiMethod.PATCH, { status }, params, undefined, true, true)
}
