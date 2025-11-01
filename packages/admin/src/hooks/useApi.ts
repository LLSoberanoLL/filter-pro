import { useAuth } from '../contexts/AuthContext'

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>
}

export function useApi() {
  const { token, logout } = useAuth()
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

  const apiRequest = async (url: string, options: RequestOptions = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`

    const response = await fetch(fullUrl, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      logout()
      throw new Error('Unauthorized')
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response
  }

  return {
    get: (url: string) => apiRequest(url),
    post: (url: string, data: any) => 
      apiRequest(url, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    put: (url: string, data: any) =>
      apiRequest(url, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    patch: (url: string, data: any) =>
      apiRequest(url, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (url: string) =>
      apiRequest(url, {
        method: 'DELETE',
      }),
  }
}