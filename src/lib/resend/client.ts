import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL: RESEND_API_KEY is not defined in the environment variables.');
  } else {
    console.warn(
      'WARNING: RESEND_API_KEY is not defined. Email dispatch will fail. ' +
      'Ensure you set RESEND_API_KEY in your .env.local file.'
    );
  }
}

/**
 * Single reusable Resend client instance for dispatching transaction/auth emails.
 */
export const resend = new Resend(apiKey || 're_dummy_key');
