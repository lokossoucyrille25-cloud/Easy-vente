import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { Product } from '../types/database'
import { 
  ArrowLeft, 
  Search, 
  AlertTriangle, 
  XCircle, 
  PlusCircle,
  Package
} from 'lucide-react'

interface Page10StockStatusProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export const Page10StockStatus: React.FC<Page10StockStatusProps> = ({ onNavigate }) => {
  const { shop, profile } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'alert' | 'out'>('all')

  const isOwner = profile?.role === 'owner'

  const loadStockData = useCallback(async () => {
    if (!shop?.id) return

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', shop.id)
        .eq('is_archived', false)
        .order('current_stock', { ascending: true })

      if (!error && data) {
        setProducts(data as Product[])
      }
    } catch (err) {
      console.error('Erreur chargement stocks:', err)
    } finally {
      setLoading(false)
    }
  }, [shop?.id])

  useEffect(() => {
    loadStockData()
  }, [loadStockData])

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase().trim())

      if (filter === 'out') return matchesSearch && p.current_stock <= 0
      if (filter === 'alert') return matchesSearch && p.current_stock > 0 && p.current_stock <= p.alert_threshold
      return matchesSearch
    })
  }, [products, searchQuery, filter])

  const outOfStockCount = products.filter((p) => p.current_stock <= 0).length
  const alertCount = products.filter((p) => p.current_stock > 0 && p.current_stock <= p.alert_threshold).length

  return (
    <div className="space-y-4 pb-24 max-w-6xl mx-auto w-full">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400 p-2 -ml-2 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tableau de bord</span>
        </button>

        {isOwner && (
          <button
            type="button"
            onClick={() => onNavigate('stock-entry')}
            className="inline-flex items-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/25 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Réapprovisionner</span>
          </button>
        )}
      </div>

      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Niveaux de stock
        </h1>
        <p className="text-xs text-slate-500">
          Suivi des quantités disponibles et prévention des ruptures
        </p>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un produit..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 shadow-sm"
        />
      </div>

      {/* Onglets Filtres */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
            filter === 'all'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
          }`}
        >
          Tous ({products.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter('alert')}
          className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
            filter === 'alert'
              ? 'bg-amber-600 text-white'
              : 'bg-white dark:bg-slate-900 text-amber-600 border border-amber-200 dark:border-amber-900/60'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Stock bas ({alertCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('out')}
          className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
            filter === 'out'
              ? 'bg-rose-600 text-white'
              : 'bg-white dark:bg-slate-900 text-rose-600 border border-rose-200 dark:border-rose-900/60'
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Épuisé ({outOfStockCount})</span>
        </button>
      </div>

      {/* Liste du Stock */}
      {loading ? (
        <div className="text-center py-12">
          <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/80 dark:border-slate-800">
          <Package className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Aucun article dans cette sélection
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredProducts.map((product) => {
            const isOut = product.current_stock <= 0
            const isAlert = !isOut && product.current_stock <= product.alert_threshold

            return (
              <div
                key={product.id}
                onClick={() => isOwner && onNavigate('stock-entry', { productId: product.id })}
                className={`p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between transition ${
                  isOwner ? 'cursor-pointer hover:border-emerald-500/50 active:scale-[0.99]' : ''
                }`}
              >
                <div className="flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {product.name}
                    </p>
                    {isOut && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                        Rupture
                      </span>
                    )}
                    {isAlert && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                        Seuil atteint
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Seuil d'alerte configuré : {product.alert_threshold}
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`text-lg font-black ${
                      isOut
                        ? 'text-rose-600 dark:text-rose-400'
                        : isAlert
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {product.current_stock}
                  </span>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">En rayon</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
