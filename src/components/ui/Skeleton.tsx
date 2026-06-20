'use client'

import React from 'react'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rectangular' | 'circular' | 'card'
  width?: string | number
  height?: string | number
  lines?: number
}

function Skeleton({ className = '', variant = 'rectangular', width, height, lines }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200 rounded'
  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
    card: 'rounded-xl',
  }

  if (variant === 'circular') {
    return (
      <div
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        style={{ width: width || 40, height: height || 40 }}
      />
    )
  }

  if (variant === 'text' && lines && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${variantClasses[variant]}`}
            style={{ width: i === lines - 1 ? '60%' : '100%', height: height || 16 }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
    />
  )
}

// Pre-built skeleton layouts for common page patterns
function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Table header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 flex-1" variant="text" />
          ))}
        </div>
      </div>
      {/* Table rows */}
      <div className="divide-y divide-gray-50">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="px-4 py-4 flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, colIdx) => (
              <Skeleton
                key={colIdx}
                className="flex-1"
                variant="text"
                height={colIdx === 0 ? 20 : 14}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid gap-4 ${count <= 2 ? 'grid-cols-1 sm:grid-cols-2' : count <= 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3.5 w-20" variant="text" />
              <Skeleton className="h-7 w-32" variant="text" />
            </div>
            <Skeleton variant="circular" width={48} height={48} />
          </div>
        </div>
      ))}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" variant="text" />
          <Skeleton className="h-4 w-32" variant="text" />
        </div>
      </div>
      {/* Content cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-6 space-y-3">
            <Skeleton className="h-4 w-24" variant="text" />
            <Skeleton className="h-6 w-full" variant="text" />
            <Skeleton className="h-4 w-3/4" variant="text" />
          </div>
        ))}
      </div>
      {/* Table */}
      <TableSkeleton rows={4} cols={5} />
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className="max-w-[800px] mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" variant="text" />
            <Skeleton className="h-4 w-56" variant="text" />
          </div>
        </div>
        <Skeleton className="h-10 w-32" variant="rectangular" />
      </div>
      {/* Form table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-4 w-20" variant="text" />
              <Skeleton className="h-10 flex-1" variant="rectangular" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FilterBarSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-10 flex-1" variant="rectangular" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20" variant="rectangular" />
          <Skeleton className="h-10 w-20" variant="rectangular" />
          <Skeleton className="h-10 w-24" variant="rectangular" />
        </div>
      </div>
    </div>
  )
}

export { Skeleton, TableSkeleton, CardSkeleton, DetailSkeleton, FormSkeleton, FilterBarSkeleton }
export default Skeleton
