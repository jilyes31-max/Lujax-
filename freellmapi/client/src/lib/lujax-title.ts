// Auto-generate conversation titles from the first user message.
// Uses FreeLLMAPI's own /v1/chat/completions to generate a short title.
// Fixed: uses the unified API key (via lujax-config) instead of the
// dashboard token, which is not accepted by the inference endpoint.

import { getSession } from './supabase-auth'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

/** Resolve the unified API key the same way the chat page does. */
async function getLujaxApiKey(): Promise<string> {
  try {
    const headers: Record<string, string> = {}
    const session = await getSession()
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
    const res = await fetch(`${BASE}/api/auth/lujax-config`, { headers })
    if (!res.ok) return ''
    const data = await res.json()
    return data.apiKey || ''
  } catch {
    return ''
  }
}

export async function generateTitle(firstMessage: string): Promise<string> {
  const truncated = firstMessage.slice(0, 500)

  try {
    const apiKey = await getLujaxApiKey()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

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
