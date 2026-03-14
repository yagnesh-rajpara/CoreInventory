import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type SubmitHandler, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import api from '@/lib/api'
import type { Warehouse } from '@/types'
import { Plus, Warehouse as WarehouseIcon, MapPin, X } from 'lucide-react'
import { getErrorMessage } from '@/lib/utils'

const warehouseSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  short_code: z.string().min(2, "Short code is required"),
  address: z.string().optional()
})

const locationSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  short_code: z.string().min(2, "Short code is required"),
  warehouse_id: z.coerce.number().min(1, "Warehouse is required")
})

type WarehouseFormData = z.infer<typeof warehouseSchema>
type LocationFormData = z.infer<typeof locationSchema>

export default function WarehousesPage() {
  const qc = useQueryClient()
  const [showWhModal, setShowWhModal] = useState(false)
  const [showLocModal, setShowLocModal] = useState(false)

  const whForm = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseSchema) as any
  })

  const locForm = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema) as any
  })

  const { data: warehouses = [], isLoading } = useQuery<Warehouse[]>({
    queryKey: ['warehouses'], queryFn: () => api.get('/warehouses').then(r => r.data),
  })

  const createWhMutation = useMutation({
    mutationFn: (d: WarehouseFormData) => api.post('/warehouses', d),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      setShowWhModal(false)
      whForm.reset()
      toast.success('Warehouse created successfully')
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to create warehouse'))
    }
  })

  const createLocMutation = useMutation({
    mutationFn: (d: LocationFormData) => api.post('/warehouses/locations', d),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      setShowLocModal(false)
      locForm.reset()
      toast.success('Location created successfully')
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to create location'))
    }
  })

  const onWhSubmit: SubmitHandler<WarehouseFormData> = (data) => createWhMutation.mutate(data)
  const onLocSubmit: SubmitHandler<LocationFormData> = (data) => createLocMutation.mutate(data)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Warehouses</h1>
          <p className="text-muted-foreground mt-1">Manage warehouses and locations</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowLocModal(true)} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
            <MapPin className="h-4 w-4" /> Add Location
          </button>
          <button onClick={() => setShowWhModal(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" /> Add Warehouse
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-40 rounded-xl bg-card border border-border animate-pulse" />)}</div>
      ) : warehouses.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground rounded-xl border border-border bg-card"><WarehouseIcon className="h-10 w-10 mx-auto mb-3 opacity-40" /><p className="text-lg font-medium">No warehouses yet</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {warehouses.map(wh => (
            <div key={wh.id} className="rounded-xl border border-border bg-card p-5 hover:shadow-lg transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{wh.name}</h3>
                  <span className="inline-flex rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-mono font-medium mt-1">{wh.short_code}</span>
                </div>
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center"><WarehouseIcon className="h-5 w-5 text-white" /></div>
              </div>
              {wh.address && <p className="text-sm text-muted-foreground mb-3">{wh.address}</p>}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Locations ({wh.locations?.length || 0})</p>
                <div className="flex flex-wrap gap-2">
                  {(wh.locations || []).map(loc => (
                    <span key={loc.id} className="inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium">
                      <MapPin className="h-3 w-3" />{loc.name} <span className="text-muted-foreground">({loc.short_code})</span>
                    </span>
                  ))}
                  {(!wh.locations || wh.locations.length === 0) && <span className="text-xs text-muted-foreground">No locations</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warehouse Modal */}
      {showWhModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl mx-4">
            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-semibold">New Warehouse</h3><button type="button" onClick={() => setShowWhModal(false)} className="rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5" /></button></div>
            <form onSubmit={whForm.handleSubmit(onWhSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input {...whForm.register('name')} className={`w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ${whForm.formState.errors.name ? 'border-red-500' : 'border-border'}`} />
                {whForm.formState.errors.name && <p className="text-red-500 text-xs mt-1">{whForm.formState.errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Short Code</label>
                <input {...whForm.register('short_code')} className={`w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ${whForm.formState.errors.short_code ? 'border-red-500' : 'border-border'}`} placeholder="WH-XXX" />
                {whForm.formState.errors.short_code && <p className="text-red-500 text-xs mt-1">{whForm.formState.errors.short_code.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input {...whForm.register('address')} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button type="button" onClick={() => setShowWhModal(false)} className="rounded-lg px-4 py-2 text-sm border border-border hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={whForm.formState.isSubmitting} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {whForm.formState.isSubmitting ? 'Creating...' : 'Create Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Location Modal */}
      {showLocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl mx-4">
            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-semibold">New Location</h3><button type="button" onClick={() => setShowLocModal(false)} className="rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5" /></button></div>
            <form onSubmit={locForm.handleSubmit(onLocSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Warehouse</label>
                <select {...locForm.register('warehouse_id')} className={`w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ${locForm.formState.errors.warehouse_id ? 'border-red-500' : 'border-border'}`}>
                  <option value="">Select warehouse</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                {locForm.formState.errors.warehouse_id && <p className="text-red-500 text-xs mt-1">{locForm.formState.errors.warehouse_id.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input {...locForm.register('name')} className={`w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ${locForm.formState.errors.name ? 'border-red-500' : 'border-border'}`} />
                {locForm.formState.errors.name && <p className="text-red-500 text-xs mt-1">{locForm.formState.errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Short Code</label>
                <input {...locForm.register('short_code')} className={`w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none ${locForm.formState.errors.short_code ? 'border-red-500' : 'border-border'}`} />
                {locForm.formState.errors.short_code && <p className="text-red-500 text-xs mt-1">{locForm.formState.errors.short_code.message}</p>}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button type="button" onClick={() => setShowLocModal(false)} className="rounded-lg px-4 py-2 text-sm border border-border hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={locForm.formState.isSubmitting} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {locForm.formState.isSubmitting ? 'Creating...' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
