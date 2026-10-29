import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getPendingSales,
  savePendingSale,
  removePendingSale,
  syncPendingSales,
  getLastSyncTime,
  setLastSyncTime
} from '../lib/offlineSync'
import { supabase } from '../lib/supabase'

// Mock de localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

describe('Module de Synchronisation Hors-Ligne (Offline Sync)', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('initialise avec une file d’attente vide', () => {
    const queue = getPendingSales()
    expect(queue).toEqual([])
  })

  it('enregistre une vente hors-ligne avec un offline_id généré', () => {
    const sale = savePendingSale({
      customer_id: 'cust-1',
      discount: 500,
      vat_amount: 0,
      payment_method: 'cash',
      paid_amount: 15000,
      items: [
        { product_id: 'prod-1', product_name: 'Huile 1L', quantity: 3, unit_price: 5000 },
      ],
      notes: 'Test hors-ligne',
      total: 15000,
    })

    expect(sale.offline_id).toBeDefined()
    expect(sale.created_at).toBeDefined()

    const queue = getPendingSales()
    expect(queue.length).toBe(1)
    expect(queue[0].offline_id).toBe(sale.offline_id)
    expect(queue[0].total).toBe(15000)
  })

  it('permet de retirer une vente de la file après synchronisation', () => {
    const sale = savePendingSale({
      customer_id: null,
      discount: 0,
      vat_amount: 0,
      payment_method: 'cash',
      paid_amount: 5000,
      items: [{ product_id: 'prod-2', quantity: 1, unit_price: 5000 }],
      notes: null,
      total: 5000,
    })

    expect(getPendingSales().length).toBe(1)

    removePendingSale(sale.offline_id)
    expect(getPendingSales().length).toBe(0)
  })

  it('maintient et stocke la date de dernière synchronisation', () => {
    expect(getLastSyncTime()).toBeNull()

    const testTimestamp = '2026-10-29T14:00:00.000Z'
    setLastSyncTime(testTimestamp)

    expect(getLastSyncTime()).toBe(testTimestamp)
  })

  it('synchronise avec succès les ventes en attente via la RPC Supabase', async () => {
    // 1. Ajouter deux ventes en attente
    savePendingSale({
      customer_id: null,
      discount: 0,
      vat_amount: 0,
      payment_method: 'cash',
      paid_amount: 4000,
      items: [{ product_id: 'prod-3', quantity: 2, unit_price: 2000 }],
      notes: null,
      total: 4000,
    })

    savePendingSale({
      customer_id: 'cust-2',
      discount: 0,
      vat_amount: 0,
      payment_method: 'mobile_money',
      paid_amount: 10000,
      items: [{ product_id: 'prod-4', quantity: 1, unit_price: 10000 }],
      notes: null,
      total: 10000,
    })

    expect(getPendingSales().length).toBe(2)

    // 2. Mocker l'appel RPC Supabase avec succès
    const rpcSpy = vi.spyOn(supabase, 'rpc').mockResolvedValue({
      data: { sale_id: 'supabase-sale-uuid-999' },
      error: null,
    } as any)

    // 3. Exécuter la synchronisation
    const result = await syncPendingSales()

    expect(result.successCount).toBe(2)
    expect(result.failedCount).toBe(0)
    expect(rpcSpy).toHaveBeenCalledTimes(2)

    // La file d'attente doit être vide après le succès
    expect(getPendingSales().length).toBe(0)
  })
})
