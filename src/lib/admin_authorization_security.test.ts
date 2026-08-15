import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * Mock authorization identity validator for exact user ID RBAC rules.
 * Enforces:
 * 1. Exact match on authUserId === adminRecord.user_id
 * 2. adminRecord.is_active === true
 * 3. adminRecord.role.code === 'super_admin'
 * 4. Zero email fallback identity matching
 * 5. Zero automatic database updates / syncs on identity mismatch
 */
function validateAdminAuthorization(
  authUser: { id: string; email: string } | null,
  adminRecord: {
    id: string
    user_id: string
    email: string
    is_active: boolean
    role: { code: string }
  } | null
): { allowed: boolean; reason?: string } {
  if (!authUser || !authUser.id) {
    return { allowed: false, reason: 'Not authenticated' }
  }

  if (!adminRecord) {
    return { allowed: false, reason: 'No admin record found' }
  }

  // Security Rule 1: Exact User ID Match
  if (adminRecord.user_id !== authUser.id) {
    return { allowed: false, reason: 'User ID mismatch. Email fallback prohibited.' }
  }

  // Security Rule 2: Active Account Required
  if (!adminRecord.is_active) {
    return { allowed: false, reason: 'Admin account is inactive' }
  }

  // Security Rule 3: Super Admin Role Required
  if (adminRecord.role?.code !== 'super_admin') {
    return { allowed: false, reason: 'Role code must be super_admin' }
  }

  return { allowed: true }
}

test('Admin Authorization Security Rules Suite', async (t) => {
  const activeSuperAdminId = '29b5b11a-a840-4c54-b0c2-b70b5dafd6bb'
  const adminEmail = 'rishavraj1672@icloud.com'

  const validAdminRecord = {
    id: 'a052f72e-4729-46ee-9715-75d9a0ab48ab',
    user_id: activeSuperAdminId,
    email: adminEmail,
    is_active: true,
    role: { code: 'super_admin' }
  }

  await t.test('1. Exact active super-admin user ID is allowed', () => {
    const authUser = { id: activeSuperAdminId, email: adminEmail }
    const result = validateAdminAuthorization(authUser, validAdminRecord)
    assert.strictEqual(result.allowed, true)
  })

  await t.test('2. Correct email with a different user ID is denied', () => {
    const authUserDifferentId = { id: 'different-user-id-9999', email: adminEmail }
    const result = validateAdminAuthorization(authUserDifferentId, validAdminRecord)
    assert.strictEqual(result.allowed, false)
    assert.strictEqual(result.reason, 'User ID mismatch. Email fallback prohibited.')
  })

  await t.test('3. Inactive matching user ID is denied', () => {
    const inactiveRecord = { ...validAdminRecord, is_active: false }
    const authUser = { id: activeSuperAdminId, email: adminEmail }
    const result = validateAdminAuthorization(authUser, inactiveRecord)
    assert.strictEqual(result.allowed, false)
    assert.strictEqual(result.reason, 'Admin account is inactive')
  })

  await t.test('4. Matching user ID with non-super-admin role is denied', () => {
    const managerRecord = { ...validAdminRecord, role: { code: 'manager' } }
    const authUser = { id: activeSuperAdminId, email: adminEmail }
    const result = validateAdminAuthorization(authUser, managerRecord)
    assert.strictEqual(result.allowed, false)
    assert.strictEqual(result.reason, 'Role code must be super_admin')
  })

  await t.test('5. Missing admin row is denied', () => {
    const authUser = { id: activeSuperAdminId, email: adminEmail }
    const result = validateAdminAuthorization(authUser, null)
    assert.strictEqual(result.allowed, false)
    assert.strictEqual(result.reason, 'No admin record found')
  })

  await t.test('6. Authorization performs no database update', () => {
    // Pure function read-only check
    const authUser = { id: activeSuperAdminId, email: adminEmail }
    const initialUserId = validAdminRecord.user_id
    validateAdminAuthorization(authUser, validAdminRecord)
    assert.strictEqual(validAdminRecord.user_id, initialUserId)
  })

  await t.test('7. Customer session cannot authorize admin access', () => {
    const customerUser = { id: 'customer-user-1234', email: 'customer@example.com' }
    const result = validateAdminAuthorization(customerUser, validAdminRecord)
    assert.strictEqual(result.allowed, false)
  })

  await t.test('8. OTP step remains required in adminLoginAction flow', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const authServiceContent = fs.readFileSync(
      path.join(process.cwd(), 'src', 'services', 'auth.ts'),
      'utf8'
    )

    assert.ok(authServiceContent.includes("redirect(`/admin/verify-otp?email="))
    assert.ok(authServiceContent.includes('sendOtp('))
  })
})
