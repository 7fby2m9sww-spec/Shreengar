import React from 'react';
import { getSession } from '@/lib/auth/getSession';
import { redirect } from 'next/navigation';
import { Breadcrumb } from '@/components/store/Breadcrumb';
import ProfileForm from './ProfileForm';
import { AccountPageHeader } from '@/components/store/account/AccountPageHeader';

export const dynamic = 'force-dynamic';

/**
 * Server Component for the customer profile settings page.
 * Restricts access to authenticated customer sessions, fetches profile details,
 * and passes them to the interactive client-side form.
 */
export default async function ProfilePage() {
  // 1. Authenticate user session
  const session = await getSession();

  // 2. Redirect unauthenticated users to login
  if (!session.authenticated) {
    redirect('/auth/login?next=/profile');
  }

  const { profile } = session;

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto font-sans">
      <AccountPageHeader
        breadcrumbs={[{ label: 'My Account' }]}
        title="My Account"
        description="Manage your profile and account details."
      />

      {/* Render the profile editing form client wrapper */}
      <section className="bg-transparent">
        <ProfileForm initialProfile={profile} />
      </section>
    </div>
  );
}
