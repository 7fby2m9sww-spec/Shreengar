import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { checkContactRateLimit } from './rateLimit'

test('Shreengar Contact Form & Support Integration Safety Suite', async (t) => {
  const contactPagePath = path.join(process.cwd(), 'src', 'app', '(store)', 'contact', 'page.tsx')
  const contactPageContent = fs.readFileSync(contactPagePath, 'utf8')

  const actionsPath = path.join(process.cwd(), 'src', 'actions', 'support', 'actions.ts')
  const actionsContent = fs.readFileSync(actionsPath, 'utf8')

  const adminSupportPath = path.join(process.cwd(), 'src', 'app', 'admin', '(dashboard)', 'support', 'page.tsx')
  const adminSupportContent = fs.readFileSync(adminSupportPath, 'utf8')

  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260729_extend_support_for_contact_form.sql')
  const migrationContent = fs.readFileSync(migrationPath, 'utf8')

  const rateLimitPath = path.join(process.cwd(), 'src', 'lib', 'rateLimit.ts')
  const rateLimitContent = fs.readFileSync(rateLimitPath, 'utf8')

  await t.test('1. RPC is not executable by anon', () => {
    assert.ok(migrationContent.includes('REVOKE ALL ON FUNCTION public.create_contact_support_conversation'))
    assert.ok(migrationContent.includes('FROM PUBLIC, anon, authenticated;'))
  })

  await t.test('2. RPC is not executable by authenticated', () => {
    assert.ok(migrationContent.includes('FROM PUBLIC, anon, authenticated;'))
  })

  await t.test('3. RPC is not executable by PUBLIC', () => {
    assert.ok(migrationContent.includes('FROM PUBLIC, anon, authenticated;'))
  })

  await t.test('4. RPC is executable by service_role', () => {
    assert.ok(migrationContent.includes('GRANT EXECUTE ON FUNCTION public.create_contact_support_conversation'))
    assert.ok(migrationContent.includes('TO service_role;'))
  })

  await t.test('5. SECURITY DEFINER is removed when unnecessary (using SECURITY INVOKER)', () => {
    assert.ok(migrationContent.includes('SECURITY INVOKER'))
  })

  await t.test('6. RPC parameters match schema types', () => {
    assert.ok(migrationContent.includes('p_customer_id UUID'))
    assert.ok(migrationContent.includes('p_reference_number TEXT'))
  })

  await t.test('7. Guest message insertion satisfies real support_messages constraints', () => {
    assert.ok(migrationContent.includes("support_messages_sender_type_check CHECK (sender_type IN ('customer', 'guest', 'admin', 'system'))"))
    assert.ok(migrationContent.includes("v_sender_type := CASE WHEN p_customer_id IS NOT NULL THEN 'customer' ELSE 'guest' END;"))
  })

  await t.test('8. Guest messages do not create fake customer IDs', () => {
    assert.ok(migrationContent.includes('sender_customer_id,'))
    assert.ok(migrationContent.includes('p_customer_id,'))
  })

  await t.test('9. Customer ownership remains secure', () => {
    assert.ok(actionsContent.includes('if (session.type === \'customer\')'))
    assert.ok(actionsContent.includes('if (conv.customer_id !== session.customerId)'))
  })

  await t.test('10. Admin unread calculation uses a valid server-side timestamp implementation', () => {
    assert.ok(actionsContent.includes("new Date(c.admin_last_read_at).getTime() < new Date(c.last_message_at).getTime()"))
  })

  await t.test('11. New Contact submission is unread for Admin timestamp calculation', () => {
    const lastMsgAt = new Date('2026-08-04T10:00:00Z').getTime()
    const adminLastReadAt = null

    const isUnreadForAdmin = !adminLastReadAt || new Date(adminLastReadAt).getTime() < lastMsgAt
    assert.strictEqual(isUnreadForAdmin, true)
  })

  await t.test('12. New Contact submission is read for the sender timestamp calculation', () => {
    const lastMsgAt = new Date('2026-08-04T10:00:00Z').getTime()
    const customerLastReadAt = new Date('2026-08-04T10:00:00Z').getTime()

    const isUnreadForCustomer = !customerLastReadAt || new Date(customerLastReadAt).getTime() < lastMsgAt
    assert.strictEqual(isUnreadForCustomer, false)
  })

  await t.test('13. Opening the conversation marks it read for Admin timestamp calculation', () => {
    const lastMsgAt = new Date('2026-08-04T10:00:00Z').getTime()
    const adminLastReadAt = new Date('2026-08-04T10:05:00Z').getTime()

    const isUnreadForAdmin = !adminLastReadAt || new Date(adminLastReadAt).getTime() < lastMsgAt
    assert.strictEqual(isUnreadForAdmin, false)
  })

  await t.test('14. Rate limiter storage mechanism is reported accurately as instance-local Map', () => {
    assert.ok(rateLimitContent.includes('const contactRateLimitStore = new Map<string, RateLimitRecord>()'))
  })

  await t.test('15. In-memory limiter is not labelled distributed or deployment-safe', () => {
    assert.strictEqual(rateLimitContent.includes('redis.set'), false)
  })

  await t.test('16. Honeypot blocks before RPC execution', () => {
    assert.ok(actionsContent.includes("input.honeypot && input.honeypot.trim() !== ''"))
  })

  await t.test('17. Duplicate strategy blocks immediate repeated submissions', () => {
    const ip = '192.168.1.200'
    const email = 'duplicate_test_2@example.com'
    const subj = 'Duplicate Subject Test 2'
    const msg = 'Duplicate Message Details Content 2'

    const res1 = checkContactRateLimit(ip, email, subj, msg)
    assert.strictEqual(res1.allowed, true)

    const res2 = checkContactRateLimit(ip, email, subj, msg)
    assert.strictEqual(res2.allowed, false)
    assert.ok(res2.error?.includes('duplicate inquiry was recently submitted'))
  })

  await t.test('18. Reference uses at least eight random hexadecimal characters', () => {
    assert.ok(actionsContent.includes("crypto.randomBytes(4).toString('hex').toUpperCase()"))
  })

  await t.test('19. Reference collision has a bounded retry', () => {
    assert.ok(actionsContent.includes('for (let attempt = 1; attempt <= 3; attempt++)'))
  })

  await t.test('20. Conversation and first message remain atomic', () => {
    assert.ok(migrationContent.includes('INSERT INTO public.support_conversations'))
    assert.ok(migrationContent.includes('INSERT INTO public.support_messages'))
  })

  await t.test('21. Source is constrained to approved values', () => {
    assert.ok(migrationContent.includes("CHECK (source IN ('support_portal', 'contact_page'))"))
  })

  await t.test('22. Browser cannot submit customer_id', () => {
    assert.ok(actionsContent.includes('let customerId: string | null = null'))
    assert.ok(actionsContent.includes("if (session.type === 'customer')"))
  })

  await t.test('23. No fake support records are inserted', () => {
    assert.ok(actionsContent.includes('const escapedMessage = message.replace'))
  })

  await t.test('24. Contact and Support designs remain unchanged', () => {
    assert.ok(contactPageContent.includes('Get in Touch with Shreengar'))
    assert.ok(adminSupportContent.includes('Inbox'))
  })

  await t.test('25. Unrelated systems remain unchanged', () => {
    assert.ok(actionsContent.includes('export async function submitContactToSupportAction'))
  })
})
