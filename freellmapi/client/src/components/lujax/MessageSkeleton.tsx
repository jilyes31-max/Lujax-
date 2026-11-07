import { Sparkles } from 'lucide-react'

export function MessageSkeleton() {
  return (
    <article aria-label="Chargement du message" aria-busy="true" className="group py-5 animate-msg-slide-left">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-600">
            <Sparkles className="h-3.5 w-3.5 text-white" aria-hidden="true" />
          </div>
          <span className="text-sm font-medium text-foreground">Lujax</span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-orange-400" aria-hidden="true" />
            Lujax r&eacute;fl&eacute;chit...
          </span>
        </div>
        <div className="ml-9 flex flex-col gap-2.5" role="status" aria-label="Chargement en cours">
          <div className="h-3.5 w-4/5 animate-skeleton-pulse rounded-md bg-muted-foreground/10" />
          <div className="h-3.5 w-3/5 animate-skeleton-pulse rounded-md bg-muted-foreground/10" style={{ animationDelay: '150ms' }} />
          <div className="h-3.5 w-2/5 animate-skeleton-pulse rounded-md bg-muted-foreground/10" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </article>
  )
}
