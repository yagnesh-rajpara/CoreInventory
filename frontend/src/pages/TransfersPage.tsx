import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Transfer, Product, Warehouse, Location } from '@/types'
import { Plus, CheckCircle, XCircle, ArrowLeftRight, X } from 'lucide-react'

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  done: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  canceled: 'bg-red-500/10 text-red-600 dark:text-red-400',
}

export default function TransfersPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ from_location_id: '', to_location_id: '', notes: '', lines: [{ product_id: '', quantity: 1 }] })

  const { data: transfers = [], isLoading } = useQuery<Transfer[]>({ queryKey: ['transfers'], queryFn: () => api.get('/operations/transfers').then(r => r.data) })
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ['products'], queryFn: () => api.get('/products').then(r => r.data) })
  const { data: warehouses = [] } = useQuery<Warehouse[]>({ queryKey: ['warehouses'], queryFn: () => api.get('/warehouses').then(r => r.data) })
  const allLocations: Location[] = warehouses.flatMap(w => w.locations || [])

  const createMut = useMutation({ mutationFn: (d: any) => api.post('/operations/transfers', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['transfers'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setShowModal(false) } })
  const validateMut = useMutation({ mutationFn: (id: number) => api.post(`/operations/transfers/${id}/validate`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['transfers'] }); qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }) } })
  const cancelMut = useMutation({ mutationFn: (id: number) => api.post(`/operations/transfers/${id}/cancel`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['transfers'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }) } })

  const addLine = () => setForm({ ...form, lines: [...form.lines, { product_id: '', quantity: 1 }] })
  const removeLine = (i: number) => setForm({ ...form, lines: form.lines.filter((_, idx) => idx !== i) })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMut.mutate({ ...form, from_location_id: Number(form.from_location_id), to_location_id: Number(form.to_location_id), lines: form.lines.filter(l => l.product_id).map(l => ({ product_id: Number(l.product_id), quantity: l.quantity })) })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Internal Transfers</h1><p className="text-muted-foreground mt-1">Move stock between locations</p></div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"><Plus className="h-4 w-4" /> New Transfer</button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div> : transfers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground"><ArrowLeftRight className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>No transfers yet</p></div>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-border bg-muted/50">
              {['Reference', 'From', 'To', 'Items', 'Status', 'Date', 'Actions'].map(h => <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody>
              {transfers.map(t => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono">{t.reference}</td>
                  <td className="px-4 py-3 text-sm">{t.from_location_name}</td>
                  <td className="px-4 py-3 text-sm">{t.to_location_name}</td>
                  <td className="px-4 py-3 text-sm">{t.lines?.length || 0} items</td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusColors[t.status] || ''}`}>{t.status}</span></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {t.status === 'draft' && (
                      <div className="flex gap-1">
                        <button onClick={() => validateMut.mutate(t.id)} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-500/10 transition-colors" title="Validate"><CheckCircle className="h-4 w-4" /></button>
                        <button onClick={() => cancelMut.mutate(t.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-500/10 transition-colors" title="Cancel"><XCircle className="h-4 w-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-semibold">New Transfer</h3><button onClick={() => setShowModal(false)} className="rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">From Location</label>
                  <select value={form.from_location_id} onChange={e => setForm({...form, from_location_id: e.target.value})} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none">
                    <option value="">Select</option>{allLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium mb-1">To Location</label>
                  <select value={form.to_location_id} onChange={e => setForm({...form, to_location_id: e.target.value})} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none">
                    <option value="">Select</option>{allLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none resize-none" /></div>
              <div>
                <div className="flex items-center justify-between mb-2"><label className="text-sm font-medium">Product Lines</label><button type="button" onClick={addLine} className="text-xs text-primary hover:underline">+ Add Line</button></div>
                {form.lines.map((line, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <select value={line.product_id} onChange={e => { const lines = [...form.lines]; lines[i].product_id = e.target.value; setForm({...form, lines}) }} required className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none">
                      <option value="">Select product</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="number" min={1} value={line.quantity} onChange={e => { const lines = [...form.lines]; lines[i].quantity = Number(e.target.value); setForm({...form, lines}) }} className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" />
                    {form.lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="text-red-500 hover:bg-red-500/10 rounded-lg p-2"><X className="h-4 w-4" /></button>}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg px-4 py-2 text-sm border border-border hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={createMut.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">{createMut.isPending ? 'Creating...' : 'Create Transfer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
