'use client'

import { apiClient } from '../api_client'
import { ApiMethod } from '../api_methods.enum'

export async function getAllLLMSettings() {
    return apiClient('llm-settings', ApiMethod.GET)
}

export async function getActiveLLMSettings() {
    return apiClient('llm-settings/active', ApiMethod.GET)
}

export async function getModelsForProvider(provider: string) {
    return apiClient(`llm-settings/models/${provider}`, ApiMethod.GET)
}

export async function upsertLLMSetting(provider: string, api_key: string, is_active: boolean) {
    return apiClient('llm-settings/upsert', ApiMethod.POST, { provider, api_key, is_active }, undefined, {}, true)
}

export async function deleteLLMSetting(provider: string) {
    return apiClient(`llm-settings/${provider}`, ApiMethod.DELETE, undefined, undefined, {}, true)
}

export async function generateLLMResponse(provider: string, model: string, prompt: string, userId?: string) {
    return apiClient('llm-settings/generate', ApiMethod.POST, { provider, model, prompt, userId }, undefined, {}, true)
}

export async function getLLMRequestHistory(limit = 50) {
    return apiClient('llm-settings/history', ApiMethod.GET, undefined, { query: { limit } })
}
