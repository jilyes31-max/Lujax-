import { memo, useState, useId } from 'react'
import { Check, Copy, RefreshCw, Sparkles, User, ChevronDown, ChevronUp, Globe } from 'lucide-react'
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
}

function MessageBubbleImpl({ message, isStreaming, onRetry }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const [showReasoning, setShowReasoning] = useState(false)
  const reasoningId = useId()
  const isUser = message.role === 'user'
  const isError = message.isError

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
      className={`group py-5 ${isUser ? '' : ''}`}
    >
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-2 flex items-center gap-2">
          {isUser ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground/10">
              <User className="h-3.5 w-3.5 text-foreground/70" aria-hidden="true" />
            </div>
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-600">
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
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-orange-400" aria-hidden="true" />
              Lujax réfléchit...
            </span>
          )}
        </div>

        {message.reasoning && (
          <div className="mb-2 ml-9">
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
          <div className="mb-2 ml-9 flex flex-wrap gap-2">
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

        <div className={`ml-9 ${isError ? 'text-destructive' : ''}`}>
          {isUser ? (
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

        {!isUser && !isStreaming && message.content && (
          <div className="ml-9 mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
