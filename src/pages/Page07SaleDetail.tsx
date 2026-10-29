import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDateTime } from '../lib/utils'
import type { Sale, SaleItem, Invoice } from '../types/database'
import { 
  ArrowLeft, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  User, 
  Calendar,
  CreditCard,
  Ban
} from 'lucide-react'

interface Page07SaleDetailProps {
  saleId: string
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export const Page07SaleDetail: React.FC<Page07SaleDetailProps> = ({ saleId, onNavigate }) => {
  const { shop, profile } = useAuth()
  const [sale, setSale] = useState<Sale | null>(null)
  const [items, setItems] = useState<SaleItem[]>([])
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const isOwner = profile?.role === 'owner'

  const loadSaleDetail = useCallback(async () => {
    if (!saleId || !shop?.id) return

    try {
      // 1. Vente + Client
      const { data: saleData } = await supabase
        .from('sales')
        .select(`
          *,
          customer:customers (id, name, phone, address, total_debt)
        `)
        .eq('id', saleId)
        .eq('shop_id', shop.id)
        .single()

      if (saleData) setSale(saleData as unknown as Sale)

      // 2. Lignes d'articles
      const { data: itemsData } = await supabase
        .from('sale_items')
        .select(`
          *,
          product:products (id, name, current_stock)
        `)
        .eq('sale_id', saleId)

      if (itemsData) setItems(itemsData as unknown as SaleItem[])

      // 3. Facture associée
      const { data: invData } = await supabase
        .from('invoices')
        .select('*')
        .eq('sale_id', saleId)
        .single()

      if (invData) setInvoice(invData as Invoice)
    } catch (err) {
      console.error('Erreur chargement détail vente:', err)
    } finally {
      setLoading(false)
    }
  }, [saleId, shop?.id])

  useEffect(() => {
    loadSaleDetail()
  }, [loadSaleDetail])

  // Annulation de la vente (Réservé au propriétaire)
  const handleCancelSale = async () => {
    setErrorMsg(null)
    setCancelling(true)

    try {
      const { error } = await supabase.rpc('cancel_sale_transaction', {
        p_sale_id: saleId,
        p_reason: cancelReason.trim() || 'Annulation manuelle par le propriétaire',
      })

      if (error) {
        setErrorMsg(error.message || 'Erreur lors de l’annulation de la vente.')
        setCancelling(false)
        return
      }

      setCancelModalOpen(false)
      await loadSaleDetail()
    } catch (err) {
      console.error('Erreur annulation vente:', err)
      setErrorMsg('Erreur inattendue lors de l’annulation.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <span className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  if (!sale) {
    return (
      <div className="text-center py-12 space-y-4 max-w-md mx-auto">
        <p className="text-sm text-slate-500">Cette vente est introuvable ou a été supprimée.</p>
        <button
          type="button"
          onClick={() => onNavigate('sales-history')}
          className="py-2.5 px-4 bg-emerald-600 text-white rounded-xl text-xs font-bold"
        >
          Retour à l'historique
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto w-full">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate('sales-history')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400 p-2 -ml-2 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Historique des ventes</span>
        </button>

        <span
          className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 ${
            sale.status === 'cancelled'
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
          }`}
        >
          {sale.status === 'cancelled' ? (
            <>
              <XCircle className="w-3.5 h-3.5" />
              <span>Annulée</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Validée</span>
            </>
          )}
        </span>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2.5 p-3.5 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Carte Résumé Principal */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {invoice?.invoice_number || 'Facture'}
            </p>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
              {formatCurrency(sale.total, shop?.currency)}
            </h1>
          </div>

          {invoice && (
            <button
              type="button"
              onClick={() => onNavigate('invoice-view', { invoiceId: invoice.id })}
              className="inline-flex items-center gap-1.5 py-2 px-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Voir Facture PDF</span>
            </button>
          )}
        </div>

        {/* Détails méta */}
        <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-400 pt-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>{formatDateTime(sale.sale_date)}</span>
          </div>

          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-400" />
            <span className="capitalize">{sale.payment_method}</span>
          </div>

          <div className="flex items-center gap-2 col-span-2">
            <User className="w-4 h-4 text-slate-400" />
            <span>
              Client: <strong className="text-slate-900 dark:text-slate-100">{sale.customer?.name || 'Client comptoir (anonyme)'}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Lignes d'articles vendus */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Articles encaissés ({items.length})
        </h2>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => (
            <div key={item.id} className="py-2.5 flex items-center justify-between text-sm">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  {item.product?.name || 'Produit'}
                </p>
                <p className="text-xs text-slate-400">
                  {item.quantity} × {formatCurrency(item.unit_price, shop?.currency)}
                </p>
              </div>
              <p className="font-black text-slate-900 dark:text-slate-100">
                {formatCurrency(item.total_price, shop?.currency)}
              </p>
            </div>
          ))}
        </div>

        {/* Totaux financiers */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Sous-total</span>
            <span>{formatCurrency(sale.subtotal, shop?.currency)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Remise</span>
              <span>-{formatCurrency(sale.discount, shop?.currency)}</span>
            </div>
          )}
          {sale.vat_amount > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>TVA</span>
              <span>+{formatCurrency(sale.vat_amount, shop?.currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-black text-slate-900 dark:text-slate-100 pt-1">
            <span>Total</span>
            <span>{formatCurrency(sale.total, shop?.currency)}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Montant payé</span>
            <span>{formatCurrency(sale.paid_amount, shop?.currency)}</span>
          </div>
          {sale.remaining_amount > 0 && (
            <div className="flex justify-between text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl">
              <span>Reste à payer</span>
              <span>{formatCurrency(sale.remaining_amount, shop?.currency)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bouton d'annulation (Réservé au propriétaire et si vente active) */}
      {isOwner && sale.status === 'completed' && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setCancelModalOpen(true)}
            className="w-full py-3.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Ban className="w-4 h-4" />
            <span>Annuler cette vente (Restituer le stock)</span>
          </button>
        </div>
      )}

      {/* Boîte de confirmation d'annulation */}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Confirmer l'annulation ?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Cette opération remettra les articles en stock, annulera la facture et réajustera la dette du client. Action irréversible.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Motif d'annulation
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Erreur de saisie, retour marchandise..."
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                disabled={cancelling}
                className="py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Garder la vente
              </button>

              <button
                type="button"
                onClick={handleCancelSale}
                disabled={cancelling}
                className="py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/30 flex items-center justify-center gap-1.5"
              >
                {cancelling ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <span>Oui, annuler</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
