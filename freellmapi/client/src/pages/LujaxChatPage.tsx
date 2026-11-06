import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Menu, LogOut } from 'lucide-react'
import { buildModelOptions } from '@/lib/model-groups'
import { readChatStream } from '@/lib/playground-stream'
import { generateTitle } from '@/lib/lujax-title'
import { useAuth } from '@/contexts/AuthContext'
import { signOut } from '@/lib/supabase-auth'
import {
  listConversations as sbListConvos,
  getConversation as sbGetConvo,
  createConversation as sbCreateConvo,
  updateConversation as sbUpdateConvo,
  deleteConversation as sbDeleteConvo,
  addMessages,
  type SBConversation,
} from '@/lib/supabase-conversations'
import { ChatSidebar } from '@/components/lujax/ChatSidebar'
import { ChatComposer } from '@/components/lujax/ChatComposer'
import { MessageBubble } from '@/components/lujax/MessageBubble'
import { ModelPicker } from '@/components/lujax/ModelPicker'
import { WelcomeScreen } from '@/components/lujax/WelcomeScreen'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  reasoning?: string
  images?: string[]
  meta?: Record<string, unknown>
  isError?: boolean
  streaming?: boolean
}

export interface ConversationSummary {
  id: string
  title: string
  updatedAt: number
}

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

function toSummary(c: SBConversation): ConversationSummary {
  return { id: c.id, title: c.title, updatedAt: new Date(c.updated_at).getTime() }
}

export default function LujaxChatPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeConvoId, setActiveConvoId] = useState<string | null>(() => {
    try { return localStorage.getItem('lujax_active_convo') } catch { return null }
  })
  const [selectedModel, setSelectedModel] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024)
  const abortRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const writeActiveId = (id: string | null) => {
    setActiveConvoId(id)
    try {
      if (id) localStorage.setItem('lujax_active_convo', id)
      else localStorage.removeItem('lujax_active_convo')
    } catch {}
  }

  // Fetch conversations from Supabase
  const { data: conversations = [] } = useQuery<ConversationSummary[]>({
    queryKey: ['lujax-conversations'],
    queryFn: async () => {
      const list = await sbListConvos()
      return list.map(toSummary)
    },
    enabled: !!user,
  })

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

  // Fetch the inference API key from the loopback-only config endpoint
  const { data: apiKey = '' } = useQuery<string>({
    queryKey: ['lujax-config'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/auth/lujax-config`)
      if (!res.ok) return ''
      const data = await res.json()
      return data.apiKey || ''
    },
  })

  // Fetch models from /v1/models using the unified API key
  const { data: fallbackEntries = [] } = useQuery<FallbackEntry[]>({
    queryKey: ['lujax-models', apiKey],
    queryFn: async () => {
      const headers: Record<string, string> = {}
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
      const res = await fetch(`${BASE}/v1/models`, { headers })
      if (!res.ok) return []
      const json = await res.json()
      interface V1Model { id: string; owned_by?: string; meta?: { display_name?: string; canonical_id?: string; size_label?: string; intelligence_rank?: number } }
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

  const unifyOn = false

  const modelOptions = buildModelOptions(
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
    unifyOn,
  )

  useEffect(() => {
    if (!selectedModel && modelOptions.length > 0) {
      const sorted = [...modelOptions].sort((a, b) => a.sizeTier - b.sizeTier || a.intelligenceRank - b.intelligenceRank)
      setSelectedModel(sorted[0]?.value || modelOptions[0].value)
    }
  }, [modelOptions, selectedModel])

  // Load active conversation from Supabase
  useEffect(() => {
    if (activeConvoId && user) {
      sbGetConvo(activeConvoId)
        .then(c => {
          setMessages(c.messages.map(m => ({
            role: m.role as ChatMessage['role'],
            content: m.content,
            reasoning: m.reasoning || undefined,
            images: m.images || undefined,
            meta: m.meta as Record<string, unknown>,
            isError: m.is_error,
          })))
          if (c.model) setSelectedModel(c.model)
        })
        .catch(() => writeActiveId(null))
    }
  }, [activeConvoId, user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        handleNewChat()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleNewChat = useCallback(() => {
    setMessages([])
    writeActiveId(null)
    setSidebarOpen(false)
  }, [])

  const saveConversation = useCallback(async (msgs: ChatMessage[], model: string) => {
    const nonStreaming = msgs.filter(m => !m.streaming)
    if (nonStreaming.length === 0) return

    if (activeConvoId) {
      // Add only the last two messages (user + assistant)
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
      writeActiveId(convo.id)
      await addMessages(convo.id, nonStreaming.map(m => ({
        role: m.role,
        content: m.content,
        reasoning: m.reasoning,
        images: m.images,
        meta: m.meta,
        is_error: m.isError,
      })))
      // Auto-generate title
      if (nonStreaming[0]?.role === 'user') {
        generateTitle(nonStreaming[0].content).then(async t => {
          await sbUpdateConvo(convo.id, { title: t })
          queryClient.invalidateQueries({ queryKey: ['lujax-conversations'] })
        }).catch(() => {})
      }
    }
    queryClient.invalidateQueries({ queryKey: ['lujax-conversations'] })
  }, [activeConvoId, queryClient])

  const handleSend = useCallback(async (text: string, images: string[]) => {
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

      const apiMessages = newMessages.slice(0, -1).map(m => {
        if (m.role === 'user' && m.images?.length) {
          return {
            role: m.role,
            content: [
              { type: 'text', text: m.content },
              ...m.images.map(img => ({ type: 'image_url', image_url: { url: img } })),
            ],
          }
        }
        return { role: m.role, content: m.content }
      })

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
  }, [messages, selectedModel, isStreaming, saveConversation, apiKey, BASE])

  const handleStop = () => {
    abortRef.current?.abort()
    abortRef.current = null
  }

  const handleRetry = useCallback((index: number) => {
    const prevMessages = messages.slice(0, index)
    setMessages(prevMessages)
    const lastUserMsg = [...prevMessages].reverse().find(m => m.role === 'user')
    if (lastUserMsg) {
      setTimeout(() => handleSend(lastUserMsg.content, lastUserMsg.images || []), 50)
    }
  }, [messages, handleSend])

  const handleSelectConvo = (id: string) => {
    writeActiveId(id)
    setSidebarOpen(false)
  }

  const handleDeleteConvo = async (id: string) => {
    await sbDeleteConvo(id)
    if (activeConvoId === id) handleNewChat()
    queryClient.invalidateQueries({ queryKey: ['lujax-conversations'] })
  }

  const handleRenameConvo = async (id: string, title: string) => {
    await sbUpdateConvo(id, { title })
    queryClient.invalidateQueries({ queryKey: ['lujax-conversations'] })
  }

  const handleSuggestion = (text: string) => {
    handleSend(text, [])
  }

  return (
    <div className="flex h-full">
      <ChatSidebar
        conversations={conversations}
        activeId={activeConvoId}
        onSelect={handleSelectConvo}
        onNew={handleNewChat}
        onDelete={handleDeleteConvo}
        onRename={handleRenameConvo}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userEmail={user?.email}
        onSignOut={signOut}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <ModelPicker
              models={modelOptions}
              selectedModel={selectedModel}
              onSelect={setSelectedModel}
            />
          </div>
          <button
            onClick={signOut}
            className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <WelcomeScreen onSuggestionClick={handleSuggestion} />
          ) : (
            <div className="pb-4">
              {messages.map((msg, i) => (
                <MessageBubble
                  key={i}
                  message={msg}
                  isStreaming={msg.streaming}
                  onRetry={msg.role === 'assistant' && !msg.streaming ? () => handleRetry(i) : undefined}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <ChatComposer
          onSend={handleSend}
          onStop={handleStop}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  )
}
