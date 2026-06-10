'use client'

import { apiClient } from '../api_client'
import { ApiMethod } from '../api_methods.enum'
import { GlobalSettingsAPIRoutes } from '../api_routes.enums'

export async function getGlobalSettings() {
    return await apiClient(GlobalSettingsAPIRoutes.GET, ApiMethod.GET, undefined, undefined, undefined, true, false)
}

export async function updateGmailSchedulerEnabled(enabled: boolean) {
    return await apiClient(GlobalSettingsAPIRoutes.SET_GMAIL_SCHEDULER, ApiMethod.PUT, { enabled }, undefined, undefined, true, true)
}
