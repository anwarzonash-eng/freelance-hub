'use client'

import { apiClient } from '../api_client'
import { ApiMethod } from '../api_methods.enum'
import { JobCVsAPIRoutes } from '../api_routes.enums'

export async function getAllCVs(filters?: any) {
    return apiClient(JobCVsAPIRoutes.GET_ALL, ApiMethod.GET, undefined, { query: filters })
}

export async function getCVById(id: number) {
    return apiClient(JobCVsAPIRoutes.GET_BY_ID.replace(':id', String(id)), ApiMethod.GET)
}

export async function createCV(data: any) {
    return apiClient(JobCVsAPIRoutes.CREATE, ApiMethod.POST, data, undefined, {}, true, true)
}

export async function updateCV(id: number, data: any) {
    return apiClient(JobCVsAPIRoutes.UPDATE.replace(':id', String(id)), ApiMethod.PUT, data, undefined, {}, true, true)
}

// Silent variant used by auto-save — no toast notifications.
export async function updateCVSilent(id: number, data: any) {
    return apiClient(JobCVsAPIRoutes.UPDATE.replace(':id', String(id)), ApiMethod.PUT, data, undefined, {}, false, false)
}

export async function deleteCV(id: number) {
    return apiClient(JobCVsAPIRoutes.DELETE.replace(':id', String(id)), ApiMethod.DELETE, undefined, undefined, {}, true)
}

export async function uploadCVAudio(blob: Blob): Promise<string> {
    const form = new FormData()
    form.append('file', blob, `cv_audio_${Date.now()}.webm`)
    const res: any = await apiClient(JobCVsAPIRoutes.UPLOAD_AUDIO, ApiMethod.POST, form, undefined, {}, true, true)
    const data = res?.data ?? res
    return data?.url ?? ''
}

export async function getCVHistory(cvId: number) {
    return apiClient(JobCVsAPIRoutes.GET_HISTORY.replace(':id', String(cvId)), ApiMethod.GET)
}

export async function addCVHistoryEntry(cvId: number, data: { note?: string; audio_url?: string; changed_by?: string }) {
    return apiClient(JobCVsAPIRoutes.ADD_HISTORY.replace(':id', String(cvId)), ApiMethod.POST, data, undefined, {}, false, false)
}
