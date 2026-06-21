'use client'

import { Search, Bell, User, X, Clock, AlertTriangle, Info, Lightbulb, ChevronRight } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/gst'
import { formatDate } from '@/lib/date'
import Link from 'next/link'

// ===== Auto-tip rotation system =====
const APP_TIPS = [
  { icon: Lightbulb, text: 'Use Ctrl+B to toggle sidebar', color: 'text-amber-600' },
  { icon: Lightbulb, text: 'Upload Excel files to bulk-import transactions', color: 'text-blue-600' },
  { icon: Lightbulb, text: 'Track material usage per village for better planning', color: 'text-green-600' },
  { icon: Lightbulb, text: 'Record payments directly from the ledger view', color: 'text-purple-600' },
  { icon: Lightbulb, text: 'Use Ctrl+Enter to quickly save forms', color: 'text-amber-600' },
  { icon: Lightbulb, text: 'Export reports to Excel or PDF from any report page', color: 'text-blue-600' },
  { icon: Lightbulb, text: 'Mark invoices as paid to keep your books accurate', color: 'text-green-600' },
]

interface NotificationItem {
  id: string
  type: 'payment_due' | 'overdue' | 'info'
  title: string
  description: string
  link?: string
  time: string
}

export default function TopBar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showResults, setShowResults] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showTip, setShowTip] = useState(true)
  const [currentTip, setCurrentTip] = useState(0)
  const searchRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const tipIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // ===== Auto-tip rotation =====
  useEffect(() => {
    if (!showTip) return
    tipIntervalRef.current = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % APP_TIPS.length)
    }, 15000) // Rotate every 15 seconds
    
    return () => {
      if (tipIntervalRef.current) clearInterval(tipIntervalRef.current)
    }
  }, [showTip])

  // ===== Fetch notifications (outstanding payments) =====
  const fetchNotifications = useCallback(async () => {
    try {
      const [purchasesRes, salesRes] = await Promise.all([
        supabase
          .from('purchases')
          .select('id, purchase_number, balance_due, invoice_date, supplier:parties!supplier_id(name)')
          .gt('balance_due', 0)
          .order('invoice_date', { ascending: false })
          .limit(5),
        supabase
          .from('sales')
          .select('id, sale_number, balance_due, invoice_date, beneficiary:parties!client_id(name)')
          .gt('balance_due', 0)
          .order('invoice_date', { ascending: false })
          .limit(5)
      ])

      const items: NotificationItem[] = []

      purchasesRes.data?.forEach((p: any) => {
        items.push({
          id: `p-${p.id}`,
          type: 'payment_due',
          title: `Payment due to ${p.supplier?.name || 'Unknown'}`,
          description: `${formatCurrency(Number(p.balance_due))} remaining on ${p.purchase_number}`,
          link: `/purchases/${p.id}`,
          time: p.invoice_date
        })
      })

      salesRes.data?.forEach((s: any) => {
        items.push({
          id: `s-${s.id}`,
          type: 'overdue',
          title: `Receivable from ${s.beneficiary?.name || 'Unknown'}`,
          description: `${formatCurrency(Number(s.balance_due))} pending on ${s.sale_number}`,
          link: `/sales/${s.id}`,
          time: s.invoice_date
        })
      })

      // Sort by date (newest first)
      items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      
      setNotifications(items)
      setUnreadCount(items.length)
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    // Refresh every 60 seconds
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // ===== Click outside handlers =====
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ===== Search debounce =====
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    const delayDebounce = setTimeout(async () => {
      const { data } = await supabase
        .from('parties')
        .select('id, name, phone, party_type')
        .or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .limit(8)

      if (data) {
        setSearchResults(data)
        setShowResults(true)
      }
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [searchQuery])

  const handleSelectParty = (party: any) => {
    setShowResults(false)
    setSearchQuery('')
    router.push(`/parties/${party.id}`)
  }

  const TipIcon = APP_TIPS[currentTip].icon

  return (
    <header className="h-14 sm:h-16 bg-white/95 backdrop-blur-md border-b border-amber-900/10 flex items-center justify-between px-3 md:px-6 sticky top-0 z-30 shadow-sm">
      {/* Mobile spacer for hamburger menu */}
      <div className="md:hidden w-8" />

      {/* Search */}
      <div className="flex items-center gap-4 flex-1" ref={searchRef}>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-amber-50/30 text-sm transition-all duration-200 placeholder:text-gray-400"
          />
          
          {/* Search Results */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-lg shadow-amber-900/5 overflow-hidden z-50 animate-fade-in-scale origin-top">
              {searchResults.map((party, i) => (
                <button
                  key={party.id}
                  onClick={() => handleSelectParty(party)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-amber-50/50 transition-colors text-left border-b last:border-b-0 border-gray-50"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-amber-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{party.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {party.party_type === 'supplier' ? 'Vendor' : 'Beneficiary'} {party.phone ? `• ${party.phone}` : ''}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Auto-tip bar */}
        {showTip && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-lg border border-amber-200/50 animate-fade-in-up max-w-sm">
            <TipIcon className={`w-3.5 h-3.5 ${APP_TIPS[currentTip].color} shrink-0`} />
            <p className="text-xs text-gray-600 truncate">{APP_TIPS[currentTip].text}</p>
            <button 
              onClick={() => setShowTip(false)} 
              className="p-0.5 hover:bg-amber-200/50 rounded shrink-0 ml-auto"
              aria-label="Dismiss tip"
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>
          </div>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
        {/* Notification Bell */}
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative p-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 ${
              showNotifications 
                ? 'bg-amber-100 text-amber-700' 
                : 'hover:bg-gray-100 text-gray-500'
            }`}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-dot-pulse"></span>
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-100 rounded-xl shadow-lg shadow-amber-900/10 overflow-hidden z-50 animate-fade-in-scale origin-top-right">
              <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-amber-100/30">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      {unreadCount} pending
                    </span>
                  )}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 font-medium">All clear!</p>
                    <p className="text-xs text-gray-400 mt-1">No outstanding payments</p>
                  </div>
                ) : (
                  notifications.map((notif, i) => {
                    const Icon = notif.type === 'info' ? Info : notif.type === 'overdue' ? AlertTriangle : Clock
                    return (
                      <Link
                        key={notif.id}
                        href={notif.link || '#'}
                        onClick={() => setShowNotifications(false)}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-amber-50/30 transition-colors border-b border-gray-50 last:border-b-0 ${
                          i === 0 ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 ${
                          notif.type === 'overdue' 
                            ? 'bg-red-100' 
                            : notif.type === 'payment_due' 
                              ? 'bg-amber-100' 
                              : 'bg-blue-100'
                        }`}>
                          <Icon className={`w-4 h-4 ${
                            notif.type === 'overdue' 
                              ? 'text-red-600' 
                              : notif.type === 'payment_due' 
                                ? 'text-amber-600' 
                                : 'text-blue-600'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{notif.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{notif.description}</p>
                        </div>
                      </Link>
                    )
                  })
                )}
              </div>

              {notifications.length > 0 && (
                <Link
                  href="/reports/outstanding"
                  onClick={() => setShowNotifications(false)}
                  className="block px-4 py-2.5 text-center text-xs font-medium text-amber-700 hover:bg-amber-50/50 bg-gradient-to-r from-amber-50/50 to-transparent border-t border-gray-100 transition-colors"
                >
                  View all outstanding →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2 pl-2 md:pl-4 border-l border-gray-100">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center shadow-sm shadow-amber-500/20 flex-shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900 leading-tight">Admin</p>
            <p className="text-xs text-gray-400">Construction Account</p>
          </div>
        </div>
      </div>

      {/* Mobile tip banner */}
      {showTip && (
        <div className="fixed bottom-0 left-0 right-0 md:hidden z-40 animate-fade-in-up">
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-2.5 flex items-center gap-2 shadow-lg">
            <TipIcon className="w-4 h-4 text-amber-200 shrink-0" />
            <p className="text-xs flex-1">{APP_TIPS[currentTip].text}</p>
            <button 
              onClick={() => setShowTip(false)}
              className="p-1 hover:bg-amber-500/50 rounded shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
