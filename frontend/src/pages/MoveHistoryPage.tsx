import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { StockMove } from '@/types'
import { Search, History } from 'lucide-react'

const moveTypeColors: Record<string, string> = {
  receipt: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  delivery: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  transfer_in: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  transfer_out: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  adjustment: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
}

export default function MoveHistoryPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const { data: moves = [], isLoading } = useQuery<StockMove[]>({
    queryKey: ['moves', search, typeFilter],
    queryFn: () => api.get('/moves', { params: { search: search || undefined, move_type: typeFilter || undefined } }).then(r => r.data),
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Move History</h1>
        <p className="text-muted-foreground mt-1">Complete stock movement ledger</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by reference..."
            className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none">
          <option value="">All Types</option>
          <option value="receipt">Receipt</option>
          <option value="delivery">Delivery</option>
          <option value="transfer_out">Transfer</option>
          <option value="adjustment">Adjustment</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div> : moves.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground"><History className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>No stock movements found</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-border bg-muted/50">
                {['Date', 'Product', 'From', 'To', 'Qty', 'Type', 'Reference', 'Status'].map(h => <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3 whitespace-nowrap">{h}</th>)}
              </tr></thead>
              <tbody>
                {moves.map(m => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{new Date(m.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm font-medium">{m.product_name}</td>
                    <td className="px-4 py-3 text-sm">{m.from_location_name}</td>
                    <td className="px-4 py-3 text-sm">{m.to_location_name}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{m.quantity}</td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${moveTypeColors[m.move_type] || ''}`}>{m.move_type.replace('_', ' ')}</span></td>
                    <td className="px-4 py-3 text-sm font-mono">{m.reference}</td>
                    <td className="px-4 py-3"><span className="inline-flex rounded-full bg-emerald-500/10 text-emerald-600 px-2.5 py-0.5 text-xs font-semibold capitalize">{m.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
