'use client'

import { IApiParams } from "../api.interface"
import { apiClient } from "../api_client"
import { ApiMethod } from "../api_methods.enum"
import { DetailProfilesAPIRoutes } from "../api_routes.enums"



export async function generatePDF(payload: any) {
    return await apiClient(DetailProfilesAPIRoutes.GENERATE_PDF, ApiMethod.POST, payload, undefined, undefined, true, true, process.env.NEXT_PUBLIC_API_PATH_SERVER_2)
}




