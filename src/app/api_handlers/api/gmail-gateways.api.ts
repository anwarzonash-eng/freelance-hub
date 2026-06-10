'use client'

import { IApiParams } from '../api.interface'
import { apiClient } from '../api_client'
import { ApiMethod } from '../api_methods.enum'
import { GmailGatewaysAPIRoutes } from '../api_routes.enums'

export async function getAllGmailGateways() {
    return await apiClient(GmailGatewaysAPIRoutes.GET_ALL, ApiMethod.GET, undefined, undefined, undefined, true, false)
}

export async function createGmailGateway(payload: { label: string }) {
    return await apiClient(GmailGatewaysAPIRoutes.CREATE, ApiMethod.POST, payload, undefined, undefined, true, true)
}

export async function updateGmailGateway(id: string, payload: { label: string; max_emails_per_day?: number | null }) {
    const params: IApiParams = { path: { id } }
    return await apiClient(GmailGatewaysAPIRoutes.UPDATE, ApiMethod.PUT, payload, params, undefined, true, true)
}

export async function deleteGmailGateway(id: string) {
    const params: IApiParams = { path: { id } }
    return await apiClient(GmailGatewaysAPIRoutes.DELETE, ApiMethod.DELETE, undefined, params, undefined, true, true)
}

export async function getGmailAuthUrl(id: string) {
    const params: IApiParams = { path: { id } }
    return await apiClient(GmailGatewaysAPIRoutes.GET_AUTH_URL, ApiMethod.GET, undefined, params, undefined, true, false)
}

export async function testGmailGateway(id: string) {
    const params: IApiParams = { path: { id } }
    return await apiClient(GmailGatewaysAPIRoutes.TEST, ApiMethod.POST, {}, params, undefined, true, true)
}

export async function sendEmailViaGateway(id: string, payload: { to: string | string[]; subject: string; html: string; replyTo?: string }) {
    const params: IApiParams = { path: { id } }
    return await apiClient(GmailGatewaysAPIRoutes.SEND, ApiMethod.POST, payload, params, undefined, true, true)
}

export async function getGmailInbox(id: string, q?: string, maxResults?: number) {
    const params: IApiParams = { path: { id }, query: {} }
    if (q) params.query!.q = q
    if (maxResults) params.query!.maxResults = maxResults
    return await apiClient(GmailGatewaysAPIRoutes.INBOX, ApiMethod.GET, undefined, params, undefined, true, false)
}
