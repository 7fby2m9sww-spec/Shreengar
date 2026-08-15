'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  AdminPageHeader,
  EmptyState,
  SearchAndFilterBar,
  TableSkeleton,
  StatusBadge,
} from '@/components/admin/AdminUI'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Plus, Trash2, BookOpen } from 'lucide-react'
import { getBlogs } from '@/services/admin'
import { Blog } from '@/types/database'
import { formatDate } from '@/lib/utils'

export default function AdminBlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function loadBlogs() {
      try {
        const data = await getBlogs()
        setBlogs(data)
      } catch {}
      setIsLoading(false)
    }
    loadBlogs()
  }, [])

  const handleAddBlog = (e: React.FormEvent) => {
    e.preventDefault()
    const newBlog: Blog = {
      id: `blog-${Date.now()}`,
      title: title || 'New Blog Article',
      slug: title.toLowerCase().replace(/\s+/g, '-') || 'new-article',
      excerpt: 'Fashion guide excerpt.',
      content: 'Article content body.',
      author: 'Shreengar Editorial Team',
      cover_image: '',
      tags: ['Fashion'],
      published_at: new Date().toISOString(),
      is_published: true,
      created_at: new Date().toISOString(),
    }
    setBlogs([...blogs, newBlog])
    setIsModalOpen(false)
    setTitle('')
  }

  const columns: Column<Blog>[] = [
    {
      header: 'Article Title & Author',
      accessor: (row) => (
        <div className="flex items-center space-x-3">
          {row.cover_image ? (
            <Image
              src={row.cover_image}
              alt={row.title}
              width={40}
              height={40}
              className="w-10 h-10 object-cover rounded-xl border border-[#5C0B26]/10"
            />
          ) : (
            <div className="w-10 h-10 bg-amber-500/10 border border-[#5C0B26]/10 rounded-xl flex items-center justify-center font-bold text-xs text-[#5C0B26]">
              {row.title.charAt(0)}
            </div>
          )}
          <div>
            <h4 className="font-serif font-bold text-xs text-[#2B1A1F] line-clamp-1">{row.title}</h4>
            <span className="text-[10px] text-[#7A6B70]">By {row.author}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Publish Date',
      accessor: (row) => (
        <span className="text-xs text-[#7A6B70]">
          {formatDate(row.published_at || '')}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.is_published ? 'active' : 'inactive'} />,
    },
  ]

  const filteredBlogs = blogs.filter(b =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Editorial & Fashion Guides"
        description="Publish ethnic styling guides, fabric care tutorials, and seasonal trend blogs."
        badgeText={`${blogs.length} Articles`}
        actions={
          <Button onClick={() => setIsModalOpen(true)} variant="primary" className="bg-[#5C0B26] hover:bg-[#8C3A57] dark:bg-gradient-to-r dark:from-[#861A39] dark:to-[#611026] dark:text-[#FFF4DC] dark:border-[#D0A45C]/25">
            <Plus className="w-4 h-4 mr-1 text-[#D4AF37]" /> New Article
          </Button>
        }
      />

      <SearchAndFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search blog title..."
      />

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : filteredBlogs.length === 0 ? (
        <EmptyState
          title="No Blog Articles Found"
          description="Create editorial content to engage customers on your storefront."
          icon={BookOpen}
          action={
            <Button onClick={() => setIsModalOpen(true)} variant="primary" className="bg-[#5C0B26] dark:bg-gradient-to-r dark:from-[#861A39] dark:to-[#611026] dark:text-[#FFF4DC] dark:border-[#D0A45C]/25">
              <Plus className="w-4 h-4 mr-1 text-[#D4AF37]" /> Write First Article
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#5C0B26]/10 shadow-sm overflow-hidden p-2 dark:bg-[#211318] dark:border-[#70424E]">
          <DataTable
            columns={columns}
            data={filteredBlogs}
            actions={(row) => (
              <button
                onClick={() => setBlogs(blogs.filter(b => b.id !== row.id))}
                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Delete Article"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          />
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Draft New Editorial Article">
        <form onSubmit={handleAddBlog} className="space-y-4">
          <Input
            label="Article Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. How to Care for Pure Zari Silk Sarees"
            required
          />
          <div className="flex justify-end space-x-2 pt-4 border-t border-[#5C0B26]/10">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="bg-[#5C0B26]">
              Publish Post
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
