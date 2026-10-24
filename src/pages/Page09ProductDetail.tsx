import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { Category } from '../types/database'
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  AlertCircle, 
  Tag, 
  Barcode, 
  CheckCircle2,
  Package
} from 'lucide-react'

interface Page09ProductDetailProps {
  productId?: string
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export const Page09ProductDetail: React.FC<Page09ProductDetailProps> = ({ productId, onNavigate }) => {
  const { shop, profile } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [purchasePrice, setPurchasePrice] = useState<number>(0)
  const [sellingPrice, setSellingPrice] = useState<number>(0)
  const [initialStock, setInitialStock] = useState<number>(0)
  const [alertThreshold, setAlertThreshold] = useState<number>(5)
  const [barcode, setBarcode] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const isEditing = Boolean(productId)
  const targetShopId = shop?.id || profile?.shop_id

  useEffect(() => {
    if (!targetShopId) return

    // 1. Charger les catégories
    supabase
      .from('categories')
      .select('*')
      .eq('shop_id', targetShopId)
      .order('name')
      .then(({ data }) => {
        if (data) setCategories(data as Category[])
      })

    // 2. Si édition, charger le produit
    if (productId) {
      setLoading(true)
      supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('shop_id', targetShopId)
        .single()
        .then(({ data, error }) => {
          setLoading(false)
          if (data && !error) {
            setName(data.name)
            setCategoryId(data.category_id || '')
            setDescription(data.description || '')
            setPurchasePrice(Number(data.purchase_price))
            setSellingPrice(Number(data.selling_price))
            setAlertThreshold(data.alert_threshold)
            setBarcode(data.barcode || '')
            setImageUrl(data.image_url || '')
          }
        })
    }
  }, [productId, targetShopId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!targetShopId) {
      setErrorMsg("Boutique non identifiée. Veuillez actualiser la page ou vérifier votre compte.")
      return
    }

    if (profile && profile.role === 'seller') {
      setErrorMsg('Seul le propriétaire de la boutique est habilité à ajouter des produits.')
      return
    }

    if (!name.trim()) {
      setErrorMsg('Le nom du produit est obligatoire.')
      return
    }

    if (sellingPrice < 0 || purchasePrice < 0) {
      setErrorMsg('Les prix ne peuvent pas être négatifs.')
      return
    }

    setSaving(true)

    try {
      if (isEditing) {
        // Mise à jour
        const { error } = await supabase
          .from('products')
          .update({
            name: name.trim(),
            category_id: categoryId || null,
            description: description.trim() || null,
            purchase_price: purchasePrice,
            selling_price: sellingPrice,
            alert_threshold: alertThreshold,
            barcode: barcode.trim() || null,
            image_url: imageUrl.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', productId)
          .eq('shop_id', targetShopId)

        if (error) throw error

        setSuccessMsg('Fiche produit mise à jour avec succès.')
        setTimeout(() => {
          onNavigate('products-list')
        }, 600)
      } else {
        // Création avec stock initial
        const { data: newProd, error: prodErr } = await supabase
          .from('products')
          .insert({
            shop_id: targetShopId,
            name: name.trim(),
            category_id: categoryId || null,
            description: description.trim() || null,
            purchase_price: purchasePrice,
            selling_price: sellingPrice,
            current_stock: initialStock || 0,
            alert_threshold: alertThreshold,
            barcode: barcode.trim() || null,
            image_url: imageUrl.trim() || null,
          })
          .select()
          .single()

        if (prodErr) throw prodErr

        // Si stock initial > 0, insérer le mouvement de stock
        if (initialStock > 0 && newProd) {
          await supabase.from('stock_movements').insert({
            shop_id: targetShopId,
            product_id: newProd.id,
            type: 'in',
            quantity: initialStock,
            reason: 'Stock initial à la création du produit',
          })
        }

        setSuccessMsg('Nouveau produit ajouté au catalogue !')
        setTimeout(() => {
          onNavigate('products-list')
        }, 600)
      }
    } catch (err: any) {
      console.error('Erreur sauvegarde produit:', err)
      setErrorMsg(err.message || 'Erreur lors de l’enregistrement du produit.')
    } finally {
      setSaving(false)
    }
  }

  // Archivage (sans suppression destructrice)
  const handleArchive = async () => {
    if (!confirm('Voulez-vous archiver ce produit ? Il ne sera plus proposé en vente.')) return
    if (!productId || !shop?.id) return

    setSaving(true)
    const { error } = await supabase
      .from('products')
      .update({ is_archived: true })
      .eq('id', productId)
      .eq('shop_id', shop.id)

    setSaving(false)
    if (error) {
      setErrorMsg(error.message)
    } else {
      onNavigate('products-list')
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
          onClick={() => onNavigate('products-list')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400 p-2 -ml-2 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Catalogue produits</span>
        </button>

        {isEditing && (
          <button
            type="button"
            onClick={handleArchive}
            className="p-2 text-rose-500 hover:text-rose-600 transition cursor-pointer"
            title="Archiver ce produit"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
        {isEditing ? 'Modifier le produit' : 'Nouveau produit'}
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

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Informations Générales */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3.5 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Désignation & Catégorie
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Nom du produit *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Savon liquide 500ml"
              required
              className="w-full px-3.5 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Catégorie / Rayon
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full pl-10 pr-3.5 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              >
                <option value="">Aucune catégorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Code-barres (Optionnel)
            </label>
            <div className="relative">
              <Barcode className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Ex: 618110023456"
                className="w-full pl-10 pr-3.5 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Tarification & Marges */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3.5 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Tarifs ({shop?.currency || 'XOF'})
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Prix d'achat
              </label>
              <input
                type="number"
                min="0"
                value={purchasePrice || ''}
                onChange={(e) => setPurchasePrice(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-full px-3.5 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Prix de vente *
              </label>
              <input
                type="number"
                min="0"
                value={sellingPrice || ''}
                onChange={(e) => setSellingPrice(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                required
                className="w-full px-3.5 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 font-bold text-emerald-600 dark:text-emerald-400"
              />
            </div>
          </div>

          {/* Calcul de marge indicatif pour le propriétaire */}
          {sellingPrice > 0 && purchasePrice > 0 && (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-xs flex justify-between">
              <span className="text-slate-500">Marge brute unitaire :</span>
              <strong className={sellingPrice >= purchasePrice ? 'text-emerald-600' : 'text-rose-500'}>
                {sellingPrice - purchasePrice} {shop?.currency} (
                {Math.round(((sellingPrice - purchasePrice) / purchasePrice) * 100)}%)
              </strong>
            </div>
          )}
        </div>

        {/* Niveaux de Stock & Alertes */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3.5 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" />
            <span>Gestion des Alertes & Stocks</span>
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {!isEditing && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Quantité initiale
                </label>
                <input
                  type="number"
                  min="0"
                  value={initialStock || ''}
                  onChange={(e) => setInitialStock(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-full px-3.5 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>
            )}

            <div className={isEditing ? 'col-span-2' : ''}>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Seuil d'alerte rupture
              </label>
              <input
                type="number"
                min="0"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(Math.max(0, Number(e.target.value)))}
                className="w-full px-3.5 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                L'application déclenche une alerte quand le stock descend sous cette limite.
              </p>
            </div>
          </div>
        </div>

        {/* Bouton Enregistrement */}
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
              <span>{isEditing ? 'Sauvegarder les modifications' : 'Ajouter le produit'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}
