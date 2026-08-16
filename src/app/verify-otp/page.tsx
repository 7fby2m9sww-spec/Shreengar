'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { OtpInput, ResendOtpButton } from '@/components/auth';
import { verifyOtpAction } from '@/actions/auth/verifyOtpAction';
import { sendOtpAction } from '@/actions/auth/sendOtpAction';
import { sendLoginOtpAction } from '@/actions/auth/sendLoginOtpAction';
import { useToast } from '@/context/ToastContext';
import { ShreengarLogo } from '@/components/store/ShreengarLogo';

/**
 * Helper function to mask email address for security.
 * Example: ananya@example.com -> an*****@example.com
 */
function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;
  if (localPart.length <= 2) {
    return `${localPart}*****@${domain}`;
  }
  return `${localPart.slice(0, 2)}*****@${domain}`;
}

function VerifyOtpContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  // Retrieve parameters passed via the search query
  const flow = searchParams.get('flow') || 'signup';
  const fullName = searchParams.get('fullName') || '';
  const email = searchParams.get('email') || '';
  const phone = searchParams.get('phone') || '';
  const next = searchParams.get('next') || '';

  const [otpToken, setOtpToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect to signup if any required parameters are missing
  useEffect(() => {
    if (!email && !phone) {
      router.push('/auth/signup');
    }
  }, [email, phone, router]);

  const handleVerifyOtp = async (e?: React.FormEvent<HTMLFormElement>, tokenToVerify?: string) => {
    e?.preventDefault();
    if (isLoading) return;

    const token = tokenToVerify || otpToken;

    if (!token || token.length < 6) {
      showToast('Validation Error', 'Please enter a valid 6-digit verification code.', 'error');
      return;
    }

    setIsLoading(true);

    const result = await verifyOtpAction({
      fullName,
      email,
      phone,
      otp: token,
      flow,
    });

    setIsLoading(false);

    if (!result.success) {
      showToast('Verification Failed', result.error, 'error');
    } else {
      if (flow === 'signup') {
        showToast('Registration Successful', 'Account created successfully. Please sign in to continue.', 'success');
        router.replace('/auth/login');
      } else {
        router.replace(next || '/account');
      }
    }
  };

  const handleResendOtp = async () => {
    if (isLoading) return;

    setIsLoading(true);

    let result;
    if (flow === 'login') {
      result = await sendLoginOtpAction({
        email: email || undefined,
        phone: phone || undefined,
      });
    } else {
      result = await sendOtpAction({
        fullName,
        email,
        phone,
      });
    }

    setIsLoading(false);

    if (!result.success) {
      showToast('Error Resending Code', result.error, 'error');
    } else {
      showToast('Code Resent', `New 6-digit verification code sent to ${maskEmail(email)}`, 'success');
    }
  };

  const handleEditInfo = () => {
    // Navigate back to signup page with query params prefilled
    router.push(
      `/auth/signup?email=${encodeURIComponent(email)}&fullName=${encodeURIComponent(fullName)}&phone=${encodeURIComponent(phone)}`
    );
  };

  return (
    <div className="min-h-screen bg-amber-50 text-rose-950 dark:bg-[radial-gradient(circle_at_top,rgba(164,116,52,0.12),transparent_35%),linear-gradient(135deg,#16090f_0%,#2b0b16_48%,#12090d_100%)] dark:text-[#F7EFD9] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/20 via-rose-950 to-rose-950 opacity-60" />

      <div className="relative z-10 w-full max-w-md bg-amber-50 border border-amber-500/10 dark:bg-[#211318]/95 dark:border-[#B88A44]/30 dark:backdrop-blur-xl dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)] rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center pb-1">
            <ShreengarLogo href="/" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-rose-950 dark:text-[#F7EFD9]">Verify your email</h1>
          <p className="text-xs text-rose-900/70 dark:text-[#C8AAA9] max-w-xs mx-auto">
            Enter the 6-digit verification code sent to {maskEmail(email)}
          </p>
        </div>

        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <div className="space-y-3">
            <label className="block text-center text-xs font-semibold text-rose-950 dark:text-[#F7EFD9] uppercase tracking-wider">
              Enter 6-Digit Code
            </label>

            <OtpInput
              length={6}
              value={otpToken}
              onChange={setOtpToken}
              onComplete={(token) => {
                setOtpToken(token);
                handleVerifyOtp(undefined, token);
              }}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full py-3 dark:bg-gradient-to-r dark:from-[#7A1730] dark:to-[#541020] dark:text-[#FFF4D6] dark:border-[#D0A45C]/35"
            isLoading={isLoading}
            disabled={otpToken.length < 6 || isLoading}
          >
            {flow === 'signup' ? 'Verify & Complete Registration' : 'Verify & Log In'}
          </Button>

          <div className="flex items-center justify-between pt-2 text-xs">
            <button
              type="button"
              onClick={handleEditInfo}
              disabled={isLoading}
              className="inline-flex items-center space-x-1 font-semibold text-rose-900 dark:text-[#F7EFD9] hover:text-amber-800 dark:hover:text-[#A47434] transition-colors disabled:opacity-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Edit Information</span>
            </button>

            <ResendOtpButton onResend={handleResendOtp} cooldownSeconds={60} disabled={isLoading} />
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-rose-950 flex items-center justify-center p-4">
        <div className="text-amber-100 font-serif">Loading verification...</div>
      </div>
    }>
      <VerifyOtpContent />
    </Suspense>
  );
}
