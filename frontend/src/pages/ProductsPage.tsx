import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type SubmitHandler, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDebounce } from 'use-debounce'
import { toast } from 'sonner'
import api from '@/lib/api'
import type { Product, Category, Location, Warehouse } from '@/types'
import { Plus, Search, Package, X } from 'lucide-react'
import { Pagination } from '@/components/Pagination'
import { getErrorMessage } from '@/lib/utils'

const productSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(100),
  sku: z.string().regex(/^[A-Z0-9\-]+$/, "SKU can only contain uppercase letters, numbers, and hyphens"),
  category_id: z.coerce.number().optional().nullable(),
  unit_of_measure: z.string().min(1, "Unit of measure is required"),
  low_stock_threshold: z.coerce.number().min(0, "Must be >= 0"),
  initial_stock: z.coerce.number().min(0, "Must be >= 0"),
  location_id: z.coerce.number().optional().nullable(),
})

type ProductFormData = z.infer<typeof productSchema>

export default function ProductsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch] = useDebounce(search, 300)
  const [showModal, setShowModal] = useState(false)
  const [page, setPage] = useState(1)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: { name: '', sku: '', unit_of_measure: 'Unit', low_stock_threshold: 10, initial_stock: 0, category_id: null, location_id: null }
  })

  const { data, isLoading } = useQuery<{ total: number, items: Product[] }>({
    queryKey: ['products', debouncedSearch, page],
    queryFn: () => api.get('/products', { params: { search: debouncedSearch || undefined, page, limit: 20 } }).then(r => r.data),
  })
  const products = data?.items || []
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ['categories'], queryFn: () => api.get('/products/categories').then(r => r.data) })
  const { data: warehouses = [] } = useQuery<Warehouse[]>({ queryKey: ['warehouses'], queryFn: () => api.get('/warehouses').then(r => r.data) })

  const allLocations: Location[] = warehouses.flatMap(w => w.locations || [])

  const createMutation = useMutation({
    mutationFn: (data: ProductFormData) => api.post('/products', data),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['products'] })
      setShowModal(false)
      reset()
      toast.success('Product created successfully')
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to create product'))
    }
  })

  const onSubmit: SubmitHandler<ProductFormData> = (data) => {
    createMutation.mutate(data)
  }

  const getStockColor = (product: Product) => {
    if (product.total_stock === 0) return 'bg-red-500/10 text-red-600 dark:text-red-400'
    if (product.total_stock <= product.low_stock_threshold) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground mt-1">Manage your product inventory</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..."
          className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground"><Package className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>No products found</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['Name', 'SKU', 'Category', 'UoM', 'Stock', 'Threshold', 'Locations'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{p.sku}</td>
                    <td className="px-4 py-3 text-sm">{p.category?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{p.unit_of_measure}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStockColor(p)}`}>{p.total_stock}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{p.low_stock_threshold}</td>
                    <td className="px-4 py-3 text-sm">
                      {p.stock_by_location?.map(s => (
                        <span key={s.location_id} className="inline-block mr-1 mb-1 rounded bg-muted px-2 py-0.5 text-xs">
                          {s.location_name}: {s.quantity}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.total > 0 && (
          <Pagination page={page} total={data.total} onPageChange={setPage} />
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">New Product</h3>
              <button type="button" onClick={() => setShowModal(false)} className="rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input {...register('name')} className={`w-full rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none ${errors.name ? 'border-red-500' : 'border-border'}`} />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SKU</label>
                  <input {...register('sku')} className={`w-full rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none ${errors.sku ? 'border-red-500' : 'border-border'}`} />
                  {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select {...register('category_id')} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="">None</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit of Measure</label>
                  <input {...register('unit_of_measure')} className={`w-full rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none ${errors.unit_of_measure ? 'border-red-500' : 'border-border'}`} />
                  {errors.unit_of_measure && <p className="text-red-500 text-xs mt-1">{errors.unit_of_measure.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Low Stock Threshold</label>
                  <input type="number" {...register('low_stock_threshold')} className={`w-full rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none ${errors.low_stock_threshold ? 'border-red-500' : 'border-border'}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Initial Stock</label>
                  <input type="number" {...register('initial_stock')} className={`w-full rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none ${errors.initial_stock ? 'border-red-500' : 'border-border'}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Location (if Initial Stock &gt; 0)</label>
                  <select {...register('location_id')} className={`w-full rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none ${errors.location_id ? 'border-red-500' : 'border-border'}`}>
                    <option value="">Select</option>
                    {allLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                  {errors.location_id && <p className="text-red-500 text-xs mt-1">{errors.location_id.message}</p>}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-lg px-4 py-2 text-sm font-medium border border-border hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {isSubmitting ? 'Creating...' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
