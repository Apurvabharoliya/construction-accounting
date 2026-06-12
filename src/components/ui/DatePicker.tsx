'use client'

import { useRef, useCallback, useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
}

/**
 * Convert yyyy-mm-dd → dd/mm/yyyy for display
 */
function toDisplay(value: string): string {
  if (!value) return ''
  const parts = value.split('-')
  if (parts.length !== 3) return value
  const [y, m, d] = parts
  // Validate they're all numeric
  if (!/^\d{4}$/.test(y) || !/^\d{2}$/.test(m) || !/^\d{2}$/.test(d)) return value
  return `${d}/${m}/${y}`
}

/**
 * A custom date picker that always displays dates in dd/mm/yyyy format
 * and shows a visible calendar icon that works on all platforms.
 *
 * Uses a hidden native <input type="date"> for the actual date picker.
 * The visible text input shows the date in dd/mm/yyyy format.
 */
export default function DatePicker({
  value,
  onChange,
  className = '',
  placeholder = 'dd/mm/yyyy',
  required,
  disabled
}: DatePickerProps) {
  const [displayValue, setDisplayValue] = useState(toDisplay(value))
  const nativeInputRef = useRef<HTMLInputElement>(null)
  const textInputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)

  // Sync display when value changes externally
  useEffect(() => {
    setDisplayValue(toDisplay(value))
  }, [value])

  const openPicker = useCallback(() => {
    if (disabled) return
    nativeInputRef.current?.showPicker()
  }, [disabled])

  const handleNativeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value // yyyy-mm-dd
    if (newValue) {
      setDisplayValue(toDisplay(newValue))
      onChange(newValue)
    }
  }, [onChange])

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    // Allow only digits and slashes
    const cleaned = raw.replace(/[^0-9/]/g, '')
    setDisplayValue(cleaned)

    // Auto-convert when complete dd/mm/yyyy is typed
    if (cleaned.length === 10) {
      const parts = cleaned.split('/')
      if (parts.length === 3) {
        const [d, m, y] = parts
        if (/^\d{2}$/.test(d) && /^\d{2}$/.test(m) && /^\d{4}$/.test(y)) {
          onChange(`${y}-${m}-${d}`)
        }
      }
    }
  }, [onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow native date picker on Space/Enter
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      openPicker()
    }
  }, [openPicker])

  return (
    <div className={`relative ${focused ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}>
      {/* Visible text input showing dd/mm/yyyy */}
      <input
        ref={textInputRef}
        type="text"
        value={displayValue}
        onChange={handleTextChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`w-full px-4 py-2 border rounded-lg cursor-pointer bg-white ${
          focused ? 'border-blue-500' : ''
        } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        autoComplete="off"
        readOnly={false}
        inputMode="numeric"
      />
      {/* Calendar icon button */}
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        tabIndex={-1}
        aria-label="Pick date"
      >
        <Calendar className="w-4 h-4" />
      </button>
      {/* Hidden native date input for OS-native date picker */}
      <input
        ref={nativeInputRef}
        type="date"
        value={value}
        onChange={handleNativeChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  )
}
