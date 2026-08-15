'use client'

import React, { useState } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

export interface Column<T> {
  header: string
  accessor: keyof T | ((row: T) => React.ReactNode)
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  searchKey?: keyof T
  searchPlaceholder?: string
  actions?: (row: T) => React.ReactNode
  pageSize?: number
  rowClassName?: (row: T) => string
  hidePagination?: boolean
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search records...',
  actions,
  pageSize = 8,
  rowClassName,
  hidePagination = false,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const filteredData = data.filter(row => {
    if (!searchTerm || !searchKey) return true
    const val = row[searchKey]
    if (typeof val === 'string') {
      return val.toLowerCase().includes(searchTerm.toLowerCase())
    }
    return true
  })

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1
  const paginatedData = hidePagination
    ? filteredData
    : filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="w-full bg-white dark:bg-[#211318] rounded-xl shadow-sm border border-rose-900/10 dark:border-[#5D3944] overflow-hidden">
      {searchKey && (
        <div className="p-4 border-b border-rose-900/10 dark:border-[#5D3944]/40 bg-amber-50/40 dark:bg-[#2A171E] flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-rose-950/40 dark:text-[#9D858D]" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#140C10] dark:border-[#5D3944] dark:text-[#FFF4DC] dark:placeholder:text-[#FFF4DC] border border-rose-900/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-900 transition-colors"
            />
          </div>
          <span className="text-xs text-rose-950/60 dark:text-[#E8D1C5] font-medium">
            Total {filteredData.length} records
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-rose-950 dark:bg-[#2A171E] text-amber-100/90 dark:text-[#FFF4DC] text-xs font-semibold uppercase tracking-wider">
              {columns.map((col, idx) => (
                <th key={idx} className={`px-4 py-3 ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
              {actions && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-rose-900/10 dark:divide-[#5D3944]/40 text-sm text-rose-950 dark:text-[#FFF4DC]">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-8 text-rose-900/50 dark:text-[#D7C0B5] italic">
                  No records found.
                </td>
              </tr>
            ) : (
              paginatedData.map(row => {
                const customClass = rowClassName ? rowClassName(row) : ''
                return (
                  <tr key={row.id} className={`hover:bg-amber-50/50 dark:hover:bg-[#2A171E]/60 transition-colors ${customClass}`}>
                    {columns.map((col, idx) => (
                      <td key={idx} className={`px-4 py-3 ${col.className || ''}`}>
                        {typeof col.accessor === 'function'
                          ? col.accessor(row)
                          : (row[col.accessor] as React.ReactNode)}
                      </td>
                    ))}
                    {actions && <td className="px-4 py-3 text-right">{actions(row)}</td>}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {!hidePagination && totalPages > 1 && (
        <div className="px-4 py-3 border-t border-rose-900/10 dark:border-[#5D3944]/40 bg-amber-50/20 dark:bg-[#211318] flex items-center justify-between">
          <span className="text-xs text-rose-950/60 dark:text-[#D7C0B5]">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md border border-rose-900/20 dark:border-[#5D3944] disabled:opacity-30 hover:bg-rose-50 dark:hover:bg-[#2A171E]"
            >
              <ChevronLeft className="w-4 h-4 text-rose-950 dark:text-[#FFF4DC]" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md border border-rose-900/20 dark:border-[#5D3944] disabled:opacity-30 hover:bg-rose-50 dark:hover:bg-[#2A171E]"
            >
              <ChevronRight className="w-4 h-4 text-rose-950 dark:text-[#FFF4DC]" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
