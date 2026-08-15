// src/app/api/admin/status/route.ts
import { NextResponse } from 'next/server';
import { resolveApplicationSession } from '@/lib/auth/resolveApplicationSession';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await resolveApplicationSession();

    if (session.type === 'admin') {
      return NextResponse.json({
        isAdmin: true,
        admin: {
          id: session.adminUserId,
          email: session.email,
          full_name: session.fullName,
          role: { code: session.role }
        }
      });
    }

    return NextResponse.json({ isAdmin: false, admin: null });
  } catch (e) {
    console.error('[api/admin/status] internal error', e);
    return NextResponse.json({ isAdmin: false, admin: null }, { status: 500 });
  }
}
