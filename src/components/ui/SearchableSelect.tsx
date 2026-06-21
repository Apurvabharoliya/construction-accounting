'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  className?: string
  disabled?: boolean
  searchable?: boolean
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  disabled = false,
  searchable = true,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)
  const label = selected?.label || ''

  const filtered = useMemo(() => {
    if (!search) return options
    const q = search.toLowerCase()
    return options.filter(o => o.label.toLowerCase().includes(q))
  }, [options, search])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Focus search on open
  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [open, searchable])

  // Scroll highlight into view
  useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const el = listRef.current.children[highlightIdx] as HTMLElement
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightIdx])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOpen(true)
        return
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightIdx(prev => (prev + 1) % filtered.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightIdx(prev => (prev - 1 + filtered.length) % filtered.length)
        break
      case 'Enter':
        e.preventDefault()
        if (highlightIdx >= 0 && filtered[highlightIdx]) {
          onChange(filtered[highlightIdx].value)
          setOpen(false)
          setSearch('')
        }
        break
      case 'Escape':
        setOpen(false)
        setSearch('')
        break
    }
  }

  function selectOption(val: string) {
    onChange(val)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between px-0 py-2.5 border-0 rounded-none text-sm text-left bg-transparent transition-all duration-150
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${!label ? 'text-gray-400' : 'text-gray-900 font-medium'}`}
      >
        <span className="truncate font-medium">{label || placeholder}</span>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {label && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => { e.stopPropagation(); selectOption('') }}
              className="p-0.5 text-gray-300 hover:text-gray-500 rounded transition-colors"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden transition-all duration-150">
          {/* Search */}
          {searchable && (
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setHighlightIdx(-1) }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Options */}
          <div ref={listRef} className="overflow-y-auto max-h-52 py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-gray-400">No results found</p>
                {search && (
                  <button
                    onClick={() => { setSearch(''); setHighlightIdx(-1) }}
                    className="text-xs text-blue-500 hover:text-blue-600 mt-1"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              filtered.map((opt, idx) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => selectOption(opt.value)}
                  onMouseEnter={() => setHighlightIdx(idx)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors duration-75
                    ${idx === highlightIdx ? 'bg-blue-50' : ''}
                    ${value === opt.value ? 'bg-blue-50/50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                    ${value === opt.value ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                    {value === opt.value && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className={`truncate ${value === opt.value ? 'font-semibold' : ''}`}>{opt.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
