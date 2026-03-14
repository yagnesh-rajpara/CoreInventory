import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type SubmitHandler, useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDebounce } from 'use-debounce'
import { toast } from 'sonner'
import api from '@/lib/api'
import type { Receipt, Product, Warehouse, Location } from '@/types'
import { Plus, CheckCircle, XCircle, ArrowDownToLine, X, Search } from 'lucide-react'
import { Pagination } from '@/components/Pagination'
import { getErrorMessage } from '@/lib/utils'

const receiptSchema = z.object({
  supplier_name: z.string().optional(),
  location_id: z.coerce.number().min(1, "Location is required"),
  notes: z.string().optional(),
  lines: z.array(z.object({
    product_id: z.coerce.number().min(1, "Product is required"),
    quantity: z.coerce.number().int().min(1, "Quantity must be at least 1")
  })).min(1, "At least one product line is required")
})

type ReceiptFormData = z.infer<typeof receiptSchema>

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  waiting: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  ready: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  done: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  canceled: 'bg-red-500/10 text-red-600 dark:text-red-400',
}

export default function ReceiptsPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch] = useDebounce(search, 300)
  const [page, setPage] = useState(1)

  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ReceiptFormData>({
    resolver: zodResolver(receiptSchema) as any,
    defaultValues: { lines: [{ product_id: undefined, quantity: 1 }] as any }
  })
  const { fields, append, remove } = useFieldArray({ control, name: "lines" })

  const { data, isLoading } = useQuery<{ total: number, items: Receipt[] }>({
    queryKey: ['receipts', debouncedSearch, page],
    queryFn: () => api.get('/operations/receipts', { params: { search: debouncedSearch || undefined, page, limit: 20 } }).then(r => r.data)
  })
  const receipts = data?.items || []

  const { data: products = [] } = useQuery<Product[]>({ queryKey: ['products'], queryFn: () => api.get('/products', { params: { limit: 1000 } }).then(r => r.data.items || r.data) })
  const { data: warehouses = [] } = useQuery<Warehouse[]>({ queryKey: ['warehouses'], queryFn: () => api.get('/warehouses').then(r => r.data) })
  const allLocations: Location[] = warehouses.flatMap(w => w.locations || [])

  const createMut = useMutation({ 
    mutationFn: (d: any) => api.post('/operations/receipts', d), 
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setShowModal(false)
      reset()
      toast.success('Receipt created successfully')
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to create receipt'))
    }
  })
  const validateMut = useMutation({ 
    mutationFn: (id: number) => api.post(`/operations/receipts/${id}/validate`), 
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Receipt validated')
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to validate receipt'))
    }
  })
  const cancelMut = useMutation({ 
    mutationFn: (id: number) => api.post(`/operations/receipts/${id}/cancel`), 
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Receipt canceled')
    }
  })

  const onSubmit: SubmitHandler<ReceiptFormData> = (data) => {
    createMut.mutate(data)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Receipts</h1><p className="text-muted-foreground mt-1">Incoming goods from suppliers</p></div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"><Plus className="h-4 w-4" /> New Receipt</button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search receipts..."
          className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div> : receipts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground"><ArrowDownToLine className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>No receipts yet</p></div>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-border bg-muted/50">
              {['Reference', 'Supplier', 'Location', 'Items', 'Status', 'Date', 'Actions'].map(h => <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody>
              {receipts.map(r => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono">{r.reference}</td>
                  <td className="px-4 py-3 text-sm">{r.supplier_name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{r.location_name}</td>
                  <td className="px-4 py-3 text-sm">{r.lines?.length || 0} items</td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusColors[r.status] || ''}`}>{r.status}</span></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {r.status === 'draft' && (
                      <div className="flex gap-1">
                        <button onClick={() => validateMut.mutate(r.id)} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-500/10 transition-colors" title="Validate"><CheckCircle className="h-4 w-4" /></button>
                        <button onClick={() => cancelMut.mutate(r.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-500/10 transition-colors" title="Cancel"><XCircle className="h-4 w-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && data.total > 0 && (
          <Pagination page={page} total={data.total} onPageChange={setPage} />
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-semibold">New Receipt</h3><button type="button" onClick={() => setShowModal(false)} className="rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Supplier</label>
                <input {...register('supplier_name')} className={`w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ${errors.supplier_name ? 'border-red-500' : 'border-border'}`} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Destination Location</label>
                <select {...register('location_id')} className={`w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ${errors.location_id ? 'border-red-500' : 'border-border'}`}>
                  <option value="">Select location</option>
                  {allLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                {errors.location_id && <p className="text-red-500 text-xs mt-1">{errors.location_id.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea {...register('notes')} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none resize-none" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Product Lines</label>
                  <button type="button" onClick={() => append({ product_id: 0, quantity: 1 })} className="text-xs text-primary hover:underline">+ Add Line</button>
                </div>
                {errors.lines?.root && <p className="text-red-500 text-xs mb-2">{errors.lines.root.message}</p>}
                {fields.map((field, i) => (
                  <div key={field.id} className="flex gap-2 mb-2 items-start">
                    <div className="flex-1">
                      <select {...register(`lines.${i}.product_id`)} className={`w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ${errors.lines?.[i]?.product_id ? 'border-red-500' : 'border-border'}`}>
                        <option value="">Select product</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      {errors.lines?.[i]?.product_id && <p className="text-red-500 text-xs mt-1">{errors.lines[i]!.product_id!.message}</p>}
                    </div>
                    <div>
                      <input type="number" min={1} {...register(`lines.${i}.quantity`)} className={`w-24 rounded-lg border bg-background px-3 py-2 text-sm outline-none py-2 ${errors.lines?.[i]?.quantity ? 'border-red-500' : 'border-border'}`} />
                      {errors.lines?.[i]?.quantity && <p className="text-red-500 text-xs mt-1">{errors.lines[i]!.quantity!.message}</p>}
                    </div>
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(i)} className="text-red-500 hover:bg-red-500/10 rounded-lg p-2"><X className="h-4 w-4" /></button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg px-4 py-2 text-sm border border-border hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {isSubmitting ? 'Creating...' : 'Create Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
