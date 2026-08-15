import { resolveApplicationSession } from './resolveApplicationSession';
import { CustomerJwtPayload } from './createJwt';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  gender: string | null;
  phone: string | null;
  avatar_url?: string | null;
}

export type CustomerSession =
  | {
      authenticated: true;
      profile: Profile;
      token: CustomerJwtPayload;
    }
  | {
      authenticated: false;
    };

/**
 * Retrieves the current customer session.
 * Routes directly through resolveApplicationSession to enforce collision policies.
 */
export async function getSession(): Promise<CustomerSession> {
  const appSession = await resolveApplicationSession();
  
  if (appSession.type === 'customer') {
    return {
      authenticated: true,
      profile: {
        id: appSession.customerId,
        email: appSession.email,
        full_name: appSession.fullName,
        gender: appSession.gender,
        phone: appSession.phone,
        avatar_url: appSession.avatar_url,
      },
      token: {
        sub: appSession.customerId,
        type: 'customer',
      },
    };
  }
  
  return { authenticated: false };
}
