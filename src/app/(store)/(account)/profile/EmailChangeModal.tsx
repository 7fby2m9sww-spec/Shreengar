import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { X, Mail, ShieldAlert } from 'lucide-react';
import { requestEmailChangeAction } from '@/actions/auth/requestEmailChangeAction';
import { confirmEmailChangeAction } from '@/actions/auth/confirmEmailChangeAction';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';

interface EmailChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmail: string;
}

export const EmailChangeModal: React.FC<EmailChangeModalProps> = ({ isOpen, onClose, currentEmail }) => {
  const { showToast } = useToast();
  const router = useRouter();
  
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [newEmail, setNewEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || newEmail === currentEmail) {
      showToast('Error', 'Please enter a valid new email address.', 'error');
      return;
    }
    
    setIsLoading(true);
    const res = await requestEmailChangeAction(newEmail);
    setIsLoading(false);

    if (res.success) {
      setStep('verify');
      showToast('Code Sent', `We sent a verification code to ${newEmail}`, 'success');
    } else {
      showToast('Error', res.error || 'Failed to request email change.', 'error');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      showToast('Error', 'Please enter the verification code.', 'error');
      return;
    }

    setIsLoading(true);
    const res = await confirmEmailChangeAction(newEmail, otp);
    setIsLoading(false);

    if (res.success) {
      showToast('Success', 'Your email address has been updated.', 'success');
      onClose();
      // Hard refresh to reload session state
      router.refresh();
      window.location.reload();
    } else {
      showToast('Error', res.error || 'Invalid verification code.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:bg-surface-muted rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-rose-950" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-foreground">Change Email</h2>
            <p className="text-sm text-muted-foreground">
              {step === 'request' 
                ? 'Enter your new email address. We will send a verification code to confirm.'
                : `Enter the 6-digit code sent to ${newEmail}`
              }
            </p>
          </div>

          {step === 'request' ? (
            <form onSubmit={handleRequest} className="space-y-5">
              <Input
                label="New Email Address"
                type="email"
                placeholder="new@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
              <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                Send Verification Code
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-5">
              <Input
                label="Verification Code"
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                required
              />
              <div className="flex items-start space-x-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <ShieldAlert className="w-4 h-4 text-amber-700 mt-0.5" />
                <p className="text-xs text-amber-800 font-medium">
                  Please check your spam folder if you do not see the email.
                </p>
              </div>
              <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                Verify & Update Email
              </Button>
              <button 
                type="button" 
                onClick={() => setStep('request')}
                className="w-full text-xs text-accent font-semibold hover:underline mt-2"
              >
                Change Email Address
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
