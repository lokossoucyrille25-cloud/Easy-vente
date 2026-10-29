import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDateTime } from '../lib/utils'
import type { Customer, Sale } from '../types/database'
import { 
  ArrowLeft, 
  Save, 
  Phone, 
  MapPin, 
  ShoppingBag, 
  AlertCircle,
  CheckCircle2,
  DollarSign
} from 'lucide-react'

interface Page13CustomerDetailProps {
  customerId?: string
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export const Page13CustomerDetail: React.FC<Page13CustomerDetailProps> = ({ customerId, onNavigate }) => {
  const { shop } = useAuth()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [customerSales, setCustomerSales] = useState<Sale[]>([])
  
  // Remboursement de dette
  const [repayModalOpen, setRepayModalOpen] = useState(false)
  const [repayAmount, setRepayAmount] = useState<number>(0)
  const [repayMethod, setRepayMethod] = useState<'cash' | 'mobile_money'>('cash')
  const [repayNotes, setRepayNotes] = useState('')
  const [repaying, setRepaying] = useState(false)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const isEditing = Boolean(customerId)

  const loadCustomerData = useCallback(async () => {
    if (!customerId || !shop?.id) return
    setLoading(true)

    try {
      // 1. Client
      const { data: custData, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('shop_id', shop.id)
        .single()

      if (custErr) throw custErr

      if (custData) {
        setCustomer(custData as Customer)
        setName(custData.name)
        setPhone(custData.phone || '')
        setAddress(custData.address || '')
        setNotes(custData.notes || '')
      }

      // 2. Historique d'achats du client
      const { data: salesData } = await supabase
        .from('sales')
        .select('*')
        .eq('customer_id', customerId)
        .eq('shop_id', shop.id)
        .order('sale_date', { ascending: false })

      if (salesData) setCustomerSales(salesData as Sale[])
    } catch (err: any) {
      console.error('Erreur chargement client:', err)
      setErrorMsg(err.message || 'Erreur lors du chargement des données.')
    } finally {
      setLoading(false)
    }
  }, [customerId, shop?.id])

  useEffect(() => {
    if (customerId) {
      loadCustomerData()
    }
  }, [customerId, loadCustomerData])

  // Sauvegarde des coordonnées
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!shop?.id) return
    if (!name.trim()) {
      setErrorMsg('Le nom du client est obligatoire.')
      return
    }

    setSaving(true)

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('customers')
          .update({
            name: name.trim(),
            phone: phone.trim() || null,
            address: address.trim() || null,
            notes: notes.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', customerId)
          .eq('shop_id', shop.id)

        if (error) throw error
        setSuccessMsg('Coordonnées du client mises à jour.')
      } else {
        const { data: newCust, error } = await supabase
          .from('customers')
          .insert({
            shop_id: shop.id,
            name: name.trim(),
            phone: phone.trim() || null,
            address: address.trim() || null,
            notes: notes.trim() || null,
          })
          .select()
          .single()

        if (error) throw error

        setSuccessMsg('Nouveau client enregistré !')
        setTimeout(() => {
          if (newCust) {
            onNavigate('customer-detail', { customerId: newCust.id })
          } else {
            onNavigate('customers-list')
          }
        }, 1000)
      }
    } catch (err: any) {
      console.error('Erreur client:', err)
      setErrorMsg(err.message || 'Erreur lors de l’enregistrement.')
    } finally {
      setSaving(false)
    }
  }

  // Remboursement d'une dette
  const handleDebtRepayment = async () => {
    setErrorMsg(null)
    if (!customerId) return
    if (repayAmount <= 0) {
      setErrorMsg('Veuillez saisir un montant valide.')
      return
    }

    setRepaying(true)

    try {
      const { data, error } = await supabase.rpc('record_customer_debt_repayment', {
        p_customer_id: customerId,
        p_amount: repayAmount,
        p_payment_method: repayMethod,
        p_notes: repayNotes.trim() || 'Remboursement de dette client',
      })

      if (error) throw error

      setRepayModalOpen(false)
      setRepayAmount(0)
      setRepayNotes('')
      setSuccessMsg('Remboursement enregistré avec succès ! Nouvelle dette: ' + formatCurrency(data, shop?.currency))
      await loadCustomerData()
    } catch (err: any) {
      console.error('Erreur remboursement dette:', err)
      setErrorMsg(err.message || 'Erreur lors de l’enregistrement du remboursement.')
    } finally {
      setRepaying(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <span className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto w-full">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate('customers-list')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400 p-2 -ml-2 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Répertoire clients</span>
        </button>
      </div>

      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
        {isEditing ? customer?.name : 'Nouveau client'}
      </h1>

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

      {/* Carte Dette & Action Remboursement (Si client existant) */}
      {isEditing && customer && (
        <div
          className={`p-5 rounded-3xl border shadow-sm space-y-3 ${
            customer.total_debt > 0
              ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
              : 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Solde débiteur en cours
              </p>
              <p
                className={`text-2xl font-black mt-0.5 ${
                  customer.total_debt > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {formatCurrency(customer.total_debt, shop?.currency)}
              </p>
            </div>

            {customer.total_debt > 0 && (
              <button
                type="button"
                onClick={() => {
                  setRepayAmount(customer.total_debt)
                  setRepayModalOpen(true)
                }}
                className="py-2.5 px-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-rose-600/30 transition cursor-pointer flex items-center gap-1.5"
              >
                <DollarSign className="w-4 h-4" />
                <span>Encaisser un remboursement</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Formulaire Coordonnées */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3.5 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Coordonnées
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Nom complet du client *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: M. Koffi Mensah"
              required
              className="w-full px-3.5 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Numéro de téléphone
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 97 00 11 22"
                className="w-full pl-10 pr-3.5 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Adresse ou quartier (Optionnel)
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Quartier Cadjèhoun, près de la pharmacie"
                className="w-full pl-10 pr-3.5 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Notes complémentaires
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observations particulières..."
              rows={2}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-base rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
        >
          {saving ? (
            <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>{isEditing ? 'Enregistrer les coordonnées' : 'Ajouter le client'}</span>
            </>
          )}
        </button>
      </form>

      {/* Historique des achats de ce client */}
      {isEditing && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Historique des achats ({customerSales.length})</span>
          </h2>

          {customerSales.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">
              Aucun achat enregistré pour ce client pour le moment.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {customerSales.map((s) => (
                <div
                  key={s.id}
                  onClick={() => onNavigate('sale-detail', { saleId: s.id })}
                  className="py-2.5 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 rounded-xl transition"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(s.total, shop?.currency)}
                    </p>
                    <p className="text-slate-400 mt-0.5">
                      {formatDateTime(s.sale_date)} • {s.payment_method.toUpperCase()}
                    </p>
                  </div>
                  {s.remaining_amount > 0 && s.status === 'completed' && (
                    <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">
                      Dû: {formatCurrency(s.remaining_amount, shop?.currency)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de Remboursement de dette */}
      {repayModalOpen && customer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Encaisser un remboursement
            </h3>
            <p className="text-xs text-slate-500">
              Dette actuelle : <strong className="text-rose-600">{formatCurrency(customer.total_debt, shop?.currency)}</strong>
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Montant remboursé *
              </label>
              <input
                type="number"
                min="1"
                max={customer.total_debt}
                value={repayAmount || ''}
                onChange={(e) => setRepayAmount(Math.max(0, Number(e.target.value)))}
                className="w-full px-3.5 py-3 text-base font-black bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Mode d'encaissement
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cash', label: 'Espèces' },
                  { id: 'mobile_money', label: 'Mobile Money' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setRepayMethod(m.id as any)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      repayMethod === m.id
                        ? 'bg-emerald-600 text-white border-transparent'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Note / Référence (Optionnel)
              </label>
              <input
                type="text"
                value={repayNotes}
                onChange={(e) => setRepayNotes(e.target.value)}
                placeholder="Ex: Paiement reçu en boutique..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRepayModalOpen(false)}
                disabled={repaying}
                className="py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleDebtRepayment}
                disabled={repaying}
                className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5"
              >
                {repaying ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <span>Encaisser</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
