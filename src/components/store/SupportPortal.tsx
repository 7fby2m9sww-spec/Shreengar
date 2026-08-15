'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePathname, useRouter } from 'next/navigation'
import {
  MessageSquare,
  X,
  Send,
  Loader2,
  ChevronLeft,
  Calendar,
  Tag,
  AlertCircle,
  HelpCircle,
  Plus
} from 'lucide-react'
import {
  getUnreadSupportCountAction,
  getConversationsAction,
  getMessagesAction,
  createConversationAction,
  sendSupportMessageAction,
  getCustomerOrdersAction
} from '@/actions/support/actions'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/context/CartContext'

const TOPICS = [
  'Order issue',
  'Product question',
  'Size or colour question',
  'Payment issue',
  'Delivery issue',
  'Return or exchange',
  'Other'
]

interface Conversation {
  id: string
  subject: string
  topic: string
  status: string
  priority: string
  last_message_at: string
}

interface Message {
  id: string
  conversation_id: string
  sender_type: 'customer' | 'admin' | 'system'
  message: string
  created_at: string
}

export function SupportPortal() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const { isMiniCartOpen } = useCart()

  // Screen state: 'list' | 'create' | 'chat'
  const [screen, setScreen] = useState<'list' | 'create' | 'chat'>('list')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(false)

  // Create form state
  const [topic, setTopic] = useState('Product question')
  const [subject, setSubject] = useState('')
  const [initialMessage, setInitialMessage] = useState('')
  const [orderId, setOrderId] = useState('')
  const [orders, setOrders] = useState<{ id: string; order_number: string }[]>([])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Chat state
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 1. Fetch unread count on mount and poll
  const loadUnreadCount = async () => {
    if (!isAuthenticated) return
    const res = await getUnreadSupportCountAction()
    if (res.success && typeof res.count === 'number') {
      setUnreadCount(res.count)
    }
  }

  useEffect(() => {
    loadUnreadCount()
    const interval = setInterval(loadUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  // 2. Fetch conversations when panel opens or screens change
  const loadConversations = async () => {
    if (!isAuthenticated) return
    setConversationsLoading(true)
    const res = await getConversationsAction({})
    if (res.success && res.data) {
      setConversations(res.data as Conversation[])
    }
    setConversationsLoading(false)
  }

  useEffect(() => {
    if (isOpen && screen === 'list') {
      loadConversations()
    }
  }, [isOpen, screen])

  // 3. Load customer orders for the dropdown
  useEffect(() => {
    if (screen === 'create' && isAuthenticated) {
      getCustomerOrdersAction().then(res => {
        if (res.success && res.data) {
          setOrders(res.data)
        }
      })
    }
  }, [screen, isAuthenticated])

  // 4. Load messages for active conversation
  const loadMessages = async (convId: string) => {
    setMessagesLoading(true)
    const res = await getMessagesAction(convId)
    if (res.success && res.data && res.conversation) {
      setMessages(res.data as Message[])
      setActiveConversation(res.conversation as Conversation)
      setChatError(null)
    } else {
      setChatError(res.error || 'Failed to load conversation.')
    }
    setMessagesLoading(false)
  }

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation.id)
    }
  }, [activeConversation?.id])

  // 5. Scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (screen === 'chat' && messages.length > 0) {
      scrollToBottom()
    }
  }, [messages, screen])

  // 6. Realtime Message Subscriptions
  useEffect(() => {
    if (!activeConversation || screen !== 'chat') return

    const supabase = createClient()
    const channel = supabase
      .channel(`support_messages:${activeConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${activeConversation.id}`
        },
        (payload) => {
          const newMsg = payload.new as Message
          if (newMsg.sender_type === 'admin' && (newMsg as any).is_internal_note === true) {
            // Exclude internal notes for customers
            return
          }
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          // Mark conversation as read
          getMessagesAction(activeConversation.id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeConversation?.id, screen])

  // 7. Polling fallback for messages
  useEffect(() => {
    if (!activeConversation || screen !== 'chat') return
    const interval = setInterval(() => {
      loadMessages(activeConversation.id)
    }, 10000)
    return () => clearInterval(interval)
  }, [activeConversation?.id, screen])

  const handleStartNewConversation = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    setCreating(true)

    const res = await createConversationAction({
      topic,
      subject,
      message: initialMessage,
      orderId: orderId || undefined
    })

    setCreating(false)
    if (res.success && res.conversationId) {
      setSubject('')
      setInitialMessage('')
      setOrderId('')
      setActiveConversation({ id: res.conversationId } as any)
      setScreen('chat')
    } else {
      setCreateError(res.error || 'Failed to start conversation.')
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeConversation || !newMessage.trim()) return
    setChatError(null)
    setSending(true)

    const textToSend = newMessage
    setNewMessage('') // clear immediately for responsive UI

    const res = await sendSupportMessageAction(activeConversation.id, textToSend)
    setSending(false)

    if (res.success) {
      loadMessages(activeConversation.id)
      loadUnreadCount()
    } else {
      setNewMessage(textToSend) // restore on error
      setChatError(res.error || 'Failed to send message.')
    }
  }

  const handleLoginRedirect = () => {
    router.push(`/auth/login?next=${encodeURIComponent(pathname)}`)
    setIsOpen(false)
  }

  if (isMiniCartOpen && !isOpen) {
    return null
  }

  return (
    <div className="fixed bottom-6 sm:bottom-8 right-4 sm:right-6 z-50 flex flex-col items-end font-sans animate-entrance">
      {/* 1. Compact Panel */}
      {isOpen && (
        <div className="w-[calc(100vw-32px)] sm:w-[400px] max-w-[400px] h-[480px] sm:h-[520px] bg-surface rounded-2xl shadow-2xl border border-border-warm mb-4 flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
          {/* Header */}
          <div className="bg-brand-primary text-brand-primary-foreground px-4 py-3 flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-gold" />
              <span className="font-serif font-bold text-sm tracking-wide">Support Chat</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-brand-primary-hover rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 text-amber-100" />
            </button>
          </div>

          {/* Body Content */}
          {!isAuthenticated ? (
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-surface-muted dark:bg-surface-muted/40 flex items-center justify-center text-brand-primary">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-serif font-bold text-sm text-foreground">Authentication Required</h4>
                <p className="text-xs text-muted-foreground max-w-[260px] mx-auto leading-relaxed">
                  Please log in to your Shreengar account to start or view support conversations.
                </p>
              </div>
              <button
                onClick={handleLoginRedirect}
                className="px-6 py-2.5 bg-brand-primary text-amber-100 font-serif font-bold text-xs rounded-xl hover:bg-brand-primary-hover transition-colors cursor-pointer"
              >
                Login to Continue
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden bg-background">
              {/* SCREEN 1: CONVERSATION LIST */}
              {screen === 'list' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-3 bg-surface border-b border-border flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground/80 uppercase tracking-wider">Your Conversations</span>
                    <button
                      onClick={() => setScreen('create')}
                      className="px-2.5 py-1.5 bg-brand-primary hover:bg-brand-primary-hover text-amber-100 font-serif font-bold text-[10px] rounded-lg flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Start New</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {conversationsLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 space-y-2">
                        <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
                        <span className="text-xs text-muted-foreground">Loading your conversations...</span>
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                        <HelpCircle className="w-10 h-10 text-gray-300 dark:text-rose-900/40" />
                        <div>
                          <p className="text-xs font-semibold text-foreground/90">You have no support conversations.</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Start one if you need help with your orders or sizes.</p>
                        </div>
                      </div>
                    ) : (
                      conversations.map(conv => (
                        <button
                          key={conv.id}
                          onClick={() => {
                            setActiveConversation(conv)
                            setScreen('chat')
                          }}
                          className="w-full text-left p-3.5 bg-surface rounded-xl border border-border hover:border-amber-900/20 dark:hover:border-amber-900/40 shadow-sm transition-all hover:scale-[1.01] cursor-pointer space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-gray-900 dark:text-amber-100 line-clamp-1 flex-1 pr-2">{conv.subject}</span>
                            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                              conv.status === 'open' ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400' :
                              conv.status === 'waiting_for_customer' ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400' :
                              conv.status === 'resolved' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400' :
                              'bg-gray-100 dark:bg-rose-950/30 text-gray-800 dark:text-amber-200/50'
                            }`}>
                              {conv.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-amber-200/30 font-medium">
                            <span className="flex items-center space-x-1">
                              <Tag className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                              <span>{conv.topic}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(conv.last_message_at).toLocaleDateString()}</span>
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* SCREEN 2: CREATE CONVERSATION */}
              {screen === 'create' && (
                <form onSubmit={handleStartNewConversation} className="flex-1 flex flex-col overflow-hidden bg-surface p-4 space-y-3.5">
                  <div className="flex items-center space-x-2 pb-2 border-b border-border">
                    <button
                      type="button"
                      onClick={() => setScreen('list')}
                      className="p-1 hover:bg-surface-muted rounded-lg cursor-pointer"
                    >
                      <ChevronLeft className="w-4.5 h-4.5 text-muted-foreground" />
                    </button>
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">New Support Request</span>
                  </div>

                  {createError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-800 dark:text-red-400 text-[11px] rounded-xl flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span>{createError}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Topic *</label>
                    <select
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      className="w-full p-2 border border-border rounded-xl text-xs bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                      {TOPICS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {topic === 'Order issue' && orders.length > 0 && (
                    <div className="space-y-1 animate-in fade-in duration-100">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Related Order</label>
                      <select
                        value={orderId}
                        onChange={e => setOrderId(e.target.value)}
                        className="w-full p-2 border border-border rounded-xl text-xs bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      >
                        <option value="">Select an order...</option>
                        {orders.map(o => (
                          <option key={o.id} value={o.id}>{o.order_number}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subject *</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      required
                      placeholder="e.g. Size advice for Queen Kurti"
                      className="w-full p-2.5 border border-border rounded-xl text-xs bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      maxLength={150}
                    />
                  </div>

                  <div className="space-y-1 flex-1 flex flex-col">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Message *</label>
                    <textarea
                      value={initialMessage}
                      onChange={e => setInitialMessage(e.target.value)}
                      required
                      placeholder="Type your message in detail..."
                      className="w-full flex-1 p-2.5 border border-border rounded-xl text-xs bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                      maxLength={5000}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={creating || !subject.trim() || !initialMessage.trim()}
                    className="w-full py-3 bg-brand-primary text-brand-primary-foreground font-serif font-bold text-xs rounded-xl hover:bg-brand-primary-hover transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Starting conversation...</span>
                      </>
                    ) : (
                      <span>Submit Request</span>
                    )}
                  </button>
                </form>
              )}

              {/* SCREEN 3: CHAT ROOM */}
              {screen === 'chat' && activeConversation && (
                <div className="flex-1 flex flex-col overflow-hidden bg-surface">
                  {/* Active Header */}
                  <div className="p-3 bg-surface border-b border-border flex items-center space-x-2">
                    <button
                      onClick={() => setScreen('list')}
                      className="p-1 hover:bg-surface-muted rounded-lg cursor-pointer"
                    >
                      <ChevronLeft className="w-4.5 h-4.5 text-muted-foreground" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-foreground truncate pr-2">{activeConversation.subject}</h4>
                      <div className="flex items-center space-x-2 text-[10px] text-muted-foreground mt-0.5">
                        <span className="capitalize">{activeConversation.status.replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span>{activeConversation.topic}</span>
                      </div>
                    </div>
                  </div>

                  {/* Messages list */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-background-warm/30">
                    {messagesLoading && messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 space-y-2">
                        <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
                        <span className="text-xs text-muted-foreground">Loading messages...</span>
                      </div>
                    ) : (
                      <>
                        {messages.map(msg => {
                          const isCustomer = msg.sender_type === 'customer'
                          const isSystem = msg.sender_type === 'system'

                          if (isSystem) {
                            return (
                              <div key={msg.id} className="text-center py-1 text-[10px] text-muted-foreground font-medium">
                                <span className="px-2 py-0.5 bg-surface-muted rounded-md">
                                  {msg.message}
                                </span>
                              </div>
                            )
                          }

                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'} space-y-1`}
                            >
                              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs shadow-sm leading-relaxed whitespace-pre-wrap break-words ${
                                isCustomer
                                  ? 'bg-brand-primary text-brand-primary-foreground rounded-tr-none'
                                  : 'bg-surface-muted text-foreground rounded-tl-none'
                              }`}>
                                {msg.message}
                              </div>
                              <span className="text-[9px] text-muted-foreground px-1 font-medium">
                                {isCustomer ? 'You' : 'Agent'} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )
                        })}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  {/* Chat Input form */}
                  <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-surface-muted flex items-center space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      required
                      className="flex-1 px-3 py-2 border border-border rounded-xl text-xs bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      maxLength={5000}
                    />
                    <button
                      type="submit"
                      disabled={sending || !newMessage.trim()}
                      className="p-2 bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center cursor-pointer"
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 text-accent" />
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-brand-primary hover:bg-brand-primary-hover text-brand-primary-foreground p-4 rounded-full shadow-2xl flex items-center justify-center space-x-2 transition-all hover:scale-105 cursor-pointer relative"
        title="Talk to Support"
      >
        <MessageSquare className="w-6 h-6 text-brand-primary-foreground" />
        <span className="hidden sm:inline font-serif font-bold text-xs tracking-wider">Talk to Support</span>
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-brand-primary font-bold text-[10px] rounded-full flex items-center justify-center border-2 border-surface dark:border-background shadow-md">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  )
}
