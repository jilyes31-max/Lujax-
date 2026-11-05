import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { MODEL_TIERS, pickTierModel, friendlyModelName, type ModelTier } from '@/lib/lujax-models'
import type { ModelOption } from '@/lib/model-groups'

interface ModelPickerProps {
  models: ModelOption[]
  selectedModel: string
  onSelect: (modelId: string) => void
}

export function ModelPicker({ models, selectedModel, onSelect }: ModelPickerProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'tiers' | 'all'>('tiers')
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const currentName = friendlyModelName(selectedModel || 'Select model')

  const filteredModels = search
    ? models.filter(m => m.label.toLowerCase().includes(search.toLowerCase()) || m.value.toLowerCase().includes(search.toLowerCase()))
    : models

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <span className="max-w-[180px] truncate">{currentName}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => { setTab('tiers'); setSearch('') }}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${tab === 'tiers' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Quick Pick
            </button>
            <button
              onClick={() => setTab('all')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${tab === 'all' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              All Models ({models.length})
            </button>
          </div>

          {tab === 'tiers' ? (
            <div className="max-h-80 overflow-y-auto p-2">
              {MODEL_TIERS.map(tier => {
                const model = pickTierModel(models, tier.id)
                if (!model) return null
                const isSelected = model.value === selectedModel
                return (
                  <button
                    key={tier.id}
                    onClick={() => { onSelect(model.value); setOpen(false) }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      isSelected ? 'bg-primary/10 text-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-sm">
                      {tier.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{tier.label}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <span className="text-xs text-muted-foreground">{tier.desc}</span>
                      <span className="block text-[10px] text-muted-foreground/60 truncate">{friendlyModelName(model.label)}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <>
              <div className="border-b border-border p-2">
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search models..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none"
                  autoFocus
                />
              </div>
              <div className="max-h-72 overflow-y-auto p-1">
                {filteredModels.slice(0, 100).map(m => (
                  <button
                    key={m.value}
                    onClick={() => { onSelect(m.value); setOpen(false) }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                      m.value === selectedModel ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{m.label}</div>
                      <div className="truncate text-[10px] opacity-60">{m.platform} · {m.value}</div>
                    </div>
                    {m.value === selectedModel && <Check className="ml-2 h-3.5 w-3.5 shrink-0 text-primary" />}
                  </button>
                ))}
                {filteredModels.length > 100 && (
                  <p className="px-3 py-2 text-center text-[10px] text-muted-foreground">
                    + {filteredModels.length - 100} more — refine your search
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
