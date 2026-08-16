import { test, describe } from 'node:test'
import assert from 'node:assert'
import { normalizeConversation } from './supportConversation.ts'

describe('Support Conversation Normalization Tests', () => {

  test('1. Handles null or undefined conversation object safely', () => {
    const normNull = normalizeConversation(null)
    const normUndef = normalizeConversation(undefined)

    assert.strictEqual(normNull.status, 'open')
    assert.strictEqual(normNull.subject, 'Support Request')
    assert.strictEqual(normNull.topic, 'General')

    assert.strictEqual(normUndef.status, 'open')
    assert.strictEqual(normUndef.subject, 'Support Request')
    assert.strictEqual(normUndef.topic, 'General')
  })

  test('2. Populates status "open" when ticket object lacks status field', () => {
    const partialTicket = {
      id: 'conv_123',
      subject: 'Kurti Size Query',
      topic: 'Size or colour question'
    } as any

    const normalized = normalizeConversation(partialTicket)
    assert.strictEqual(normalized.id, 'conv_123')
    assert.strictEqual(normalized.status, 'open')
    assert.strictEqual(normalized.subject, 'Kurti Size Query')
    assert.strictEqual(normalized.topic, 'Size or colour question')
  })

  test('3. Preserves existing status when status is provided', () => {
    const resolvedTicket = {
      id: 'conv_456',
      subject: 'Order Delivered',
      topic: 'Delivery issue',
      status: 'resolved'
    }

    const normalized = normalizeConversation(resolvedTicket)
    assert.strictEqual(normalized.status, 'resolved')
  })

  test('4. Realtime update payload merging never strips status', () => {
    const existingActiveConv = {
      id: 'conv_789',
      subject: 'Payment Error',
      topic: 'Payment issue',
      status: 'open',
      priority: 'normal',
      last_message_at: '2026-08-15T12:00:00Z'
    }

    // Partial update from socket payload without status
    const socketUpdate = {
      last_message_at: '2026-08-15T12:05:00Z'
    }

    const merged = normalizeConversation({ ...existingActiveConv, ...socketUpdate })
    assert.strictEqual(merged.status, 'open')
    assert.strictEqual(merged.last_message_at, '2026-08-15T12:05:00Z')
    assert.strictEqual(typeof merged.status.replace, 'function')
    assert.strictEqual(merged.status.replace(/_/g, ' '), 'open')
  })

})
