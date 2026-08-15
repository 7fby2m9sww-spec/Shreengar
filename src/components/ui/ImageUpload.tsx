'use client'

import React, { useState, useRef } from 'react'
import Image from 'next/image'
import { Upload, X, Loader2, Star, ArrowLeft, ArrowRight } from 'lucide-react'
import { uploadProductImageAction } from '@/actions/admin/uploadProductImageAction'
import { ProductImageState } from '@/types/database'

interface ImageUploadProps {
  bucket?: string;
  images: ProductImageState[];
  onChange: (images: ProductImageState[]) => void;
  maxFiles?: number;
  label?: string;
  onUploadingChange?: (isUploading: boolean) => void;
  onUploadErrorChange?: (hasError: boolean) => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  bucket = 'products',
  images,
  onChange,
  maxFiles = 5,
  label = 'Product Images (Upload up to 5 images)',
  onUploadingChange,
  onUploadErrorChange,
}) => {
  const [isUploading, setIsUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFiles = (files: FileList): boolean => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (images.length + files.length > maxFiles) {
      setErrorMsg(`You can upload a maximum of ${maxFiles} images.`)
      return false
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!allowedTypes.includes(file.type)) {
        setErrorMsg(`Unsupported file type: ${file.name}. Only JPG, PNG, and WebP are allowed.`)
        return false
      }
      if (file.size > maxSize) {
        setErrorMsg(`File too large: ${file.name}. Maximum file size is 10MB.`)
        return false
      }
    }
    return true
  }

  const uploadFiles = async (files: FileList) => {
    if (!validateFiles(files)) return

    setIsUploading(true);
    onUploadingChange?.(true);
    onUploadErrorChange?.(false);
    setErrorMsg(null);

    const newUploaded: ProductImageState[] = []
    const failedFiles: string[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        const formData = new FormData()
        formData.append('file', file)

        const res = await uploadProductImageAction(formData)

        if (res.success && res.url && res.storage_path) {
          newUploaded.push({
            type: 'new',
            image_url: res.url,
            storage_path: res.storage_path,
          })
        } else {
          console.error('Product image Storage upload failed', {
            bucket,
            originalName: file.name,
            mimeType: file.type,
            fileSize: file.size,
            message: res.error,
          })
          failedFiles.push(`${file.name} (Error: ${res.error ?? 'Unknown Storage error'})`)
        }
      }

      if (failedFiles.length > 0) {
        setErrorMsg(`Failed to upload: ${failedFiles.join(', ')}`);
        onUploadErrorChange?.(true);
      }

      onChange([...images, ...newUploaded]);
    } catch {
      setErrorMsg('Failed to upload image. Please try again.')
    } finally {
      setIsUploading(false)
      onUploadingChange?.(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(e.target.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = e.dataTransfer.files
    if (files) uploadFiles(files)
  }

  const handleRemoveImage = (indexToRemove: number) => {
    const newImages = images.filter((_, idx) => idx !== indexToRemove)
    onChange(newImages)
  }

  const handleMoveLeft = (index: number) => {
    if (index === 0) return
    const newImages = [...images]
    const temp = newImages[index]
    newImages[index] = newImages[index - 1]
    newImages[index - 1] = temp
    onChange(newImages)
  }

  const handleMoveRight = (index: number) => {
    if (index === images.length - 1) return
    const newImages = [...images]
    const temp = newImages[index]
    newImages[index] = newImages[index + 1]
    newImages[index + 1] = temp
    onChange(newImages)
  }

  const handleMakeFeatured = (index: number) => {
    if (index === 0) return
    const newImages = [...images]
    const [featuredImage] = newImages.splice(index, 1)
    newImages.unshift(featuredImage)
    onChange(newImages)
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-rose-950/80">
          {label}
        </label>
      )}

      {/* Image Thumbnail Preview Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {images.map((img, idx) => {
          const isFeatured = idx === 0
          return (
            <div
              key={idx}
              className="relative aspect-[3/4] rounded-xl overflow-hidden border border-rose-900/20 bg-rose-950/5 group shadow-sm flex flex-col justify-end"
            >
              <Image src={img.image_url} alt={`Upload ${idx}`} fill className="object-cover" />
              
              {/* Featured Badge */}
              {isFeatured && (
                <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-amber-500 text-white rounded-md text-[9px] font-bold flex items-center space-x-1 shadow-xs z-10">
                  <Star className="w-2.5 h-2.5 fill-white" />
                  <span>Featured</span>
                </div>
              )}

              {/* Hover controls overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5 z-10">
                <div className="flex justify-between items-start">
                  {!isFeatured ? (
                    <button
                      type="button"
                      onClick={() => handleMakeFeatured(idx)}
                      className="p-1 bg-white/95 hover:bg-amber-500 hover:text-white text-amber-700 rounded-md transition-colors shadow-2xs cursor-pointer"
                      title="Make Featured Image"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="p-1 bg-white/95 hover:bg-rose-600 hover:text-white text-rose-600 rounded-md transition-colors shadow-2xs cursor-pointer"
                    title="Delete Image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Reorder Arrows */}
                <div className="flex justify-center space-x-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveLeft(idx)}
                    className="p-1 bg-white/95 hover:bg-[#5C0B26] hover:text-white text-rose-950 rounded-md transition-colors disabled:opacity-40 disabled:hover:bg-white/95 disabled:hover:text-rose-950 shadow-2xs cursor-pointer"
                    title="Move Left"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === images.length - 1}
                    onClick={() => handleMoveRight(idx)}
                    className="p-1 bg-white/95 hover:bg-[#5C0B26] hover:text-white text-rose-950 rounded-md transition-colors disabled:opacity-40 disabled:hover:bg-white/95 disabled:hover:text-rose-950 shadow-2xs cursor-pointer"
                    title="Move Right"
                  >
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {/* Upload Trigger Dropzone & Drag Over */}
        {images.length < maxFiles && (
          <label
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative aspect-[3/4] rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-3 cursor-pointer transition-all text-center ${
              isDragOver 
                ? 'border-amber-700 bg-amber-100/50 scale-105' 
                : 'border-rose-900/30 hover:border-amber-700 bg-amber-50/40 hover:bg-amber-100/50'
            }`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="w-6 h-6 text-amber-700 animate-spin" />
              </div>
            ) : (
              <>
                <Upload className="w-6 h-6 text-amber-800 mb-1" />
                <span className="text-[11px] font-bold text-rose-950">Add Photos</span>
                <span className="text-[9px] text-rose-950/50">PNG, JPG, WEBP</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        )}
      </div>

      {errorMsg && (
        <p className="text-rose-600 text-[11px] font-medium px-2 py-1 bg-rose-50 rounded-md border border-rose-200">
          {errorMsg}
        </p>
      )}
    </div>
  )
}
