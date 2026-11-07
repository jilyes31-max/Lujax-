import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { buildModelOptions, type ModelOption } from '@/lib/model-groups'
import { useAuth } from '@/contexts/AuthContext'
import { getSession } from '@/lib/supabase-auth'

interface FallbackEntry {
  modelDbId: number
  priority: number
  enabled: boolean
  platform: string
  modelId: string
  canonicalId?: string
  displayName: string
  sizeLabel: string
  intelligenceRank?: number
}

interface V1Model {
  id: string
  owned_by?: string
  meta?: {
    display_name?: string
    canonical_id?: string
    size_label?: string
    intelligence_rank?: number
  }
}

export interface UseLujaxModelsReturn {
  models: FallbackEntry[]
  selectedModel: string
  setSelectedModel: (model: string) => void
  modelOptions: ModelOption[]
  apiKey: string
}

export function useLujaxModels(): UseLujaxModelsReturn {
  const { user } = useAuth()
  const [selectedModel, setSelectedModel] = useState('')

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

  const { data: apiKey = '' } = useQuery<string>({
    queryKey: ['lujax-config', user?.id],
    queryFn: async () => {
      try {
        const headers: Record<string, string> = {}
        const session = await getSession()
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`
        }
        const res = await fetch(`${BASE}/api/auth/lujax-config`, { headers })
        if (!res.ok) return ''
        const data = await res.json()
        return data.apiKey || ''
      } catch {
        return ''
      }
    },
    enabled: !!user,
  })

  const { data: fallbackEntries = [] } = useQuery<FallbackEntry[]>({
    queryKey: ['lujax-models', apiKey],
    queryFn: async () => {
      const headers: Record<string, string> = {}
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
      const res = await fetch(`${BASE}/v1/models`, { headers })
      if (!res.ok) return []
      const json = await res.json()
      return ((json.data || []) as V1Model[]).map((m: V1Model) => ({
        modelDbId: 0,
        priority: 0,
        enabled: true,
        platform: m.owned_by || 'unknown',
        modelId: m.id,
        canonicalId: m.meta?.canonical_id,
        displayName: m.meta?.display_name || m.id,
        sizeLabel: m.meta?.size_label || 'Medium',
        intelligenceRank: m.meta?.intelligence_rank || 0,
      }))
    },
    enabled: !!apiKey,
  })

  const modelOptions = useMemo(() => {
    return buildModelOptions(
      fallbackEntries
        .filter(e => e.enabled)
        .map(e => ({
          modelDbId: e.modelDbId,
          modelId: e.canonicalId || e.modelId,
          displayName: e.displayName,
          platform: e.platform,
          groupKey: e.canonicalId ? e.displayName : undefined,
          canonicalId: e.canonicalId,
          intelligenceRank: e.intelligenceRank,
          sizeLabel: e.sizeLabel,
        })),
      false,
    )
  }, [fallbackEntries])

  useEffect(() => {
    if (!selectedModel && modelOptions.length > 0) {
      const sorted = [...modelOptions].sort(
        (a, b) => a.sizeTier - b.sizeTier || a.intelligenceRank - b.intelligenceRank,
      )
      setSelectedModel(sorted[0]?.value || modelOptions[0].value)
    }
  }, [modelOptions, selectedModel])

  return {
    models: fallbackEntries,
    selectedModel,
    setSelectedModel,
    modelOptions,
    apiKey,
  }
}
