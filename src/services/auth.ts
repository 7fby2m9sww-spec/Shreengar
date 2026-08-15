'use server'

import { createClient, createAdminClient } from '../lib/supabase/server.ts'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { AdminUser } from '../types/database.ts'
import { clearCustomerSessionCookie } from '../lib/auth/cookies.ts'
import { sendOtp } from '../lib/auth/sendOtp.ts'
import { verifyOtp } from '../lib/auth/verifyOtp.ts'
import crypto from 'crypto'
import React from 'react'
import { resend } from '../lib/resend/client.ts'
import { AdminResetEmail } from '../lib/resend/templates/adminResetEmail.tsx'

import { resolveApplicationSession } from '../lib/auth/resolveApplicationSession.ts'

/**
 * Reusable helper to retrieve active admin_users record for a given user ID.
 * Accepts an optional Supabase client instance (server or browser client).
 */
export async function getActiveAdminUser(
  userId: string,
  supabaseClient?: Awaited<ReturnType<typeof createClient>>
): Promise<AdminUser | null> {
  if (!userId) return null
  const supabase = createAdminClient()
  const { data: adminRecord, error } = await supabase
    .from('admin_users')
    .select('*, role:roles(*)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('[ADMIN_QUERY_ERROR] Error fetching admin user record:', error);
  }

  return (adminRecord as AdminUser) || null
}

/**
 * Reusable helper to check if a user ID belongs to an active administrator.
 */
export async function isUserActiveAdmin(
  userId: string,
  supabaseClient?: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  const admin = await getActiveAdminUser(userId, supabaseClient)
  return !!admin
}

/**
 * Strict Super‑Admin guard.
 * Returns trusted admin payload if the current session belongs to the active Super Admin.
 * Redirects to /admin/login for any other case.
 */
export async function requireAdmin(): Promise<{
  userId: string
  adminId: string
  email: string
  role: string
}> {
  const appSession = await resolveApplicationSession()
  if (appSession.type !== 'admin') {
    redirect('/admin/login')
  }

  return {
    userId: appSession.authUserId,
    adminId: appSession.adminUserId,
    email: appSession.email,
    role: appSession.role
  }
}

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Please provide both email and password.' }
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { error: error.message }
    }

    if (data.user) {
      // Check if user has active admin privileges in admin_users table
      const isAdmin = await isUserActiveAdmin(data.user.id, supabase)
      if (isAdmin) {
        redirect('/admin')
      }
    }

    redirect('/profile')
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'digest' in err && (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')) {
      throw err
    }
    return { error: 'Authentication failed. Please verify network connection or credentials.' }
  }
}

export async function adminLoginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Please provide administrative email and password.' }
  }

  const normalizedEmail = email.trim().toLowerCase()

  try {
    const supabase = await createClient()

    // 1. Authenticate with the normalized email
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (authError || !authData.user) {
      return { error: authError?.message || 'Invalid administrative credentials.' }
    }

    // 2. Enforce active admin user role check using central helper (bypassing RLS)
    const adminRecord = await getActiveAdminUser(authData.user.id, createAdminClient())

    if (!adminRecord) {
      await supabase.auth.signOut()
      return { error: 'Access Denied. Account is not registered for administrative access.' }
    }

    // Check is_active again just to be safe
    if (!adminRecord.is_active) {
      await supabase.auth.signOut()
      return { error: 'Access Denied. Account is not registered for administrative access.' }
    }

    const adminAny = adminRecord as any;
    const resolvedRoleCode = Array.isArray(adminAny.role) ? adminAny.role[0]?.code : adminAny.role?.code;

    if (resolvedRoleCode !== 'super_admin') {
      await supabase.auth.signOut()
      return { error: 'Access Denied. Account is not registered for administrative access.' }
    }

    // 3. Immediately sign out from Supabase Auth to prevent one-factor login session establishment
    await supabase.auth.signOut()
    await clearCustomerSessionCookie()

    // 4. Generate and send administrative OTP code
    const otpRes = await sendOtp(normalizedEmail)
    if (!otpRes.success) {
      return { error: otpRes.error }
    }

    // 5. Redirect to administrative OTP verification page
    redirect(`/admin/verify-otp?email=${encodeURIComponent(normalizedEmail)}`)
  } catch (err: unknown) {
    console.error('[DEBUG-ADMIN-LOGIN] Exception caught:', err);
    if (err && typeof err === 'object' && 'digest' in err && (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')) {
      throw err
    }
    return { error: 'Admin authentication failed.' }
  }
}

export async function sendOtpAction(formData: FormData) {
  const email = formData.get('email') as string
  const fullName = (formData.get('fullName') as string) || (formData.get('name') as string) || undefined
  const phone = (formData.get('phone') as string) || undefined

  if (!email) {
    return { error: 'Please enter your email address.' }
  }

  try {
    const supabase = await createClient()

    if (phone) {
      const cleanPhone = phone.trim()
      const { data: existingPhoneUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', cleanPhone)
        .maybeSingle()

      if (existingPhoneUser) {
        return {
          error: 'An account with this mobile number already exists. Please sign in instead.',
        }
      }
    }

    const userData: Record<string, string> = {}
    if (fullName) userData.full_name = fullName
    if (phone) userData.phone = phone

    const options: { shouldCreateUser: boolean; data?: Record<string, string> } = {
      shouldCreateUser: true,
    }

    if (Object.keys(userData).length > 0) {
      options.data = userData
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options,
    })

    if (error) {
      return { error: error.message }
    }

    return { success: true, message: `OTP verification code dispatched to ${email}` }
  } catch {
    return { error: 'Failed to send OTP code.' }
  }
}

export async function sendPhoneOtpAction(formData: FormData) {
  const phone = (formData.get('phone') as string) || undefined

  if (!phone) {
    return { error: 'Please enter your mobile number.' }
  }

  const cleanPhone = phone.trim()
  const phoneRegex = /^[6-9]\d{9}$/
  if (!phoneRegex.test(cleanPhone)) {
    return { error: 'Please enter a valid 10-digit Indian mobile number.' }
  }

  try {
    const supabase = await createClient()

    const { data: profile, error: dbError } = await supabase
      .from('profiles')
      .select('email')
      .eq('phone', cleanPhone)
      .maybeSingle()

    if (dbError || !profile || !profile.email) {
      return { error: 'No account exists with this mobile number.' }
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: profile.email,
      options: {
        shouldCreateUser: false,
      },
    })

    if (otpError) {
      return { error: otpError.message }
    }

    return {
      success: true,
      message: `OTP verification code dispatched to your registered account.`,
      email: profile.email,
    }
  } catch {
    return { error: 'Failed to send OTP code to mobile number.' }
  }
}

export async function verifyOtpAction(formData: FormData) {
  const email = formData.get('email') as string
  const token = formData.get('token') as string

  if (!email || !token) {
    return { error: 'Please enter both email and OTP verification code.' }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })

    if (error || !data.user) {
      return { error: error?.message || 'Invalid OTP code.' }
    }

    // Update customer profile email_verified status upon successful OTP verification
    await supabase
      .from('profiles')
      .update({
        email_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.user.id)

    // Check if user is admin using central helper
    const isAdmin = await isUserActiveAdmin(data.user.id, supabase)
    if (isAdmin) {
      redirect('/admin')
    }

    redirect('/profile')
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'digest' in err && (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')) {
      throw err
    }
    return { error: 'OTP verification failed.' }
  }
}

export async function signupAction(formData: FormData): Promise<{ error?: string; success?: boolean; message?: string }> {
  const fullName = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Please fill in all required fields.' }
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      const errorMsg = typeof error.message === 'string' && error.message.trim() !== ''
        ? error.message
        : 'Signup failed. Please verify your connection or try another email address.'
      return { error: errorMsg }
    }

    if (data.user) {
      // Handle existing account case (Supabase returns empty identities array for duplicate emails)
      if (data.user.identities && data.user.identities.length === 0) {
        return { error: 'An account with this email address already exists. Please sign in instead.' }
      }

      redirect('/profile')
    }

    return { success: true, message: `Signup successful! Verification email sent to ${email}` }
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'digest' in err && (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')) {
      throw err
    }

    const catchErrorMsg = err instanceof Error && typeof err.message === 'string' && err.message.trim() !== ''
      ? err.message
      : 'Signup failed. Please verify your connection or try another email address.'
    return { error: catchErrorMsg }
  }
}

export async function forgotPasswordAction(formData: FormData) {
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Please enter your registered email address.' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://shreengar.com/auth/reset-password',
    })

    if (error) {
      return { error: error.message }
    }

    return { success: true }
  } catch {
    return { error: 'Unable to send password reset email. Please try again.' }
  }
}

export async function resetPasswordAction(formData: FormData) {
  const password = formData.get('password') as string

  if (!password || password.length < 6) {
    return { error: 'Password must be at least 6 characters.' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      return { error: error.message }
    }

    return { success: true }
  } catch {
    return { error: 'Password reset failed. Session may have expired.' }
  }
}

export async function logoutAction() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
    await clearCustomerSessionCookie()
  } catch { }
  redirect('/auth/login')
}

// Initial One-Time Super Admin Bootstrapping Action
export async function setupFirstAdminAction(formData: FormData) {
  const fullName = formData.get('fullName') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!fullName || !email || !password) {
    return { error: 'Please provide full name, email, and master password.' }
  }

  try {
    const supabase = await createClient()

    // 1. Ensure zero admin users exist
    const { count } = await createAdminClient().from('admin_users').select('*', { count: 'exact', head: true })
    if (count && count > 0) {
      return { error: 'Initial setup locked. At least one admin user already exists.' }
    }

    // 2. Sign up user via Supabase Auth using the exact email provided
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (authError || !authData.user) {
      return { error: authError?.message || 'Failed to create admin user credentials.' }
    }

    let userId: string = authData.user.id

    // 3. Handle pre-existing user account (Supabase returns empty identities array when email exists)
    if (authData.user.identities && authData.user.identities.length === 0) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError || !signInData.user) {
        return { error: 'An account with this email already exists. Please sign in using the correct password.' }
      }

      userId = signInData.user.id
    }

    // 4. Lookup pre-seeded Super Admin role
    const { data: superAdminRole, error: roleError } = await createAdminClient()
      .from('roles')
      .select('id')
      .eq('code', 'super_admin')
      .maybeSingle()

    if (roleError || !superAdminRole) {
      return { error: 'Super Admin system role is missing. Please ensure the RBAC seed migration has been applied.' }
    }

    const roleId = superAdminRole.id

    // 5. Create admin_users record in database using verified user_id
    const { error: dbError } = await createAdminClient().from('admin_users').insert({
      user_id: userId,
      email,
      full_name: fullName,
      role_id: roleId,
      is_active: true,
    })

    if (dbError) {
      return { error: dbError.message }
    }

    redirect('/admin')
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'digest' in err && (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')) {
      throw err
    }
    return { error: 'Failed to complete initial admin setup.' }
  }
}

// Super Admin creation of staff users (Roles: Super Admin, Admin, Manager, Staff)
export async function createAdminUserAction(formData: FormData) {
  const fullName = formData.get('fullName') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const roleCode = (formData.get('roleCode') as string) || 'staff'

  if (!fullName || !email || !password) {
    return { error: 'Please provide full name, email, and password.' }
  }

  try {
    const supabase = await createClient()

    // Ensure session belongs to active Super Admin
    const { data: sessionData } = await supabase.auth.getUser()
    if (!sessionData.user) {
      return { error: 'Unauthorized. Please login as Super Admin.' }
    }

    const activeAdmin = await getActiveAdminUser(sessionData.user.id, createAdminClient())
    if (!activeAdmin || activeAdmin.role?.code !== 'super_admin') {
      return { error: 'Unauthorized. Only Super Admins can create staff accounts.' }
    }

    // Register user credentials with the exact email specified
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (authError || !authData.user) {
      return { error: authError?.message || 'Failed to create staff account credentials.' }
    }

    // Lookup role
    let roleId: string | null = null
    const { data: roleRecord } = await supabase.from('roles').select('id').eq('code', roleCode).maybeSingle()

    if (roleRecord) {
      roleId = roleRecord.id
    } else {
      // Create role if missing
      const roleName = roleCode === 'super_admin' ? 'Super Admin' : roleCode === 'admin' ? 'Admin' : roleCode === 'manager' ? 'Manager' : 'Staff'
      const { data: newRole } = await supabase
        .from('roles')
        .insert({
          name: roleName,
          code: roleCode,
          description: `${roleName} role privileges.`,
          is_system: false,
        })
        .select('id')
        .maybeSingle()

      if (newRole) roleId = newRole.id
    }

    if (!roleId) {
      return { error: 'Failed to resolve assigned role.' }
    }

    // Insert admin_users record
    const { error: dbError } = await supabase.from('admin_users').insert({
      user_id: authData.user.id,
      email,
      full_name: fullName,
      role_id: roleId,
      is_active: true,
    })

    if (dbError) {
      return { error: dbError.message }
    }

    return { success: true }
  } catch {
    return { error: 'Failed to create staff account.' }
  }
}

export async function adminVerifyOtpAction(formData: FormData) {
  const email = formData.get('email') as string
  const otp = formData.get('otp') as string

  if (!email || !otp) {
    return { error: 'Email and verification code are required.' }
  }

  const normalizedEmail = email.trim().toLowerCase()
  const normalizedOtp = otp.trim()

  try {
    // 1. Verify OTP using verified verifyOtp logic
    const verifyResult = await verifyOtp(normalizedEmail, normalizedOtp)
    if (!verifyResult.success) {
      return { error: verifyResult.error }
    }

    const supabase = createAdminClient()

    // 2. Fetch the administrative user record
    const { data: adminRecord, error: adminError } = await supabase
      .from('admin_users')
      .select('*, role:roles(*)')
      .eq('email', normalizedEmail)
      .eq('is_active', true)
      .maybeSingle()

    if (adminError || !adminRecord) {
      return { error: 'Access Denied. Account is not registered for administrative access.' }
    }

    // 3. Generate magiclink to establish Supabase session
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
    })

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[DEBUG-ADMIN-VERIFY] generateLink error:', linkError);
      return { error: 'Failed to generate administrative login session.' }
    }

    // 4. Fetch the link programmatically to get cookies and call setSession
    const verifyRes = await fetch(linkData.properties.action_link, {
      redirect: 'manual',
    })
    const locationHeader = verifyRes.headers.get('location')
    if (locationHeader && locationHeader.includes('#')) {
      const hash = locationHeader.split('#')[1]
      const params = new URLSearchParams(hash)
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      if (access_token && refresh_token) {
        const clientSupabase = await createClient()
        await clientSupabase.auth.setSession({ access_token, refresh_token })
        await clearCustomerSessionCookie()
      } else {
        return { error: 'Verification failed. Could not parse login session.' }
      }
    } else {
      return { error: 'Verification failed. Invalid session handshake.' }
    }

    // 5. Update last login timestamp using admin client to bypass RLS
    await supabase
      .from('admin_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', adminRecord.id)

    redirect('/admin')
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'digest' in err && (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')) {
      throw err
    }
    return { error: 'Verification failed.' }
  }
}

/**
 * Resend OTP to admin email with 60s cooldown.
 * @param formData FormData containing 'email' field.
 */
export async function adminResendOtpAction(formData: FormData) {
  const email = (formData.get('email') as string || '').trim().toLowerCase();
  if (!email) {
    return { error: 'Email is required to resend OTP.' };
  }

  try {
    const supabase = createAdminClient();
    // 1. Verify admin exists, is active, and has super_admin role
    const { data: adminRecord, error: adminError } = await supabase
      .from('admin_users')
      .select('id, is_active, role_id')
      .eq('email', email)
      .maybeSingle();
    if (adminError) {
      console.error('[adminResendOtp] admin fetch error:', adminError);
    }
    if (!adminRecord || !adminRecord.is_active) {
      // Generic error to avoid enumeration
      return { error: 'Failed to resend OTP.' };
    }
    const { data: roleRecord, error: roleError } = await supabase
      .from('roles')
      .select('code')
      .eq('id', adminRecord.role_id)
      .maybeSingle();
    if (roleError) {
      console.error('[adminResendOtp] role fetch error:', roleError);
    }
    if (!roleRecord || roleRecord.code !== 'super_admin') {
      return { error: 'Failed to resend OTP.' };
    }

    // 2. Enforce 60s cooldown based on latest unused OTP
    const { data: recent, error: fetchError } = await supabase
      .from('email_otps')
      .select('created_at')
      .eq('email', email)
      .eq('purpose', 'login')
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1);
    if (fetchError) {
      console.error('[adminResendOtp] fetch error:', fetchError);
    } else if (recent && recent.length > 0) {
      const created = new Date(recent[0].created_at);
      const now = new Date();
      const diffSec = (now.getTime() - created.getTime()) / 1000;
      if (diffSec < 60) {
        return { error: 'Please wait before requesting another OTP.' };
      }
    }

    // 3. Invalidate any older unused OTPs for this email/purpose to ensure only the newest works
    await supabase
      .from('email_otps')
      .delete()
      .eq('email', email)
      .eq('purpose', 'login')
      .eq('used', false);

    // 4. Send fresh OTP using existing helper (hashed storage, expiry preserved)
    const result = await sendOtp(email, undefined, 'login');
    if (!result.success) {
      return { error: result.error };
    }
    return { success: true };
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    return { error: 'Failed to resend OTP.' };
  }
}

export async function adminForgotPasswordAction(formData: FormData): Promise<{ success?: boolean; message?: string; error?: string }> {
  const emailInput = formData.get('email') as string
  const successResponse = {
    success: true,
    message: 'If the email address is associated with an active administrator account, you will receive a password reset link shortly.'
  }

  if (!emailInput) {
    return successResponse
  }

  const email = emailInput.trim().toLowerCase()

  try {
    const supabaseAdmin = createAdminClient()

    // 1. Check eligibility privately
    const { data: adminRecord } = await supabaseAdmin
      .from('admin_users')
      .select('id, user_id, is_active')
      .eq('email', email)
      .maybeSingle()

    if (!adminRecord || !adminRecord.is_active) {
      return successResponse
    }

    const { data: authUser, error: authUserErr } = await supabaseAdmin.auth.admin.getUserById(adminRecord.user_id)
    if (authUserErr || !authUser?.user) {
      return successResponse
    }

    // 2. Check throttling (database-backed email lookup)
    const { data: latestToken } = await supabaseAdmin
      .from('admin_password_reset_tokens')
      .select('created_at')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestToken) {
      const timeSinceLast = Date.now() - new Date(latestToken.created_at).getTime()
      if (timeSinceLast < 60 * 1000) {
        const emailHash = crypto.createHash('sha256').update(email).digest('hex').substring(0, 8)
        console.warn(`[adminForgotPasswordAction] Request throttled for admin email hash: ${emailHash}`)
        return successResponse
      }
    }

    // 3. Generate and hash the new token
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 mins expiry

    // 4. Insert new token record
    const { data: insertedToken, error: insertErr } = await supabaseAdmin
      .from('admin_password_reset_tokens')
      .insert({
        user_id: adminRecord.user_id,
        email,
        token_hash: tokenHash,
        expires_at: expiresAt,
        used: false,
        attempts: 0
      })
      .select('id')
      .maybeSingle()

    if (insertErr || !insertedToken) {
      console.error('[adminForgotPasswordAction] Insert token error:', insertErr)
      return successResponse
    }

    // 5. Build emailed reset link securely using APP_URL origin validation
    const siteUrlEnv = process.env.APP_URL
    let validatedAppOrigin = ''
    let appUrlValid = false

    if (siteUrlEnv) {
      try {
        const parsedUrl = new URL(siteUrlEnv)
        const isLocalhost = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1'
        const isHttpAllowed = parsedUrl.protocol === 'http:' && isLocalhost
        const isHttpsRequired = parsedUrl.protocol === 'https:'

        if (isHttpAllowed || isHttpsRequired) {
          if (!parsedUrl.username && !parsedUrl.password) {
            if (parsedUrl.pathname === '/' && !parsedUrl.search && !parsedUrl.hash) {
              validatedAppOrigin = parsedUrl.origin
              appUrlValid = true
            }
          }
        }
      } catch (urlErr) {
        console.error('[adminForgotPasswordAction] APP_URL parsing exception occurred')
      }
    }

    if (!appUrlValid) {
      console.error('[adminForgotPasswordAction] Configuration error: APP_URL is missing, invalid, or insecure.')
      // Invalidate the newly inserted token since we cannot construct a safe reset link
      const { error: deleteTokenErr } = await supabaseAdmin
        .from('admin_password_reset_tokens')
        .delete()
        .eq('id', insertedToken.id)
      if (deleteTokenErr) {
        console.error('[adminForgotPasswordAction] Failed to delete token on configuration failure:', deleteTokenErr)
      }
      return successResponse
    }

    const resetLink = `${validatedAppOrigin}/admin/reset-password?token=${encodeURIComponent(rawToken)}`

    // 6. Send the Resend email
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Shreengar <noreply@shreengar.in>'
    const { error: emailErr } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Reset Your Shreengar Administrative Password',
      react: React.createElement(AdminResetEmail, { resetLink, expiryMinutes: 15 }),
    })

    if (emailErr) {
      console.error('[adminForgotPasswordAction] Email dispatch error:', emailErr)
      // Rollback: delete the newly created token on failure so it cannot be used
      const { error: deleteTokenErr } = await supabaseAdmin
        .from('admin_password_reset_tokens')
        .delete()
        .eq('id', insertedToken.id)
      if (deleteTokenErr) {
        console.error('[adminForgotPasswordAction] Failed to delete token on email dispatch failure:', deleteTokenErr)
      }
      return successResponse
    }

    // 7. Invalidate older unused tokens for the same user (excluding new token ID)
    const { error: invalidateErr } = await supabaseAdmin
      .from('admin_password_reset_tokens')
      .update({ used: true })
      .eq('email', email)
      .eq('used', false)
      .neq('id', insertedToken.id)

    if (invalidateErr) {
      console.error('[adminForgotPasswordAction] Invalidation of older unused tokens failed:', invalidateErr)
    }

    return successResponse
  } catch (err) {
    console.error('[adminForgotPasswordAction] Exception:', err)
    return successResponse
  }
}

export async function adminResetPasswordAction(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const token = formData.get('token') as string

  const genericError = { error: 'Unable to reset the password. Please request a new link and try again.' }

  if (!password || !confirmPassword || !token) {
    return genericError
  }

  // Password Complexity Validation
  const uppercase = /[A-Z]/
  const lowercase = /[a-z]/
  const number = /[0-9]/
  const special = /[!@#$%^&*(),.?":{}|<>]/

  if (
    password.length < 8 ||
    !uppercase.test(password) ||
    !lowercase.test(password) ||
    !number.test(password) ||
    !special.test(password)
  ) {
    return { error: 'Password does not meet complexity requirements. It must be at least 8 characters long and contain uppercase, lowercase, number, and special character.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }

  try {
    const supabaseAdmin = createAdminClient()

    // 1. Hash the submitted raw reset token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    // 2. Atomically claim the token via PostgreSQL RPC
    const { data: claimData, error: claimErr } = await supabaseAdmin
      .rpc('claim_admin_password_reset_token', {
        p_token_hash: tokenHash
      }) as { data: { r_user_id: string; r_id: string }[] | null; error: any }

    if (claimErr) {
      console.error('[adminResetPasswordAction] RPC claim error:', claimErr)
      return genericError
    }

    if (!claimData || claimData.length === 0) {
      return genericError
    }

    const claimRecord = claimData[0]
    const userId = claimRecord.r_user_id

    // 3. Confirm the linked admin still exists and is active in admin_users
    const { data: adminRecord, error: adminErr } = await supabaseAdmin
      .from('admin_users')
      .select('id, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()

    if (adminErr || !adminRecord) {
      console.error('[adminResetPasswordAction] Admin user inactive or not found during consumption')
      return genericError
    }

    // 4. Update the Supabase Auth password
    const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: password
    })

    if (updateAuthErr) {
      console.error('[adminResetPasswordAction] Update user password error:', updateAuthErr)
      return genericError
    }

    // 5. Invalidate all remaining reset tokens for that admin (user_id)
    const { error: invalidateAllErr } = await supabaseAdmin
      .from('admin_password_reset_tokens')
      .update({ used: true })
      .eq('user_id', userId)
      .eq('used', false)

    if (invalidateAllErr) {
      console.error('[adminResetPasswordAction] Invalidate all tokens error:', invalidateAllErr)
    }

    return { success: true }
  } catch (err) {
    console.error('[adminResetPasswordAction] Exception:', err)
    return genericError
  }
}

export async function adminRequestChangePasswordAction(
  formData: FormData
): Promise<{ success?: boolean; otpRequired?: boolean; error?: string }> {
  const currentPassword = formData.get('currentPassword') as string
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: 'All fields are required.' }
  }

  // Password Complexity Validation
  const uppercase = /[A-Z]/
  const lowercase = /[a-z]/
  const number = /[0-9]/
  const special = /[!@#$%^&*(),.?":{}|<>]/

  if (
    newPassword.length < 8 ||
    !uppercase.test(newPassword) ||
    !lowercase.test(newPassword) ||
    !number.test(newPassword) ||
    !special.test(newPassword)
  ) {
    return { error: 'New password does not meet complexity requirements.' }
  }

  if (newPassword !== confirmPassword) {
    return { error: 'New passwords do not match.' }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email) {
      return { error: 'Not authenticated.' }
    }

    // 1. Enforce active admin check
    const isAdmin = await isUserActiveAdmin(user.id, supabase)
    if (!isAdmin) {
      return { error: 'Access Denied. Account is not registered for administrative access.' }
    }

    // 2. Validate current password using temporary non-cookie-persisting client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const tempClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    })

    const { error: verifyError } = await tempClient.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (verifyError) {
      return { error: 'Current password is incorrect.' }
    }

    // 3. Generate and send OTP to the admin's email address
    const otpRes = await sendOtp(user.email)
    if (!otpRes.success) {
      return { error: 'Failed to send verification code. Please try again.' }
    }

    return { success: true, otpRequired: true }
  } catch {
    return { error: 'Failed to request password change. Please try again.' }
  }
}

export async function adminConfirmChangePasswordAction(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const currentPassword = formData.get('currentPassword') as string
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const otp = formData.get('otp') as string

  if (!currentPassword || !newPassword || !confirmPassword || !otp) {
    return { error: 'All fields and verification code are required.' }
  }

  // Password Complexity Validation
  const uppercase = /[A-Z]/
  const lowercase = /[a-z]/
  const number = /[0-9]/
  const special = /[!@#$%^&*(),.?":{}|<>]/

  if (
    newPassword.length < 8 ||
    !uppercase.test(newPassword) ||
    !lowercase.test(newPassword) ||
    !number.test(newPassword) ||
    !special.test(newPassword)
  ) {
    return { error: 'New password does not meet complexity requirements.' }
  }

  if (newPassword !== confirmPassword) {
    return { error: 'New passwords do not match.' }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email) {
      return { error: 'Not authenticated.' }
    }

    // 1. Enforce active admin check
    const isAdmin = await isUserActiveAdmin(user.id, supabase)
    if (!isAdmin) {
      return { error: 'Access Denied. Account is not registered for administrative access.' }
    }

    // 2. Validate current password using temporary non-cookie-persisting client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const tempClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    })

    const { error: verifyError } = await tempClient.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (verifyError) {
      return { error: 'Current password is incorrect.' }
    }

    // 3. Verify the OTP verification code
    const verifyResult = await verifyOtp(user.email, otp.trim())
    if (!verifyResult.success) {
      return { error: verifyResult.error || 'Invalid verification code.' }
    }

    // 4. Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      return { error: updateError.message }
    }

    // 5. Invalidate current session by signing out
    await supabase.auth.signOut()

    return { success: true }
  } catch {
    return { error: 'Failed to confirm password change. Please try again.' }
  }
}
