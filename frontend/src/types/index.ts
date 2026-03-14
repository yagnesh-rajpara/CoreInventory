export interface User {
  id: number
  email: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
}

export interface Category {
  id: number
  name: string
  description?: string
  created_at: string
}

export interface StockByLocation {
  location_id: number
  location_name: string
  warehouse_name: string
  quantity: number
}

export interface Product {
  id: number
  name: string
  sku: string
  category_id?: number
  category?: Category
  unit_of_measure: string
  low_stock_threshold: number
  total_stock: number
  stock_by_location: StockByLocation[]
  created_at: string
  updated_at: string
}

export interface Warehouse {
  id: number
  name: string
  short_code: string
  address?: string
  created_at: string
  locations: Location[]
}

export interface Location {
  id: number
  name: string
  short_code: string
  warehouse_id: number
  created_at: string
}

export interface OperationLine {
  id: number
  product_id: number
  product_name: string
  quantity: number
}

export interface Receipt {
  id: number
  reference: string
  supplier_name?: string
  status: string
  location_id: number
  location_name: string
  notes?: string
  created_by: number
  creator_name: string
  created_at: string
  validated_at?: string
  lines: OperationLine[]
}

export interface Delivery {
  id: number
  reference: string
  customer_name?: string
  status: string
  location_id: number
  location_name: string
  notes?: string
  created_by: number
  creator_name: string
  created_at: string
  validated_at?: string
  lines: OperationLine[]
}

export interface Transfer {
  id: number
  reference: string
  status: string
  from_location_id: number
  from_location_name: string
  to_location_id: number
  to_location_name: string
  notes?: string
  created_by: number
  creator_name: string
  created_at: string
  validated_at?: string
  lines: OperationLine[]
}

export interface Adjustment {
  id: number
  reference: string
  product_id: number
  product_name: string
  location_id: number
  location_name: string
  recorded_quantity: number
  actual_quantity: number
  notes?: string
  created_by: number
  creator_name: string
  created_at: string
}

export interface StockMove {
  id: number
  product_id: number
  product_name: string
  from_location_id?: number
  from_location_name: string
  to_location_id?: number
  to_location_name: string
  quantity: number
  move_type: string
  reference: string
  status: string
  created_at: string
}

export interface KPIs {
  total_products: number
  low_stock_items: number
  out_of_stock_items: number
  pending_receipts: number
  pending_deliveries: number
  internal_transfers: number
}

export interface RecentActivity {
  id: number
  type: string
  reference: string
  status: string
  description: string
  created_at: string
}

export interface Dashboard {
  kpis: KPIs
  recent_activity: RecentActivity[]
}
