'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/services/auth'
import { checkUserPermission } from '@/services/admin'

export async function uploadCategoryImageAction(formData: FormData): Promise<{
  success: boolean
  url?: string
  storage_path?: string
  error?: string
}> {
  try {
    // 1. Authenticate admin user
    const adminSession = await requireAdmin()
    
    // 2. Authorize admin user
    const hasPermission = await checkUserPermission(adminSession.email, 'manage_categories')
    if (!hasPermission) {
      return { success: false, error: 'Access Denied: You do not have permission to manage categories.' }
    }

    // 3. Extract and validate file
    const file = formData.get('file') as File | null
    if (!file) {
      return { success: false, error: 'No file provided.' }
    }

    if (file.size === 0) {
      return { success: false, error: 'Uploaded file is empty (0 bytes).' }
    }

    const fileExt = '.' + (file.name.split('.').pop() || '').toLowerCase()
    
    // Explicit SVG rejection
    if (file.type === 'image/svg+xml' || fileExt === '.svg') {
      return { success: false, error: 'SVG vector images are not allowed for category photos due to security guidelines. Please upload JPG, PNG, WebP, AVIF, HEIC, or GIF image files.' }
    }

    // Allowed MIME types and extensions
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'image/avif', 'image/gif', 'image/bmp', 'image/tiff',
      'image/heic', 'image/heif'
    ]
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.bmp', '.tiff', '.heic', '.heif']

    if (file.type && !allowedTypes.includes(file.type.toLowerCase())) {
      return { success: false, error: 'Invalid image format. Supported formats: JPG, PNG, WebP, AVIF, GIF, BMP, TIFF, HEIC, HEIF.' }
    }

    if (!allowedExtensions.includes(fileExt)) {
      return { success: false, error: 'Invalid image file extension. Supported extensions: .jpg, .jpeg, .png, .webp, .avif, .gif, .bmp, .tiff, .heic, .heif.' }
    }

    // Validate size (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return { success: false, error: 'File size exceeds the 10MB limit.' }
    }

    // 4. Generate unique storage file path
    const fileBaseName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const fileName = `${fileBaseName}${fileExt}`
    const filePath = `categories/${fileName}`

    // Convert file to Buffer for node-compatibility in upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 5. Upload file using the admin client (which bypasses RLS)
    const supabase = createAdminClient()
    const { data, error } = await supabase.storage.from('products').upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })

    if (error || !data) {
      console.error('[uploadCategoryImageAction] Supabase storage upload failed:', error)
      return { success: false, error: error?.message || 'Failed to upload to storage.' }
    }

    // 6. Get public URL of the uploaded object
    const { data: publicUrlData } = supabase.storage.from('products').getPublicUrl(data.path)
    
    return { success: true, url: publicUrlData.publicUrl, storage_path: data.path }
  } catch (err: any) {
    console.error('[uploadCategoryImageAction] Unexpected error:', err)
    return { success: false, error: err?.message || 'An unexpected error occurred during upload.' }
  }
}
