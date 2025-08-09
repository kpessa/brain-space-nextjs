'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to manage CSRF tokens on the client
 */
export function useCSRF() {
  const [csrfToken, setCSRFToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCSRFToken()
  }, [])

  const fetchCSRFToken = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/auth/csrf', {
        method: 'GET',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token')
      }

      const data = await response.json()
      setCSRFToken(data.token)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setCSRFToken(null)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Helper to add CSRF token to fetch options
   */
  const withCSRF = (options: RequestInit = {}): RequestInit => {
    if (!csrfToken) {
      return options
    }

    return {
      ...options,
      headers: {
        ...options.headers,
        'x-csrf-token': csrfToken
      }
    }
  }

  /**
   * Protected fetch wrapper that includes CSRF token
   */
  const protectedFetch = async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    // Wait for token if still loading
    if (loading) {
      await new Promise(resolve => {
        const checkToken = setInterval(() => {
          if (!loading) {
            clearInterval(checkToken)
            resolve(undefined)
          }
        }, 100)
      })
    }

    if (!csrfToken) {
      throw new Error('CSRF token not available')
    }

    return fetch(url, withCSRF(options))
  }

  return {
    csrfToken,
    loading,
    error,
    fetchCSRFToken,
    withCSRF,
    protectedFetch
  }
}