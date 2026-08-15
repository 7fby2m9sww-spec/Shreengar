'use server';

import { resolveApplicationSession } from '@/lib/auth/resolveApplicationSession';

/**
 * Server Action wrapper to retrieve the current unified application session.
 * Exposes resolveApplicationSession to Client Components safely.
 */
export async function getSessionAction() {
  return await resolveApplicationSession();
}
