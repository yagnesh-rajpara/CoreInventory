import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Dashboard } from '@/types'
import {
  Package, AlertTriangle, XCircle, ArrowDownToLine,
  ArrowUpFromLine, ArrowLeftRight, Plus, ClipboardList, History,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const kpiConfig = [
  { key: 'total_products', label: 'Total Products', icon: Package, color: 'from-blue-500 to-blue-600', textColor: 'text-blue-600 dark:text-blue-400' },
  { key: 'low_stock_items', label: 'Low Stock', icon: AlertTriangle, color: 'from-amber-500 to-orange-500', textColor: 'text-amber-600 dark:text-amber-400' },
  { key: 'out_of_stock_items', label: 'Out of Stock', icon: XCircle, color: 'from-red-500 to-rose-600', textColor: 'text-red-600 dark:text-red-400' },
  { key: 'pending_receipts', label: 'Pending Receipts', icon: ArrowDownToLine, color: 'from-emerald-500 to-green-600', textColor: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'pending_deliveries', label: 'Pending Deliveries', icon: ArrowUpFromLine, color: 'from-violet-500 to-purple-600', textColor: 'text-violet-600 dark:text-violet-400' },
  { key: 'internal_transfers', label: 'Transfers', icon: ArrowLeftRight, color: 'from-cyan-500 to-teal-600', textColor: 'text-cyan-600 dark:text-cyan-400' },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery<Dashboard>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data),
  })

  const quickActions = [
    { label: 'New Product', icon: Plus, path: '/products', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20' },
    { label: 'New Receipt', icon: ArrowDownToLine, path: '/receipts', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20' },
    { label: 'New Delivery', icon: ArrowUpFromLine, path: '/deliveries', color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20' },
    { label: 'Adjustment', icon: ClipboardList, path: '/adjustments', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20' },
    { label: 'Move History', icon: History, path: '/moves', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20' },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const kpis = data?.kpis

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your inventory operations</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiConfig.map(({ key, label, icon: Icon, color, textColor }) => (
          <div key={key} className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
            <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity`} />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className={`text-3xl font-bold mt-1 ${textColor}`}>
                  {kpis ? (kpis as any)[key] : 0}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${action.color}`}
            >
              <action.icon className="h-4 w-4" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {data?.recent_activity && data.recent_activity.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Reference</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Description</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_activity.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono">{item.reference}</td>
                    <td className="px-4 py-3 text-sm">{item.description}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary capitalize">
                        {item.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No recent activity yet. Start by creating operations!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
