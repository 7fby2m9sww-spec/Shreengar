// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { adminLogoutAction } from '@/actions/auth/adminLogoutAction';

export const dynamic = 'force-dynamic';

export async function POST() {
  const result = await adminLogoutAction();
  // Return JSON indicating success; client will handle navigation.
  return NextResponse.json({ success: result.success, error: result.success ? null : result.error });
}
