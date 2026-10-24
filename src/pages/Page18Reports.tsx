import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/utils'
import { 
  ArrowLeft, 
  Award
} from 'lucide-react'

interface Page18ReportsProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

interface TopProduct {
  name: string
  totalQty: number
  totalRevenue: number
}

export const Page18Reports: React.FC<Page18ReportsProps> = ({ onNavigate }) => {
  const { shop, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'month' | 'all'>('month')
  
  // Indicateurs financiers
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalProfit, setTotalProfit] = useState(0)
  const [totalStockValue, setTotalStockValue] = useState(0)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])

  const isOwner = profile?.role === 'owner'

  const loadFinancialReports = async () => {
    if (!shop?.id) return
    setLoading(true)

    try {
      // 1. Valeur totale du stock actuel (current_stock * purchase_price)
      const { data: productsData } = await supabase
        .from('products')
        .select('current_stock, purchase_price')
        .eq('shop_id', shop.id)
        .eq('is_archived', false)

      if (productsData) {
        const stockVal = productsData.reduce(
          (sum, p) => sum + Number(p.current_stock || 0) * Number(p.purchase_price || 0),
          0
        )
        setTotalStockValue(stockVal)
      }

      // 2. Chiffre d'affaires & Ventes
      let salesQuery = supabase
        .from('sales')
        .select('id, total, status, sale_date')
        .eq('shop_id', shop.id)
        .eq('status', 'completed')

      if (period === 'month') {
        const firstDayOfMonth = new Date()
        firstDayOfMonth.setDate(1)
        firstDayOfMonth.setHours(0, 0, 0, 0)
        salesQuery = salesQuery.gte('sale_date', firstDayOfMonth.toISOString())
      }

      const { data: salesData } = await salesQuery

      if (salesData) {
        const rev = salesData.reduce((sum, s) => sum + Number(s.total || 0), 0)
        setTotalRevenue(rev)

        // 3. Calcul de la marge / bénéfice et top articles via sale_items
        const saleIds = salesData.map((s) => s.id)
        if (saleIds.length > 0) {
          const { data: itemsData } = await supabase
            .from('sale_items')
            .select(`
              quantity, unit_price, purchase_price, total_price,
              product:products (name)
            `)
            .in('sale_id', saleIds)

          if (itemsData) {
            // Bénéfice = (unit_price - purchase_price) * quantity
            let profitSum = 0
            const productAgg: Record<string, { name: string; qty: number; rev: number }> = {}

            itemsData.forEach((item: any) => {
              const qty = Number(item.quantity)
              const sellP = Number(item.unit_price)
              const costP = Number(item.purchase_price)
              profitSum += (sellP - costP) * qty

              const pName = item.product?.name || 'Produit'
              if (!productAgg[pName]) {
                productAgg[pName] = { name: pName, qty: 0, rev: 0 }
              }
              productAgg[pName].qty += qty
              productAgg[pName].rev += Number(item.total_price)
            })

            setTotalProfit(profitSum)

            // Top 5 produits les plus vendus
            const sorted = Object.values(productAgg)
              .sort((a, b) => b.qty - a.qty)
              .slice(0, 5)
              .map((p) => ({ name: p.name, totalQty: p.qty, totalRevenue: p.rev }))

            setTopProducts(sorted)
          }
        } else {
          setTotalProfit(0)
          setTopProducts([])
        }
      }
    } catch (err) {
      console.error('Erreur chargement rapports:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFinancialReports()
  }, [shop?.id, period])

  if (!isOwner) {
    return (
      <div className="text-center py-20 max-w-sm mx-auto space-y-3">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Accès restreint
        </p>
        <p className="text-xs text-slate-500">
          Seul le propriétaire de la boutique a accès aux marges et aux rapports financiers.
        </p>
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
    <div className="space-y-6 pb-24 max-w-6xl mx-auto w-full">
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

        {/* Sélecteur de période */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setPeriod('month')}
            className={`py-1 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
              period === 'month'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Ce mois
          </button>
          <button
            type="button"
            onClick={() => setPeriod('all')}
            className={`py-1 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
              period === 'all'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Global
          </button>
        </div>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
          Rapports financiers
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Bénéfices réels, chiffre d'affaires et valorisation du stock
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <span className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Cartes Bénéfice, CA & Stock (Grille responsive 1 col mobile, 3 cols desktop) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Bénéfice Net Réel */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl p-5 shadow-lg shadow-emerald-600/20 flex flex-col justify-between">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-100">
                  Bénéfice estimé ({period === 'month' ? 'du mois' : 'total'})
                </span>
                <p className="text-3xl font-black mt-1">
                  {formatCurrency(totalProfit, shop?.currency)}
                </p>
              </div>
              <p className="text-xs text-emerald-100/90 mt-2">
                Différence Prix de vente − Prix d'achat
              </p>
            </div>

            {/* Chiffre d'affaires */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Chiffre d'affaires
                </span>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {formatCurrency(totalRevenue, shop?.currency)}
                </p>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Total des encaissements sur la période
              </p>
            </div>

            {/* Valeur du Stock en rayon */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Valeur du stock
                </span>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  {formatCurrency(totalStockValue, shop?.currency)}
                </p>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Actifs immobilisés au prix d'achat
              </p>
            </div>
          </div>

          {/* Top 5 Articles les plus vendus */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Produits les plus vendus</span>
            </h2>

            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                Aucune vente sur cette période pour établir le classement.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {topProducts.map((p, idx) => (
                  <div key={p.name} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{p.name}</p>
                        <p className="text-slate-400">{p.totalQty} unités écoulées</p>
                      </div>
                    </div>
                    <span className="font-black text-slate-900 dark:text-slate-100">
                      {formatCurrency(p.totalRevenue, shop?.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
