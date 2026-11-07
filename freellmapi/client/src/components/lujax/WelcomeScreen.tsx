import { memo } from 'react'
import { Sparkles, Code, FileText, Search, ImageIcon, Lightbulb, Terminal, Bug, Database, Wand2, Zap, Settings } from 'lucide-react'
import type { ChatMode } from './ModeSelector'

const chatSuggestions = [
  { icon: Code, text: 'Écris un script Python pour analyser des données CSV', color: 'text-blue-500' },
  { icon: FileText, text: 'Résume ce document pour moi', color: 'text-green-500' },
  { icon: Search, text: 'Recherche les dernières tendances en IA', color: 'text-purple-500' },
  { icon: ImageIcon, text: 'Décris ce que tu vois dans cette image', color: 'text-orange-500' },
  { icon: Lightbulb, text: 'Aide-moi à brainstormer des idées de startup', color: 'text-yellow-500' },
  { icon: Code, text: 'Débogue ce composant React pour moi', color: 'text-cyan-500' },
]

const codeSuggestions = [
  { icon: Terminal, text: 'Crée une API REST avec Express et TypeScript', color: 'text-green-500' },
  { icon: Bug, text: 'Trouve et corrige les bugs dans ce code', color: 'text-red-500' },
  { icon: Database, text: 'Écris une requête SQL optimisée pour cette tâche', color: 'text-blue-500' },
  { icon: Code, text: 'Convertis ce code JavaScript en TypeScript', color: 'text-cyan-500' },
  { icon: Terminal, text: 'Crée un script Bash pour automatiser le déploiement', color: 'text-purple-500' },
  { icon: Code, text: 'Implémente un algorithme de tri efficace', color: 'text-orange-500' },
]

const autoSuggestions = [
  { icon: Wand2, text: 'Analyse mes conversations et suggère des améliorations', color: 'text-purple-500' },
  { icon: Zap, text: 'Optimise mes paramètres pour de meilleures réponses', color: 'text-yellow-500' },
  { icon: Settings, text: 'Crée un profil personnalisé basé sur mes préférences', color: 'text-blue-500' },
  { icon: Wand2, text: 'Génère un résumé de mes habitudes d\'utilisation', color: 'text-green-500' },
  { icon: Zap, text: 'Suggère le meilleur modèle IA pour mes besoins', color: 'text-orange-500' },
  { icon: Lightbulb, text: 'Propose des améliorations pour l\'interface Lujax', color: 'text-cyan-500' },
]

const suggestionsByMode: Record<ChatMode, typeof chatSuggestions> = {
  chat: chatSuggestions,
  code: codeSuggestions,
  auto: autoSuggestions,
}

const subtitleByMode: Record<ChatMode, string> = {
  chat: 'Ta propre IA, gratuite et sans limites',
  code: 'Assistant de code alimenté par l\'IA',
  auto: 'Auto-modification intelligente',
}

const descByMode: Record<ChatMode, string> = {
  chat: 'Je suis Lujax, ton assistant IA personnel. Pose-moi n\'importe quelle question — code, écriture, maths, images, recherche — je suis là pour t\'aider.',
  code: 'Mode Code activé. Je suis optimisé pour écrire, déboguer et expliquer du code. Collez du code ou décrivez ce que vous voulez construire.',
  auto: 'Mode Auto-Modification activé. Je peux analyser vos habitudes, optimiser vos paramètres et suggérer des améliorations personnalisées.',
}

interface WelcomeScreenProps {
  onSuggestionClick: (text: string) => void
  mode?: ChatMode
}

function WelcomeScreenImpl({ onSuggestionClick, mode = 'chat' }: WelcomeScreenProps) {
  const suggestions = suggestionsByMode[mode]
  const modeIcon = mode === 'code' ? Terminal : mode === 'auto' ? Wand2 : Sparkles
  const ModeIcon = modeIcon

  return (
    <section aria-labelledby="welcome-title" className="flex flex-1 flex-col items-center justify-center px-4 pb-32">
      <div className="mb-8 flex items-center gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg ${
          mode === 'code'
            ? 'bg-gradient-to-br from-emerald-400 to-green-600'
            : mode === 'auto'
              ? 'bg-gradient-to-br from-violet-400 to-purple-600'
              : 'bg-gradient-to-br from-orange-400 to-amber-600'
        }`}>
          <ModeIcon className="h-6 w-6 text-white" aria-hidden="true" />
        </div>
        <div>
          <h1 id="welcome-title" className="text-2xl font-semibold text-foreground">
            {mode === 'code' ? 'Lujax Code' : mode === 'auto' ? 'Lujax Auto' : 'Lujax'}
          </h1>
          <p className="text-sm text-muted-foreground">{subtitleByMode[mode]}</p>
        </div>
      </div>

      <p className="mb-8 max-w-md text-center text-muted-foreground">
        {descByMode[mode]}
      </p>

      <h2 id="welcome-suggestions" className="sr-only">Suggestions pour commencer</h2>
      <div role="group" aria-labelledby="welcome-suggestions" className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {suggestions.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSuggestionClick(s.text)}
            aria-label={`Suggestion : ${s.text}`}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-all hover:border-primary/30 hover:bg-accent hover:shadow-sm"
          >
            <s.icon className={`h-4 w-4 shrink-0 ${s.color} transition-transform group-hover:scale-110`} aria-hidden="true" />
            <span className="text-sm text-foreground">{s.text}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

export const WelcomeScreen = memo(WelcomeScreenImpl)
