import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { Product } from '../types/database'
import { 
  ArrowLeft, 
  PlusCircle, 
  AlertCircle, 
  CheckCircle2, 
  Package, 
  FileText 
} from 'lucide-react'

interface Page11StockEntryProps {
  productId?: string
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export const Page11StockEntry: React.FC<Page11StockEntryProps> = ({ productId, onNavigate }) => {
  const { shop, profile } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>(productId || '')
  const [movementType, setMovementType] = useState<'in' | 'adjustment' | 'out'>('in')
  const [quantity, setQuantity] = useState<number>(0)
  const [reason, setReason] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const isOwner = profile?.role === 'owner'

  useEffect(() => {
    if (!shop?.id) return

    supabase
      .from('products')
      .select('*')
      .eq('shop_id', shop.id)
      .eq('is_archived', false)
      .order('name')
      .then(({ data }) => {
        if (data) {
          setProducts(data as Product[])
          if (!selectedProductId && data.length > 0) {
            setSelectedProductId(data[0].id)
          }
        }
      })
  }, [shop?.id])

  const selectedProduct = products.find((p) => p.id === selectedProductId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!shop?.id) return

    if (!isOwner) {
      setErrorMsg('Seul le propriétaire de la boutique peut enregistrer un mouvement de stock.')
      return
    }

    if (!selectedProductId) {
      setErrorMsg('Veuillez sélectionner un produit.')
      return
    }

    if (quantity <= 0) {
      setErrorMsg('La quantité doit être strictement supérieure à zéro.')
      return
    }

    setSaving(true)

    try {
      // Pour une sortie manuelle, la quantité doit être négative
      const effectiveQty = movementType === 'out' ? -quantity : quantity

      const { error } = await supabase.from('stock_movements').insert({
        shop_id: shop.id,
        product_id: selectedProductId,
        type: movementType,
        quantity: effectiveQty,
        reason: reason.trim() || (movementType === 'in' ? 'Réapprovisionnement fournisseur' : 'Ajustement inventaire'),
      })

      if (error) throw error

      setSuccessMsg('Mouvement de stock enregistré avec succès !')
      setQuantity(0)
      setReason('')

      // Actualiser le stock du produit localement
      const { data: updatedProduct } = await supabase
        .from('products')
        .select('*')
        .eq('id', selectedProductId)
        .single()

      if (updatedProduct) {
        setProducts((prev) =>
          prev.map((p) => (p.id === selectedProductId ? (updatedProduct as Product) : p))
        )
      }
    } catch (err: any) {
      console.error('Erreur entrée stock:', err)
      setErrorMsg(err.message || 'Erreur lors de l’enregistrement du stock.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto w-full">
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
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Entrée / Ajustement de stock
        </h1>
        <p className="text-xs text-slate-500">
          Réapprovisionnement et correction des quantités en rayon
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-sm">
          {/* Choix du produit */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Sélectionner le produit *
            </label>
            <div className="relative">
              <Package className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 font-medium"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock actuel: {p.current_stock})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedProduct && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-between text-xs">
              <span className="text-slate-500">Stock actuellement en rayon :</span>
              <strong className="text-base text-slate-900 dark:text-slate-100 font-black">
                {selectedProduct.current_stock}
              </strong>
            </div>
          )}

          {/* Type d'opération */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Type de mouvement
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'in', label: 'Entrée (+)' },
                { id: 'adjustment', label: 'Ajustement (+)' },
                { id: 'out', label: 'Perte/Sortie (-)' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setMovementType(t.id as any)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    movementType === t.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quantité */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Quantité à ajouter/retirer *
            </label>
            <input
              type="number"
              min="1"
              value={quantity || ''}
              onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))}
              placeholder="Ex: 50"
              required
              className="w-full px-4 py-3 text-base bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 font-black"
            />
          </div>

          {/* Motif */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Motif / Référence de livraison (Optionnel)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Facture fournisseur N° 402, Carton de 24 reçus..."
                rows={2}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Bouton de validation */}
        <button
          type="submit"
          disabled={saving || !isOwner}
          className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-base rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
        >
          {saving ? (
            <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
          ) : (
            <>
              <PlusCircle className="w-5 h-5" />
              <span>Valider le réapprovisionnement</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}
