'use client'

import { apiClient } from '../api_client'
import { ApiMethod } from '../api_methods.enum'
import { ReferralSettingsAPIRoutes } from '../api_routes.enums'

export async function getReferralSettings() {
    return await apiClient(ReferralSettingsAPIRoutes.GET, ApiMethod.GET, undefined, undefined, undefined, true, false)
}

export async function saveReferralSettings(payload: { me_link?: string; ou_link?: string; mi_link?: string; al_link?: string }) {
    return await apiClient(ReferralSettingsAPIRoutes.UPSERT, ApiMethod.PUT, payload, undefined, undefined, true, true)
}
