import { useState } from 'react'
import { Plus, Search, Trash2, Edit3, Check, X, Sparkles, MessageSquare, LogOut } from 'lucide-react'

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

export function ChatSidebar({ conversations, activeId, onSelect, onNew, onDelete, onRename, isOpen, onClose, userEmail, onSignOut }: ChatSidebarProps) {
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const filtered = search
    ? conversations.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    : conversations

  const grouped = groupByDate(filtered)
  const groupOrder = ['Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days', 'Older']

  const startRename = (c: ConversationSummary) => {
    setEditingId(c.id)
    setEditTitle(c.title)
  }

  const confirmRename = () => {
    if (editingId !== null && editTitle.trim()) {
      onRename(editingId, editTitle.trim())
    }
    setEditingId(null)
  }

  return (
    <>
      {isOpen && onClose && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <aside
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
            onClick={onNew}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="New chat"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full rounded-lg border border-border bg-muted/30 py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {filtered.length === 0 ? (
            <div className="mt-8 text-center text-xs text-muted-foreground">
              {search ? 'No matching conversations' : 'No conversations yet'}
            </div>
          ) : (
            groupOrder.map(label => {
              const items = grouped[label]
              if (!items?.length) return null
              return (
                <div key={label} className="mb-3">
                  <h3 className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {label}
                  </h3>
                  {items.map(c => (
                    <div
                      key={c.id}
                      className={`group/item flex items-center rounded-lg px-2 py-1.5 text-sm transition-colors ${
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
                            onKeyDown={e => e.key === 'Enter' && confirmRename()}
                            className="flex-1 rounded bg-background px-1 py-0.5 text-xs focus:outline-none"
                            autoFocus
                          />
                          <button onClick={confirmRename} className="text-green-500"><Check className="h-3 w-3" /></button>
                          <button onClick={() => setEditingId(null)} className="text-muted-foreground"><X className="h-3 w-3" /></button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => onSelect(c.id)}
                            className="flex flex-1 items-center gap-2 truncate text-left"
                          >
                            <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />
                            <span className="truncate text-xs">{c.title}</span>
                          </button>
                          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/item:opacity-100">
                            <button
                              onClick={e => { e.stopPropagation(); startRename(c) }}
                              className="rounded p-0.5 hover:bg-accent"
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); onDelete(c.id) }}
                              className="rounded p-0.5 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )
            })
          )}
        </div>

        {userEmail && (
          <div className="border-t border-border p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">{userEmail}</p>
                <p className="text-[10px] text-muted-foreground">Free plan</p>
              </div>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
