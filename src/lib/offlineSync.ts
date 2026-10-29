import { supabase } from './supabase'

export interface PendingOfflineSaleItem {
  product_id: string
  product_name?: string
  quantity: number
  unit_price: number
}

export interface PendingOfflineSale {
  offline_id: string
  created_at: string
  customer_id: string | null
  customer_name?: string
  discount: number
  vat_amount: number
  payment_method: 'cash' | 'mobile_money' | 'credit' | 'split'
  paid_amount: number
  items: PendingOfflineSaleItem[]
  notes: string | null
  total: number
}

export interface SyncResult {
  successCount: number
  failedCount: number
  errors: string[]
}

const STORAGE_KEY = 'easy_vente_pending_sales'
const LAST_SYNC_KEY = 'easy_vente_last_sync'

// Générateur d'UUID v4 compatible tous navigateurs
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// 1. Récupération de la file d'attente locale
export function getPendingSales(): PendingOfflineSale[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('Erreur lecture file hors-ligne:', err)
    return []
  }
}

// 2. Enregistrement d'une vente hors-ligne
export function savePendingSale(
  sale: Omit<PendingOfflineSale, 'offline_id' | 'created_at'> & {
    offline_id?: string
    created_at?: string
  }
): PendingOfflineSale {
  const pendingSale: PendingOfflineSale = {
    ...sale,
    offline_id: sale.offline_id || generateUUID(),
    created_at: sale.created_at || new Date().toISOString(),
  }

  const currentQueue = getPendingSales()
  // Éviter les doublons sur offline_id
  const filtered = currentQueue.filter((s) => s.offline_id !== pendingSale.offline_id)
  filtered.push(pendingSale)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('easy_vente_offline_queue_updated'))
    }
  } catch (err) {
    console.error('Erreur stockage local vente:', err)
  }

  return pendingSale
}

// 3. Suppression d'une vente après synchronisation réussie
export function removePendingSale(offline_id: string): void {
  const currentQueue = getPendingSales()
  const updated = currentQueue.filter((s) => s.offline_id !== offline_id)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('easy_vente_offline_queue_updated'))
    }
  } catch (err) {
    console.error('Erreur mise à jour file hors-ligne:', err)
  }
}

// 4. Récupération et mise à jour de la date de dernière synchronisation
export function getLastSyncTime(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY)
}

export function setLastSyncTime(timeIso?: string): void {
  const value = timeIso || new Date().toISOString()
  localStorage.setItem(LAST_SYNC_KEY, value)
}

// 5. Exécution de la synchronisation réelle vers Supabase
export async function syncPendingSales(): Promise<SyncResult> {
  const queue = getPendingSales()
  const result: SyncResult = {
    successCount: 0,
    failedCount: 0,
    errors: [],
  }

  if (queue.length === 0) {
    setLastSyncTime()
    return result
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    result.errors.push('Connexion Internet indisponible pour la synchronisation.')
    return result
  }

  for (const sale of queue) {
    try {
      const itemsPayload = sale.items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      }))

      const { data, error } = await supabase.rpc('create_sale_transaction', {
        p_customer_id: sale.customer_id,
        p_discount: sale.discount,
        p_vat_amount: sale.vat_amount,
        p_payment_method: sale.payment_method,
        p_paid_amount: sale.paid_amount,
        p_items: itemsPayload,
        p_offline_id: sale.offline_id,
        p_notes: sale.notes ? `${sale.notes} (Sync hors-ligne)` : '(Sync hors-ligne)',
      })

      if (error) {
        // Si l'erreur indique que la vente avec cet offline_id a déjà été enregistrée
        if (
          error.message?.includes('duplicate') ||
          error.message?.includes('unique') ||
          error.code === '23505'
        ) {
          console.warn(`Vente ${sale.offline_id} déjà présente sur le serveur, suppression de la file.`)
          removePendingSale(sale.offline_id)
          result.successCount++
        } else {
          console.error(`Erreur sync vente ${sale.offline_id}:`, error)
          result.failedCount++
          result.errors.push(`Vente ${sale.offline_id.slice(0, 8)}: ${error.message}`)
        }
      } else if (data?.sale_id) {
        // Succès confirmé : retrait de la vente de la file d'attente
        removePendingSale(sale.offline_id)
        result.successCount++
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de communication réseau'
      result.failedCount++
      result.errors.push(`Vente ${sale.offline_id.slice(0, 8)}: ${message}`)
    }
  }

  if (result.successCount > 0) {
    setLastSyncTime()
  }

  return result
}
