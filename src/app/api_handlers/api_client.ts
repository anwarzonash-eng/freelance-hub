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


): Promise<IApiResponse> => {


    // Use the new buildUrl function
    const url = buildUrl(BASE_API_URL, route, params);

    const defaultHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        ...headers,
    };

    const config: RequestInit = {
        method,
        headers: defaultHeaders,
        body: payload && method !== 'GET' ? JSON.stringify(payload) : undefined,
    };
    // console.log(url, config)

    try {
        const response = await fetch(url, config);
        const jsonResponse: IApiResponse<T> = await response.json();

        if (!response.ok || jsonResponse.APIStatus === 'error') {
            const errorMessage = jsonResponse.message || 'An unknown API error occurred.';
            showErrorMessage && showAppNotification('error', 'API Request Failed', errorMessage);
            return null;
        }
        showSuccessMessage && showAppNotification('success', 'Operation Complete', jsonResponse.message);


        return jsonResponse;

    } catch (error) {
        const errorMessage = `A network or parsing error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`;
        showErrorMessage && showAppNotification('error', 'API Request Failed', errorMessage);
        return null;
    }
};