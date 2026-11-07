import { memo, useState, useId, useRef, useEffect } from 'react'
import { Check, Copy, RefreshCw, Sparkles, User, ChevronDown, ChevronUp, Globe, Pencil, X, Send } from 'lucide-react'
import { Markdown } from '@/components/markdown'
import type { ChatMessage } from '@/hooks/types'
import { friendlyModelName } from '@/lib/lujax-models'

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function isSafeImageSrc(src: string): boolean {
  if (/^data:image\/(png|jpeg|gif|webp);base64,/i.test(src)) return true
  try {
    const parsed = new URL(src)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

interface MessageBubbleProps {
  message: ChatMessage
  isStreaming?: boolean
  onRetry?: () => void
  onEdit?: (newContent: string) => void
}

function MessageBubbleImpl({ message, isStreaming, onRetry, onEdit }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const [showReasoning, setShowReasoning] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)
  const reasoningId = useId()
  const isUser = message.role === 'user'
  const isError = message.isError

  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.focus()
      editTextareaRef.current.setSelectionRange(
        editTextareaRef.current.value.length,
        editTextareaRef.current.value.length,
      )
    }
  }, [isEditing])

  const handleStartEdit = () => {
    setEditContent(message.content)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditContent('')
  }

  const handleSubmitEdit = () => {
    const trimmed = editContent.trim()
    if (!trimmed || trimmed === message.content) {
      handleCancelEdit()
      return
    }
    onEdit?.(trimmed)
    setIsEditing(false)
    setEditContent('')
  }

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitEdit()
    }
    if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const imageCount = message.images?.length ?? 0

  return (
    <article
      aria-label={isUser ? 'Votre message' : 'Message de Lujax'}
      aria-busy={isStreaming}
      className={`group py-3 sm:py-5 ${isUser ? 'animate-msg-slide-right' : 'animate-msg-slide-left'}`}
    >
      <div className="mx-auto max-w-3xl px-3 sm:px-4">
        <div className="mb-2 flex items-center gap-2">
          {isUser ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground/10">
              <User className="h-3.5 w-3.5 text-foreground/70" aria-hidden="true" />
            </div>
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700">
              <Sparkles className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            </div>
          )}
          <span className="text-sm font-medium text-foreground">
            {isUser ? 'Vous' : 'Lujax'}
          </span>
          {!isUser && typeof message.meta?.model === 'string' && (
            <span className="text-xs text-muted-foreground">
              {friendlyModelName(String(message.meta.model))}
            </span>
          )}
          {isStreaming && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" aria-hidden="true" />
              Lujax réfléchit...
            </span>
          )}
        </div>

        {message.reasoning && (
          <div className="mb-2 ml-7 sm:ml-9">
            <button
              type="button"
              onClick={() => setShowReasoning(!showReasoning)}
              aria-expanded={showReasoning}
              aria-controls={reasoningId}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {showReasoning ? <ChevronUp className="h-3 w-3" aria-hidden="true" /> : <ChevronDown className="h-3 w-3" aria-hidden="true" />}
              Raisonnement
            </button>
            {showReasoning && (
              <div id={reasoningId} className="mt-1 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                <Markdown>{message.reasoning}</Markdown>
              </div>
            )}
          </div>
        )}

        {(message.meta?.webSearch as { sources?: { url: string; title: string }[] })?.sources && (message.meta?.webSearch as { sources?: { url: string; title: string }[] }).sources!.length > 0 && (
          <div className="mb-2 ml-7 flex flex-wrap gap-2 sm:ml-9">
            {((message.meta?.webSearch as { sources: { url: string; title: string }[] }).sources).slice(0, 4).map((source: { url: string; title: string }, i: number) => {
              const href = isSafeUrl(source.url) ? source.url : undefined
              return href ? (
                <a
                  key={source.url}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                >
                  <Globe className="h-3 w-3" aria-hidden="true" />
                  <span className="max-w-[150px] truncate">{source.title}</span>
                </a>
              ) : (
                <span key={i} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
                  <Globe className="h-3 w-3" aria-hidden="true" />
                  <span className="max-w-[150px] truncate">{source.title}</span>
                </span>
              )
            })}
          </div>
        )}

        <div className={`ml-7 sm:ml-9 ${isError ? 'text-destructive' : ''}`}>
          {isUser && isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                ref={editTextareaRef}
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                onKeyDown={handleEditKeyDown}
                rows={Math.min(Math.max(editContent.split('\n').length, 2), 10)}
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                aria-label="Modifier votre message"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSubmitEdit}
                  disabled={!editContent.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  <Send className="h-3 w-3" aria-hidden="true" />
                  Envoyer
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                  Annuler
                </button>
              </div>
            </div>
          ) : isUser ? (
            <div className="whitespace-pre-wrap text-sm text-foreground">{message.content}</div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground" aria-live={isStreaming ? 'polite' : undefined}>
              <Markdown>{message.content}</Markdown>
            </div>
          )}

          {message.images && imageCount > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.images.filter(isSafeImageSrc).map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Image jointe ${i + 1} sur ${imageCount}`}
                  className="h-32 w-auto rounded-lg border border-border object-cover"
                />
              ))}
            </div>
          )}
        </div>

        {isUser && !isEditing && onEdit && (
          <div className="ml-7 mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 sm:ml-9">
            <button
              type="button"
              onClick={handleStartEdit}
              aria-label="Modifier le message"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Pencil className="h-3 w-3" aria-hidden="true" />
              Modifier
            </button>
          </div>
        )}

        {!isUser && !isStreaming && message.content && (
          <div className="ml-7 mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 sm:ml-9">
            <button
              type="button"
              onClick={handleCopy}
              aria-label={copied ? 'Copié' : 'Copier le message'}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {copied ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
              {copied ? 'Copié' : 'Copier'}
            </button>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                aria-label="Réessayer la réponse"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                Réessayer
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

export const MessageBubble = memo(MessageBubbleImpl)
