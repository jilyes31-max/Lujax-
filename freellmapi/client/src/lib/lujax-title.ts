// Auto-generate conversation titles from the first user message.
// Uses FreeLLMAPI's own /v1/chat/completions to generate a short title.

import { getToken } from './api'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export async function generateTitle(firstMessage: string): Promise<string> {
  const truncated = firstMessage.slice(0, 500)

  try {
    const token = getToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`${BASE}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'Generate a short title (3-6 words max) for this conversation. Reply with ONLY the title, no quotes, no punctuation at the end.',
          },
          { role: 'user', content: truncated },
        ],
        max_tokens: 20,
        temperature: 0.3,
      }),
    })

    if (!res.ok) return fallbackTitle(firstMessage)

    const data = await res.json()
    const title = data.choices?.[0]?.message?.content?.trim()
    if (title && title.length <= 60) return title
    return fallbackTitle(firstMessage)
  } catch {
    return fallbackTitle(firstMessage)
  }
}

function fallbackTitle(message: string): string {
  const clean = message.replace(/\n/g, ' ').trim()
  if (clean.length <= 40) return clean
  return clean.slice(0, 37) + '...'
}
