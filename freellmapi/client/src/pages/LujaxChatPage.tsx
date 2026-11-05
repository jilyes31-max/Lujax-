import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Menu } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { buildModelOptions } from '@/lib/model-groups'
import { readChatStream } from '@/lib/playground-stream'
import { generateTitle } from '@/lib/lujax-title'
import {
  listConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation,
  toStoredMessages,
  readActiveConversationId,
  writeActiveConversationId,
  type ChatMessage,
  type ConversationSummary,
} from '@/lib/playground-conversations'
import { ChatSidebar } from '@/components/lujax/ChatSidebar'
import { ChatComposer } from '@/components/lujax/ChatComposer'
import { MessageBubble } from '@/components/lujax/MessageBubble'
import { ModelPicker } from '@/components/lujax/ModelPicker'
import { WelcomeScreen } from '@/components/lujax/WelcomeScreen'

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

export default function LujaxChatPage() {
  const queryClient = useQueryClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeConvoId, setActiveConvoId] = useState<number | null>(readActiveConversationId)
  const [selectedModel, setSelectedModel] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024)
  const abortRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Fetch conversations list
  const { data: conversations = [] } = useQuery<ConversationSummary[]>({
    queryKey: ['lujax-conversations'],
    queryFn: listConversations,
  })

  // Fetch models
  const { data: fallbackEntries = [] } = useQuery<FallbackEntry[]>({
    queryKey: ['lujax-fallback'],
    queryFn: () => apiFetch<FallbackEntry[]>('/api/fallback'),
  })

  const { data: unifyOn = false } = useQuery<boolean>({
    queryKey: ['lujax-unify'],
    queryFn: async () => {
      try {
        const res = await apiFetch<{ enabled: boolean }>('/api/settings/unify')
        return res.enabled
      } catch { return false }
    },
  })

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

  // Set default model
  useEffect(() => {
    if (!selectedModel && modelOptions.length > 0) {
      const sorted = [...modelOptions].sort((a, b) => a.sizeTier - b.sizeTier || a.intelligenceRank - b.intelligenceRank)
      setSelectedModel(sorted[0]?.value || modelOptions[0].value)
    }
  }, [modelOptions, selectedModel])

  // Load active conversation
  useEffect(() => {
    if (activeConvoId) {
      getConversation(activeConvoId)
        .then(c => {
          setMessages(c.messages)
          if (c.model) setSelectedModel(c.model)
        })
        .catch(() => {
          setActiveConvoId(null)
          writeActiveConversationId(null)
        })
    }
  }, [activeConvoId])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Keyboard shortcuts
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
    setActiveConvoId(null)
    writeActiveConversationId(null)
    setSidebarOpen(false)
  }, [])

  const saveConversation = useCallback(async (msgs: ChatMessage[], model: string) => {
    const stored = toStoredMessages(msgs)
    if (activeConvoId) {
      await updateConversation(activeConvoId, { messages: stored, model })
    } else if (stored.length > 0) {
      const title = stored[0]?.content?.slice(0, 40) || 'New chat'
      const convo = await createConversation({ title, messages: stored, model })
      setActiveConvoId(convo.id)
      writeActiveConversationId(convo.id)
      // Auto-generate title in background
      if (stored[0]?.role === 'user') {
        generateTitle(stored[0].content).then(async t => {
          await updateConversation(convo.id, { title: t })
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
      const token = localStorage.getItem('freellmapi_dashboard_token')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      // Build messages payload
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

      const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
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

      // Extract routing info from headers
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
  }, [messages, selectedModel, isStreaming, saveConversation])

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

  const handleSelectConvo = (id: number) => {
    setActiveConvoId(id)
    writeActiveConversationId(id)
    setSidebarOpen(false)
  }

  const handleDeleteConvo = async (id: number) => {
    await deleteConversation(id)
    if (activeConvoId === id) {
      handleNewChat()
    }
    queryClient.invalidateQueries({ queryKey: ['lujax-conversations'] })
  }

  const handleRenameConvo = async (id: number, title: string) => {
    await updateConversation(id, { title })
    queryClient.invalidateQueries({ queryKey: ['lujax-conversations'] })
  }

  const handleSuggestion = (text: string) => {
    handleSend(text, [])
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <ChatSidebar
        conversations={conversations}
        activeId={activeConvoId}
        onSelect={handleSelectConvo}
        onNew={handleNewChat}
        onDelete={handleDeleteConvo}
        onRename={handleRenameConvo}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
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
        </div>

        {/* Messages */}
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

        {/* Composer */}
        <ChatComposer
          onSend={handleSend}
          onStop={handleStop}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  )
}
