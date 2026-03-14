import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore, useUIStore } from '@/store'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Package, Warehouse, ArrowDownToLine, ArrowUpFromLine,
  ArrowLeftRight, ClipboardList, History, Settings, User, LogOut, ChevronLeft, ChevronRight,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Products', icon: Package, path: '/products' },
  { type: 'divider', label: 'Operations' },
  { label: 'Receipts', icon: ArrowDownToLine, path: '/receipts' },
  { label: 'Delivery Orders', icon: ArrowUpFromLine, path: '/deliveries' },
  { label: 'Internal Transfers', icon: ArrowLeftRight, path: '/transfers' },
  { label: 'Adjustments', icon: ClipboardList, path: '/adjustments' },
  { label: 'Move History', icon: History, path: '/moves' },
  { type: 'divider', label: 'Settings' },
  { label: 'Warehouses', icon: Warehouse, path: '/warehouses' },
  { label: 'Profile', icon: User, path: '/profile' },
]

export default function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-full border-r border-border bg-card transition-all duration-300 flex flex-col',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shrink-0">
          CI
        </div>
        {sidebarOpen && (
          <span className="text-lg font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent animate-slide-in">
            CoreInventory
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item, i) => {
          if (item.type === 'divider') {
            return sidebarOpen ? (
              <div key={i} className="pt-4 pb-1 px-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</span>
              </div>
            ) : (
              <div key={i} className="pt-4 pb-1 flex justify-center">
                <div className="w-6 h-px bg-border" />
              </div>
            )
          }
          const Icon = item.icon!
          return (
            <NavLink
              key={item.path}
              to={item.path!}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground',
                  !sidebarOpen && 'justify-center px-0'
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span className="animate-slide-in">{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-2 space-y-1">
        <button
          onClick={handleLogout}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            'text-destructive hover:bg-destructive/10',
            !sidebarOpen && 'justify-center px-0'
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {sidebarOpen && <span>Logout</span>}
        </button>

        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent transition-colors"
        >
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  )
}
