export interface Conversation {
  id: string
  subject: string
  topic: string
  status: string
  priority: string
  last_message_at: string
  order_id?: string | null
  order?: {
    id: string
    order_number: string
    status: string
  } | null
}

export function normalizeConversation(conv: Partial<Conversation> | null | undefined): Conversation {
  if (!conv) {
    return {
      id: '',
      subject: 'Support Request',
      topic: 'General',
      status: 'open',
      priority: 'normal',
      last_message_at: new Date().toISOString(),
      order_id: null,
      order: null,
    }
  }
  return {
    ...conv,
    id: conv.id || '',
    subject: conv.subject || 'Support Request',
    topic: conv.topic || 'General',
    status: conv.status || 'open',
    priority: conv.priority || 'normal',
    last_message_at: conv.last_message_at || new Date().toISOString(),
    order_id: conv.order_id || conv.order?.id || null,
    order: conv.order || null,
  }
}
