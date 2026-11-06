import { MessageSquare, Terminal, Wand2 } from 'lucide-react'

export type ChatMode = 'chat' | 'code' | 'auto'

interface ModeSelectorProps {
  mode: ChatMode
  onChange: (mode: ChatMode) => void
}

const modes = [
  { value: 'chat' as const, label: 'Chat', icon: MessageSquare },
  { value: 'code' as const, label: 'Code', icon: Terminal },
  { value: 'auto' as const, label: 'Auto', icon: Wand2 },
]

export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="flex items-center rounded-full border border-border bg-muted/40 p-0.5">
      {modes.map(m => {
        const active = mode === m.value
        return (
          <button
            key={m.value}
            onClick={() => onChange(m.value)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
              active
                ? 'bg-foreground text-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <m.icon className="h-3.5 w-3.5" />
            {m.label}
          </button>
        )
      })}
    </div>
  )
}
