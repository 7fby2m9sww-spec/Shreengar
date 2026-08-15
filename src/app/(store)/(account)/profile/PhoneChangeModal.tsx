import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { X, Phone, ShieldAlert } from 'lucide-react';
import { requestPhoneChangeAction } from '@/actions/auth/requestPhoneChangeAction';
import { confirmPhoneChangeAction } from '@/actions/auth/confirmPhoneChangeAction';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';

interface PhoneChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhone: string | null;
  currentEmail: string; // The email where OTP is sent
}

export const PhoneChangeModal: React.FC<PhoneChangeModalProps> = ({ isOpen, onClose, currentPhone, currentEmail }) => {
  const { showToast } = useToast();
  const router = useRouter();
  
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [newPhone, setNewPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim() || newPhone === currentPhone) {
      showToast('Error', 'Please enter a valid new phone number.', 'error');
      return;
    }
    
    setIsLoading(true);
    const res = await requestPhoneChangeAction(newPhone);
    setIsLoading(false);

    if (res.success) {
      setStep('verify');
      showToast('Code Sent', `We sent a verification code to your email: ${currentEmail}`, 'success');
    } else {
      showToast('Error', res.error || 'Failed to request phone change.', 'error');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      showToast('Error', 'Please enter the verification code.', 'error');
      return;
    }

    setIsLoading(true);
    const res = await confirmPhoneChangeAction(newPhone, otp);
    setIsLoading(false);

    if (res.success) {
      showToast('Success', 'Your phone number has been updated.', 'success');
      onClose();
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
              <Phone className="w-6 h-6 text-rose-950" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-foreground">Change Phone Number</h2>
            <p className="text-sm text-muted-foreground">
              {step === 'request' 
                ? `Enter your new phone number. We'll send an OTP to ${currentEmail} to confirm.`
                : `Enter the 6-digit code sent to ${currentEmail}`
              }
            </p>
          </div>

          {step === 'request' ? (
            <form onSubmit={handleRequest} className="space-y-5">
              <Input
                label="New Phone Number"
                type="tel"
                placeholder="9876543210"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                maxLength={10}
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
                  The code was sent to your current verified email address for security.
                </p>
              </div>
              <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                Verify & Update Phone
              </Button>
              <button 
                type="button" 
                onClick={() => setStep('request')}
                className="w-full text-xs text-accent font-semibold hover:underline mt-2"
              >
                Change Phone Number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
