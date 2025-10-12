'use client'

import { IApiParams } from "../api.interface"
import { apiClient } from "../api_client"
import { ApiMethod } from "../api_methods.enum"
import { UpworkJobsAPIRoutes } from "../api_routes.enums"

export async function getALLUPworkJobs() {
    return await apiClient(UpworkJobsAPIRoutes.GET_LATEST, ApiMethod.GET, undefined, undefined, undefined, true, false)
}

