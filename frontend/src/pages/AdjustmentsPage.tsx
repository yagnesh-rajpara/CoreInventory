import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type SubmitHandler, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDebounce } from 'use-debounce'
import { toast } from 'sonner'
import api from '@/lib/api'
import type { Adjustment, Product, Warehouse, Location } from '@/types'
import { Plus, ClipboardList, X, Search } from 'lucide-react'
import { Pagination } from '@/components/Pagination'
import { getErrorMessage } from '@/lib/utils'

const adjustmentSchema = z.object({
  product_id: z.coerce.number().min(1, "Product is required"),
  location_id: z.coerce.number().min(1, "Location is required"),
  recorded_quantity: z.coerce.number().min(0),
  actual_quantity: z.coerce.number().min(0),
  notes: z.string().optional()
})

type AdjustmentFormData = z.infer<typeof adjustmentSchema>

export default function AdjustmentsPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch] = useDebounce(search, 300)
  const [page, setPage] = useState(1)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema) as any
  })

  const { data, isLoading } = useQuery<{ total: number, items: Adjustment[] }>({ 
    queryKey: ['adjustments', debouncedSearch, page], 
    queryFn: () => api.get('/operations/adjustments', { params: { search: debouncedSearch || undefined, page, limit: 20 } }).then(r => r.data) 
  })
  const adjustments = data?.items || []

  const { data: products = [] } = useQuery<Product[]>({ queryKey: ['products'], queryFn: () => api.get('/products', { params: { limit: 1000 } }).then(r => r.data.items || r.data) })
  const { data: warehouses = [] } = useQuery<Warehouse[]>({ queryKey: ['warehouses'], queryFn: () => api.get('/warehouses').then(r => r.data) })
  const allLocations: Location[] = warehouses.flatMap(w => w.locations || [])

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/operations/adjustments', d),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['adjustments'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setShowModal(false)
      reset()
      toast.success('Adjustment applied successfully')
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to apply adjustment'))
    }
  })

  const onSubmit: SubmitHandler<AdjustmentFormData> = (data) => {
    createMut.mutate(data)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Stock Adjustments</h1><p className="text-muted-foreground mt-1">Correct mismatches between recorded and actual stock</p></div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"><Plus className="h-4 w-4" /> New Adjustment</button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search adjustments..."
          className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
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
        {data && data.total > 0 && (
          <Pagination page={page} total={data.total} onPageChange={setPage} />
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl mx-4">
            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-semibold">New Adjustment</h3><button type="button" onClick={() => setShowModal(false)} className="rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product</label>
                <select {...register('product_id')} className={`w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ${errors.product_id ? 'border-red-500' : 'border-border'}`}>
                  <option value="">Select product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.total_stock})</option>)}
                </select>
                {errors.product_id && <p className="text-red-500 text-xs mt-1">{errors.product_id.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <select {...register('location_id')} className={`w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ${errors.location_id ? 'border-red-500' : 'border-border'}`}>
                  <option value="">Select location</option>
                  {allLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                {errors.location_id && <p className="text-red-500 text-xs mt-1">{errors.location_id.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Recorded Qty</label>
                  <input type="number" {...register('recorded_quantity')} className={`w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ${errors.recorded_quantity ? 'border-red-500' : 'border-border'}`} />
                  {errors.recorded_quantity && <p className="text-red-500 text-xs mt-1">{errors.recorded_quantity.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Actual Qty</label>
                  <input type="number" {...register('actual_quantity')} className={`w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ${errors.actual_quantity ? 'border-red-500' : 'border-border'}`} />
                  {errors.actual_quantity && <p className="text-red-500 text-xs mt-1">{errors.actual_quantity.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea {...register('notes')} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg px-4 py-2 text-sm border border-border hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {isSubmitting ? 'Applying...' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
