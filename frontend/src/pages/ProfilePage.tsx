import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/store'
import api from '@/lib/api'
import { User, Shield, Mail, Save } from 'lucide-react'

export default function ProfilePage() {
  const { user, setAuth } = useAuthStore()
  const [form, setForm] = useState({ full_name: user?.full_name || '', email: user?.email || '' })
  const [saved, setSaved] = useState(false)

  const updateMut = useMutation({
    mutationFn: (data: any) => api.put('/auth/me', data),
    onSuccess: (res) => {
      const updatedUser = res.data
      const token = localStorage.getItem('token') || ''
      setAuth(updatedUser, token)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary/20">
            {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <h3 className="text-xl font-semibold">{user?.full_name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground capitalize">{user?.role?.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); updateMut.mutate(form) }} className="space-y-5">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-1.5"><User className="h-4 w-4" /> Full Name</label>
            <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-1.5"><Mail className="h-4 w-4" /> Email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={updateMut.isPending}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-lg shadow-primary/20">
              <Save className="h-4 w-4" /> {updateMut.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400 animate-fade-in">✓ Profile updated!</span>}
          </div>
        </form>
      </div>

      {/* Account Info */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold mb-4">Account Information</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-border"><span className="text-muted-foreground">User ID</span><span className="font-mono">{user?.id}</span></div>
          <div className="flex justify-between py-2 border-b border-border"><span className="text-muted-foreground">Role</span><span className="capitalize font-medium">{user?.role?.replace('_', ' ')}</span></div>
          <div className="flex justify-between py-2 border-b border-border"><span className="text-muted-foreground">Status</span>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${user?.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
              {user?.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex justify-between py-2"><span className="text-muted-foreground">Member Since</span><span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</span></div>
        </div>
      </div>
    </div>
  )
}
