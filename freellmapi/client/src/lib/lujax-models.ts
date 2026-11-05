// Smart model grouping: collapse 635 provider-specific models into friendly tiers
// so the UI feels like Claude's simple model picker, not a provider dashboard.

import type { ModelOption } from './model-groups'

export interface ModelTier {
  id: string
  label: string
  desc: string
  icon: string
}

export const MODEL_TIERS: ModelTier[] = [
  { id: 'best',     label: 'Best',      desc: 'Most capable model available',    icon: '✦' },
  { id: 'fast',     label: 'Fast',      desc: 'Quick responses, good quality',   icon: '⚡' },
  { id: 'balanced', label: 'Balanced',  desc: 'Speed and quality in balance',    icon: '◎' },
  { id: 'vision',   label: 'Vision',    desc: 'Can understand images',           icon: '👁' },
  { id: 'code',     label: 'Code',      desc: 'Optimized for programming',       icon: '▦' },
  { id: 'reason',   label: 'Reasoning', desc: 'Deep thinking and analysis',      icon: '◇' },
]

const CODE_KEYWORDS = /code|coder|starcoder|codestral|deepseek-coder|qwen.*coder/i
const REASON_KEYWORDS = /think|reason|r1|qwq|o1|o3|o4/i

export function pickTierModel(
  models: ModelOption[],
  tierId: string,
): ModelOption | undefined {
  if (!models.length) return undefined
  const sorted = [...models]

  switch (tierId) {
    case 'best':
      sorted.sort((a, b) => a.sizeTier - b.sizeTier || a.intelligenceRank - b.intelligenceRank)
      return sorted[0]
    case 'fast':
      sorted.sort((a, b) => b.sizeTier - a.sizeTier || b.intelligenceRank - a.intelligenceRank)
      return sorted[0]
    case 'balanced':
      sorted.sort((a, b) => (a.sizeTier + a.intelligenceRank) - (b.sizeTier + b.intelligenceRank))
      return sorted[Math.floor(sorted.length * 0.3)]
    case 'vision':
      return sorted.find(m => /vision|gemini|gpt-4|claude|pixtral/i.test(m.label))
        || sorted[0]
    case 'code':
      return sorted.find(m => CODE_KEYWORDS.test(m.value) || CODE_KEYWORDS.test(m.label))
        || sorted[0]
    case 'reason':
      return sorted.find(m => REASON_KEYWORDS.test(m.value) || REASON_KEYWORDS.test(m.label))
        || sorted[0]
    default:
      return sorted[0]
  }
}

export function friendlyModelName(model: string): string {
  return model
    .replace(/^(google|groq|cerebras|mistral|openrouter|cloudflare|cohere|nvidia|huggingface|opencode|ollama):/, '')
    .replace(/@.*$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
}
