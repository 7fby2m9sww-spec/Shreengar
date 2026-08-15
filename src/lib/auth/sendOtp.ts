import React from 'react';
import { createAdminClient } from '@/lib/supabase/server';
import { generateOtp } from './generateOtp';
import { hashOtp } from './hashOtp';
import { resend } from '../resend/client';
import { OtpEmail } from '../resend/templates/otpEmail';

export type SendOtpResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Generates, hashes, stores, and sends a 6-digit verification OTP to the user's email.
 * Includes extensive logs and forwards original error messages.
 * 
 * @param email The recipient's email address.
 * @param _fullName The optional recipient's name (reserved for compatibility).
 * @param purpose The purpose of the OTP. Defaults to 'login'.
 * @returns A promise resolving to a SendOtpResult indicating success or failure.
 */
export async function sendOtp(email: string, _fullName?: string, purpose: string = 'login'): Promise<SendOtpResult> {
  // 1. Normalize email input immediately
  const normalizedEmail = email.trim().toLowerCase();
  
  let createdRecordId: string | null = null;
  let supabase;

  try {
    // 2. Initialize the shared reusable Supabase admin client
    supabase = createAdminClient();

    // 3. Generate a secure 6-digit plain text OTP
    const plainOtp = generateOtp();

    // 4. Hash the OTP using bcrypt
    const hashed = await hashOtp(plainOtp);

    // 5. Invalidate/delete any previous unused OTP records for the same email and purpose
    const { error: deleteError } = await supabase
      .from('email_otps')
      .delete()
      .eq('email', normalizedEmail)
      .eq('purpose', purpose)
      .eq('used', false);

    if (deleteError) {
      console.error('[sendOtp] Database OTP cleanup failed:', deleteError);
      return { success: false, error: `Database cleanup error: ${deleteError.message || JSON.stringify(deleteError)}` };
    }

    // 6. Store the hashed OTP and expiration timestamp (10 minutes validity)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { data: newRecord, error: insertError } = await supabase
      .from('email_otps')
      .insert({
        email: normalizedEmail,
        otp_hash: hashed,
        expires_at: expiresAt,
        used: false,
        purpose: purpose,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[sendOtp] Database OTP insertion failed:', insertError);
      return { success: false, error: `Database insert error: ${insertError.message || JSON.stringify(insertError)}` };
    }

    createdRecordId = newRecord?.id || null;

    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!fromEmail) {
      throw new Error(
        'RESEND_FROM_EMAIL is not configured. Please add it to environment variables.'
      );
    }
    
    const resendResponse = await resend.emails.send({
      from: fromEmail,
      to: normalizedEmail,
      subject: 'Your Shreengar Verification Code',
      react: React.createElement(OtpEmail, { otp: plainOtp, expiryMinutes: 10 }),
    });

    const { error: resendError } = resendResponse;

    // 8. Handle email delivery failures with database rollback
    if (resendError) {
      console.error('[sendOtp] Failed to dispatch OTP email via Resend:', resendError);
      
      // Rollback database state
      if (createdRecordId) {
        await supabase.from('email_otps').delete().eq('id', createdRecordId);
      }
      
      return { success: false, error: `Resend dispatch error: ${resendError.message || JSON.stringify(resendError)}` };
    }

    return { success: true };
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[sendOtp] Unexpected exception during OTP generation/dispatch:', err.message, err.stack);

    // Rollback database state in case of exceptions after record creation
    if (supabase && createdRecordId) {
      try {
        await supabase.from('email_otps').delete().eq('id', createdRecordId);
      } catch (rollbackError) {
        console.error('[sendOtp] Failed to rollback OTP database insertion:', rollbackError);
      }
    }

    return { success: false, error: `Unexpected exception in sendOtp: ${err.message}` };
  }
}
