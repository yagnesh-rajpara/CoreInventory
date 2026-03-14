import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Warehouse } from '@/types'
import { Plus, Warehouse as WarehouseIcon, MapPin, X } from 'lucide-react'

export default function WarehousesPage() {
  const qc = useQueryClient()
  const [showWhModal, setShowWhModal] = useState(false)
  const [showLocModal, setShowLocModal] = useState(false)
  const [whForm, setWhForm] = useState({ name: '', short_code: '', address: '' })
  const [locForm, setLocForm] = useState({ name: '', short_code: '', warehouse_id: '' })

  const { data: warehouses = [], isLoading } = useQuery<Warehouse[]>({
    queryKey: ['warehouses'], queryFn: () => api.get('/warehouses').then(r => r.data),
  })

  const createWh = useMutation({
    mutationFn: (d: any) => api.post('/warehouses', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['warehouses'] }); setShowWhModal(false); setWhForm({ name: '', short_code: '', address: '' }) },
  })

  const createLoc = useMutation({
    mutationFn: (d: any) => api.post('/warehouses/locations', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['warehouses'] }); setShowLocModal(false); setLocForm({ name: '', short_code: '', warehouse_id: '' }) },
  })

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
            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-semibold">New Warehouse</h3><button onClick={() => setShowWhModal(false)} className="rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5" /></button></div>
            <form onSubmit={e => { e.preventDefault(); createWh.mutate(whForm) }} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Name</label><input value={whForm.name} onChange={e => setWhForm({...whForm, name: e.target.value})} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div><label className="block text-sm font-medium mb-1">Short Code</label><input value={whForm.short_code} onChange={e => setWhForm({...whForm, short_code: e.target.value})} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" placeholder="WH-XXX" /></div>
              <div><label className="block text-sm font-medium mb-1">Address</label><input value={whForm.address} onChange={e => setWhForm({...whForm, address: e.target.value})} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowWhModal(false)} className="rounded-lg px-4 py-2 text-sm border border-border hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={createWh.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">{createWh.isPending ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Location Modal */}
      {showLocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl mx-4">
            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-semibold">New Location</h3><button onClick={() => setShowLocModal(false)} className="rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5" /></button></div>
            <form onSubmit={e => { e.preventDefault(); createLoc.mutate({...locForm, warehouse_id: Number(locForm.warehouse_id)}) }} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Warehouse</label>
                <select value={locForm.warehouse_id} onChange={e => setLocForm({...locForm, warehouse_id: e.target.value})} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none">
                  <option value="">Select warehouse</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium mb-1">Name</label><input value={locForm.name} onChange={e => setLocForm({...locForm, name: e.target.value})} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" /></div>
              <div><label className="block text-sm font-medium mb-1">Short Code</label><input value={locForm.short_code} onChange={e => setLocForm({...locForm, short_code: e.target.value})} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowLocModal(false)} className="rounded-lg px-4 py-2 text-sm border border-border hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={createLoc.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">{createLoc.isPending ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
