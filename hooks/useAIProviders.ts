import { useQuery } from '@tanstack/react-query'

interface AIProvidersResponse {
  providers: string[]
  current: string
  configured: boolean
}

export function useAIProviders() {
  return useQuery<AIProvidersResponse>({
    queryKey: ['ai-providers'],
    queryFn: async () => {
      const response = await fetch('/api/ai/providers')
      if (!response.ok) {
        throw new Error('Failed to fetch AI providers')
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - providers don't change often
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  })
}