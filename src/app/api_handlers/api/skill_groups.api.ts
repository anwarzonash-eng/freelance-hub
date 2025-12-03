'use client'

import { IApiParams } from "../api.interface";
import { apiClient } from "../api_client";
import { ApiMethod } from "../api_methods.enum";
import { SkillGroupsAPIRoutes } from "../api_routes.enums";

export async function addSkillGroup(payload: any) {
    return await apiClient(SkillGroupsAPIRoutes.ADD, ApiMethod.POST, payload, undefined, undefined, true, true);
}

export async function addBulkSkillGroups(payload: any[]) {
    return await apiClient(SkillGroupsAPIRoutes.ADD_BULK, ApiMethod.POST, payload, undefined, undefined, true, true);
}

export async function getAllSkillGroups() {
    return await apiClient(SkillGroupsAPIRoutes.GET_ALL, ApiMethod.GET, undefined, undefined, undefined, true, false);
}

export async function getSkillGroupByID(params: IApiParams) {
    return await apiClient(SkillGroupsAPIRoutes.GET_BY_ID, ApiMethod.GET, undefined, params, undefined, true, false);
}

export async function updateSkillGroupByID(payload: any, params: IApiParams) {
    return await apiClient(SkillGroupsAPIRoutes.UPDATE, ApiMethod.PUT, payload, params, undefined, true, true);
}

export async function deleteSkillGroupByID(params: IApiParams) {
    return await apiClient(SkillGroupsAPIRoutes.DELETE, ApiMethod.DELETE, undefined, params, undefined, true, true);
}

export async function hardDeleteSkillGroupByID(params: IApiParams) {
    return await apiClient(SkillGroupsAPIRoutes.HARD_DELETE, ApiMethod.DELETE, undefined, params, undefined, true, true);
}
