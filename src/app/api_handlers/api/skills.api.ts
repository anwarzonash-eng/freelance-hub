'use client'

import { IApiParams } from "../api.interface"
import { apiClient } from "../api_client"
import { ApiMethod } from "../api_methods.enum"
import { SkillsAPIRoutes } from "../api_routes.enums"



export async function getAllSkills() {
    return await apiClient(
        SkillsAPIRoutes.GET_ALL,
        ApiMethod.GET,
        undefined,
        undefined,
        undefined,
        true,
        false

    )
}

export async function getSkillByID(params: IApiParams) {
    return await apiClient(
        SkillsAPIRoutes.GET_BY_ID,
        ApiMethod.GET,
        undefined,
        params,
        undefined,
        true,
        false

    )
}

export async function addSkill(payload: any) {
    return await apiClient(
        SkillsAPIRoutes.ADD,
        ApiMethod.POST,
        payload,
        undefined,
        undefined,
        true,
        true
    )
}

export async function addBulkSkills(payload: any[]) {
    return await apiClient(
        SkillsAPIRoutes.ADD_BULK,
        ApiMethod.POST,
        payload,
        undefined,
        undefined,
        true,
        true
    )
}

export async function updateSkillByID(payload: any, params: IApiParams) {
    return await apiClient(
        SkillsAPIRoutes.UPDATE,
        ApiMethod.PUT,
        payload,
        params,
        undefined,
        true,
        true
    )
}

export async function deleteSkillByID(params: IApiParams) {
    return await apiClient(
        SkillsAPIRoutes.DELETE,
        ApiMethod.DELETE,
        undefined,
        params,
        undefined,
        true,
        true

    )
}

export async function hardDeleteSkillByID(params: IApiParams) {
    return await apiClient(
        SkillsAPIRoutes.HARD_DELETE,
        ApiMethod.DELETE,
        undefined,
        params,
        undefined,
        true,
        true

    )
}
