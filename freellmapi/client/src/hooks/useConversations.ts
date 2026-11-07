import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
  listConversations as sbListConvos,
  getConversation as sbGetConvo,
  updateConversation as sbUpdateConvo,
  deleteConversation as sbDeleteConvo,
  type SBConversation,
} from '@/lib/supabase-conversations'
import type { ChatMessage, ConversationSummary } from './types'

function toSummary(c: SBConversation): ConversationSummary {
  return { id: c.id, title: c.title, updatedAt: new Date(c.updated_at).getTime() }
}

function writeActiveIdToStorage(id: string | null): void {
  try {
    if (id) localStorage.setItem('lujax_active_convo', id)
    else localStorage.removeItem('lujax_active_convo')
  } catch {}
}

export interface UseConversationsReturn {
  conversations: ConversationSummary[]
  activeConvoId: string | null
  setActiveConvoId: (id: string | null) => void
  selectConvo: (id: string) => void
  deleteConvo: (id: string) => Promise<void>
  renameConvo: (id: string, title: string) => Promise<void>
  newChat: () => void
  loadActiveConversation: (
    onMessages: (msgs: ChatMessage[]) => void,
    onModel: (model: string) => void,
  ) => void
  invalidateConversations: () => void
}

export function useConversations(): UseConversationsReturn {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [activeConvoId, setActiveConvoIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem('lujax_active_convo')
    } catch {
      return null
    }
  })

  const { data: conversations = [] } = useQuery<ConversationSummary[]>({
    queryKey: ['lujax-conversations'],
    queryFn: async () => {
      const list = await sbListConvos()
      return list.map(toSummary)
    },
    enabled: !!user,
  })

  const invalidateConversations = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['lujax-conversations'] })
  }, [queryClient])

  const setActiveConvoId = useCallback((id: string | null) => {
    setActiveConvoIdState(id)
    writeActiveIdToStorage(id)
  }, [])

  const selectConvo = useCallback((id: string) => {
    setActiveConvoIdState(id)
    writeActiveIdToStorage(id)
  }, [])

  const newChat = useCallback(() => {
    setActiveConvoIdState(null)
    writeActiveIdToStorage(null)
  }, [])

  const deleteConvo = useCallback(async (id: string) => {
    await sbDeleteConvo(id)
    if (activeConvoId === id) {
      setActiveConvoIdState(null)
      writeActiveIdToStorage(null)
    }
    invalidateConversations()
  }, [activeConvoId, invalidateConversations])

  const renameConvo = useCallback(async (id: string, title: string) => {
    await sbUpdateConvo(id, { title })
    invalidateConversations()
  }, [invalidateConversations])

  const loadActiveConversation = useCallback((
    onMessages: (msgs: ChatMessage[]) => void,
    onModel: (model: string) => void,
  ) => {
    if (!activeConvoId || !user) return
    sbGetConvo(activeConvoId)
      .then(c => {
        onMessages(c.messages.map(m => ({
          role: m.role as ChatMessage['role'],
          content: m.content,
          reasoning: m.reasoning || undefined,
          images: m.images || undefined,
          meta: m.meta as Record<string, unknown>,
          isError: m.is_error,
        })))
        if (c.model) onModel(c.model)
      })
      .catch(() => {
        setActiveConvoIdState(null)
        writeActiveIdToStorage(null)
      })
  }, [activeConvoId, user])

  return {
    conversations,
    activeConvoId,
    setActiveConvoId,
    selectConvo,
    deleteConvo,
    renameConvo,
    newChat,
    loadActiveConversation,
    invalidateConversations,
  }
}
