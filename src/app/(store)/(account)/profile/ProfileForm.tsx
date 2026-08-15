'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { updateProfileAction } from '@/actions/auth/updateProfileAction';
import { useToast } from '@/context/ToastContext';
import { Profile } from '@/lib/auth/getSession';
import { ShieldCheck, Mail, Phone, Edit2 } from 'lucide-react';
import { EmailChangeModal } from './EmailChangeModal';
import { PhoneChangeModal } from './PhoneChangeModal';

interface ProfileFormProps {
  initialProfile: Profile;
}

export default function ProfileForm({ initialProfile }: ProfileFormProps) {
  const { showToast } = useToast();
  const [fullName, setFullName] = useState(initialProfile.full_name || '');
  const [gender, setGender] = useState(initialProfile.gender || 'prefer_not_to_say');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);

  // Derive values for the profile badge UI
  const displayEmail = initialProfile.email;
  const displayPhone = initialProfile.phone;
  const avatarLetter = fullName ? fullName[0].toUpperCase() : displayEmail[0].toUpperCase();

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      showToast('Validation Error', 'Full Name is required and cannot be empty.', 'error');
      return;
    }

    if (fullName.trim().length < 2) {
      showToast('Validation Error', 'Full Name must be at least 2 characters.', 'error');
      return;
    }

    setIsSubmitting(true);

    const res = await updateProfileAction({
      fullName: fullName.trim(),
      gender,
    });

    setIsSubmitting(false);

    if (!res.success) {
      showToast('Profile Update Failed', res.error, 'error');
    } else {
      showToast('Success', 'Profile updated successfully!', 'success');
    }
  };

  const handleChangeEmail = () => {
    setIsEmailModalOpen(true);
  };

  const handleChangePhone = () => {
    setIsPhoneModalOpen(true);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
      {/* Left Column: Customer Badge Card */}
      <div className="md:col-span-4 bg-surface p-6 rounded-2xl border border-border shadow-sm text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-rose-950 text-amber-300 font-serif font-bold text-2xl flex items-center justify-center mx-auto border-2 border-amber-500 shadow-md">
          {avatarLetter}
        </div>
        <div>
          <h3 className="font-serif font-bold text-lg text-foreground">{fullName || 'Customer User'}</h3>
          <span className="text-xs text-muted-foreground font-mono">{displayEmail}</span>
        </div>
        <div className="pt-3 border-t border-border text-xs text-muted-foreground flex items-center justify-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Verified Member</span>
        </div>
      </div>

      {/* Right Column: Edit Profile Form */}
      <div className="md:col-span-8 space-y-6">
        
        {/* Personal Details Section */}
        <div className="bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-sm space-y-6">
          <h3 className="font-serif text-lg font-bold text-foreground pb-3 border-b border-border">
            Personal Details
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your Full Name"
                required
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-foreground">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-surface border border-border text-foreground text-sm rounded-lg focus:ring-accent focus:border-accent block p-2.5 shadow-sm transition-colors"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non_binary">Non-binary</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                Save Profile Changes
              </Button>
            </div>
          </form>
        </div>

        {/* Contact Details Section */}
        <div className="bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-sm space-y-6">
          <h3 className="font-serif text-lg font-bold text-foreground pb-3 border-b border-border">
            Contact Details
          </h3>
          
          <div className="space-y-4">
            {/* Email Row */}
            <div className="flex items-center justify-between p-4 bg-surface-muted rounded-xl border border-border">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Verified Email</p>
                  <p className="font-medium text-foreground text-sm font-mono">{displayEmail}</p>
                </div>
              </div>
              <button
                onClick={handleChangeEmail}
                className="text-xs text-accent font-semibold hover:text-accent/80 flex items-center space-x-1 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Change</span>
              </button>
            </div>

            {/* Phone Row */}
            <div className="flex items-center justify-between p-4 bg-surface-muted rounded-xl border border-border">
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Verified Phone</p>
                  <p className="font-medium text-foreground text-sm">{displayPhone || 'Not provided'}</p>
                </div>
              </div>
              <button
                onClick={handleChangePhone}
                className="text-xs text-accent font-semibold hover:text-accent/80 flex items-center space-x-1 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Change</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      <EmailChangeModal 
        isOpen={isEmailModalOpen} 
        onClose={() => setIsEmailModalOpen(false)} 
        currentEmail={displayEmail} 
      />

      <PhoneChangeModal 
        isOpen={isPhoneModalOpen} 
        onClose={() => setIsPhoneModalOpen(false)} 
        currentPhone={displayPhone} 
        currentEmail={displayEmail} 
      />
    </div>
  );
}
