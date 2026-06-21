'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  FileSpreadsheet, 
  MapPin,
  UserCheck,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'

function ConstructionLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 21H21" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 21V7L12 3L19 7V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 21V14H15V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="8" y="9" width="3" height="3" rx="0.5" stroke="white" strokeWidth="1.5" />
      <rect x="13" y="9" width="3" height="3" rx="0.5" stroke="white" strokeWidth="1.5" />
    </svg>
  )
}

const menuItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Vendors', href: '/parties', icon: Users },
  { name: 'Transactions', href: '/purchases', icon: FileSpreadsheet },
  { name: 'Villages', href: '/villages', icon: MapPin },
  { name: 'Beneficiaries', href: '/beneficiaries', icon: UserCheck },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const STORAGE_KEY = 'sidebar-collapsed'
const EDGE_THRESHOLD = 40       // px from left edge to trigger open
const SWIPE_THRESHOLD = 80      // px of travel to complete action
const MAX_DRAG = 300            // max drag distance for visual feedback

function getIsDesktop(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth >= 1024
}

function getIsMobile(): boolean {
  if (typeof window === 'undefined') return true
  return window.innerWidth < 768
}

function getInitialCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored !== null) return stored === 'true'
  // Default: collapsed on tablet (md 768-1023px), expanded on lg+
  return window.innerWidth >= 768 && window.innerWidth < 1024
}

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState<boolean | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hoverExpanded, setHoverExpanded] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isMobile, setIsMobile] = useState(true)

  // Hydrate state from localStorage / screen size
  useEffect(() => {
    setCollapsed(getInitialCollapsed())
    setIsDesktop(getIsDesktop())
    setIsMobile(getIsMobile())

    function handleResize() {
      setIsDesktop(getIsDesktop())
      setIsMobile(getIsMobile())
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Persist collapse state
  useEffect(() => {
    if (collapsed !== null) {
      localStorage.setItem(STORAGE_KEY, String(collapsed))
    }
  }, [collapsed])

  // Keyboard shortcut: Ctrl+B to toggle sidebar
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        setCollapsed(prev => prev === null ? false : !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Swipe gesture state — drag progress in pixels
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const drawerRef = useRef<HTMLDivElement>(null)
  const dragXRef = useRef(0)
  const isDraggingRef = useRef(false)
  const mobileOpenRef = useRef(false)

  // Keep refs in sync with state
  useEffect(() => { dragXRef.current = dragX }, [dragX])
  useEffect(() => { isDraggingRef.current = isDragging }, [isDragging])
  useEffect(() => { mobileOpenRef.current = mobileOpen }, [mobileOpen])

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  // --- Swipe-to-open (from left edge) & swipe-to-close (on drawer) ---
  useEffect(() => {
    if (!isMobile) {
      setIsDragging(false)
      setDragX(0)
      return
    }

    function onTouchStart(e: TouchEvent) {
      const touch = e.touches[0]
      touchStartX.current = touch.clientX
      touchStartY.current = touch.clientY

      // Skip if user tapped a button (e.g. hamburger menu or close button)
      if ((e.target as HTMLElement).closest('button')) return

      // Only start gesture if we're near the left edge (sidebar closed) or on the drawer (sidebar open)
      const isNearLeftEdge = touch.clientX < EDGE_THRESHOLD
      const isOnDrawer = drawerRef.current?.contains(e.target as Node)

      if (mobileOpenRef.current && isOnDrawer) {
        // Starting drag on the open drawer — allow swipe-left-to-close
        setIsDragging(true)
        setDragX(0)
        dragXRef.current = 0
      } else if (!mobileOpenRef.current && isNearLeftEdge) {
        // Starting drag from left edge — allow swipe-right-to-open
        setIsDragging(true)
        setDragX(0)
        dragXRef.current = 0
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (!isDraggingRef.current) return

      const touch = e.touches[0]
      const deltaX = touch.clientX - touchStartX.current
      const deltaY = touch.clientY - touchStartY.current

      // If the user is scrolling vertically more than horizontally, cancel the drag
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 20) {
        setIsDragging(false)
        setDragX(0)
        return
      }

      // Only prevent default when there's meaningful horizontal drag
      // Allow vertical scrolling when drawer is fully open and stationary
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        e.preventDefault()
      }

      let newDragX: number
      if (mobileOpenRef.current) {
        // Drawer is open — track swipe-left (negative delta)
        newDragX = Math.max(-MAX_DRAG, Math.min(0, deltaX))
      } else {
        // Drawer is closed — track swipe-right (positive delta)
        newDragX = Math.max(0, Math.min(MAX_DRAG, deltaX - EDGE_THRESHOLD))
      }
      setDragX(newDragX)
      dragXRef.current = newDragX
    }

    function onTouchEnd() {
      if (!isDraggingRef.current) return

      if (mobileOpenRef.current) {
        // Swipe left to close
        if (dragXRef.current < -SWIPE_THRESHOLD) {
          setMobileOpen(false)
        }
      } else {
        // Swipe right to open
        if (dragXRef.current > SWIPE_THRESHOLD) {
          setMobileOpen(true)
        }
      }

      setIsDragging(false)
      setDragX(0)
      dragXRef.current = 0
    }

    // Attach to document to catch edge swipes anywhere
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [isMobile])

  const toggleCollapse = useCallback(() => setCollapsed(prev => prev === null ? false : !prev), [])

  // Reset hover when sidebar expands
  useEffect(() => {
    if (collapsed === false) setHoverExpanded(false)
  }, [collapsed])

  // Determine if sidebar should show expanded labels
  // During SSR/hydration: always show expanded (avoid flash)
  const isCollapsed = collapsed === null ? false : collapsed
  const showExpanded = isCollapsed ? hoverExpanded : true

  // Guard hover-expand: only on desktop (md+)
  const handleMouseEnter = useCallback(() => {
    if (isDesktop && isCollapsed) setHoverExpanded(true)
  }, [isDesktop, isCollapsed])

  const handleMouseLeave = useCallback(() => {
    setHoverExpanded(false)
  }, [])

  const sidebarContent = (
    <aside
      className={cn(
        "bg-gray-900 text-white min-h-screen flex flex-col transition-[width] duration-200 relative",
        showExpanded ? "w-64" : "w-16"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Logo */}
      <div className={cn(
        "border-b border-white/10 transition-all duration-200",
        showExpanded ? "p-4" : "p-3"
      )}>
        <button onClick={toggleCollapse} className="w-full text-left" title={showExpanded ? 'Collapse sidebar (Ctrl+B)' : 'Expand sidebar (Ctrl+B)'}>
          {showExpanded ? (
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2.5">
                <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/20">
                  <ConstructionLogo />
                </div>
                <span className="text-white">Construction</span>
              </h1>
              <p className="text-gray-500 text-xs mt-1.5 pl-[46px]">Accounting App</p>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
                <ConstructionLogo />
              </div>
            </div>
          )}
        </button>
      </div>

      {/* Mobile close button */}
      <button
        onClick={() => setMobileOpen(false)}
        className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors md:hidden"
        aria-label="Close menu"
      >
        <X className="w-5 h-5" />
      </button>
      
      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 group relative",
                !showExpanded && "justify-center px-2",
                isActive 
                  ? 'bg-white/10 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5',
              )}
              title={!showExpanded ? item.name : undefined}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-400 rounded-r" />
              )}
              <item.icon className={cn(
                "w-5 h-5 flex-shrink-0",
                isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'
              )} />
              {showExpanded && (
                <span className={cn(
                  "text-sm font-medium",
                  isActive ? 'text-white' : ''
                )}>
                  {item.name}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse Button */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={toggleCollapse}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          aria-label={showExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          title={showExpanded ? 'Collapse sidebar (Ctrl+B)' : 'Expand sidebar (Ctrl+B)'}
        >
          {showExpanded ? (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs">Collapse</span>
            </>
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 p-2 bg-white border rounded-lg shadow-sm hover:bg-gray-50 transition-colors md:hidden"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>

      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:flex relative">
        {sidebarContent}
        {/* Floating edge toggle button - visible when collapsed on desktop */}
        {isCollapsed && !hoverExpanded && (
          <button
            onClick={toggleCollapse}
            className="absolute top-20 right-0 translate-x-full z-30 w-6 h-12 bg-gray-900 border border-gray-700 border-l-0 rounded-r-md flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors shadow-md"
            aria-label="Expand sidebar"
            title="Expand sidebar (Ctrl+B)"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Mobile Sidebar Overlay — fades with drag progress */}
      {(mobileOpen || isDragging) && (
        <div 
          className="fixed inset-0 z-40 backdrop-blur-sm md:hidden transition-opacity duration-200"
          style={{
            backgroundColor: `rgba(0,0,0,${isDragging
              ? mobileOpen
                ? 0.5 * (1 - Math.abs(dragX) / MAX_DRAG)   // closing: fade out
                : 0.5 * (Math.abs(dragX) / MAX_DRAG)       // opening: fade in
              : 0.5})`,
            pointerEvents: mobileOpen ? 'auto' : 'none',
          }}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div
        ref={drawerRef}
        className={cn(
          "fixed inset-y-0 left-0 z-50 md:hidden max-w-[85vw]",
          isDragging ? 'transition-none' : 'transition-transform duration-200'
        )}
        style={{
          transform: mobileOpen && !isDragging
            ? 'translateX(0px)'
            : !mobileOpen && !isDragging
              ? 'translateX(-100%)'
              : isDragging && !mobileOpen
                ? `translateX(calc(-100% + ${dragX}px))`
                : `translateX(${dragX}px)`,
        }}
      >
        {sidebarContent}
      </div>
    </>
  )
}
