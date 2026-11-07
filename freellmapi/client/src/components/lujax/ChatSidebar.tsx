import { useRef, useState, type KeyboardEvent } from 'react'
import { Plus, Search, Trash2, Edit3, Check, X, Sparkles, MessageSquare, LogOut, Settings } from 'lucide-react'

interface ConversationSummary {
  id: string
  title: string
  updatedAt: number
}

interface ChatSidebarProps {
  conversations: ConversationSummary[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
  isOpen: boolean
  onClose?: () => void
  userEmail?: string
  onSignOut?: () => void
  onSettings?: () => void
}

function groupByDate(conversations: ConversationSummary[]): Record<string, ConversationSummary[]> {
  const now = Date.now()
  const day = 86400000
  const groups: Record<string, ConversationSummary[]> = {}

  for (const c of conversations) {
    const age = now - c.updatedAt
    let label: string
    if (age < day) label = 'Today'
    else if (age < 2 * day) label = 'Yesterday'
    else if (age < 7 * day) label = 'Previous 7 Days'
    else if (age < 30 * day) label = 'Previous 30 Days'
    else label = 'Older'

    if (!groups[label]) groups[label] = []
    groups[label].push(c)
  }
  return groups
}

export function ChatSidebar({ conversations, activeId, onSelect, onNew, onDelete, onRename, isOpen, onClose, userEmail, onSignOut, onSettings }: ChatSidebarProps) {
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = search
    ? conversations.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    : conversations

  const grouped = groupByDate(filtered)
  const groupOrder = ['Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days', 'Older']

  const startRename = (c: ConversationSummary) => {
    setEditingId(c.id)
    setEditTitle(c.title)
  }

  const restoreOptionFocus = (id: string | null) => {
    if (!id) return
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>(`[role="option"][data-convo-id="${id}"]`)?.focus()
    })
  }

  const confirmRename = () => {
    const id = editingId
    if (id !== null && editTitle.trim()) {
      onRename(id, editTitle.trim())
    }
    setEditingId(null)
    restoreOptionFocus(id)
  }

  const cancelRename = () => {
    const id = editingId
    setEditingId(null)
    restoreOptionFocus(id)
  }

  // Roving tabindex: the active conversation (or the first one) is the single tab stop.
  const tabStopId = filtered.some(c => c.id === activeId) ? activeId : filtered[0]?.id ?? null

  const handleOptionKeyDown = (e: KeyboardEvent<HTMLDivElement>, c: ConversationSummary) => {
    if (e.target !== e.currentTarget) return
    const options = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])
    const index = options.indexOf(e.currentTarget)
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        options[Math.min(index + 1, options.length - 1)]?.focus()
        break
      case 'ArrowUp':
        e.preventDefault()
        options[Math.max(index - 1, 0)]?.focus()
        break
      case 'Home':
        e.preventDefault()
        options[0]?.focus()
        break
      case 'End':
        e.preventDefault()
        options[options.length - 1]?.focus()
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        onSelect(c.id)
        break
      case 'F2':
        e.preventDefault()
        startRename(c)
        break
    }
  }

  return (
    <>
      {isOpen && onClose && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <aside
        role="navigation"
        aria-label="Conversations"
        className={`fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-border bg-background transition-transform lg:relative lg:z-0 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-amber-600">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-foreground">Lujax</span>
          </div>
          <button
            type="button"
            onClick={onNew}
            aria-label="Nouvelle conversation"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Nouvelle conversation"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              aria-label="Rechercher dans les conversations"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full rounded-lg border border-border bg-muted/30 py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {filtered.length === 0 ? (
            <div role="status" className="mt-8 text-center text-xs text-muted-foreground">
              {search ? 'No matching conversations' : 'No conversations yet'}
            </div>
          ) : (
            <div ref={listRef} role="listbox" aria-label="Liste des conversations">
            {groupOrder.map(label => {
              const items = grouped[label]
              if (!items?.length) return null
              return (
                <div key={label} role="group" aria-labelledby={`convo-group-${label.replace(/\s+/g, '-')}`} className="mb-3">
                  <h3
                    id={`convo-group-${label.replace(/\s+/g, '-')}`}
                    className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {label}
                  </h3>
                  {items.map(c => (
                    <div
                      key={c.id}
                      role="option"
                      data-convo-id={c.id}
                      aria-selected={c.id === activeId}
                      aria-label={c.title}
                      tabIndex={editingId === c.id ? -1 : c.id === tabStopId ? 0 : -1}
                      onKeyDown={e => handleOptionKeyDown(e, c)}
                      className={`group/item flex items-center rounded-lg px-2 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                        c.id === activeId
                          ? 'bg-accent text-foreground'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                      }`}
                    >
                      {editingId === c.id ? (
                        <div className="flex flex-1 items-center gap-1">
                          <input
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            onKeyDown={e => {
                              e.stopPropagation()
                              if (e.key === 'Enter') confirmRename()
                              else if (e.key === 'Escape') cancelRename()
                            }}
                            aria-label="Nouveau titre de la conversation"
                            className="flex-1 rounded bg-background px-1 py-0.5 text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                            autoFocus
                          />
                          <button type="button" onClick={confirmRename} aria-label="Valider le nouveau titre" className="text-green-500"><Check className="h-3 w-3" aria-hidden="true" /></button>
                          <button type="button" onClick={cancelRename} aria-label="Annuler le renommage" className="text-muted-foreground"><X className="h-3 w-3" aria-hidden="true" /></button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => onSelect(c.id)}
                            className="flex flex-1 items-center gap-2 truncate text-left"
                          >
                            <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true" />
                            <span className="truncate text-xs">{c.title}</span>
                          </button>
                          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-focus-within/item:opacity-100 group-hover/item:opacity-100">
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); startRename(c) }}
                              aria-label={`Renommer la conversation ${c.title}`}
                              className="rounded p-0.5 hover:bg-accent"
                            >
                              <Edit3 className="h-3 w-3" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); onDelete(c.id) }}
                              aria-label={`Supprimer la conversation ${c.title}`}
                              className="rounded p-0.5 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
            </div>
          )}
        </div>

        {userEmail && (
          <div className="border-t border-border p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">{userEmail}</p>
                <p className="text-[10px] text-muted-foreground">Free plan</p>
              </div>
              <div className="flex items-center gap-1">
                {onSettings && (
                  <button
                    type="button"
                    onClick={onSettings}
                    aria-label="Paramètres"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    title="Paramètres"
                  >
                    <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    aria-label="Se déconnecter"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    title="Se déconnecter"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
