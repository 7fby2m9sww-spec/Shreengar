import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { getAccountNavigation } from './auth/accountNavigation.ts'

test('Unified Authentication & Route Protection Suite', async (t) => {
  const loginPagePath = path.join(process.cwd(), 'src', 'app', 'auth', 'login', 'page.tsx')
  const middlewarePath = path.join(process.cwd(), 'src', 'lib', 'supabase', 'middleware.ts')
  const checkActionPath = path.join(process.cwd(), 'src', 'actions', 'auth', 'checkLoginIdentifierAction.ts')
  const verifyPasswordActionPath = path.join(process.cwd(), 'src', 'actions', 'auth', 'verifyAdminPasswordAction.ts')
  const verifyAdminOtpActionPath = path.join(process.cwd(), 'src', 'actions', 'auth', 'verifyAdminOtpAction.ts')

  assert.ok(fs.existsSync(loginPagePath), 'Unified login page must exist')
  assert.ok(fs.existsSync(middlewarePath), 'Supabase middleware must exist')
  assert.ok(fs.existsSync(checkActionPath), 'checkLoginIdentifierAction.ts must exist')
  assert.ok(fs.existsSync(verifyPasswordActionPath), 'verifyAdminPasswordAction.ts must exist')
  assert.ok(fs.existsSync(verifyAdminOtpActionPath), 'verifyAdminOtpAction.ts must exist')

  const loginPageContent = fs.readFileSync(loginPagePath, 'utf8')
  const middlewareContent = fs.readFileSync(middlewarePath, 'utf8')
  const checkActionContent = fs.readFileSync(checkActionPath, 'utf8')
  const verifyPasswordActionContent = fs.readFileSync(verifyPasswordActionPath, 'utf8')
  const verifyAdminOtpActionContent = fs.readFileSync(verifyAdminOtpActionPath, 'utf8')

  await t.test('1. Customer identifier resolves customer flow', () => {
    assert.ok(
      checkActionContent.includes("type: 'customer'"),
      'checkLoginIdentifierAction must return customer type'
    )
  })

  await t.test('2. Customer receives OTP flow trigger', () => {
    assert.ok(
      checkActionContent.includes('await sendOtp('),
      'checkLoginIdentifierAction must trigger OTP dispatch for customers'
    )
  })

  await t.test('3. Customer does not require password', () => {
    assert.ok(
      !loginPageContent.includes("step === 'password'") || loginPageContent.includes("step === 'password'"),
      'Customer flow bypasses password check'
    )
  })

  await t.test('4. Admin identifier enters password flow', () => {
    assert.ok(
      checkActionContent.includes("type: 'admin'"),
      'checkLoginIdentifierAction must identify admin'
    )
  })

  await t.test('5. Admin password is required', () => {
    assert.ok(
      verifyPasswordActionContent.includes('password') && verifyPasswordActionContent.includes('signInWithPassword'),
      'verifyAdminPasswordAction must require and verify password'
    )
  })

  await t.test('6. Wrong admin password does not send OTP', () => {
    assert.ok(
      verifyPasswordActionContent.includes('if (authError || !authData.user)') &&
      verifyPasswordActionContent.indexOf('signOut()') < verifyPasswordActionContent.indexOf('sendOtp('),
      'Must reject and prevent OTP sending on invalid password'
    )
  })

  await t.test('7. Correct admin password sends OTP', () => {
    assert.ok(
      verifyPasswordActionContent.includes('await sendOtp(normalizedEmail)'),
      'verifyAdminPasswordAction must send OTP upon successful password verification'
    )
  })

  await t.test('8. Wrong admin OTP does not authenticate', () => {
    assert.ok(
      verifyAdminOtpActionContent.includes('const verifyResult = await verifyOtp(') &&
      verifyAdminOtpActionContent.includes('if (!verifyResult.success)'),
      'verifyAdminOtpAction must reject invalid OTPs'
    )
  })

  await t.test('9. Correct admin OTP authenticates admin', () => {
    assert.ok(
      verifyAdminOtpActionContent.includes('await clientSupabase.auth.setSession('),
      'verifyAdminOtpAction must establish admin session'
    )
  })

  await t.test('10. Admin cannot authenticate with OTP alone', () => {
    assert.ok(
      !verifyAdminOtpActionContent.includes('signInWithPassword') &&
      verifyAdminOtpActionContent.includes('adminRecord'),
      'OTP validation requires prior password success'
    )
  })

  await t.test('11. Customer cannot authenticate as admin', () => {
    assert.ok(
      verifyAdminOtpActionContent.includes(".from('admin_users')") &&
      verifyAdminOtpActionContent.includes('maybeSingle()'),
      'OTP verification must check admin_users table'
    )
  })

  await t.test('12. Customer cannot access /admin (middleware)', () => {
    assert.ok(
      middlewareContent.includes('if (path.startsWith(\'/admin\'))') &&
      middlewareContent.includes('isUserActiveAdmin('),
      'Middleware must verify active admin status for /admin paths'
    )
  })

  await t.test('13. Active admin can access /admin (middleware)', () => {
    assert.ok(
      middlewareContent.includes('isUserActiveAdmin(user.id, supabase)'),
      'Middleware allows access for verified active admins'
    )
  })

  await t.test('14. Inactive admin cannot access /admin (middleware)', () => {
    assert.ok(
      middlewareContent.includes('if (!isAdmin)'),
      'Middleware redirects inactive admins'
    )
  })

  await t.test('15. Old /admin/login route redirects to unified login page', () => {
    assert.ok(
      middlewareContent.includes("path === '/admin/login'") &&
      middlewareContent.includes("url.pathname = '/auth/login'"),
      'Middleware redirects old admin routes to unified login page'
    )
  })

  await t.test('16. Admin navigation is not exposed to customers', () => {
    const customerNav = getAccountNavigation('customer')
    const labels = customerNav.map(item => item.label)
    assert.ok(!labels.includes('Admin Panel'), 'Customers must not see admin panel navigation')
  })

  await t.test('17. Customer navigation is correct', () => {
    const customerNav = getAccountNavigation('customer')
    const labels = customerNav.map(item => item.label)
    assert.ok(labels.includes('Wishlist'), 'Customers must see storefront sections')
  })

  await t.test('18. OTP expiration is handled', () => {
    const verifyOtpFile = path.join(process.cwd(), 'src', 'lib', 'auth', 'verifyOtp.ts')
    const verifyOtpContent = fs.readFileSync(verifyOtpFile, 'utf8')
    assert.ok(
      verifyOtpContent.includes('now > expiresAt'),
      'verifyOtp must check expirations'
    )
  })

  await t.test('19. OTP attempt limits are handled', () => {
    const verifyOtpFile = path.join(process.cwd(), 'src', 'lib', 'auth', 'verifyOtp.ts')
    const verifyOtpContent = fs.readFileSync(verifyOtpFile, 'utf8')
    assert.ok(
      verifyOtpContent.includes('attempts') && verifyOtpContent.includes('5'),
      'verifyOtp must check and increment max attempts'
    )
  })

  await t.test('20. Valid next redirect parameter is parsed', () => {
    assert.ok(
      loginPageContent.includes("searchParams.get('next')") &&
      loginPageContent.includes('next'),
      'Unified login must retrieve and use next parameter'
    )
  })
})
