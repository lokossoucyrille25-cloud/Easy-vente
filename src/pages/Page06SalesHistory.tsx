import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDateTime } from '../lib/utils'
import type { Sale } from '../types/database'
import { Search, ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react'

interface Page06SalesHistoryProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export const Page06SalesHistory: React.FC<Page06SalesHistoryProps> = ({ onNavigate }) => {
  const { shop } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all')

  const loadSales = useCallback(async () => {
    if (!shop?.id) return

    try {
      let query = supabase
        .from('sales')
        .select(`
          *,
          customer:customers (id, name, phone)
        `)
        .eq('shop_id', shop.id)
        .order('sale_date', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (!error && data) {
        setSales(data as unknown as Sale[])
      }
    } catch (err) {
      console.error('Erreur chargement ventes:', err)
    } finally {
      setLoading(false)
    }
  }, [shop?.id, statusFilter])

  useEffect(() => {
    loadSales()
  }, [loadSales])

  // Filtrage par nom client
  const filteredSales = sales.filter((s) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    const clientName = s.customer?.name?.toLowerCase() || ''
    const notes = s.notes?.toLowerCase() || ''
    return clientName.includes(q) || notes.includes(q)
  })

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
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Historique des ventes
        </h1>
      </div>

      {/* Barre de recherche & Filtres */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par client..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 shadow-sm"
          />
        </div>

        {/* Boutons filtres */}
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'Toutes' },
            { id: 'completed', label: 'Validées' },
            { id: 'cancelled', label: 'Annulées' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id as any)}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste des ventes réelles */}
      {loading ? (
        <div className="text-center py-12">
          <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent" />
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/80 dark:border-slate-800">
          <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Aucune vente trouvée
          </p>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Les encaissements réalisés apparaîtront ici avec tous leurs détails.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('new-sale')}
            className="py-2.5 px-4 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Faire une vente
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSales.map((sale) => (
            <div
              key={sale.id}
              onClick={() => onNavigate('sale-detail', { saleId: sale.id })}
              className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between hover:border-emerald-500/50 transition cursor-pointer active:scale-[0.99]"
            >
              <div className="flex-1 pr-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {sale.customer?.name || 'Client comptoir'}
                  </p>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      sale.status === 'cancelled'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                    }`}
                  >
                    {sale.status === 'cancelled' ? 'Annulée' : 'Validée'}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-0.5">
                  {formatDateTime(sale.sale_date)} • {sale.payment_method.toUpperCase()}
                </p>

                {sale.remaining_amount > 0 && sale.status === 'completed' && (
                  <p className="text-xs text-rose-500 font-semibold mt-0.5">
                    Reste dû: {formatCurrency(sale.remaining_amount, shop?.currency)}
                  </p>
                )}
              </div>

              <div className="text-right flex items-center gap-2">
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                    {formatCurrency(sale.total, shop?.currency)}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
