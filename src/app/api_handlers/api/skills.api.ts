// Find skills by description (AI skill finder)

'use client'

import { IApiParams } from "../api.interface"
import { apiClient } from "../api_client"
import { ApiMethod } from "../api_methods.enum"
import { SkillsAPIRoutes } from "../api_routes.enums"



export async function getAllSkills(filters?: any) {
    const params: IApiParams = {};

    if (filters) {
        params.query = {};
        if (filters.is_techstack) {
            params.query.is_techstack = filters.is_techstack;
        }
        if (filters.order) {
            params.query.order = filters.order;
        }
    }

    return await apiClient(
        SkillsAPIRoutes.GET_ALL,
        ApiMethod.GET,
        undefined,
        params,
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

export async function findSkills(payload: { description: string; main_profile_id: string }) {
    return await apiClient(
        SkillsAPIRoutes.FIND_BY_DESCRIPTION,
        ApiMethod.POST,
        payload,
        undefined,
        undefined,
        true,
        false
    );
}
