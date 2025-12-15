import { IApiParams } from "../api.interface";
import { apiClient } from "../api_client";
import { ApiMethod } from "../api_methods.enum";
import { TestimonialsAPIRoutes } from "../api_routes.enums";

export const getAllTestimonials = (params?: IApiParams) =>
    apiClient(TestimonialsAPIRoutes.GET_ALL, ApiMethod.GET, undefined, params, undefined, true, false);

export const getTestimonialById = (params?: IApiParams) =>
    apiClient(TestimonialsAPIRoutes.GET_BY_ID, ApiMethod.GET, undefined, params, undefined, true, false);

export const createTestimonial = (payload: any) =>
    apiClient(TestimonialsAPIRoutes.ADD, ApiMethod.POST, payload, undefined, undefined, true, true);

export const updateTestimonial = (payload: any, params?: IApiParams) =>
    apiClient(TestimonialsAPIRoutes.UPDATE, ApiMethod.PUT, payload, params, undefined, true, true);

export const deleteTestimonial = (params?: IApiParams) =>
    apiClient(TestimonialsAPIRoutes.DELETE, ApiMethod.DELETE, undefined, params, undefined, true, true);

export const uploadTestimonialFile = (payload: any) =>
    apiClient(TestimonialsAPIRoutes.UPLOAD_SINGLE, ApiMethod.POST, payload, undefined, undefined, true, true);

export const getTestimonialsByMainProfileId = (mainProfileId: string) =>
    apiClient(TestimonialsAPIRoutes.GET_ALL, ApiMethod.GET, undefined, { query: { main_profile_id: mainProfileId } }, undefined, true, false);
