import { IApiParams } from "../api.interface";
import { apiClient } from "../api_client";
import { ApiMethod } from "../api_methods.enum";

export enum ExperiencesAPIRoutes {
    GET_ALL = 'experiences',
    GET_BY_ID = 'experiences/:id',
    ADD = 'experiences',
    UPDATE = 'experiences/:id',
    DELETE = 'experiences/:id',
}

export const getAllExperiences = (params?: IApiParams) =>
    apiClient(ExperiencesAPIRoutes.GET_ALL, ApiMethod.GET, undefined, params, undefined, true, false);

export const getExperienceById = (params?: IApiParams) =>
    apiClient(ExperiencesAPIRoutes.GET_BY_ID, ApiMethod.GET, undefined, params, undefined, true, false);

export const createExperience = (payload: any) =>
    apiClient(ExperiencesAPIRoutes.ADD, ApiMethod.POST, payload, undefined, undefined, true, true);

export const updateExperience = (payload: any, params?: IApiParams) =>
    apiClient(ExperiencesAPIRoutes.UPDATE, ApiMethod.PUT, payload, params, undefined, true, true);

export const deleteExperience = (params?: IApiParams) =>
    apiClient(ExperiencesAPIRoutes.DELETE, ApiMethod.DELETE, undefined, params, undefined, true, true);
