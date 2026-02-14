'use client'
export interface IApiParams {
    // For replacing placeholders in the route like /sales/:id
    path?: Record<string, string | number>;
    // For appending query string like ?key=value
    query?: Record<string, string | number | boolean>;
}

export interface IApiResponse<T = any> {
    statusCode: number;
    message: string;
    APIStatus: 'success' | 'error';
    data: T;
    userInfo: any;
}

