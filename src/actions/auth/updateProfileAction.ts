'use server';

import { getSession } from '@/lib/auth/getSession';
import { createAdminClient } from '@/lib/supabase/server';

export type UpdateProfileActionResponse =
  | { success: true }
  | { success: false; error: string };

/**
 * Server Action to update the customer's profile details.
 * Validates authentication via getSession(), restricts updates to full_name and phone,
 * and ensures data integrity.
 * 
 * @param params The profile updates: fullName and gender.
 * @returns A promise resolving to an UpdateProfileActionResponse.
 */
export async function updateProfileAction(params: {
  fullName: string;
  gender: string;
}): Promise<UpdateProfileActionResponse> {
  // 1. Verify user session
  const session = await getSession();
  if (!session.authenticated) {
    return { success: false, error: 'You must be signed in to update your profile.' };
  }

  const { fullName, gender } = params;

  // 2. Validate input constraints
  const cleanFullName = fullName.trim();
  const cleanGender = gender.trim();

  if (!cleanFullName) {
    return { success: false, error: 'Full Name is required and cannot be empty.' };
  }

  if (cleanFullName.length < 2) {
    return { success: false, error: 'Full Name must be at least 2 characters.' };
  }

  const validGenders = ['male', 'female', 'non_binary', 'prefer_not_to_say'];
  if (!validGenders.includes(cleanGender)) {
    return { success: false, error: 'Please select a valid gender option.' };
  }

  try {
    const supabase = createAdminClient();

    // 3. Update customer columns in database
    const { error: dbError } = await supabase
      .from('profiles')
      .update({
        full_name: cleanFullName,
        gender: cleanGender,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.profile.id);

    if (dbError) {
      console.error('Database update failed in updateProfileAction:', dbError);
      return { success: false, error: 'Unable to save profile changes. Please try again.' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Unexpected exception in updateProfileAction server action:', error);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}
