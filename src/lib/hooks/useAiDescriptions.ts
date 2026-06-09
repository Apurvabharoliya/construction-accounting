'use client'

import { useState, useEffect, useRef } from 'react'

type RecordType = 'beneficiary' | 'party' | 'purchase' | 'sale'

interface UseAiDescriptionsOptions {
  records: any[]
  type: RecordType
  enabled?: boolean
}

export function useAiDescriptions({ records, type, enabled = true }: UseAiDescriptionsOptions) {
  const [descriptions, setDescriptions] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastFetchRef = useRef('')

  useEffect(() => {
    if (!enabled || records.length === 0) {
      setDescriptions({})
      return
    }

    const idsKey = records.map((r) => r.id).join(',')

    // Skip if we already have descriptions cached for these exact IDs
    if (idsKey === lastFetchRef.current) return
    lastFetchRef.current = idsKey

    let cancelled = false
    setLoading(true)
    setError(null)

    async function fetchDescriptions() {
      try {
        const response = await fetch('/api/ai/describe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            records: records.map((r) => ({
              id: r.id,
              ...r,
            })),
          }),
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.error || `HTTP ${response.status}`)
        }

        const data = await response.json()
        const descMap: Record<string, string> = {}
        for (const item of data.descriptions as { id: string; description: string }[]) {
          descMap[item.id] = item.description
        }

        if (!cancelled) {
          setDescriptions(descMap)
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message)
          console.error('AI descriptions error:', e)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchDescriptions()

    return () => {
      cancelled = true
    }
  }, [records, type, enabled])

  return { descriptions, loading, error }
}
