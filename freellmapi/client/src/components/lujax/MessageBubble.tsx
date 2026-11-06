import { useState } from 'react'
import { Check, Copy, RefreshCw, Sparkles, User, ChevronDown, ChevronUp, Globe } from 'lucide-react'
import { Markdown } from '@/components/markdown'
import type { ChatMessage } from '@/pages/LujaxChatPage'
import { friendlyModelName } from '@/lib/lujax-models'

interface MessageBubbleProps {
  message: ChatMessage
  isStreaming?: boolean
  onRetry?: () => void
}

export function MessageBubble({ message, isStreaming, onRetry }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const [showReasoning, setShowReasoning] = useState(false)
  const isUser = message.role === 'user'
  const isError = message.isError

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`group py-5 ${isUser ? '' : ''}`}>
      <div className="mx-auto max-w-3xl px-4">
        {/* Avatar + name row */}
        <div className="mb-2 flex items-center gap-2">
          {isUser ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground/10">
              <User className="h-3.5 w-3.5 text-foreground/70" />
            </div>
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-600">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
          )}
          <span className="text-sm font-medium text-foreground">
            {isUser ? 'You' : 'Lujax'}
          </span>
          {!isUser && typeof message.meta?.model === 'string' && (
            <span className="text-xs text-muted-foreground">
              {friendlyModelName(String(message.meta.model))}
            </span>
          )}
          {isStreaming && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-orange-400" />
              thinking...
            </span>
          )}
        </div>

        {/* Reasoning (collapsible) */}
        {message.reasoning && (
          <div className="mb-2 ml-9">
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {showReasoning ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              Reasoning
            </button>
            {showReasoning && (
              <div className="mt-1 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                <Markdown>{message.reasoning}</Markdown>
              </div>
            )}
          </div>
        )}

        {/* Web search sources */}
        {(message.meta?.webSearch as { sources?: { url: string; title: string }[] })?.sources && (message.meta?.webSearch as { sources?: { url: string; title: string }[] }).sources!.length > 0 && (
          <div className="mb-2 ml-9 flex flex-wrap gap-2">
            {((message.meta?.webSearch as { sources: { url: string; title: string }[] }).sources).slice(0, 4).map((source: { url: string; title: string }, i: number) => (
              <a
                key={i}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              >
                <Globe className="h-3 w-3" />
                <span className="max-w-[150px] truncate">{source.title}</span>
              </a>
            ))}
          </div>
        )}

        {/* Message content */}
        <div className={`ml-9 ${isError ? 'text-destructive' : ''}`}>
          {isUser ? (
            <div className="whitespace-pre-wrap text-sm text-foreground">{message.content}</div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
              <Markdown>{message.content}</Markdown>
            </div>
          )}

          {/* User images */}
          {message.images && message.images.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Attachment ${i + 1}`}
                  className="h-32 w-auto rounded-lg border border-border object-cover"
                />
              ))}
            </div>
          )}
        </div>

        {/* Action buttons (show on hover for assistant messages) */}
        {!isUser && !isStreaming && message.content && (
          <div className="ml-9 mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
