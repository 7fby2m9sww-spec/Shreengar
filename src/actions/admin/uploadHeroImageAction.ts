'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/services/auth'
import { checkUserPermission } from '@/services/admin'

export async function uploadHeroImageAction(formData: FormData): Promise<{
  success: boolean
  url?: string
  storage_path?: string
  error?: string
}> {
  try {
    // 1. Authenticate admin user
    const adminSession = await requireAdmin()
    
    // 2. Authorize admin user for marketing/banners management
    const hasPermission = await checkUserPermission(adminSession.email, 'manage_marketing')
    if (!hasPermission) {
      return { success: false, error: 'Access Denied: You do not have permission to manage homepage banners.' }
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
    
    // Reject SVG files due to security guidelines
    if (file.type === 'image/svg+xml' || fileExt === '.svg') {
      return { success: false, error: 'SVG vector images are not allowed for Hero photographs due to security guidelines. Please upload JPG, PNG, WebP, or AVIF files.' }
    }

    // Reject HEIC/HEIF files unless converted
    if (file.type === 'image/heic' || file.type === 'image/heif' || fileExt === '.heic' || fileExt === '.heif') {
      return { success: false, error: 'HEIC format is not supported directly for web browser display. Please upload a JPG, PNG, WebP, or AVIF image file.' }
    }

    // Allowed MIME types and extensions
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'image/avif', 'image/gif'
    ]
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']

    if (file.type && !allowedTypes.includes(file.type.toLowerCase())) {
      return { success: false, error: 'Invalid image format. Supported formats: JPG, PNG, WebP, AVIF, GIF, HEIC.' }
    }

    if (!allowedExtensions.includes(fileExt)) {
      return { success: false, error: 'Invalid image file extension. Supported extensions: .jpg, .jpeg, .png, .webp, .avif, .gif, .heic.' }
    }

    // Validate max file size (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return { success: false, error: 'File size exceeds the 10MB limit.' }
    }

    // 4. Generate unique storage file path
    const fileBaseName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const fileName = `hero-${fileBaseName}${fileExt}`
    const filePath = `hero/${fileName}`

    // Convert file to Buffer for node compatibility
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 5. Upload file using admin client (bypasses RLS)
    const supabase = createAdminClient()
    const { data, error } = await supabase.storage.from('products').upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })

    if (error || !data) {
      console.error('[uploadHeroImageAction] Storage upload failed:', error)
      return { success: false, error: error?.message || 'Failed to upload Hero image to storage.' }
    }

    // 6. Return public URL
    const { data: publicUrlData } = supabase.storage.from('products').getPublicUrl(data.path)
    
    return { success: true, url: publicUrlData.publicUrl, storage_path: data.path }
  } catch (err: any) {
    console.error('[uploadHeroImageAction] Unexpected error:', err)
    return { success: false, error: err?.message || 'An unexpected error occurred during Hero image upload.' }
  }
}
