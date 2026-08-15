import { NextResponse } from 'next/server'
import { resolveApplicationSession } from '@/lib/auth/resolveApplicationSession'
import { createAdminClient } from '@/lib/supabase/server'
import { checkUserPermission } from '@/services/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  // 1. Session resolution
  let session;
  try {
    session = await resolveApplicationSession();
  } catch (sessErr: any) {
    console.error('[api/admin/support/unread-count] Session resolution failed:', sessErr.message || sessErr);
    return NextResponse.json(
      { success: false, count: 0, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  if (!session || session.type !== 'admin') {
    return NextResponse.json(
      { success: false, count: 0, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // 2. Permission check
  try {
    const hasPermission = await checkUserPermission(session.email, 'support.manage')
    if (!hasPermission) {
      return NextResponse.json(
        { success: false, count: 0, error: 'Forbidden' },
        { status: 403 }
      )
    }
  } catch (permErr: any) {
    console.error('[api/admin/support/unread-count] Permission helper failed:', permErr.message || permErr);
    // Unexpected permission check failure → safe HTTP 200/count 0
    return NextResponse.json(
      { success: false, count: 0, error: 'Unable to load support count' },
      { status: 200 }
    )
  }

  // 3. Database query
  try {
    const supabase = createAdminClient()
    const { count, error } = await supabase
      .from('support_conversations')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'assigned'])
      .or('admin_last_read_at.is.null,admin_last_read_at.lt.last_message_at')

    if (error) {
      console.error('[api/admin/support/unread-count] Supabase query error:', error.message)
      return NextResponse.json(
        { success: false, count: 0, error: 'Unable to load support count' },
        { status: 200 }
      )
    }

    return NextResponse.json({ success: true, count: count ?? 0 })
  } catch (dbErr: any) {
    console.error('[api/admin/support/unread-count] Database query exception:', dbErr.message || dbErr)
    return NextResponse.json(
      { success: false, count: 0, error: 'Unable to load support count' },
      { status: 200 }
    )
  }
}
