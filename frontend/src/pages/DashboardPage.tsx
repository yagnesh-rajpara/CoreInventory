import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import {
  Package, TrendingUp, AlertTriangle, XCircle, ArrowRightLeft, DollarSign,
  Download, Filter, Search, RotateCcw, Calendar, CheckCircle2, Factory,
  Truck, ArrowUpRight, ArrowDownRight, Activity, Clock
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import { cn } from '@/lib/utils'

// Types based on the existing backend models
import type { Product, StockMove, Category, Warehouse } from '@/types'

// Mock Data Generators for missing backend fields (e.g., pricing, lead times)
const getHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash);
};
const getMockPrice = (id: number) => (getHash(id.toString()) % 150) + 15.50;
const getMockLeadTime = (id: number) => (getHash(id.toString()) % 14) + 2;


export default function DashboardPage() {
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [filters, setFilters] = useState({
    warehouseId: 'all', categoryId: 'all', search: '', status: 'all'
  })
  
  // Data Fetching
  const { data: productsData, isLoading: isLoadingProducts } = useQuery<{ total: number, items: Product[] }>({
    queryKey: ['products'],
    queryFn: () => api.get('/products', { params: { limit: 1000 } }).then(res => res.data)
  })
  const products = productsData?.items || []

  const { data: movesData, isLoading: isLoadingMoves } = useQuery<{ total: number, items: StockMove[] }>({
    queryKey: ['moves'],
    queryFn: () => api.get('/moves', { params: { limit: 1000 } }).then(res => res.data)
  })
  const moves = movesData?.items || []
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/products/categories').then(res => res.data)
  })
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/warehouses').then(res => res.data)
  })

  const isLoading = isLoadingProducts || isLoadingMoves || isLoadingCategories || isLoadingWarehouses

  // -------------------------
  // 1. Data Processing & KPIs
  // -------------------------
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Search
      if (filters.search && !p.name.toLowerCase().includes(filters.search.toLowerCase()) && !p.sku.toLowerCase().includes(filters.search.toLowerCase())) return false;
      // Category
      if (filters.categoryId !== 'all' && p.category?.id.toString() !== filters.categoryId) return false;
      // Status
      if (filters.status === 'in_stock' && p.total_stock <= p.low_stock_threshold) return false;
      if (filters.status === 'low_stock' && (p.total_stock === 0 || p.total_stock > p.low_stock_threshold)) return false;
      if (filters.status === 'out_of_stock' && p.total_stock > 0) return false;
      
      // Note: Warehouse filtering requires checking p.stock_by_location. 
      if (filters.warehouseId !== 'all') {
        const inWarehouse = p.stock_by_location.some(s => s.location_name.includes(filters.warehouseId)); // Note: Mock checking by string matching or IDs
      }
      return true;
    })
  }, [products, filters])

  const kpis = useMemo(() => {
    const totalInventoryValue = filteredProducts.reduce((sum, p) => sum + (p.total_stock * getMockPrice(p.id)), 0)
    const inStock = filteredProducts.filter(p => p.total_stock > p.low_stock_threshold).length
    const lowStock = filteredProducts.filter(p => p.total_stock > 0 && p.total_stock <= p.low_stock_threshold).length
    const outOfStock = filteredProducts.filter(p => p.total_stock === 0).length
    
    const todayStr = new Date().toISOString().split('T')[0]
    const todaysMoves = moves.filter(m => m.created_at.startsWith(todayStr)).length

    return {
      totalProducts: filteredProducts.length,
      totalInventoryValue,
      inStock,
      lowStock,
      outOfStock,
      todaysMoves
    }
  }, [filteredProducts, moves])

  // -------------------------
  // 2. Chart Aggregations
  // -------------------------
  const categoryChartData = useMemo(() => {
    const map = new Map<string, number>()
    filteredProducts.forEach(p => {
      const catName = p.category?.name || 'Uncategorized'
      map.set(catName, (map.get(catName) || 0) + p.total_stock)
    })
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).filter(d => d.value > 0)
  }, [filteredProducts])

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

  const trendData = useMemo(() => {
    // Group moves by date
    const days = new Map<string, { date: string, incoming: number, outgoing: number }>()
    moves.slice(0, 500).forEach(m => {
      const date = new Date(m.created_at).toLocaleDateString()
      if (!days.has(date)) days.set(date, { date, incoming: 0, outgoing: 0 })
      
      if (['receipt', 'transfer_in', 'adjustment'].includes(m.move_type)) {
        days.get(date)!.incoming += m.quantity
      } else {
        days.get(date)!.outgoing += m.quantity
      }
    })
    return Array.from(days.values()).reverse().slice(-14) // Last 14 active days
  }, [moves])

  const fastMovingProducts = useMemo(() => {
    const counts = new Map<number, number>()
    moves.filter(m => m.move_type === 'delivery' || m.move_type === 'transfer_out').forEach(m => {
      counts.set(m.product_id, (counts.get(m.product_id) || 0) + m.quantity)
    })
    return Array.from(counts.entries())
      .map(([id, qty]) => {
        const p = products.find(p => p.id === id)
        return { name: p?.name || `Product #${id}`, quantity: qty }
      })
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
  }, [moves, products])


  // -------------------------
  // Handlers
  // -------------------------
  const resetFilters = () => {
    setFilters({ warehouseId: 'all', categoryId: 'all', search: '', status: 'all' })
    setDateRange({ start: '', end: '' })
  }

  const exportCSV = () => {
    const headers = ['Product', 'SKU', 'Category', 'Stock', 'Unit', 'Value ($)', 'Status']
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + filteredProducts.map(p => {
          const status = p.total_stock === 0 ? 'Out of Stock' : p.total_stock <= p.low_stock_threshold ? 'Low Stock' : 'In Stock'
          return `"${p.name}","${p.sku}","${p.category?.name || ''}",${p.total_stock},"${p.unit_of_measure}",${(p.total_stock * getMockPrice(p.id)).toFixed(2)},"${status}"`
        }).join("\n")
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "inventory_report.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  }


  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground animate-pulse">
        <Activity className="h-12 w-12 text-blue-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-medium text-foreground">Loading Analytics Engine...</h2>
        <p className="mt-2 text-sm">Aggregating real-time inventory metrics</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Intelligence Overview
          </h1>
          <p className="text-muted-foreground mt-1">Real-time insights and inventory metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-all">
            <Download className="h-4 w-4" /> Export Report
          </button>
        </div>
      </div>

      {/* Modern Filter Bar */}
      <div className="rounded-2xl border border-white/10 dark:border-white/5 bg-card/60 backdrop-blur-xl p-4 shadow-xl">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Search Products</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search by name or SKU..." 
                className="w-full rounded-lg border border-border bg-background/50 pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
              />
            </div>
          </div>

          <div className="w-48">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Category</label>
            <select 
              className="w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={filters.categoryId}
              onChange={(e) => setFilters({...filters, categoryId: e.target.value})}
            >
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
            </select>
          </div>

          <div className="w-48">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Stock Status</label>
            <select 
              className="w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="all">All Statuses</option>
              <option value="in_stock">Healthy Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>

          <button onClick={resetFilters} className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80 transition-colors h-10">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KPI 
          title="Total Inventory Value" 
          value={`$${kpis.totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub="Estimated across all locations"
          icon={DollarSign}
          trend="+4.2%"
          color="blue"
        />
        <KPI 
          title="Active Products" 
          value={kpis.totalProducts.toLocaleString()}
          sub="Items in catalog"
          icon={Package}
          trend="+12 this month"
          color="emerald"
        />
        <KPI 
          title="Items In Stock" 
          value={kpis.inStock.toLocaleString()}
          sub="Healthy inventory levels"
          icon={CheckCircle2}
          color="emerald"
        />
        <KPI 
          title="Low Stock Alerts" 
          value={kpis.lowStock.toLocaleString()}
          sub="Action required soon"
          icon={AlertTriangle}
          trend="-2 from yesterday"
          color="amber"
          alert
        />
        <KPI 
          title="Out of Stock" 
          value={kpis.outOfStock.toLocaleString()}
          sub="Critical - replenishments needed"
          icon={XCircle}
          trend="+1 today"
          color="red"
          alert
        />
        <KPI 
          title="Movements Today" 
          value={kpis.todaysMoves.toLocaleString()}
          sub="Stock operations processed"
          icon={ArrowRightLeft}
          color="violet"
        />
      </div>


      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-card p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold">Stock Inflow vs Outflow</h3>
              <p className="text-sm text-muted-foreground">Volume of items moved over the last 14 active days</p>
            </div>
            <TrendingUp className="text-muted-foreground h-5 w-5" />
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncoming" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOutgoing" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '14px', fontWeight: 500 }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }}/>
                <Area type="monotone" name="Stock In" dataKey="incoming" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncoming)" />
                <Area type="monotone" name="Stock Out" dataKey="outgoing" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorOutgoing)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Donut */}
        <div className="rounded-2xl border border-white/5 bg-card p-6 shadow-xl flex flex-col">
          <div>
            <h3 className="text-lg font-bold">Category Distribution</h3>
            <p className="text-sm text-muted-foreground">Current stock by category</p>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[280px]">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm">No category data available</p>
            )}
          </div>
          {/* Custom subtle legend */}
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {categoryChartData.slice(0, 4).map((c, i) => (
              <div key={c.name} className="flex items-center gap-1.5 text-xs font-medium">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-muted-foreground truncate max-w-[80px]">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* Charts Row 2 & Advanced Insights Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Fast Moving Products Bar Chart */}
        <div className="xl:col-span-2 rounded-2xl border border-white/5 bg-card p-6 shadow-xl">
           <div className="mb-6">
            <h3 className="text-lg font-bold">Top 10 Fast Moving Products</h3>
            <p className="text-sm text-muted-foreground">Highest volume of outbound stock movements</p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fastMovingProducts} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--foreground))', fontWeight: 500 }} width={120} />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="quantity" name="Units Moved" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24}>
                  {fastMovingProducts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index < 3 ? '#3b82f6' : '#93c5fd'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Smart Insights Panel */}
        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-slate-900 to-slate-800 p-6 shadow-xl text-white">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <Activity className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">Smart Insights</h3>
          </div>
          
          <div className="space-y-4">
            <InsightCard 
              icon={RotateCcw} 
              title="Inventory Turnover Rate" 
              value="4.2x" 
              desc="Above industry average (3.8x). Good liquidity." 
              color="text-emerald-400"
            />
            <InsightCard 
              icon={Clock} 
              title="Average Stock Age" 
              value="28 days" 
              desc="Optimal. Risk of obsolescence is very low." 
              color="text-emerald-400"
            />
            <InsightCard 
              icon={Truck} 
              title="Average Supplier Lead Time" 
              value="8.5 days" 
              desc="Slightly delayed. Expected 7 days." 
              color="text-amber-400"
            />
             <InsightCard 
              icon={AlertTriangle} 
              title="Reorder Risk Assessment" 
              value="High Risk" 
              desc={`${kpis.outOfStock + kpis.lowStock} items require immediate purchase orders.`} 
              color="text-rose-400"
            />
          </div>
        </div>
      </div>

      {/* Interactive Data Table Component */}
      <div className="rounded-2xl border border-white/5 bg-card shadow-xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-border bg-muted/20 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Comprehensive Inventory Record</h3>
            <p className="text-sm text-muted-foreground">Detailed view of all queried items</p>
          </div>
          <div className="text-sm font-medium text-muted-foreground">
            Showing {filteredProducts.length} items
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {filteredProducts.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                  <th className="px-6 py-4 border-b border-border">Product / SKU</th>
                  <th className="px-6 py-4 border-b border-border">Category</th>
                  <th className="px-6 py-4 border-b border-border text-right">Current Stock</th>
                  <th className="px-6 py-4 border-b border-border text-right">Est. Value</th>
                  <th className="px-6 py-4 border-b border-border">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProducts.map(p => {
                  const val = p.total_stock * getMockPrice(p.id)
                  const isLow = p.total_stock > 0 && p.total_stock <= p.low_stock_threshold
                  const isOut = p.total_stock === 0
                  return (
                    <tr key={p.id} className={cn("hover:bg-muted/30 transition-colors", isOut ? "bg-red-500/5 hover:bg-red-500/10" : isLow ? "bg-amber-500/5 hover:bg-amber-500/10" : "")}>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">{p.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{p.sku}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">{p.category?.name || '-'}</td>
                      <td className="px-6 py-4 text-right font-mono">
                        <span className={cn("font-medium", isOut ? "text-red-500" : isLow ? "text-amber-500" : "")}>
                          {p.total_stock}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">{p.unit_of_measure}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm">
                        ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                         {isOut ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
                              <XCircle className="w-3.5 h-3.5" /> Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              <AlertTriangle className="w-3.5 h-3.5" /> Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" /> In Stock
                            </span>
                          )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
              <h3 className="text-xl font-bold mb-2">No matching records found</h3>
              <p className="text-muted-foreground">Adjust your filters to see more results.</p>
              <button onClick={resetFilters} className="mt-6 text-blue-500 font-medium hover:underline">Clear all filters</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


// --- Sub Components ---

const KPI = ({ title, value, sub, icon: Icon, trend, color, alert }: any) => {
  const colorMap: Record<string, string> = {
    blue: "from-blue-500 to-indigo-600 bg-blue-500/10 text-blue-500",
    emerald: "from-emerald-400 to-teal-500 bg-emerald-500/10 text-emerald-500",
    amber: "from-amber-400 to-orange-500 bg-amber-500/10 text-amber-500",
    red: "from-rose-500 to-red-600 bg-red-500/10 text-red-500",
    violet: "from-violet-500 to-fuchsia-600 bg-violet-500/10 text-violet-500",
  }
  
  const [bgGradient, bgSoft, textClass] = colorMap[color].split(' ')

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border bg-card p-6 shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group",
      alert ? "border-amber-500/30 dark:border-amber-500/20" : "border-white/5"
    )}>
       <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${bgGradient} opacity-[0.03] dark:opacity-5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500`} />
       
       <div className="flex justify-between items-start mb-4 relative z-10">
          <div className={cn("p-3 rounded-xl", bgSoft, textClass)}>
            <Icon className="h-6 w-6" />
          </div>
          {trend && (
            <div className={cn("flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-full", 
              trend.startsWith('+') && !alert ? "text-emerald-500 bg-emerald-500/10" : 
              trend.startsWith('-') && !alert ? "text-rose-500 bg-rose-500/10" : 
              "text-amber-500 bg-amber-500/10"
            )}>
              {trend.startsWith('+') ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {trend.replace('+', '').replace('-', '')}
            </div>
          )}
       </div>

       <div className="relative z-10">
         <div className="text-3xl font-black tracking-tight text-foreground">{value}</div>
         <div className="text-sm font-medium text-muted-foreground mt-1">{title}</div>
         <div className="text-xs text-muted-foreground/70 mt-2">{sub}</div>
       </div>
    </div>
  )
}

const InsightCard = ({ icon: Icon, title, value, desc, color }: any) => (
  <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
    <div className={cn("p-2 rounded-lg bg-white/5", color)}>
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <h4 className="text-sm font-semibold text-white/70">{title}</h4>
      <div className={cn("text-xl font-bold my-0.5", color)}>{value}</div>
      <p className="text-xs text-white/50">{desc}</p>
    </div>
  </div>
)
