export type UserRole = 'owner' | 'seller'

export interface Shop {
  id: string
  name: string
  address?: string | null
  phone?: string | null
  currency: string
  vat_enabled: boolean
  vat_rate: number
  logo_url?: string | null
  owner_id: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  shop_id: string
  full_name: string
  phone?: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  shop_id: string
  name: string
  description?: string | null
  created_at: string
}

export interface Product {
  id: string
  shop_id: string
  category_id?: string | null
  name: string
  description?: string | null
  purchase_price: number
  selling_price: number
  current_stock: number
  alert_threshold: number
  barcode?: string | null
  image_url?: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export type StockMovementType = 'in' | 'out' | 'adjustment' | 'sale' | 'sale_cancel'

export interface StockMovement {
  id: string
  shop_id: string
  product_id: string
  type: StockMovementType
  quantity: number
  reason?: string | null
  created_by?: string | null
  created_at: string
}

export interface Customer {
  id: string
  shop_id: string
  name: string
  phone?: string | null
  address?: string | null
  total_debt: number
  notes?: string | null
  created_at: string
  updated_at: string
}

export type PaymentMethod = 'cash' | 'mobile_money' | 'credit' | 'split'
export type SaleStatus = 'completed' | 'cancelled'

export interface Sale {
  id: string
  shop_id: string
  seller_id?: string | null
  customer_id?: string | null
  sale_date: string
  subtotal: number
  discount: number
  vat_amount: number
  total: number
  paid_amount: number
  remaining_amount: number
  payment_method: PaymentMethod
  status: SaleStatus
  offline_id?: string | null
  notes?: string | null
  created_at: string
  // Jointures optionnelles pour l'affichage
  customer?: Customer | null
  items?: SaleItem[]
}

export interface SaleItem {
  id: string
  shop_id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  purchase_price: number
  total_price: number
  created_at: string
  // Jointure optionnelle
  product?: Product | null
}

export interface Invoice {
  id: string
  shop_id: string
  sale_id: string
  invoice_number: string
  invoice_date: string
  pdf_url?: string | null
  status: 'valid' | 'cancelled'
  created_at: string
}

export interface Payment {
  id: string
  shop_id: string
  sale_id?: string | null
  customer_id?: string | null
  amount: number
  payment_method: 'cash' | 'mobile_money' | 'bank_transfer' | 'other'
  payment_date: string
  notes?: string | null
  created_by?: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  shop_id: string
  user_id?: string | null
  action: string
  entity_type: string
  entity_id?: string | null
  details?: Record<string, unknown> | null
  created_at: string
}
