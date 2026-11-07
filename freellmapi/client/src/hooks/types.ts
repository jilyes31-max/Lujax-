export interface ChatMessage {
  id?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  reasoning?: string
  images?: string[]
  meta?: Record<string, unknown>
  isError?: boolean
  streaming?: boolean
}

export interface ConversationSummary {
  id: string
  title: string
  updatedAt: number
}
