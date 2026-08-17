import React from 'react';
import { getSession } from '@/lib/auth/getSession';
import { redirect } from 'next/navigation';
import { Breadcrumb } from '@/components/store/Breadcrumb';
import { User, Mail, Phone, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

/**
 * Server Component representing the authenticated customer Account page.
 * Uses the custom getSession() helper to verify session integrity and retrieve profile details.
 */
export default async function AccountPage() {
  // 1. Retrieve and verify session using central getSession helper
  const session = await getSession();

  // 2. Redirect to login if user is unauthenticated
  if (!session.authenticated) {
    redirect('/auth/login?next=/account');
  }

  const { profile } = session;
  const fullName = profile.full_name || 'Customer';
  const email = profile.email;
  const phone = profile.phone || 'Not provided';
  const avatarLetter = fullName[0].toUpperCase();

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto font-sans px-4 sm:px-6 lg:px-8">
      {/* Page Breadcrumb */}
      <div className="hidden sm:block">
        <Breadcrumb items={[{ label: 'My Account' }]} />
      </div>

      <h1 className="font-serif text-[34px] sm:text-4xl font-bold text-foreground">My Account</h1>

      <div className="w-full bg-surface p-4 sm:p-6 lg:p-8 rounded-[20px] sm:rounded-2xl border border-border shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-3">
          <h3 className="font-serif text-lg font-bold text-foreground">
            Account Information
          </h3>
          <Link
            href="/profile"
            className="text-xs text-foreground font-semibold hover:text-accent flex items-center space-x-1.5 transition-colors min-h-[44px] sm:min-h-0"
          >
            <span>Edit Profile</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="space-y-4">
          {/* Full Name Block */}
          <div className="flex items-start gap-3.5 p-4 bg-surface-muted rounded-[16px] sm:rounded-xl border border-border shadow-xs">
            <User className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider leading-none mb-1.5">Full Name</p>
              <p className="font-medium text-foreground text-[16px] sm:text-base leading-tight">{fullName}</p>
            </div>
          </div>

          {/* Email Address Block */}
          <div className="flex items-start gap-3.5 p-4 bg-surface-muted rounded-[16px] sm:rounded-xl border border-border shadow-xs">
            <Mail className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider leading-none mb-1.5">Email Address</p>
              <p className="font-medium text-foreground text-[16px] sm:text-base leading-tight font-mono break-all overflow-wrap-anywhere">{email}</p>
            </div>
          </div>

          {/* Phone Number Block */}
          <div className="flex items-start gap-3.5 p-4 bg-surface-muted rounded-[16px] sm:rounded-xl border border-border shadow-xs">
            <Phone className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider leading-none mb-1.5">Phone Number</p>
              <p className="font-medium text-foreground text-[16px] sm:text-base leading-tight">{phone}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
