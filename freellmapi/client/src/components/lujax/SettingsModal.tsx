import { useState, useEffect } from 'react'
import { X, Sun, Moon, Monitor, Globe, Mic, Code, Wand2, Sparkles, Info, User, MessageSquarePlus } from 'lucide-react'
import { loadSettings, saveSettings, applyTheme, type LujaxSettings } from '@/lib/lujax-settings'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  onSettingsChange: (settings: LujaxSettings) => void
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative h-5 w-9 rounded-full transition-colors ${on ? 'bg-orange-500' : 'bg-muted-foreground/30'}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}

export function SettingsModal({ open, onClose, onSettingsChange }: SettingsModalProps) {
  const [settings, setSettings] = useState<LujaxSettings>(loadSettings)

  useEffect(() => {
    if (open) setSettings(loadSettings())
  }, [open])

  const update = (patch: Partial<LujaxSettings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(next)
    onSettingsChange(next)
    if ('theme' in patch) applyTheme(next.theme)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
          <X className="h-4 w-4" />
        </button>

        <h2 className="mb-6 text-lg font-semibold text-foreground">Paramètres</h2>

        {/* Thème */}
        <section className="mb-5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <Sun className="h-4 w-4" /> Thème
          </h3>
          <div className="flex gap-2">
            {([
              { value: 'light' as const, label: 'Clair', Icon: Sun },
              { value: 'dark' as const, label: 'Sombre', Icon: Moon },
              { value: 'system' as const, label: 'Système', Icon: Monitor },
            ]).map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => update({ theme: value })}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                  settings.theme === value
                    ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                    : 'border-border text-muted-foreground hover:border-orange-500/30 hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        </section>

        {/* Langue */}
        <section className="mb-5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <Globe className="h-4 w-4" /> Langue
          </h3>
          <div className="flex gap-2">
            {([
              { value: 'fr' as const, label: 'Français' },
              { value: 'en' as const, label: 'English' },
            ]).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => update({ language: value, voiceLang: value === 'fr' ? 'fr-FR' : 'en-US' })}
                className={`flex flex-1 items-center justify-center rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                  settings.language === value
                    ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                    : 'border-border text-muted-foreground hover:border-orange-500/30 hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Mode vocal */}
        <section className="mb-5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <Mic className="h-4 w-4" /> Mode vocal
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span className="text-xs text-foreground">Lecture automatique des réponses</span>
              <Toggle on={settings.voiceAutoRead} onToggle={() => update({ voiceAutoRead: !settings.voiceAutoRead })} />
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <span className="shrink-0 text-xs text-foreground">Vitesse</span>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={settings.voiceSpeed}
                onChange={e => update({ voiceSpeed: parseFloat(e.target.value) })}
                className="flex-1 accent-orange-500"
              />
              <span className="w-8 text-right text-xs text-muted-foreground">{settings.voiceSpeed}x</span>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Langue vocale</label>
              <select
                value={settings.voiceLang}
                onChange={e => update({ voiceLang: e.target.value })}
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs text-foreground focus:border-orange-500/50 focus:outline-none"
              >
                <option value="fr-FR">Français</option>
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="es-ES">Español</option>
                <option value="de-DE">Deutsch</option>
                <option value="ar-SA">العربية</option>
              </select>
            </div>
          </div>
        </section>

        {/* Mode Claude Code */}
        <section className="mb-5">
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <span className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Code className="h-3.5 w-3.5" /> Mode Claude Code
            </span>
            <Toggle on={settings.codeMode} onToggle={() => update({ codeMode: !settings.codeMode })} />
          </div>
          <p className="mt-1 px-1 text-[10px] text-muted-foreground">
            Optimise les réponses pour la programmation avec du code bien formaté
          </p>
        </section>

        {/* Auto-modification */}
        <section className="mb-5">
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <span className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Wand2 className="h-3.5 w-3.5" /> Auto-modification
            </span>
            <Toggle on={settings.autoModify} onToggle={() => update({ autoModify: !settings.autoModify })} />
          </div>
          <p className="mt-1 px-1 text-[10px] text-muted-foreground">
            Permet à Lujax de modifier ses paramètres via le chat (ex: "passe en mode sombre")
          </p>
        </section>

        {/* Identité */}
        <section className="mb-5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <User className="h-4 w-4" /> Ton nom
          </h3>
          <input
            value={settings.userName}
            onChange={e => update({ userName: e.target.value })}
            placeholder="Comment tu t'appelles ?"
            className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-orange-500/50 focus:outline-none"
          />
          <p className="mt-1 px-1 text-[10px] text-muted-foreground">
            Lujax utilisera ton nom pour personnaliser ses réponses
          </p>
        </section>

        {/* Instructions personnalisées */}
        <section className="mb-5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <MessageSquarePlus className="h-4 w-4" /> Instructions personnalisées
          </h3>
          <textarea
            value={settings.customInstructions}
            onChange={e => update({ customInstructions: e.target.value })}
            placeholder="Dis à Lujax comment tu veux qu'elle se comporte...&#10;&#10;Ex: Tu es un expert en Python. Réponds toujours avec des exemples de code. Utilise un ton décontracté."
            rows={4}
            className="w-full resize-none rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-orange-500/50 focus:outline-none"
          />
          <p className="mt-1 px-1 text-[10px] text-muted-foreground">
            Ces instructions seront envoyées avec chaque message pour personnaliser l'IA
          </p>
        </section>

        {/* À propos */}
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <Info className="h-4 w-4" /> À propos
          </h3>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-amber-600">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Lujax</p>
                <p className="text-[10px] text-muted-foreground">v1.0.0</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Ta propre IA, 100% gratuite. Pas besoin de clé API. Propulsé par 53+ modèles gratuits. Personnalise-la avec tes instructions.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
