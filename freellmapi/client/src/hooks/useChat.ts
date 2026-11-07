import { useState, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { readChatStream } from '@/lib/playground-stream'
import { generateTitle } from '@/lib/lujax-title'
import { loadSettings, buildSystemPrompts } from '@/lib/lujax-settings'
import {
  createConversation as sbCreateConvo,
  updateConversation as sbUpdateConvo,
  addMessages,
} from '@/lib/supabase-conversations'
import type { ChatMode } from '@/components/lujax/ModeSelector'
import type { ChatMessage } from './types'

const CODE_SYSTEM_PROMPT = `Tu es Lujax Code, un assistant de programmation expert. Tu dois:
- Toujours répondre en français sauf pour le code
- Fournir du code propre, bien commenté et fonctionnel
- Expliquer les concepts techniques clairement
- Suggérer les meilleures pratiques et patterns de design
- Identifier et corriger les bugs quand on te montre du code
- Proposer des optimisations de performance
- Utiliser des exemples concrets avec le code
Formate toujours le code dans des blocs de code avec le langage spécifié.`

const AUTO_SYSTEM_PROMPT = `Tu es Lujax Auto, un assistant d'auto-modification intelligent. Tu dois:
- Toujours répondre en français
- Analyser les préférences et habitudes de l'utilisateur
- Suggérer des améliorations personnalisées pour l'expérience utilisateur
- Proposer des optimisations de paramètres (modèle IA, style de réponse, etc.)
- Créer des profils utilisateur personnalisés basés sur les conversations
- Recommander le meilleur modèle IA selon le type de tâche
- Générer des résumés d'utilisation et des insights
Quand l'utilisateur te demande d'optimiser ou modifier quelque chose, propose des actions concrètes avec des explications claires.`

export interface UseChatOptions {
  activeConvoId: string | null
  setActiveConvoId: (id: string | null) => void
  selectedModel: string
  apiKey: string
  chatMode: ChatMode
  invalidateConversations: () => void
}

export interface UseChatReturn {
  messages: ChatMessage[]
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  isStreaming: boolean
  send: (text: string, images: string[]) => Promise<void>
  stop: () => void
  retry: (index: number) => void
}

export function useChat({
  activeConvoId,
  setActiveConvoId,
  selectedModel,
  apiKey,
  chatMode,
  invalidateConversations,
}: UseChatOptions): UseChatReturn {
  const queryClient = useQueryClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

  const saveConversation = useCallback(async (msgs: ChatMessage[], model: string) => {
    const nonStreaming = msgs.filter(m => !m.streaming)
    if (nonStreaming.length === 0) return

    if (activeConvoId) {
      const newMsgs = nonStreaming.slice(-2)
      await addMessages(activeConvoId, newMsgs.map(m => ({
        role: m.role,
        content: m.content,
        reasoning: m.reasoning,
        images: m.images,
        meta: m.meta,
        is_error: m.isError,
      })))
      await sbUpdateConvo(activeConvoId, { model })
    } else {
      const firstMsg = nonStreaming[0]?.content?.slice(0, 40) || 'New chat'
      const convo = await sbCreateConvo(firstMsg, model)
      setActiveConvoId(convo.id)
      await addMessages(convo.id, nonStreaming.map(m => ({
        role: m.role,
        content: m.content,
        reasoning: m.reasoning,
        images: m.images,
        meta: m.meta,
        is_error: m.isError,
      })))
      if (nonStreaming[0]?.role === 'user') {
        generateTitle(nonStreaming[0].content).then(async t => {
          await sbUpdateConvo(convo.id, { title: t })
          queryClient.invalidateQueries({ queryKey: ['lujax-conversations'] })
        }).catch(() => {})
      }
    }
    invalidateConversations()
  }, [activeConvoId, setActiveConvoId, queryClient, invalidateConversations])

  const send = useCallback(async (text: string, images: string[]) => {
    if (isStreaming) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
      ...(images.length > 0 ? { images } : {}),
    }

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      streaming: true,
      meta: { model: selectedModel },
    }

    const newMessages = [...messages, userMessage, assistantMessage]
    setMessages(newMessages)
    setIsStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

      const settings = loadSettings()
      const basePrompts = buildSystemPrompts(settings)
      const modePrompt = chatMode === 'code' ? CODE_SYSTEM_PROMPT
        : chatMode === 'auto' ? AUTO_SYSTEM_PROMPT
        : null

      const apiMessages: Array<{ role: string; content: unknown }> = []
      const combinedSystem = [...basePrompts, ...(modePrompt ? [modePrompt] : [])].join('\n\n')
      if (combinedSystem) {
        apiMessages.push({ role: 'system', content: combinedSystem })
      }
      for (const m of newMessages.slice(0, -1)) {
        if (m.role === 'user' && m.images?.length) {
          apiMessages.push({
            role: m.role,
            content: [
              { type: 'text', text: m.content },
              ...m.images.map(img => ({ type: 'image_url', image_url: { url: img } })),
            ],
          })
        } else {
          apiMessages.push({ role: m.role, content: m.content })
        }
      }

      const res = await fetch(`${BASE}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: selectedModel,
          messages: apiMessages,
          stream: true,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.text()
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              content: `Error: ${res.status} — ${err}`,
              isError: true,
              streaming: false,
            }
          }
          return updated
        })
        setIsStreaming(false)
        return
      }

      if (!res.body) throw new Error('No response body')

      const routedVia = res.headers.get('x-routed-via') || ''
      const [routedPlatform, routedModel] = routedVia.split(':')

      await readChatStream(res.body, {
        onDelta: (delta) => {
          setMessages(prev => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last.role === 'assistant') {
              updated[updated.length - 1] = {
                ...last,
                content: last.content + delta,
                meta: {
                  ...last.meta,
                  platform: routedPlatform || last.meta?.platform,
                  model: routedModel || last.meta?.model,
                },
              }
            }
            return updated
          })
        },
        onReasoning: (delta) => {
          setMessages(prev => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last.role === 'assistant') {
              updated[updated.length - 1] = {
                ...last,
                reasoning: (last.reasoning || '') + delta,
              }
            }
            return updated
          })
        },
        onError: (errorMsg) => {
          setMessages(prev => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last.role === 'assistant' && !last.content) {
              updated[updated.length - 1] = {
                ...last,
                content: errorMsg,
                isError: true,
              }
            }
            return updated
          })
        },
        onDone: () => {
          setMessages(prev => {
            const updated = prev.map(m =>
              m.streaming ? { ...m, streaming: false } : m
            )
            saveConversation(updated, selectedModel)
            return updated
          })
          setIsStreaming(false)
        },
      })
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setMessages(prev => prev.map(m => m.streaming ? { ...m, streaming: false } : m))
      } else {
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              content: last.content || 'Connection error. Please try again.',
              isError: !last.content,
              streaming: false,
            }
          }
          return updated
        })
      }
      setIsStreaming(false)
    }
  }, [messages, selectedModel, isStreaming, saveConversation, apiKey, BASE, chatMode])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const retry = useCallback((index: number) => {
    const prevMessages = messages.slice(0, index)
    setMessages(prevMessages)
    const lastUserMsg = [...prevMessages].reverse().find(m => m.role === 'user')
    if (lastUserMsg) {
      setTimeout(() => send(lastUserMsg.content, lastUserMsg.images || []), 50)
    }
  }, [messages, send])

  return { messages, setMessages, isStreaming, send, stop, retry }
}
