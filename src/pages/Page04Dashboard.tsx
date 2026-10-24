import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/utils'
import { 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  PlusCircle, 
  ShoppingBag, 
  Package, 
  ArrowRight,
  RefreshCw
} from 'lucide-react'

interface Page04DashboardProps {
  onNavigate: (page: string) => void
}

export const Page04Dashboard: React.FC<Page04DashboardProps> = ({ onNavigate }) => {
  const { shop, profile } = useAuth()
  const isOwner = profile?.role === 'owner'
  const [loading, setLoading] = useState(true)
  const [todaySalesTotal, setTodaySalesTotal] = useState(0)
  const [todaySalesCount, setTodaySalesCount] = useState(0)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [totalCustomerDebt, setTotalCustomerDebt] = useState(0)
  const [customersInDebtCount, setCustomersInDebtCount] = useState(0)

  const loadDashboardData = async () => {
    if (!shop?.id) return
    setLoading(true)

    try {
      // 1. Ventes du jour (début de la journée locale à minuit)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('total, status')
        .eq('shop_id', shop.id)
        .eq('status', 'completed')
        .gte('sale_date', today.toISOString())

      if (!salesError && salesData) {
        const total = salesData.reduce((sum, s) => sum + Number(s.total || 0), 0)
        setTodaySalesTotal(total)
        setTodaySalesCount(salesData.length)
      }

      // 2. Alertes Stock Bas (current_stock <= alert_threshold et non archivé)
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, current_stock, alert_threshold')
        .eq('shop_id', shop.id)
        .eq('is_archived', false)

      if (!productsError && productsData) {
        const low = productsData.filter((p) => p.current_stock <= p.alert_threshold)
        setLowStockCount(low.length)
      }

      // 3. Dettes Clients
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('total_debt')
        .eq('shop_id', shop.id)
        .gt('total_debt', 0)

      if (!customersError && customersData) {
        const debtSum = customersData.reduce((sum, c) => sum + Number(c.total_debt || 0), 0)
        setTotalCustomerDebt(debtSum)
        setCustomersInDebtCount(customersData.length)
      }
    } catch (err) {
      console.error('Erreur chargement dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [shop?.id])

  return (
    <div className="space-y-6 pb-24 max-w-6xl mx-auto w-full">
      {/* En-tête Boutique & Actualisation */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {profile?.role === 'owner' ? 'Propriétaire' : 'Vendeur'}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            {shop?.name || 'Ma Boutique'}
          </h1>
        </div>

        <button
          type="button"
          onClick={loadDashboardData}
          disabled={loading}
          className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition cursor-pointer"
          title="Actualiser"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
        </button>
      </div>

      {/* Action Rapide : Bouton Vente Imposant (Accessibilité 1 main & Desktop CTA) */}
      <button
        type="button"
        onClick={() => onNavigate('new-sale')}
        className="w-full py-4 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-base rounded-3xl shadow-lg shadow-emerald-600/30 flex items-center justify-between active:scale-[0.98] transition cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div className="text-left">
            <p className="text-base font-bold leading-tight">Nouvelle vente (Caisse)</p>
            <p className="text-xs text-emerald-100 font-normal">Encaisser un client en quelques secondes</p>
          </div>
        </div>
        <ArrowRight className="w-5 h-5" />
      </button>

      {/* Cartes KPI réelles (Grille responsive 1 col mobile, 3 cols desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1 : Ventes du jour */}
        <div
          onClick={() => onNavigate('sales-history')}
          className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm cursor-pointer hover:border-emerald-500/50 transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Ventes d'aujourd'hui
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
            {formatCurrency(todaySalesTotal, shop?.currency)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {todaySalesCount === 0
              ? 'Aucune vente enregistrée aujourd’hui'
              : `${todaySalesCount} transaction${todaySalesCount > 1 ? 's' : ''} réalisée${todaySalesCount > 1 ? 's' : ''}`}
          </p>
        </div>

        {/* KPI 2 : Stock Faible / Ruptures */}
        <div
          onClick={() => onNavigate('stock-status')}
          className={`p-5 rounded-3xl border shadow-sm cursor-pointer transition flex flex-col justify-between ${
            lowStockCount > 0
              ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Stock critique
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                lowStockCount > 0
                  ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-2xl sm:text-3xl font-black ${
              lowStockCount > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {lowStockCount}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {lowStockCount > 0 ? 'Articles à réapprovisionner d’urgence' : 'Tous les stocks sont à niveau'}
          </p>
        </div>

        {/* KPI 3 : Dettes clients à recouvrer */}
        <div
          onClick={() => onNavigate('customers-list')}
          className={`p-5 rounded-3xl border shadow-sm cursor-pointer transition flex flex-col justify-between ${
            totalCustomerDebt > 0
              ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Dettes clients
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                totalCustomerDebt > 0
                  ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-2xl sm:text-3xl font-black truncate ${
              totalCustomerDebt > 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {formatCurrency(totalCustomerDebt, shop?.currency)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {customersInDebtCount > 0
              ? `${customersInDebtCount} client${customersInDebtCount > 1 ? 's' : ''} en attente de paiement`
              : 'Aucune créance en retard'}
          </p>
        </div>
      </div>

      {/* Raccourcis Métiers (2 cols mobile, 4 cols desktop) */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
          Accès rapide
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <button
            type="button"
            onClick={() => onNavigate('products-list')}
            className="flex items-center gap-3 p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-left hover:border-emerald-500/50 hover:shadow-xs transition cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">Produits</p>
              <p className="text-[11px] text-slate-500 truncate">Catalogue & prix</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('sales-history')}
            className="flex items-center gap-3 p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-left hover:border-emerald-500/50 hover:shadow-xs transition cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">Historique</p>
              <p className="text-[11px] text-slate-500 truncate">Toutes les ventes</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('customers-list')}
            className="flex items-center gap-3 p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-left hover:border-emerald-500/50 hover:shadow-xs transition cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">Clients</p>
              <p className="text-[11px] text-slate-500 truncate">Créances & dettes</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate(isOwner ? 'reports' : 'offline-sync')}
            className="flex items-center gap-3 p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-left hover:border-emerald-500/50 hover:shadow-xs transition cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {isOwner ? 'Rapports' : 'Synchronisation'}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {isOwner ? 'Bénéfices & stats' : 'Mode hors-ligne'}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
