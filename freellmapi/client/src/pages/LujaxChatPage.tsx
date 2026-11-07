import { lazy, Suspense, useState, useRef, useEffect, useCallback } from 'react'
import { Menu, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { signOut } from '@/lib/supabase-auth'
import { useConversations } from '@/hooks/useConversations'
import { useChat } from '@/hooks/useChat'
import { useLujaxModels } from '@/hooks/useLujaxModels'
import { useLujaxSettings } from '@/hooks/useLujaxSettings'
import { ChatSidebar } from '@/components/lujax/ChatSidebar'
import { ChatComposer } from '@/components/lujax/ChatComposer'
import { MessageBubble } from '@/components/lujax/MessageBubble'
import { ModelPicker } from '@/components/lujax/ModelPicker'
import { WelcomeScreen } from '@/components/lujax/WelcomeScreen'
import { ModeSelector, type ChatMode } from '@/components/lujax/ModeSelector'
import { MessageSkeleton } from '@/components/lujax/MessageSkeleton'
import { CodeRenderersProvider } from '@/components/lujax/code-renderers'

const SettingsModal = lazy(() =>
  import('@/components/lujax/SettingsModal').then((m) => ({ default: m.SettingsModal })),
)

export type { ChatMessage, ConversationSummary } from '@/hooks/types'

export default function LujaxChatPage() {
  const { user } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLElement>(null)

  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024)
  const [chatMode, setChatMode] = useState<ChatMode>(() => {
    try {
      return (localStorage.getItem('lujax_chat_mode') as ChatMode) || 'chat'
    } catch {
      return 'chat'
    }
  })
  const [announcement, setAnnouncement] = useState('')
  const [errorAnnouncement, setErrorAnnouncement] = useState('')

  const {
    conversations,
    activeConvoId,
    setActiveConvoId,
    selectConvo,
    deleteConvo,
    renameConvo,
    newChat: rawNewChat,
    loadActiveConversation,
    invalidateConversations,
  } = useConversations()

  const { selectedModel, setSelectedModel, modelOptions, apiKey } = useLujaxModels()

  const { messages, setMessages, isStreaming, send, stop, retry, edit } = useChat({
    activeConvoId,
    setActiveConvoId,
    selectedModel,
    apiKey,
    chatMode,
    invalidateConversations,
  })

  const { settingsOpen, openSettings, closeSettings } = useLujaxSettings()

  useEffect(() => {
    loadActiveConversation(setMessages, setSelectedModel)
  }, [activeConvoId, loadActiveConversation, setMessages, setSelectedModel])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' })
  }, [messages, isStreaming])

  const lastMessage = messages[messages.length - 1]
  const lastErrorText = lastMessage?.isError && !lastMessage.streaming ? lastMessage.content : ''
  useEffect(() => {
    setErrorAnnouncement(lastErrorText ? `Erreur : ${lastErrorText}` : '')
  }, [lastErrorText])

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
    rawNewChat()
    setSidebarOpen(false)
  }, [rawNewChat, setMessages])

  const handleModeChange = useCallback((mode: ChatMode) => {
    setChatMode(mode)
    try {
      localStorage.setItem('lujax_chat_mode', mode)
    } catch {}
  }, [])

  const handleSelectConvo = useCallback((id: string) => {
    selectConvo(id)
    setSidebarOpen(false)
  }, [selectConvo])

  const handleDeleteConvo = useCallback(async (id: string) => {
    await deleteConvo(id)
    if (activeConvoId === id) handleNewChat()
  }, [deleteConvo, activeConvoId, handleNewChat])

  const handleSend = useCallback((text: string, images: string[]) => {
    send(text, images)
    setAnnouncement('Message envoyé')
    requestAnimationFrame(() => document.getElementById('lujax-composer-input')?.focus())
  }, [send])

  const handleSuggestion = useCallback((text: string) => {
    handleSend(text, [])
  }, [handleSend])

  const composerPlaceholder = chatMode === 'code'
    ? 'Collez du code ou décrivez ce que vous voulez coder...'
    : chatMode === 'auto'
      ? 'Demandez une optimisation ou modification...'
      : undefined

  return (
    <CodeRenderersProvider>
      <div className="flex h-full">
      <a
        href="#lujax-main"
        onClick={e => {
          e.preventDefault()
          document.getElementById('lujax-main')?.focus()
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[200] focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg focus:ring-2 focus:ring-primary"
      >
        Aller au contenu principal
      </a>

      <ChatSidebar
        conversations={conversations}
        activeId={activeConvoId}
        onSelect={handleSelectConvo}
        onNew={handleNewChat}
        onDelete={handleDeleteConvo}
        onRename={renameConvo}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userEmail={user?.email}
        onSignOut={signOut}
        onSettings={openSettings}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Ouvrir ou fermer la liste des conversations"
              aria-expanded={sidebarOpen}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>
            <ModelPicker
              models={modelOptions}
              selectedModel={selectedModel}
              onSelect={setSelectedModel}
            />
          </div>
          <div className="flex items-center gap-2">
            <ModeSelector mode={chatMode} onChange={handleModeChange} />
            <button
              type="button"
              onClick={signOut}
              aria-label="Se déconnecter"
              className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <main
          id="lujax-main"
          ref={scrollContainerRef}
          tabIndex={-1}
          aria-label="Conversation avec Lujax"
          className="flex-1 overflow-y-auto focus:outline-none"
        >
          <div role="log" aria-live="polite" aria-relevant="additions" aria-label="Messages de la conversation">
            {messages.length === 0 ? (
              <WelcomeScreen onSuggestionClick={handleSuggestion} mode={chatMode} />
            ) : (
              <div className="pb-4">
                {messages.map((msg, i) => (
                  <MessageBubble
                    key={msg.id ?? i}
                    message={msg}
                    isStreaming={msg.streaming}
                    onRetry={msg.role === 'assistant' && !msg.streaming ? () => retry(i) : undefined}
                    onEdit={msg.role === 'user' && !isStreaming ? (newContent: string) => edit(i, newContent) : undefined}
                  />
                ))}
                {isStreaming && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content && (
                  <MessageSkeleton />
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </main>

        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement}
        </div>
        <div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only">
          {errorAnnouncement}
        </div>

        <ChatComposer
          onSend={handleSend}
          onStop={stop}
          isStreaming={isStreaming}
          placeholder={composerPlaceholder}
        />
      </div>

      {settingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal
            open={settingsOpen}
            onClose={closeSettings}
            onSettingsChange={() => {}}
          />
        </Suspense>
      )}
      </div>
    </CodeRenderersProvider>
  )
}
