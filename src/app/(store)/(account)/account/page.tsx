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
    <div className="space-y-6 pb-16 max-w-4xl mx-auto font-sans">
      {/* Page Breadcrumb */}
      <Breadcrumb items={[{ label: 'My Account' }]} />

      <h1 className="font-serif text-3xl font-bold text-foreground">My Account</h1>

      <div className="w-full bg-surface p-6 sm:p-8 rounded-2xl border border-border shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h3 className="font-serif text-lg font-bold text-foreground">
            Account Information
          </h3>
          <Link
            href="/profile"
            className="text-xs text-foreground font-semibold hover:text-accent flex items-center space-x-1.5 transition-colors"
          >
            <span>Edit Profile</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

          <div className="space-y-4 text-sm">
            {/* Full Name Block */}
            <div className="flex items-center space-x-4 p-4 bg-surface-muted rounded-xl border border-border shadow-sm">
              <User className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Full Name</p>
                <p className="font-medium text-foreground text-sm">{fullName}</p>
              </div>
            </div>

            {/* Email Address Block */}
            <div className="flex items-center space-x-4 p-4 bg-surface-muted rounded-xl border border-border shadow-sm">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Email Address</p>
                <p className="font-medium text-foreground text-sm font-mono">{email}</p>
              </div>
            </div>

            {/* Phone Number Block */}
            <div className="flex items-center space-x-4 p-4 bg-surface-muted rounded-xl border border-border shadow-sm">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Phone Number</p>
                <p className="font-medium text-foreground text-sm">{phone}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
