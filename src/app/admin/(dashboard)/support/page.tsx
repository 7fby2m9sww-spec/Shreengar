'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  MessageSquare,
  User,
  Inbox,
  UserCheck,
  Clock,
  CheckCircle,
  Archive,
  RefreshCw,
  Search,
  Filter,
  Send,
  Loader2,
  AlertCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  UserPlus
} from 'lucide-react'
import { getSessionAction } from '@/actions/auth/getSessionAction'
import {
  getConversationsAction,
  getMessagesAction,
  updateConversationMetaAction,
  sendSupportMessageAction,
  getSupportAdminsAction
} from '@/actions/support/actions'
import { createClient } from '@/lib/supabase/client'

interface Conversation {
  id: string
  subject: string
  topic: string
  status: 'open' | 'assigned' | 'waiting_for_customer' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  assigned_admin_id: string | null
  last_message_at: string
  customer_last_read_at: string | null
  admin_last_read_at: string | null
  created_at: string
  source?: 'support_portal' | 'contact_page' | string
  guest_name?: string | null
  guest_email?: string | null
  guest_phone?: string | null
  customer?: {
    id: string
    full_name: string
    email: string
  }
  assigned_admin?: {
    id: string
    full_name: string
  }
  order?: {
    id: string
    order_number: string
    status: string
  } | null
}

interface Message {
  id: string
  conversation_id: string
  sender_type: 'customer' | 'admin' | 'system'
  sender_customer_id: string | null
  sender_admin_id: string | null
  message: string
  is_internal_note: boolean
  created_at: string
}

export default function AdminSupportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const conversationParam = searchParams.get('conversation')

  const [currentAdmin, setCurrentAdmin] = useState<any>(null)
  const [admins, setAdmins] = useState<{ id: string; full_name: string }[]>([])
  
  // Left Column Filters & Folders
  const [folder, setFolder] = useState<'inbox' | 'unassigned' | 'mine' | 'waiting' | 'resolved' | 'closed'>('inbox')
  const [searchQuery, setSearchQuery] = useState('')
  const [topicFilter, setTopicFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  
  // Middle Column State
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Right Column State
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [sendingReply, setSendingReply] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load Session and Admin users list
  useEffect(() => {
    getSessionAction().then(session => {
      if (session.type === 'admin') {
        setCurrentAdmin(session)
      } else {
        router.push('/auth/login')
      }
    })

    getSupportAdminsAction().then(res => {
      if (res.success && res.data) {
        setAdmins(res.data)
      }
    })
  }, [])

  // Sync active conversation from URL param
  useEffect(() => {
    if (conversationParam) {
      loadActiveConversation(conversationParam)
    } else {
      setActiveConversation(null)
      setMessages([])
    }
  }, [conversationParam])

  // Load active conversation details & messages
  const loadActiveConversation = async (id: string) => {
    setLoadingMessages(true)
    const res = await getMessagesAction(id)
    if (res.success && res.conversation) {
      setMessages(res.data as Message[] || [])
      setActiveConversation(res.conversation as Conversation)
      setErrorMessage(null)
    } else {
      setErrorMessage(res.error || 'Failed to load conversation.')
    }
    setLoadingMessages(false)
  }

  // Load Conversations List
  const loadConversationsList = async () => {
    if (!currentAdmin) return
    setLoadingList(true)
    
    // Map folder to status & assigned flags
    let status: string | undefined = undefined
    let assignedAdmin: string | undefined = undefined
    
    if (folder === 'inbox') {
      status = 'all' // We retrieve all, but filter locally or query appropriate
    } else if (folder === 'unassigned') {
      assignedAdmin = 'unassigned'
    } else if (folder === 'mine') {
      assignedAdmin = currentAdmin.adminUserId
    } else if (folder === 'waiting') {
      status = 'waiting_for_customer'
    } else if (folder === 'resolved') {
      status = 'resolved'
    } else if (folder === 'closed') {
      status = 'closed'
    }

    const res = await getConversationsAction({
      status,
      assignedAdmin,
      topic: topicFilter,
      priority: priorityFilter,
      search: searchQuery,
      page,
      limit: 20
    })

    if (res.success && res.data) {
      let data = res.data as Conversation[]
      // Inbox folder filter (only show non-closed, non-resolved in inbox view)
      if (folder === 'inbox') {
        data = data.filter(c => c.status !== 'resolved' && c.status !== 'closed')
      }
      setConversations(data)
      setTotalCount(res.totalCount || 0)
    }
    setLoadingList(false)
  }

  // Reload when filters, folder, or page changes
  useEffect(() => {
    loadConversationsList()
  }, [folder, topicFilter, priorityFilter, page, currentAdmin])

  // Realtime Subscriptions for Active Chat
  useEffect(() => {
    if (!activeConversation) return

    const supabase = createClient()
    const channel = supabase
      .channel(`admin_messages:${activeConversation.id}`)
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
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeConversation?.id])

  // Polling fallback
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeConversation) {
        getMessagesAction(activeConversation.id).then(res => {
          if (res.success && res.data) {
            setMessages(res.data as Message[])
          }
        })
      }
      loadConversationsList()
    }, 15000)
    return () => clearInterval(interval)
  }, [activeConversation?.id, folder])

  // Auto scroll
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Handle Meta Changes (Status, Priority, Assignment)
  const handleMetaChange = async (meta: {
    status?: 'open' | 'assigned' | 'waiting_for_customer' | 'resolved' | 'closed'
    priority?: 'low' | 'normal' | 'high' | 'urgent'
    assignedAdminId?: string | null
  }) => {
    if (!activeConversation) return
    const res = await updateConversationMetaAction(activeConversation.id, meta)
    if (res.success) {
      loadActiveConversation(activeConversation.id)
      loadConversationsList()
    } else {
      setErrorMessage(res.error || 'Failed to update metadata.')
    }
  }

  // Handle Reply Submit
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeConversation || !replyText.trim()) return
    setSendingReply(true)
    setErrorMessage(null)

    const textToSend = replyText
    const noteMode = isInternalNote
    setReplyText('')

    const res = await sendSupportMessageAction(activeConversation.id, textToSend, noteMode)
    setSendingReply(false)

    if (res.success) {
      loadActiveConversation(activeConversation.id)
      loadConversationsList()
      setIsInternalNote(false)
    } else {
      setReplyText(textToSend)
      setErrorMessage(res.error || 'Failed to send reply.')
    }
  }

  // Unread badge helper
  const isUnreadForAdmin = (c: Conversation) => {
    if (!c.admin_last_read_at) return true
    return new Date(c.admin_last_read_at) < new Date(c.last_message_at)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-gray-50 border border-amber-900/10 rounded-2xl overflow-hidden font-sans">
      {/* Mobile Header (back button) */}
      {activeConversation && (
        <div className="md:hidden bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <button
            onClick={() => router.push('/admin/support')}
            className="flex items-center space-x-1.5 text-rose-950 font-semibold text-xs cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back to Inbox</span>
          </button>
          <span className="font-serif font-bold text-xs text-rose-950 truncate max-w-[200px]">
            {activeConversation.subject}
          </span>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* COLUMN 1: FOLDERS & FILTERS (Visible on Desktop, hidden on mobile if active conversation selected) */}
        <div className={`w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 ${
          activeConversation ? 'hidden md:flex' : 'flex'
        }`}>
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search inbox..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadConversationsList()}
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8C3A57]"
              />
            </div>
            <button
              onClick={loadConversationsList}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-xl font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh List</span>
            </button>
          </div>

          {/* Folder Buttons */}
          <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
            {[
              { id: 'inbox', label: 'Inbox', icon: Inbox },
              { id: 'unassigned', label: 'Unassigned', icon: UserPlus },
              { id: 'mine', label: 'Assigned to me', icon: UserCheck },
              { id: 'waiting', label: 'Waiting for Customer', icon: Clock },
              { id: 'resolved', label: 'Resolved', icon: CheckCircle },
              { id: 'closed', label: 'Closed', icon: Archive }
            ].map(f => {
              const isActive = folder === f.id
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    setFolder(f.id as any)
                    setPage(1)
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#8C3A57]/10 text-[#8C3A57]'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <f.icon className={`w-4 h-4 ${isActive ? 'text-[#8C3A57]' : 'text-gray-400'}`} />
                    <span>{f.label}</span>
                  </div>
                </button>
              )
            })}

            {/* Topic Filter */}
            <div className="pt-4 border-t border-gray-100 mt-4 px-2 space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Filter Topic</span>
              <select
                value={topicFilter}
                onChange={e => {
                  setTopicFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full p-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-700"
              >
                <option value="all">All Topics</option>
                {TOPICS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div className="pt-4 px-2 space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Filter Priority</span>
              <select
                value={priorityFilter}
                onChange={e => {
                  setPriorityFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full p-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-700"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        </div>

        {/* COLUMN 2: CONVERSATION LIST */}
        <div className={`w-full md:w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 ${
          activeConversation ? 'hidden md:flex' : 'flex'
        }`}>
          <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider capitalize">
              {folder.replace(/_/g, ' ')} ({totalCount})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loadingList ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-2">
                <Loader2 className="w-6 h-6 text-[#8C3A57] animate-spin" />
                <span className="text-xs text-gray-500">Loading support inbox...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center py-20">
                <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-700">No support conversations.</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Check other folders or clear your filters.</p>
              </div>
            ) : (
              conversations.map(conv => {
                const isSelected = activeConversation?.id === conv.id
                const isUnread = isUnreadForAdmin(conv)
                return (
                  <button
                    key={conv.id}
                    onClick={() => router.push(`/admin/support?conversation=${conv.id}`)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-all border-l-4 cursor-pointer relative ${
                      isSelected
                        ? 'bg-rose-50/30 border-[#8C3A57] shadow-inner'
                        : isUnread
                        ? 'border-amber-500 bg-amber-50/5'
                        : 'border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start space-y-1">
                      <span className={`text-xs truncate max-w-[140px] ${isUnread ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                        {conv.customer?.full_name || conv.guest_name || 'Guest User'}
                      </span>
                      <span className="text-[9px] text-gray-400">
                        {new Date(conv.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <div className={`text-[11px] truncate mt-1 ${isUnread ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                      {conv.subject}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {conv.source === 'contact_page' && (
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                          Contact Page
                        </span>
                      )}

                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                        conv.status === 'open' ? 'bg-amber-100 text-amber-800' :
                        conv.status === 'assigned' ? 'bg-indigo-100 text-indigo-800' :
                        conv.status === 'waiting_for_customer' ? 'bg-blue-100 text-blue-800' :
                        conv.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {(conv.status || 'open').replace(/_/g, ' ')}
                      </span>

                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                        conv.priority === 'urgent' ? 'bg-red-100 text-red-800 animate-pulse' :
                        conv.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        conv.priority === 'normal' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {conv.priority}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Simple Pagination Footer */}
          {totalCount > 20 && (
            <div className="p-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <button
                disabled={page <= 1}
                onClick={() => setPage(prev => prev - 1)}
                className="p-1 hover:bg-gray-200 rounded-lg disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <span className="text-[11px] text-gray-500 font-semibold">Page {page} of {Math.ceil(totalCount / 20)}</span>
              <button
                disabled={page >= Math.ceil(totalCount / 20)}
                onClick={() => setPage(prev => prev + 1)}
                className="p-1 hover:bg-gray-200 rounded-lg disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}
        </div>

        {/* COLUMN 3: ACTIVE CONVERSATION WORKSPACE */}
        <div className={`flex-1 bg-gray-50 flex flex-col overflow-hidden ${
          activeConversation ? 'flex' : 'hidden md:flex items-center justify-center p-8 text-center bg-gray-50'
        }`}>
          {!activeConversation ? (
            <div className="space-y-3">
              <MessageSquare className="w-16 h-16 text-gray-200 mx-auto" />
              <div className="max-w-[280px]">
                <h3 className="font-serif font-bold text-sm text-gray-800">Select a conversation</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Choose a ticket from the inbox list to view the customer details, messages history and post replies.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              {/* Workspace Header (metadata) */}
              <div className="p-4 border-b border-gray-200 bg-gray-50/60 flex flex-wrap gap-4 items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-rose-950" />
                    <span className="font-serif font-bold text-sm text-rose-950">
                      {activeConversation.customer?.full_name || activeConversation.guest_name || 'Guest User'}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({activeConversation.customer?.email || activeConversation.guest_email || 'No Email'})
                    </span>
                    {activeConversation.guest_phone && (
                      <span className="text-xs font-mono text-gray-500">
                        📞 {activeConversation.guest_phone}
                      </span>
                    )}
                    {activeConversation.source === 'contact_page' && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-[10px] font-semibold">
                        Source: Contact Page
                      </span>
                    )}
                  </div>
                  <h2 className="font-bold text-xs text-gray-900 mt-1">{activeConversation.subject}</h2>
                  {activeConversation.order && (
                    <div className="text-[11px] text-amber-900 font-semibold flex items-center space-x-1.5 mt-0.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Order: {activeConversation.order.order_number} ({activeConversation.order.status})</span>
                    </div>
                  )}
                </div>

                {/* Resolve Quick Action */}
                {activeConversation.status !== 'resolved' && activeConversation.status !== 'closed' && (
                  <button
                    onClick={() => handleMetaChange({ status: 'resolved' })}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl flex items-center space-x-1 shadow-sm cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Resolve Ticket</span>
                  </button>
                )}
              </div>

              {/* Status / Priority / Assignee controls */}
              <div className="p-3 border-b border-gray-200 bg-white grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">Status</label>
                  <select
                    value={activeConversation.status}
                    onChange={e => handleMetaChange({ status: e.target.value as any })}
                    className="w-full p-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-800"
                  >
                    <option value="open">Open</option>
                    <option value="assigned">Assigned</option>
                    <option value="waiting_for_customer">Waiting for Customer</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">Priority</label>
                  <select
                    value={activeConversation.priority}
                    onChange={e => handleMetaChange({ priority: e.target.value as any })}
                    className="w-full p-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-800"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">Assigned Agent</label>
                  <div className="flex space-x-1.5">
                    <select
                      value={activeConversation.assigned_admin_id || ''}
                      onChange={e => handleMetaChange({ assignedAdminId: e.target.value || null })}
                      className="flex-1 p-2 border border-gray-200 rounded-xl text-xs bg-white text-gray-800"
                    >
                      <option value="">Unassigned</option>
                      {admins.map(a => (
                        <option key={a.id} value={a.id}>{a.full_name}</option>
                      ))}
                    </select>
                    {activeConversation.assigned_admin_id !== currentAdmin?.adminUserId && (
                      <button
                        onClick={() => handleMetaChange({ assignedAdminId: currentAdmin.adminUserId })}
                        className="px-2.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl text-[10px] font-bold text-rose-950 transition-all cursor-pointer"
                        title="Assign to me"
                      >
                        Me
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Message History list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {loadingMessages && messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-2">
                    <Loader2 className="w-6 h-6 text-[#8C3A57] animate-spin" />
                    <span className="text-xs text-gray-500">Loading conversation history...</span>
                  </div>
                ) : (
                  <>
                    {messages.map(msg => {
                      const isCustomer = msg.sender_type === 'customer'
                      const isSystem = msg.sender_type === 'system'
                      const isNote = msg.is_internal_note

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="text-center py-1 text-[10px] text-gray-400 font-medium">
                            <span className="px-2.5 py-1 bg-gray-200 rounded-md">
                              {msg.message}
                            </span>
                          </div>
                        )
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'} space-y-1`}
                        >
                          <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed whitespace-pre-wrap break-words ${
                            isNote
                              ? 'bg-amber-50 text-amber-950 border border-amber-300/60 rounded-tr-none'
                              : isCustomer
                              ? 'bg-gray-100 text-gray-800 rounded-tl-none'
                              : 'bg-[#8C3A57] text-amber-100 rounded-tr-none'
                          }`}>
                            {isNote && (
                              <div className="text-[9px] font-bold text-amber-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                <span>Internal Staff Note</span>
                              </div>
                            )}
                            {msg.message}
                          </div>
                          <span className="text-[9px] text-gray-400 px-1 font-medium">
                            {isCustomer ? 'Customer' : isNote ? 'Staff Note' : 'You (Staff)'} • {new Date(msg.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Reply Box Form */}
              <form onSubmit={handleSendReply} className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col space-y-3">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={e => setIsInternalNote(e.target.checked)}
                      className="rounded border-gray-300 text-[#8C3A57] focus:ring-[#8C3A57] w-4 h-4 cursor-pointer"
                    />
                    <span>Post as Internal Staff Note (Customer won&apos;t see this)</span>
                  </label>
                </div>

                <div className="flex items-start space-x-2">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder={isInternalNote ? "Type internal staff note..." : "Type reply to customer..."}
                    required
                    className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#8C3A57] min-h-[50px] max-h-[150px] resize-y"
                    maxLength={5000}
                  />
                  <button
                    type="submit"
                    disabled={sendingReply || !replyText.trim()}
                    className="px-4 py-3 bg-[#8C3A57] hover:bg-[#5C0B26] text-amber-100 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-md"
                  >
                    {sendingReply ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-[#D4AF37]" />
                        <span className="font-serif font-bold text-xs">Send</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
const TOPICS = [
  'Order issue',
  'Product question',
  'Size or colour question',
  'Payment issue',
  'Delivery issue',
  'Return or exchange',
  'Other'
]
