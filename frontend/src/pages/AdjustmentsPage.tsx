import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Adjustment, Product, Warehouse, Location } from '@/types'
import { Plus, ClipboardList, X } from 'lucide-react'

export default function AdjustmentsPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ product_id: '', location_id: '', recorded_quantity: 0, actual_quantity: 0, notes: '' })

  const { data: adjustments = [], isLoading } = useQuery<Adjustment[]>({ queryKey: ['adjustments'], queryFn: () => api.get('/operations/adjustments').then(r => r.data) })
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ['products'], queryFn: () => api.get('/products').then(r => r.data) })
  const { data: warehouses = [] } = useQuery<Warehouse[]>({ queryKey: ['warehouses'], queryFn: () => api.get('/warehouses').then(r => r.data) })
  const allLocations: Location[] = warehouses.flatMap(w => w.locations || [])

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/operations/adjustments', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['adjustments'] }); qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setShowModal(false) },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMut.mutate({ ...form, product_id: Number(form.product_id), location_id: Number(form.location_id) })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Stock Adjustments</h1><p className="text-muted-foreground mt-1">Correct mismatches between recorded and actual stock</p></div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"><Plus className="h-4 w-4" /> New Adjustment</button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div> : adjustments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground"><ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>No adjustments yet</p></div>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-border bg-muted/50">
              {['Reference', 'Product', 'Location', 'Recorded', 'Actual', 'Diff', 'Date'].map(h => <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody>
              {adjustments.map(a => {
                const diff = a.actual_quantity - a.recorded_quantity
                return (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono">{a.reference}</td>
                    <td className="px-4 py-3 text-sm">{a.product_name}</td>
                    <td className="px-4 py-3 text-sm">{a.location_name}</td>
                    <td className="px-4 py-3 text-sm">{a.recorded_quantity}</td>
                    <td className="px-4 py-3 text-sm font-medium">{a.actual_quantity}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${diff > 0 ? 'bg-emerald-500/10 text-emerald-600' : diff < 0 ? 'bg-red-500/10 text-red-600' : 'bg-gray-500/10 text-gray-600'}`}>
                        {diff > 0 ? '+' : ''}{diff}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl mx-4">
            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-semibold">New Adjustment</h3><button onClick={() => setShowModal(false)} className="rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Product</label>
                <select value={form.product_id} onChange={e => setForm({...form, product_id: e.target.value})} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none">
                  <option value="">Select product</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.total_stock})</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium mb-1">Location</label>
                <select value={form.location_id} onChange={e => setForm({...form, location_id: e.target.value})} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none">
                  <option value="">Select location</option>{allLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Recorded Qty</label><input type="number" value={form.recorded_quantity} onChange={e => setForm({...form, recorded_quantity: Number(e.target.value)})} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" /></div>
                <div><label className="block text-sm font-medium mb-1">Actual Qty</label><input type="number" value={form.actual_quantity} onChange={e => setForm({...form, actual_quantity: Number(e.target.value)})} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none resize-none" /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg px-4 py-2 text-sm border border-border hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={createMut.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">{createMut.isPending ? 'Creating...' : 'Apply Adjustment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
