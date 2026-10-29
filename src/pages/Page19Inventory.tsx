import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { Product } from '../types/database'
import { 
  ArrowLeft, 
  Search, 
  ClipboardCheck, 
  CheckCircle2, 
  AlertCircle, 
  Save 
} from 'lucide-react'

interface Page19InventoryProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export const Page19Inventory: React.FC<Page19InventoryProps> = ({ onNavigate }) => {
  const { shop, profile } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [countedQuantities, setCountedQuantities] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const isOwner = profile?.role === 'owner'

  const loadProducts = useCallback(async () => {
    if (!shop?.id) return

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', shop.id)
        .eq('is_archived', false)
        .order('name')

      if (!error && data) {
        setProducts(data as Product[])
        const initialCount: Record<string, number> = {}
        data.forEach((p) => {
          initialCount[p.id] = p.current_stock
        })
        setCountedQuantities(initialCount)
      }
    } catch (err) {
      console.error('Erreur inventaire:', err)
    } finally {
      setLoading(false)
    }
  }, [shop?.id])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const handleQuantityChange = (productId: string, val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0)
    setCountedQuantities((prev) => ({ ...prev, [productId]: num }))
  }

  // Enregistrer l'ajustement pour un produit ayant un écart
  const handleApplyAdjustment = async (product: Product) => {
    setErrorMsg(null)
    setSuccessMsg(null)

    const counted = countedQuantities[product.id]
    const diff = counted - product.current_stock

    if (diff === 0) {
      setSuccessMsg(`Aucun écart pour ${product.name} (stock identique).`)
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase.from('stock_movements').insert({
        shop_id: shop!.id,
        product_id: product.id,
        type: 'adjustment',
        quantity: diff,
        reason: `Ajustement inventaire physique : compté ${counted} vs théorique ${product.current_stock} (écart de ${diff > 0 ? '+' : ''}${diff})`,
      })

      if (error) throw error

      setSuccessMsg(`Stock de "${product.name}" réajusté à ${counted} avec succès.`)
      await loadProducts()
    } catch (err: any) {
      console.error('Erreur ajustement:', err)
      setErrorMsg(err.message || 'Erreur lors de l’ajustement.')
    } finally {
      setSaving(false)
    }
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  )

  if (!isOwner) {
    return (
      <div className="text-center py-20 max-w-sm mx-auto space-y-3">
        <p className="text-sm font-semibold text-slate-700">Accès réservé au propriétaire.</p>
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="py-2.5 px-4 bg-emerald-600 text-white rounded-xl text-xs font-bold"
        >
          Retour au tableau de bord
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-24 max-w-6xl mx-auto w-full">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate('stock-status')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400 p-2 -ml-2 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>État du stock</span>
        </button>
      </div>

      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-emerald-600" />
          <span>Inventaire physique</span>
        </h1>
        <p className="text-xs text-slate-500">
          Comptez vos articles en rayon et corrigez automatiquement les écarts
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2.5 p-3.5 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-2.5 p-3.5 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-2xl">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filtrer un produit..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
        />
      </div>

      {/* Liste d'inventaire */}
      {loading ? (
        <div className="text-center py-12">
          <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-8">Aucun produit à inventorier.</p>
      ) : (
        <div className="space-y-2">
          {filteredProducts.map((p) => {
            const counted = countedQuantities[p.id] ?? p.current_stock
            const diff = counted - p.current_stock

            return (
              <div
                key={p.id}
                className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{p.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Théorique : <strong>{p.current_stock}</strong>
                    {diff !== 0 && (
                      <span className={`ml-2 font-bold ${diff > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        Écart: {diff > 0 ? `+${diff}` : diff}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={counted}
                    onChange={(e) => handleQuantityChange(p.id, e.target.value)}
                    className="w-16 px-2 py-2 text-center text-sm font-black bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />

                  {diff !== 0 && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleApplyAdjustment(p)}
                      className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs cursor-pointer hover:bg-emerald-700 transition"
                      title="Appliquer l'écart"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
