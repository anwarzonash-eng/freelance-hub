'use client';

import { IApiParams, IApiResponse } from '@/app/api_handlers/api.interface'
import { ApiMethod } from './api_methods.enum';
import { showAppNotification } from '@/utils/notificationService';

const BASE_API_URL = process.env.NEXT_PUBLIC_API_PATH;
const BASE_API_URL_PERSONAL_SITES = process.env.NEXT_PUBLIC_PERSONAL_SITES_API_DOMAIN;





const callPopup = (message: string, isError: boolean) => {
    const icon = isError ? 'error_outline' : 'check_circle_outline';
    const type = isError ? 'Error' : 'Success';
    // console.log(`[${type} Popup | Icon: ${icon}] Message: ${message}`);
};

const buildUrl = (baseUrl: string, route: string, params?: IApiParams): string => {
    let finalRoute = route;

    // 1. Handle Path Parameters (e.g., /sales/:id -> /sales/123)
    if (params?.path) {
        for (const [key, value] of Object.entries(params.path)) {
            // Replace :key with the actual value
            finalRoute = finalRoute.replace(`:${key}`, String(value));
        }
    }

    // 2. Handle Query Parameters (e.g., /products -> /products?limit=10)
    if (params?.query) {
        const query = new URLSearchParams();
        for (const [key, value] of Object.entries(params.query)) {
            if (value !== undefined && value !== null) {
                query.append(key, String(value));
            }
        }
        const queryString = query.toString();
        if (queryString) {
            finalRoute += `?${queryString}`;
        }
    }

    return `${baseUrl}${finalRoute}`;
};


export const apiClient = async <T = any, P = any>(
    route: string,
    method: ApiMethod,
    payload?: P,
    params?: IApiParams, // New parameter for path/query params
    headers: HeadersInit = {},
    showErrorMessage: boolean = false,
    showSuccessMessage: boolean = false,
    apiBaseURL = BASE_API_URL,
    isPublicSiteAPI: boolean = false


): Promise<IApiResponse> => {

    let token = null;
    if (!isPublicSiteAPI) {
        token = localStorage.getItem('authToken') || null;
        console.log("Using auth token:", token);
    }

    const url = buildUrl(apiBaseURL, route, params);

    const isFormData = payload instanceof FormData;

    const defaultHeaders: HeadersInit = isFormData
        ? {} // FormData will set Content-Type automatically
        : {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...headers,
        };

    const config: RequestInit = {
        method,
        headers: defaultHeaders,
        body: payload && method !== 'GET'
            ? isFormData
                ? payload
                : JSON.stringify(payload)
            : undefined,
    };
    // console.log(url, config)

    try {
        const response = await fetch(url, config);
        const jsonResponse: IApiResponse<T> = await response.json();
        if (response.status == 401) {
            localStorage.removeItem('authToken');
            window.location.href = '/login';
            console.log("Unauthorized access - 401");
        }

        if (!response.ok || jsonResponse.APIStatus === 'error') {
            const errorMessage = jsonResponse.message || 'An unknown API error occurred.';
            showErrorMessage && showAppNotification('error', 'API Request Failed', errorMessage);
            return null;
        }
        showSuccessMessage && showAppNotification('success', 'Operation Complete', jsonResponse.message);


        return jsonResponse;

    } catch (error) {
        console.error('API Client Error:', error);
        const errorMessage = `A network or parsing error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`;
        showErrorMessage && showAppNotification('error', 'API Request Failed', errorMessage);
        return null;
    }
};