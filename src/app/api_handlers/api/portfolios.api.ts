import { IApiParams } from "../api.interface";
import { apiClient } from "../api_client";
import { ApiMethod } from "../api_methods.enum";
import { PortfoliosAPIRoutes } from "../api_routes.enums";

export const getAllPortfolios = (params?: IApiParams) =>
    apiClient(PortfoliosAPIRoutes.GET_ALL, ApiMethod.GET, undefined, params, undefined, true, false);

export const getPortfolioById = (params?: IApiParams) =>
    apiClient(PortfoliosAPIRoutes.GET_BY_ID, ApiMethod.GET, undefined, params, undefined, true, false);

export const createPortfolio = (payload: any) =>
    apiClient(PortfoliosAPIRoutes.ADD, ApiMethod.POST, payload, undefined, undefined, true, true);

export const updatePortfolio = (payload: any, params?: IApiParams) =>
    apiClient(PortfoliosAPIRoutes.UPDATE, ApiMethod.PUT, payload, params, undefined, true, true);

export const deletePortfolio = (params?: IApiParams) =>
    apiClient(PortfoliosAPIRoutes.DELETE, ApiMethod.DELETE, undefined, params, undefined, true, true);

export const uploadPortfolioImage = (payload: any) =>
    apiClient(PortfoliosAPIRoutes.UPLOAD_SINGLE, ApiMethod.POST, payload, undefined, undefined, true, true);

export const uploadPortfolioImages = (payload: any) =>
    apiClient(PortfoliosAPIRoutes.UPLOAD_MULTIPLE, ApiMethod.POST, payload, undefined, undefined, true, true);
