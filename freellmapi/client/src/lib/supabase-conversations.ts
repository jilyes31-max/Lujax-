import { supabase } from './supabase'

export interface SBConversation {
  id: string
  title: string
  model: string
  pinned: boolean
  created_at: string
  updated_at: string
}

export interface SBMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  reasoning: string | null
  images: string[] | null
  meta: Record<string, unknown>
  is_error: boolean
  created_at: string
}

export async function listConversations(): Promise<SBConversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, title, model, pinned, created_at, updated_at')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getConversation(id: string) {
  const [convoRes, msgsRes] = await Promise.all([
    supabase.from('conversations').select('*').eq('id', id).single(),
    supabase.from('messages').select('*').eq('conversation_id', id).order('created_at', { ascending: true }),
  ])
  if (convoRes.error) throw convoRes.error
  return {
    ...convoRes.data as SBConversation,
    messages: (msgsRes.data || []) as SBMessage[],
  }
}

export async function createConversation(title: string, model: string): Promise<SBConversation> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: user.id, title, model })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateConversation(id: string, updates: Partial<Pick<SBConversation, 'title' | 'model' | 'pinned'>>) {
  const { error } = await supabase
    .from('conversations')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

export async function deleteConversation(id: string) {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function addMessage(conversationId: string, msg: {
  role: string
  content: string
  reasoning?: string
  images?: string[]
  meta?: Record<string, unknown>
  is_error?: boolean
}): Promise<SBMessage> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: msg.role,
      content: msg.content,
      reasoning: msg.reasoning || null,
      images: msg.images || null,
      meta: msg.meta || {},
      is_error: msg.is_error || false,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function addMessages(conversationId: string, msgs: {
  role: string
  content: string
  reasoning?: string
  images?: string[]
  meta?: Record<string, unknown>
  is_error?: boolean
}[]): Promise<SBMessage[]> {
  const rows = msgs.map(msg => ({
    conversation_id: conversationId,
    role: msg.role,
    content: msg.content,
    reasoning: msg.reasoning || null,
    images: msg.images || null,
    meta: msg.meta || {},
    is_error: msg.is_error || false,
  }))
  const { data, error } = await supabase
    .from('messages')
    .insert(rows)
    .select()
  if (error) throw error
  return data || []
}
