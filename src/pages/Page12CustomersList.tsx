import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/utils'
import type { Customer } from '../types/database'
import { 
  Search, 
  UserPlus, 
  Users, 
  ArrowLeft, 
  ArrowRight, 
  Phone,
  AlertCircle
} from 'lucide-react'

interface Page12CustomersListProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export const Page12CustomersList: React.FC<Page12CustomersListProps> = ({ onNavigate }) => {
  const { shop } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDebtOnly, setFilterDebtOnly] = useState(false)

  const loadCustomers = async () => {
    if (!shop?.id) return
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('shop_id', shop.id)
        .order('name')

      if (!error && data) {
        setCustomers(data as Customer[])
      }
    } catch (err) {
      console.error('Erreur chargement clients:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [shop?.id])

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        !searchQuery.trim() ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (c.phone && c.phone.includes(searchQuery.trim()))

      if (filterDebtOnly) {
        return matchesSearch && c.total_debt > 0
      }
      return matchesSearch
    })
  }, [customers, searchQuery, filterDebtOnly])

  const totalDebtsSum = customers.reduce((sum, c) => sum + Number(c.total_debt || 0), 0)
  const debtClientsCount = customers.filter((c) => c.total_debt > 0).length

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

        <button
          type="button"
          onClick={() => onNavigate('customer-detail')}
          className="inline-flex items-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/25 transition cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nouveau client</span>
        </button>
      </div>

      <div className="flex items-baseline justify-between px-1">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Répertoire clients ({filteredCustomers.length})
        </h1>
      </div>

      {/* Carte Dettes Totales si créances en cours */}
      {totalDebtsSum > 0 && (
        <div
          onClick={() => setFilterDebtOnly(!filterDebtOnly)}
          className={`p-4 rounded-3xl border transition cursor-pointer flex items-center justify-between ${
            filterDebtOnly
              ? 'bg-rose-100 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800'
              : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
          }`}
        >
          <div>
            <p className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
              Total des créances à recouvrer
            </p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-300 mt-0.5">
              {formatCurrency(totalDebtsSum, shop?.currency)}
            </p>
            <p className="text-[11px] text-rose-600/80 mt-0.5">
              {debtClientsCount} client{debtClientsCount > 1 ? 's' : ''} vous doi{debtClientsCount > 1 ? 'vent' : 't'} de l'argent • {filterDebtOnly ? 'Afficher tous les clients' : 'Filtrer les débiteurs'}
            </p>
          </div>
          <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
        </div>
      )}

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par nom ou numéro de téléphone..."
          className="w-full pl-10 pr-4 py-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 shadow-sm"
        />
      </div>

      {/* Liste des clients */}
      {loading ? (
        <div className="text-center py-12">
          <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent" />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/80 dark:border-slate-800">
          <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Aucun client trouvé
          </p>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Enregistrez vos clients réguliers pour suivre leurs achats et crédits.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('customer-detail')}
            className="py-2.5 px-4 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Ajouter un client
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              onClick={() => onNavigate('customer-detail', { customerId: customer.id })}
              className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between hover:border-emerald-500/50 transition cursor-pointer active:scale-[0.99]"
            >
              <div className="flex-1 pr-2">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {customer.name}
                </p>
                {customer.phone && (
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" />
                    <span>{customer.phone}</span>
                  </p>
                )}
              </div>

              <div className="text-right flex items-center gap-2">
                <div>
                  {customer.total_debt > 0 ? (
                    <div>
                      <p className="text-sm font-black text-rose-600 dark:text-rose-400">
                        {formatCurrency(customer.total_debt, shop?.currency)}
                      </p>
                      <p className="text-[10px] text-rose-500 font-semibold uppercase">Dette</p>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      À jour
                    </span>
                  )}
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
