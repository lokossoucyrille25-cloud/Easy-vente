import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/utils'
import type { Product, Category } from '../types/database'
import { 
  Search, 
  Plus, 
  Package, 
  AlertTriangle, 
  ArrowLeft,
  ArrowRight
} from 'lucide-react'

interface Page08ProductsListProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export const Page08ProductsList: React.FC<Page08ProductsListProps> = ({ onNavigate }) => {
  const { shop, profile } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const isOwner = profile?.role === 'owner'

  const targetShopId = shop?.id || profile?.shop_id

  const loadData = useCallback(async () => {
    if (!targetShopId) return

    try {
      // 1. Produits
      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', targetShopId)
        .eq('is_archived', false)
        .order('name')

      if (prodData) setProducts(prodData as Product[])

      // 2. Catégories
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .eq('shop_id', targetShopId)
        .order('name')

      if (catData) setCategories(catData as Category[])
    } catch (err) {
      console.error('Erreur chargement catalogue produits:', err)
    } finally {
      setLoading(false)
    }
  }, [targetShopId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (p.barcode && p.barcode.includes(searchQuery.trim()))

      const matchesCategory =
        selectedCategory === 'all' || p.category_id === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [products, searchQuery, selectedCategory])

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
            onClick={() => onNavigate('product-detail')}
            className="inline-flex items-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/25 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau produit</span>
          </button>
        )}
      </div>

      <div className="flex items-baseline justify-between px-1">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Produits ({filteredProducts.length})
        </h1>
        <button
          type="button"
          onClick={() => onNavigate('stock-status')}
          className="text-xs font-bold text-emerald-600 hover:underline"
        >
          Voir état des stocks →
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par nom, code-barres..."
          className="w-full pl-10 pr-4 py-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 shadow-sm"
        />
      </div>

      {/* Filtres par catégories réelles */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`py-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            Tous les rayons
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === c.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Liste des produits */}
      {loading ? (
        <div className="text-center py-12">
          <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/80 dark:border-slate-800">
          <Package className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Aucun produit dans le catalogue
          </p>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Enregistrez les articles que vous vendez pour commencer votre inventaire.
          </p>
          {isOwner && (
            <button
              type="button"
              onClick={() => onNavigate('product-detail')}
              className="py-2.5 px-4 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow cursor-pointer"
            >
              Ajouter un premier produit
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProducts.map((product) => {
            const isLowStock = product.current_stock <= product.alert_threshold

            return (
              <div
                key={product.id}
                onClick={() => isOwner && onNavigate('product-detail', { productId: product.id })}
                className={`p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between transition ${
                  isOwner ? 'cursor-pointer hover:border-emerald-500/50 active:scale-[0.99]' : ''
                }`}
              >
                <div className="flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {product.name}
                    </p>
                    {isLowStock && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Alerte</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>
                      Stock :{' '}
                      <strong
                        className={
                          product.current_stock <= 0
                            ? 'text-rose-600 font-bold'
                            : isLowStock
                            ? 'text-amber-600 font-bold'
                            : 'text-slate-700 dark:text-slate-300'
                        }
                      >
                        {product.current_stock}
                      </strong>
                    </span>

                    {/* Le prix d'achat n'est visible que pour le propriétaire */}
                    {isOwner && (
                      <span>Achat: {formatCurrency(product.purchase_price, shop?.currency)}</span>
                    )}
                  </div>
                </div>

                <div className="text-right flex items-center gap-2">
                  <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(product.selling_price, shop?.currency)}
                  </p>
                  {isOwner && <ArrowRight className="w-4 h-4 text-slate-400" />}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
