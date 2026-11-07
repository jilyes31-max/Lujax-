const STORAGE_KEY = 'lujax_settings'

export interface LujaxSettings {
  theme: 'light' | 'dark' | 'system'
  language: 'fr' | 'en'
  voiceAutoRead: boolean
  voiceSpeed: number
  voiceLang: string
  codeMode: boolean
  autoModify: boolean
  customInstructions: string
  userName: string
}

const defaults: LujaxSettings = {
  theme: 'system',
  language: 'fr',
  voiceAutoRead: false,
  voiceSpeed: 1,
  voiceLang: 'fr-FR',
  codeMode: false,
  autoModify: true,
  customInstructions: '',
  userName: '',
}

export function loadSettings(): LujaxSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaults }
    const parsed = JSON.parse(raw)
    const settings: LujaxSettings = { ...defaults, ...parsed }

    // Validate and sanitize individual fields, falling back to defaults
    if (!['light', 'dark', 'system'].includes(settings.theme)) {
      settings.theme = defaults.theme
    }
    if (!['fr', 'en'].includes(settings.language)) {
      settings.language = defaults.language
    }
    const speed = Number(settings.voiceSpeed)
    if (!Number.isFinite(speed) || speed < 0.5 || speed > 2) {
      settings.voiceSpeed = defaults.voiceSpeed
    } else {
      settings.voiceSpeed = speed
    }

    return settings
  } catch {
    return { ...defaults }
  }
}

export function saveSettings(settings: LujaxSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {}
}

export function applyTheme(theme: LujaxSettings['theme']): void {
  const root = document.documentElement
  if (theme === 'system') {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', dark)
  } else {
    root.classList.toggle('dark', theme === 'dark')
  }
}

export interface LujaxCommand {
  action: string
  value: string
}

export function parseLujaxCommands(text: string): LujaxCommand[] {
  const regex = /```lujax-cmd\s*\n?(\{[^`]+\})\s*\n?```/g
  const commands: LujaxCommand[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    try {
      commands.push(JSON.parse(match[1]))
    } catch {}
  }
  return commands
}

export function applyCommand(settings: LujaxSettings, cmd: LujaxCommand): LujaxSettings {
  switch (cmd.action) {
    case 'set_theme':
      if (['light', 'dark', 'system'].includes(cmd.value)) {
        return { ...settings, theme: cmd.value as LujaxSettings['theme'] }
      }
      break
    case 'set_language':
      if (['fr', 'en'].includes(cmd.value)) {
        return { ...settings, language: cmd.value as LujaxSettings['language'], voiceLang: cmd.value === 'fr' ? 'fr-FR' : 'en-US' }
      }
      break
    case 'set_code_mode':
      return { ...settings, codeMode: cmd.value === 'true' }
    case 'set_voice_auto_read':
      return { ...settings, voiceAutoRead: cmd.value === 'true' }
    case 'set_voice_speed': {
      const speed = parseFloat(cmd.value)
      if (speed >= 0.5 && speed <= 2) return { ...settings, voiceSpeed: speed }
      break
    }
  }
  return settings
}

export function buildSystemPrompts(settings: LujaxSettings): string[] {
  const prompts: string[] = []

  const name = settings.userName ? `, et l'utilisateur s'appelle ${settings.userName}` : ''
  prompts.push(
    `Tu es Lujax, une intelligence artificielle avancée, gratuite et open-source. Tu as été créée pour être l'assistant IA le plus accessible au monde${name}. Tu es:
- Intelligente, amicale et polyvalente
- Experte dans tous les domaines: programmation, écriture, mathématiques, sciences, philosophie, créativité
- Capable d'analyser des images et des documents
- Tu donnes des réponses claires, bien structurées et détaillées
- Tu utilises du markdown pour formater tes réponses (titres, listes, blocs de code, etc.)
Quand on te demande qui tu es, tu dis que tu es Lujax, une IA gratuite créée pour aider tout le monde sans restriction. Tu ne dis JAMAIS que tu es ChatGPT, Claude, ou une autre IA.`
  )

  if (settings.customInstructions) {
    prompts.push(`Instructions personnalisées de l'utilisateur:\n${settings.customInstructions}`)
  }

  if (settings.codeMode) {
    prompts.push(
      'Tu es un assistant expert en programmation. Réponds toujours avec du code bien formaté en utilisant des blocs de code avec la syntaxe appropriée. Sois précis, technique et concis. Privilégie les exemples de code pratiques.'
    )
  }

  if (settings.autoModify) {
    prompts.push(
      "Tu peux modifier les paramètres de l'application Lujax. Quand l'utilisateur te demande de changer un paramètre (thème, langue, mode code, etc.), inclus dans ta réponse un bloc:\n" +
      '```lujax-cmd\n{"action":"set_theme","value":"dark"}\n```\n' +
      'Actions: set_theme (light/dark/system), set_language (fr/en), set_code_mode (true/false), set_voice_auto_read (true/false), set_voice_speed (0.5-2). ' +
      "Confirme le changement à l'utilisateur après le bloc de commande."
    )
  }

  if (settings.language === 'fr') {
    prompts.push('Réponds toujours en français.')
  }

  return prompts
}
