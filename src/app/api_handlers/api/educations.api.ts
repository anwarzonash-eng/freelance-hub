import { IApiParams } from "../api.interface";
import { apiClient } from "../api_client";
import { ApiMethod } from "../api_methods.enum";

export enum EducationsAPIRoutes {
    GET_ALL = 'educations',
    GET_BY_ID = 'educations/:id',
    ADD = 'educations',
    UPDATE = 'educations/:id',
    DELETE = 'educations/:id',
    UPLOAD_SINGLE = 'educations/upload-single',
    UPLOAD_MULTIPLE = 'educations/upload-multiple',
}



export const getAllEducations = (params?: IApiParams) =>
    apiClient(EducationsAPIRoutes.GET_ALL, ApiMethod.GET, undefined, params, undefined, true, false);

export const getEducationById = (params?: IApiParams) =>
    apiClient(EducationsAPIRoutes.GET_BY_ID, ApiMethod.GET, undefined, params, undefined, true, false);

export const createEducation = (payload: any) =>
    apiClient(EducationsAPIRoutes.ADD, ApiMethod.POST, payload, undefined, undefined, true, true);

export const updateEducation = (payload: any, params?: IApiParams) =>
    apiClient(EducationsAPIRoutes.UPDATE, ApiMethod.PUT, payload, params, undefined, true, true);

export const deleteEducation = (params?: IApiParams) =>
    apiClient(EducationsAPIRoutes.DELETE, ApiMethod.DELETE, undefined, params, undefined, true, true);

export const uploadEducationImage = (payload: any) =>
    apiClient(EducationsAPIRoutes.UPLOAD_SINGLE, ApiMethod.POST, payload, undefined, undefined, true, true);

export const uploadEducationImages = (payload: any) =>
    apiClient(EducationsAPIRoutes.UPLOAD_MULTIPLE, ApiMethod.POST, payload, undefined, undefined, true, true);
