'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  TrendingUp,
  HandHeart,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const menuItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Parties', href: '/parties', icon: Users },
  { name: 'Vendors', href: '/purchases', icon: ShoppingCart },
  { name: 'Sales', href: '/sales', icon: TrendingUp },
  { name: 'Beneficiaries', href: '/beneficiaries', icon: HandHeart },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const sidebarContent = (
    <aside className={cn(
      "bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 text-white min-h-screen flex flex-col transition-all duration-300 relative overflow-hidden",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Decorative gradient blobs */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Logo */}
      <div className={cn(
        "relative p-4 border-b border-white/5",
        collapsed && "p-3"
      )}>
        {collapsed ? (
          <div className="flex items-center justify-center">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 animate-in fade-in zoom-in-95 duration-300">
              <span className="text-white font-bold text-sm">C</span>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-left-2 duration-300">
            <h1 className="text-xl font-bold flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                <span className="text-white font-bold">C</span>
              </div>
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Construction
              </span>
            </h1>
            <p className="text-gray-500 text-xs mt-1.5 pl-[46px]">Accounting App</p>
          </div>
        )}
      </div>

      {/* Mobile close button */}
      <button
        onClick={() => setMobileOpen(false)}
        className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all md:hidden"
      >
        <X className="w-5 h-5" />
      </button>
      
      {/* Navigation */}
      <nav className="relative flex-1 p-3 space-y-0.5 overflow-y-auto">
        {menuItems.map((item, index) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              style={{ animationDelay: `${index * 50}ms` }}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                collapsed && "justify-center px-2",
                isActive 
                  ? 'bg-gradient-to-r from-blue-600/80 to-blue-700/40 text-white shadow-sm shadow-blue-500/10' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5',
              )}
              title={collapsed ? item.name : undefined}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-blue-400 to-purple-500 rounded-r-full animate-in fade-in slide-in-from-left-1 duration-200" />
              )}
              <item.icon className={cn(
                "w-5 h-5 flex-shrink-0 transition-transform duration-200",
                isActive ? 'text-blue-300' : 'group-hover:scale-105'
              )} />
              {!collapsed && (
                <span className={cn(
                  "text-sm font-medium transition-all duration-200",
                  isActive ? 'text-white' : 'group-hover:translate-x-0.5'
                )}>
                  {item.name}
                </span>
              )}
              {/* Active dot indicator */}
              {collapsed && isActive && (
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse Button */}
      <div className="relative p-3 border-t border-white/5">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all group active:scale-95"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-xs">Collapse</span>
            </>
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
        className="fixed top-3 left-3 z-50 p-2 bg-white border rounded-lg shadow-sm hover:bg-gray-50 transition-all md:hidden"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>

      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:flex">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 transform transition-all duration-300 md:hidden max-w-[85vw]",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebarContent}
      </div>
    </>
  )
}
