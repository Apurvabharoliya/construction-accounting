'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Check, ChevronDown, Loader2, Search, X } from 'lucide-react'

interface Beneficiary {
  id: string
  name: string
}

interface BeneficiaryDropdownProps {
  value: string
  onChange: (value: string, id?: string) => void
  onBeneficiaryCreated?: (beneficiary: Beneficiary) => void
  className?: string
  placeholder?: string
  error?: boolean
}

export default function BeneficiaryDropdown({
  value,
  onChange,
  onBeneficiaryCreated,
  className = '',
  placeholder = 'Select beneficiary',
  error = false
}: BeneficiaryDropdownProps) {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) fetchBeneficiaries()
  }, [open])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setAdding(false)
        setNewName('')
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (adding && inputRef.current) inputRef.current.focus()
  }, [adding])

  useEffect(() => {
    if (open && !adding) {
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [open, adding])

  useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const el = listRef.current.children[highlightIdx] as HTMLElement
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightIdx])

  async function fetchBeneficiaries() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('parties')
        .select('id, name')
        .eq('party_type', 'beneficiary')
        .order('name')
      if (error) throw error
      setBeneficiaries(data || [])
    } catch (err) {
      console.error('Failed to fetch beneficiaries:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    const trimmed = newName.trim()
    if (!trimmed) return

    if (beneficiaries.some(b => b.name.toLowerCase() === trimmed.toLowerCase())) {
      onChange(trimmed)
      setOpen(false)
      setAdding(false)
      setNewName('')
      setSearch('')
      return
    }

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('parties')
        .insert([{ name: trimmed, party_type: 'beneficiary', opening_balance: 0, gst_registered: false }])
        .select('id, name')
        .single()
      if (error) throw error
      setBeneficiaries(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      onChange(data.name)
      onBeneficiaryCreated?.(data)
      setOpen(false)
      setAdding(false)
      setNewName('')
      setSearch('')
    } catch (err: any) {
      console.error('Failed to create beneficiary:', err)
    } finally {
      setSaving(false)
    }
  }

  const filtered = useMemo(() => {
    if (!search) return beneficiaries
    const q = search.toLowerCase()
    return beneficiaries.filter(b => b.name.toLowerCase().includes(q))
  }, [beneficiaries, search])

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
          onChange(filtered[highlightIdx].name, filtered[highlightIdx].id)
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

  return (
    <div ref={dropdownRef} className={`relative ${className}`} id="beneficiary-dropdown">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        id="beneficiary-dropdown-trigger"
        className={`w-full flex items-center justify-between px-3 py-2.5 border rounded-lg text-sm text-left bg-white transition-all duration-150
          ${error ? 'border-red-300' : ''}
          ${open ? 'border-blue-400 ring-2 ring-blue-100 shadow-sm' : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'}
          ${!value ? 'text-gray-400' : 'text-gray-900'}`}
      >
        <span className="truncate font-medium">{value || placeholder}</span>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {value && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => { e.stopPropagation(); onChange('') }}
              className="p-0.5 text-gray-300 hover:text-gray-500 rounded transition-colors"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div role="listbox" aria-label="Beneficiary list" className="absolute z-50 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                ref={searchRef}
                id="beneficiary-search"
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setHighlightIdx(-1) }}
                onKeyDown={handleKeyDown}
                placeholder="Search beneficiaries..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-colors"
              />
            </div>
          </div>
          <div ref={listRef} className="overflow-y-auto max-h-48 py-1">
            {loading ? (
              <div className="flex items-center justify-center py-5 text-gray-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-5 text-center">
                <p className="text-sm text-gray-400">No beneficiaries found</p>
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
              filtered.map((b, idx) => (
                <button
                  key={b.id}
                  type="button"
                  role="option"
                  aria-selected={value === b.name}
                  onClick={() => { onChange(b.name, b.id); setOpen(false); setSearch('') }}
                  onMouseEnter={() => setHighlightIdx(idx)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors duration-75
                    ${idx === highlightIdx ? 'bg-blue-50' : ''}
                    ${value === b.name ? 'bg-blue-50/50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                    ${value === b.name ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                    {value === b.name && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className={`truncate ${value === b.name ? 'font-semibold' : ''}`}>{b.name}</span>
                </button>
              ))
            )}
          </div>
          <div className="border-t border-gray-100">
            {!adding ? (
              <button type="button" onClick={() => setAdding(true)} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors font-medium">
                <div className="w-4 h-4 rounded-full border-2 border-dashed border-blue-300 flex items-center justify-center">
                  <Plus className="w-2.5 h-2.5" />
                </div>
                Add New Beneficiary
              </button>
            ) : (
              <div className="p-2.5 space-y-2 bg-gray-50/50">
                <label htmlFor="new-beneficiary-name" className="sr-only">New beneficiary name</label>
                <input
                  id="new-beneficiary-name"
                  ref={inputRef}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleCreate() }
                    else if (e.key === 'Escape') { setAdding(false); setNewName('') }
                  }}
                  placeholder="Enter beneficiary name..."
                  className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={handleCreate} disabled={!newName.trim() || saving} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}Save
                  </button>
                  <button type="button" onClick={() => { setAdding(false); setNewName('') }} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
