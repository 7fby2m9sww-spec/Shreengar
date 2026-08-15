import { NextRequest, NextResponse } from 'next/server'
import { resolveApplicationSession } from '@/lib/auth/resolveApplicationSession'
import { checkUserPermission } from '@/services/admin'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await resolveApplicationSession()
    if (session.type !== 'admin') {
      return NextResponse.json({ error: 'Access Denied: Admin session required.' }, { status: 401 })
    }

    // 2. Check permission
    const hasPermission = await checkUserPermission(session.email, 'manage_products')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Access Denied: Missing required permission.' }, { status: 403 })
    }

    // 3. Parse FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const productId = formData.get('productId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'Uploaded file is empty.' }, { status: 400 })
    }

    const fileExt = '.' + (file.name.split('.').pop() || '').toLowerCase()
    
    // SVG check
    if (file.type === 'image/svg+xml' || fileExt === '.svg') {
      return NextResponse.json({ error: 'SVG vector images are not allowed for product photos due to security guidelines.' }, { status: 400 })
    }

    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'image/avif', 'image/gif', 'image/bmp', 'image/tiff',
      'image/heic', 'image/heif'
    ]
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.bmp', '.tiff', '.heic', '.heif']

    if (file.type && !allowedTypes.includes(file.type.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid image format.' }, { status: 400 })
    }

    if (!allowedExtensions.includes(fileExt)) {
      return NextResponse.json({ error: 'Invalid image file extension.' }, { status: 400 })
    }

    // 10MB limit check
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds the 10MB limit.' }, { status: 400 })
    }

    // 4. Generate unique storage path
    const fileBaseName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const fileName = `${fileBaseName}${fileExt}`
    const productIdVal = productId && productId.trim() !== '' ? productId.trim() : 'temp'
    const filePath = `products/${productIdVal}/${fileName}`

    // 5. Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const supabase = createAdminClient()
    const { data, error } = await supabase.storage.from('products').upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })

    if (error || !data) {
      console.error('[API-UPLOAD] Supabase upload failed:', error)
      return NextResponse.json({ error: error?.message || 'Storage upload failed.' }, { status: 500 })
    }

    // 6. Get Public URL
    const { data: publicUrlData } = supabase.storage.from('products').getPublicUrl(data.path)

    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl,
      storage_path: data.path
    })
  } catch (err: any) {
    console.error('[API-UPLOAD] Unexpected error:', err)
    return NextResponse.json({ error: err.message || 'An unexpected error occurred.' }, { status: 500 })
  }
}
