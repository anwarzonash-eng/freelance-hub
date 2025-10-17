'use client'

import { IApiParams } from "../api.interface"
import { apiClient } from "../api_client"
import { ApiMethod } from "../api_methods.enum"
import { UpworkJobsAPIRoutes } from "../api_routes.enums"

export async function getALLUPworkJobs() {
    return await apiClient(UpworkJobsAPIRoutes.GET_LATEST, ApiMethod.GET, undefined, undefined, undefined, true, false)
}

export async function getSubmittedUPworkJobs() {
    return await apiClient(UpworkJobsAPIRoutes.GET_SUBMITTED, ApiMethod.GET, undefined, undefined, undefined, true, false)
}

export async function addSubmittedUPworkJobs(payload: any) {
    return await apiClient(UpworkJobsAPIRoutes.ADD_SUBMITTED_JOB, ApiMethod.POST, payload, undefined, undefined, true, true)
}




