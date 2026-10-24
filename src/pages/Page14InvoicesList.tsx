import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDateTime } from '../lib/utils'
import type { Invoice, Sale } from '../types/database'
import { Search, FileText, ArrowRight, ArrowLeft } from 'lucide-react'

interface InvoiceWithSale extends Invoice {
  sale?: Sale & {
    customer?: { id: string; name: string } | null
  }
}

interface Page14InvoicesListProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export const Page14InvoicesList: React.FC<Page14InvoicesListProps> = ({ onNavigate }) => {
  const { shop } = useAuth()
  const [invoices, setInvoices] = useState<InvoiceWithSale[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const loadInvoices = async () => {
    if (!shop?.id) return
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          sale:sales (
            id, total, status, sale_date,
            customer:customers (id, name)
          )
        `)
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setInvoices(data as unknown as InvoiceWithSale[])
      }
    } catch (err) {
      console.error('Erreur chargement factures:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvoices()
  }, [shop?.id])

  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) return invoices
    const q = searchQuery.toLowerCase().trim()
    return invoices.filter((inv) => {
      const matchesNum = inv.invoice_number.toLowerCase().includes(q)
      const matchesClient = inv.sale?.customer?.name?.toLowerCase().includes(q)
      return matchesNum || matchesClient
    })
  }, [invoices, searchQuery])

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
          Factures émises
        </h1>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par N° facture (ex: FAC-2026-0001) ou client..."
          className="w-full pl-10 pr-4 py-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 shadow-sm"
        />
      </div>

      {/* Liste des factures réelles */}
      {loading ? (
        <div className="text-center py-12">
          <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent" />
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/80 dark:border-slate-800">
          <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Aucune facture générée
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Chaque vente validée produit automatiquement une facture officielle numérotée sans trou.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredInvoices.map((inv) => (
            <div
              key={inv.id}
              onClick={() => onNavigate('invoice-view', { invoiceId: inv.id })}
              className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between hover:border-emerald-500/50 transition cursor-pointer active:scale-[0.99]"
            >
              <div className="flex-1 pr-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {inv.invoice_number}
                  </p>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      inv.status === 'cancelled'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                    }`}
                  >
                    {inv.status === 'cancelled' ? 'Annulée' : 'Valide'}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-0.5">
                  Client: {inv.sale?.customer?.name || 'Comptoir'} • {formatDateTime(inv.invoice_date)}
                </p>
              </div>

              <div className="text-right flex items-center gap-2">
                <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                  {formatCurrency(inv.sale?.total || 0, shop?.currency)}
                </p>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
