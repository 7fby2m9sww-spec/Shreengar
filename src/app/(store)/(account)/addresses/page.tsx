import React from 'react';
import { getSession } from '@/lib/auth/getSession';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { Breadcrumb } from '@/components/store/Breadcrumb';
import AddressForm from './AddressForm';

export const dynamic = 'force-dynamic';

interface Address {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  is_default: boolean;
  created_at: string;
}

/**
 * Server Component representing the Customer addresses management dashboard.
 * Fetches user session, retrieves only addresses matching user's account ID,
 * and renders the interactive client management component.
 */
export default async function SavedAddressesPage() {
  // 1. Authenticate user session
  const session = await getSession();

  // 2. Redirect unauthenticated users
  if (!session.authenticated) {
    redirect('/auth/login?next=/addresses');
  }

  // 3. Query the user's addresses from the database
  const supabase = createAdminClient();
  const { data: addresses, error: dbError } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', session.profile.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (dbError) {
    console.error('Database query failed during addresses retrieval:', dbError);
  }

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto font-sans px-4 sm:px-6 lg:px-8">
      {/* Navigation Breadcrumbs */}
      <div className="hidden sm:block">
        <Breadcrumb items={[{ label: 'Saved Addresses' }]} />
      </div>

      {/* Render interactive address form manager */}
      <AddressForm initialAddresses={(addresses || []) as Address[]} />
    </div>
  );
}
