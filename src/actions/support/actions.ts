'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkAdminAuth } from '@/actions/catalog/actions'
import { resolveApplicationSession } from '@/lib/auth/resolveApplicationSession'

// Enforces customer authentication and returns their customer ID
async function getAuthCustomerId() {
  const session = await resolveApplicationSession()
  if (session.type !== 'customer') {
    throw new Error('Please log in to talk to support.')
  }
  return session.customerId
}

export async function getUnreadSupportCountAction(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const session = await resolveApplicationSession()
    const supabase = createAdminClient()

    if (session.type === 'admin') {
      const { data, error } = await supabase
        .from('support_conversations')
        .select('admin_last_read_at, last_message_at')
        .in('status', ['open', 'assigned'])

      if (error) return { success: false, count: 0, error: error.message }

      const unreadCount = (data || []).filter(c => {
        if (!c.admin_last_read_at) return true
        return new Date(c.admin_last_read_at).getTime() < new Date(c.last_message_at).getTime()
      }).length

      return { success: true, count: unreadCount }
    } else if (session.type === 'customer') {
      const { data, error } = await supabase
        .from('support_conversations')
        .select('customer_last_read_at, last_message_at')
        .eq('customer_id', session.customerId)

      if (error) return { success: false, count: 0, error: error.message }

      const unreadCount = (data || []).filter(c => {
        if (!c.customer_last_read_at) return true
        return new Date(c.customer_last_read_at).getTime() < new Date(c.last_message_at).getTime()
      }).length

      return { success: true, count: unreadCount }
    }
    return { success: true, count: 0 }
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'Unable to load support count' }
  }
}

export async function getConversationsAction(params: {
  status?: string
  priority?: string
  topic?: string
  assignedAdmin?: string
  search?: string
  page?: number
  limit?: number
}): Promise<{ success: boolean; data?: any[]; totalCount?: number; error?: string }> {
  try {
    const session = await resolveApplicationSession()
    const supabase = createAdminClient()
    const page = params.page || 1
    const limit = params.limit || 20
    const offset = (page - 1) * limit

    if (session.type === 'admin') {
      await checkAdminAuth('support.manage')

      let query = supabase
        .from('support_conversations')
        .select(`
          *,
          customer:profiles(id, full_name, email),
          assigned_admin:admin_users(id, full_name)
        `, { count: 'exact' })

      // Apply filters
      if (params.status && params.status !== 'all') {
        query = query.eq('status', params.status)
      }
      if (params.priority && params.priority !== 'all') {
        query = query.eq('priority', params.priority)
      }
      if (params.topic && params.topic !== 'all') {
        query = query.eq('topic', params.topic)
      }
      if (params.assignedAdmin) {
        if (params.assignedAdmin === 'unassigned') {
          query = query.is('assigned_admin_id', null)
        } else {
          query = query.eq('assigned_admin_id', params.assignedAdmin)
        }
      }

      // We will perform pagination and sorting
      query = query
        .order('last_message_at', { ascending: false })
        .range(offset, offset + limit - 1)

      const { data, count, error } = await query

      if (error) return { success: false, error: error.message }

      // Custom search filter on returned data (since joins on profiles can't easily be filtered in basic Supabase search without text search configuration)
      let filteredData = data || []
      if (params.search && params.search.trim()) {
        const search = params.search.toLowerCase().trim()
        filteredData = filteredData.filter((c: any) => {
          const nameMatch = c.customer?.full_name?.toLowerCase().includes(search) || c.guest_name?.toLowerCase().includes(search)
          const emailMatch = c.customer?.email?.toLowerCase().includes(search) || c.guest_email?.toLowerCase().includes(search)
          const subjectMatch = c.subject?.toLowerCase().includes(search)
          return nameMatch || emailMatch || subjectMatch
        })
      }

      return { success: true, data: filteredData, totalCount: count ?? 0 }
    } else if (session.type === 'customer') {
      const { data, error } = await supabase
        .from('support_conversations')
        .select(`
          *,
          order:orders(id, order_number, status)
        `)
        .eq('customer_id', session.customerId)
        .order('last_message_at', { ascending: false })

      if (error) return { success: false, error: error.message }
      return { success: true, data: data || [], totalCount: data?.length ?? 0 }
    }

    return { success: false, error: 'Please log in to talk to support.' }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getMessagesAction(conversationId: string): Promise<{ success: boolean; data?: any[]; conversation?: any; error?: string }> {
  try {
    const session = await resolveApplicationSession()
    const supabase = createAdminClient()

    // Retrieve conversation first to check ownership
    const { data: conv, error: convErr } = await supabase
      .from('support_conversations')
      .select(`
        *,
        customer:profiles(id, full_name, email),
        order:orders(id, order_number, status)
      `)
      .eq('id', conversationId)
      .maybeSingle()

    if (convErr || !conv) {
      return { success: false, error: 'This conversation is no longer available.' }
    }

    // Check authorization
    if (session.type === 'customer') {
      if (conv.customer_id !== session.customerId) {
        return { success: false, error: 'You do not have permission to view this conversation.' }
      }
    } else if (session.type === 'admin') {
      await checkAdminAuth('support.manage')
    } else {
      return { success: false, error: 'Authentication required.' }
    }

    // Mark as read
    const nowStr = new Date().toISOString()
    if (session.type === 'customer') {
      await supabase
        .from('support_conversations')
        .update({ customer_last_read_at: nowStr })
        .eq('id', conversationId)
    } else {
      await supabase
        .from('support_conversations')
        .update({ admin_last_read_at: nowStr })
        .eq('id', conversationId)
    }

    // Query messages
    let query = supabase
      .from('support_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (session.type === 'customer') {
      query = query.eq('is_internal_note', false)
    }

    const { data: messages, error: msgErr } = await query

    if (msgErr) return { success: false, error: msgErr.message }

    revalidatePath('/admin/support')

    return { success: true, data: messages || [], conversation: conv }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function createConversationAction(input: {
  topic: string
  subject: string
  message: string
  orderId?: string
}): Promise<{ success: boolean; conversationId?: string; conversation?: any; error?: string }> {
  try {
    const customerId = await getAuthCustomerId()

    // Validate inputs
    const subject = input.subject.trim()
    const message = input.message.trim()

    if (!input.topic || input.topic.trim() === '') {
      return { success: false, error: 'Topic is required.' }
    }
    if (subject.length < 3 || subject.length > 150) {
      return { success: false, error: 'Subject must be between 3 and 150 characters.' }
    }
    if (message.length < 1 || message.length > 5000) {
      return { success: false, error: 'Message must be between 1 and 5000 characters.' }
    }

    const supabase = createAdminClient()

    // Validate order ownership if orderId provided
    if (input.orderId) {
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .select('id')
        .eq('id', input.orderId)
        .eq('user_id', customerId)
        .maybeSingle()

      if (orderErr || !order) {
        return { success: false, error: 'Invalid order selected.' }
      }
    }

    // Escape message / subject plain text (basic HTML sanitization/escaping)
    const escapedSubject = subject.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const escapedMessage = message.replace(/</g, '&lt;').replace(/>/g, '&gt;')

    // Insert conversation
    const { data: conv, error: convErr } = await supabase
      .from('support_conversations')
      .insert({
        customer_id: customerId,
        order_id: input.orderId || null,
        subject: escapedSubject,
        topic: input.topic,
        status: 'open',
        priority: 'normal',
        last_message_at: new Date().toISOString()
      })
      .select('*')
      .single()

    if (convErr || !conv) {
      return { success: false, error: 'Unable to start your conversation. Please try again.' }
    }

    // Insert initial message
    const { error: msgErr } = await supabase
      .from('support_messages')
      .insert({
        conversation_id: conv.id,
        sender_type: 'customer',
        sender_customer_id: customerId,
        message: escapedMessage
      })

    if (msgErr) {
      return { success: false, error: 'Unable to send your message. Please try again.' }
    }

    revalidatePath('/admin/support')

    return { success: true, conversationId: conv.id, conversation: conv }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function sendSupportMessageAction(
  conversationId: string,
  messageText: string,
  isInternalNote: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await resolveApplicationSession()
    const supabase = createAdminClient()

    const message = messageText.trim()
    if (message.length < 1 || message.length > 5000) {
      return { success: false, error: 'Enter a message.' }
    }

    // Escaping
    const escapedMessage = message.replace(/</g, '&lt;').replace(/>/g, '&gt;')

    // Fetch conversation details
    const { data: conv, error: convErr } = await supabase
      .from('support_conversations')
      .select('customer_id, status')
      .eq('id', conversationId)
      .maybeSingle()

    if (convErr || !conv) {
      return { success: false, error: 'This conversation is no longer available.' }
    }

    const nowStr = new Date().toISOString()

    if (session.type === 'customer') {
      if (conv.customer_id !== session.customerId) {
        return { success: false, error: 'You do not have permission to reply to this conversation.' }
      }

      // Customer sends message
      const { error: msgErr } = await supabase
        .from('support_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'customer',
          sender_customer_id: session.customerId,
          message: escapedMessage
        })

      if (msgErr) return { success: false, error: 'Unable to send your message. Please try again.' }

      // Update conversation last_message_at and reopen if resolved/closed
      const newStatus = (conv.status === 'resolved' || conv.status === 'closed') ? 'open' : conv.status
      await supabase
        .from('support_conversations')
        .update({
          last_message_at: nowStr,
          customer_last_read_at: nowStr,
          status: newStatus
        })
        .eq('id', conversationId)

    } else if (session.type === 'admin') {
      await checkAdminAuth('support.manage')

      // Admin sends message/note
      const { error: msgErr } = await supabase
        .from('support_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'admin',
          sender_admin_id: session.adminUserId,
          message: escapedMessage,
          is_internal_note: isInternalNote
        })

      if (msgErr) return { success: false, error: 'Unable to send the reply.' }

      // Update conversation details
      const updatePayload: any = {
        last_message_at: nowStr,
        admin_last_read_at: nowStr
      }
      
      // If it's not an internal note, set status to waiting_for_customer
      if (!isInternalNote) {
        updatePayload.status = 'waiting_for_customer'
      }

      await supabase
        .from('support_conversations')
        .update(updatePayload)
        .eq('id', conversationId)
    } else {
      return { success: false, error: 'Authentication required.' }
    }

    revalidatePath('/admin/support')

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function updateConversationMetaAction(
  conversationId: string,
  meta: {
    status?: 'open' | 'assigned' | 'waiting_for_customer' | 'resolved' | 'closed'
    priority?: 'low' | 'normal' | 'high' | 'urgent'
    assignedAdminId?: string | null
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUserId = await checkAdminAuth('support.manage')
    const supabase = createAdminClient()

    const updatePayload: any = {
      updated_at: new Date().toISOString()
    }

    if (meta.status) updatePayload.status = meta.status
    if (meta.priority) updatePayload.priority = meta.priority
    if (meta.assignedAdminId !== undefined) {
      updatePayload.assigned_admin_id = meta.assignedAdminId
      if (meta.assignedAdminId && !meta.status) {
        // Auto update status to assigned if assigning agent
        updatePayload.status = 'assigned'
      }
    }

    const { error } = await supabase
      .from('support_conversations')
      .update(updatePayload)
      .eq('id', conversationId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/admin/support')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getSupportAdminsAction(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    await checkAdminAuth('support.manage')
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, full_name')
      .eq('is_active', true)

    if (error) return { success: false, error: error.message }
    return { success: true, data: data || [] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getCustomerOrdersAction(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const customerId = await getAuthCustomerId()
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, status, created_at')
      .eq('user_id', customerId)
      .order('created_at', { ascending: false })

    if (error) return { success: false, error: error.message }
    return { success: true, data: data || [] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

import { checkContactRateLimit } from '@/lib/rateLimit'
import { headers } from 'next/headers'

export interface ContactSubmissionInput {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  honeypot?: string
}

export async function submitContactToSupportAction(input: ContactSubmissionInput): Promise<{
  success: boolean
  reference?: string
  conversationId?: string
  error?: string
}> {
  try {
    // 1. Honeypot check
    if (input.honeypot && input.honeypot.trim() !== '') {
      return { success: false, error: 'Spam submission detected.' }
    }

    // 2. Full Name validation
    const name = input.name?.trim() || ''
    if (name.length < 2 || name.length > 100) {
      return { success: false, error: 'Full name must be between 2 and 100 characters.' }
    }

    // 3. Email validation
    const email = input.email?.trim().toLowerCase() || ''
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email) || email.length > 255) {
      return { success: false, error: 'Please enter a valid email address.' }
    }

    // 4. Phone validation
    const phone = input.phone?.trim() || ''
    if (phone && phone.length > 50) {
      return { success: false, error: 'Phone number must be under 50 characters.' }
    }

    // 5. Subject validation
    const subject = input.subject?.trim() || ''
    if (subject.length < 3 || subject.length > 150) {
      return { success: false, error: 'Subject must be between 3 and 150 characters.' }
    }

    // 6. Message validation
    const message = input.message?.trim() || ''
    if (message.length < 10 || message.length > 3000) {
      return { success: false, error: 'Message must be between 10 and 3000 characters.' }
    }

    // 7. Server-side Rate Limiting & Duplicate Protection
    let clientIp = '127.0.0.1'
    try {
      const headerList = await headers()
      clientIp = headerList.get('x-forwarded-for')?.split(',')[0]?.trim() || headerList.get('x-real-ip') || '127.0.0.1'
    } catch {
      // Ignore if headers() unavailable in test environment
    }

    const rateLimitResult = checkContactRateLimit(clientIp, email, subject, message)
    if (!rateLimitResult.allowed) {
      return { success: false, error: rateLimitResult.error || 'Rate limit exceeded. Please try again later.' }
    }

    // 8. Resolve session if logged in
    const session = await resolveApplicationSession()
    let customerId: string | null = null
    if (session.type === 'customer') {
      customerId = session.customerId
    }

    const supabase = createAdminClient()
    const escapedSubject = subject.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const escapedMessage = message.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const crypto = await import('crypto')

    let referenceNumber = ''
    let rpcRes: any = null
    let rpcErr: any = null

    // 9. Execute Atomic RPC `create_contact_support_conversation` with retry loop for reference collisions
    for (let attempt = 1; attempt <= 3; attempt++) {
      const randHex = crypto.randomBytes(4).toString('hex').toUpperCase() // 8 hex characters
      referenceNumber = `SHR-SUP-${dateStr}-${randHex}`

      const res = await supabase.rpc('create_contact_support_conversation', {
        p_customer_id: customerId,
        p_guest_name: name,
        p_guest_email: email,
        p_guest_phone: phone || null,
        p_subject: escapedSubject,
        p_topic: subject,
        p_message: escapedMessage,
        p_source: 'contact_page',
        p_reference_number: referenceNumber
      })

      if (!res.error && res.data && res.data.length > 0) {
        rpcRes = res.data
        rpcErr = null
        break
      }
      rpcErr = res.error
    }

    if (!rpcErr && rpcRes && rpcRes.length > 0) {
      revalidatePath('/admin/support')
      return {
        success: true,
        reference: rpcRes[0].reference_number || referenceNumber,
        conversationId: rpcRes[0].conversation_id
      }
    }

    // Fallback if migration RPC not yet applied in environment
    const nowStr = now.toISOString()
    const fallbackRand = crypto.randomBytes(4).toString('hex').toUpperCase()
    referenceNumber = `SHR-SUP-${dateStr}-${fallbackRand}`

    const { data: conv, error: convErr } = await supabase
      .from('support_conversations')
      .insert({
        customer_id: customerId,
        guest_name: name,
        guest_email: email,
        guest_phone: phone || null,
        subject: escapedSubject,
        topic: subject,
        source: 'contact_page',
        reference_number: referenceNumber,
        status: 'open',
        priority: 'normal',
        last_message_at: nowStr,
        customer_last_read_at: nowStr,
        admin_last_read_at: null,
        created_at: nowStr,
        updated_at: nowStr
      })
      .select('id, reference_number')
      .single()

    if (convErr || !conv) {
      console.warn('Diagnostic warning (submitContactToSupportAction convErr):', convErr?.message || convErr)
      return { success: false, error: 'Failed to create support inquiry. Please try again.' }
    }

    const { error: msgErr } = await supabase
      .from('support_messages')
      .insert({
        conversation_id: conv.id,
        sender_type: customerId ? 'customer' : 'guest',
        sender_customer_id: customerId,
        message: escapedMessage,
        created_at: nowStr,
        updated_at: nowStr
      })

    if (msgErr) {
      console.warn('Diagnostic warning (submitContactToSupportAction msgErr):', msgErr.message || msgErr)
      await supabase.from('support_conversations').delete().eq('id', conv.id)
      return { success: false, error: 'Failed to send inquiry message. Please try again.' }
    }

    revalidatePath('/admin/support')

    return {
      success: true,
      reference: conv.reference_number || referenceNumber,
      conversationId: conv.id
    }
  } catch (err: any) {
    console.warn('Diagnostic warning (submitContactToSupportAction exception):', err.message || err)
    return { success: false, error: err.message || 'An error occurred while submitting your inquiry.' }
  }
}
