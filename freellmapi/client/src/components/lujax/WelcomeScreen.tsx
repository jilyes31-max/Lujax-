import { Sparkles, Code, FileText, Search, ImageIcon, Lightbulb } from 'lucide-react'

const suggestions = [
  { icon: Code, text: 'Write a Python script to analyze CSV data', color: 'text-blue-500' },
  { icon: FileText, text: 'Summarize this document for me', color: 'text-green-500' },
  { icon: Search, text: 'Research the latest trends in AI', color: 'text-purple-500' },
  { icon: ImageIcon, text: 'Describe what you see in this image', color: 'text-orange-500' },
  { icon: Lightbulb, text: 'Help me brainstorm startup ideas', color: 'text-yellow-500' },
  { icon: Code, text: 'Debug this React component for me', color: 'text-cyan-500' },
]

interface WelcomeScreenProps {
  onSuggestionClick: (text: string) => void
}

export function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 pb-32">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-amber-600 shadow-lg">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Lujax</h1>
          <p className="text-sm text-muted-foreground">Free AI, powered by 635 models</p>
        </div>
      </div>

      <p className="mb-8 max-w-md text-center text-muted-foreground">
        Ask me anything. I can write code, analyze documents, search the web, understand images, and much more.
      </p>

      <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggestionClick(s.text)}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-all hover:border-primary/30 hover:bg-accent hover:shadow-sm"
          >
            <s.icon className={`h-4 w-4 shrink-0 ${s.color} transition-transform group-hover:scale-110`} />
            <span className="text-sm text-foreground">{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
