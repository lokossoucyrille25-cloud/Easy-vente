import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/utils'
import type { Product, Customer } from '../types/database'
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  User, 
  CreditCard, 
  Check, 
  AlertCircle, 
  ArrowLeft,
  ShoppingBag,
  Percent
} from 'lucide-react'

interface CartItem {
  product: Product
  quantity: number
  unit_price: number
}

interface Page05NewSaleProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export const Page05NewSale: React.FC<Page05NewSaleProps> = ({ onNavigate }) => {
  const { shop, profile } = useAuth()
  const isOwner = profile?.role === 'owner'
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [discount, setDiscount] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'credit' | 'split'>('cash')
  const [paidAmount, setPaidAmount] = useState<number>(0)
  const [notes] = useState<string>('')
  const [step, setStep] = useState<'select_products' | 'checkout'>('select_products')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Charger les vrais produits et clients de la boutique
  useEffect(() => {
    if (!shop?.id) return

    const fetchData = async () => {
      // 1. Produits actifs
      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', shop.id)
        .eq('is_archived', false)
        .order('name')

      if (prodData) setProducts(prodData as Product[])

      // 2. Clients
      const { data: custData } = await supabase
        .from('customers')
        .select('*')
        .eq('shop_id', shop.id)
        .order('name')

      if (custData) setCustomers(custData as Customer[])
    }

    fetchData()
  }, [shop?.id])

  // Filtrage des produits par nom ou code-barres
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products
    const q = searchQuery.toLowerCase().trim()
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q))
    )
  }, [products, searchQuery])

  // Calculs financiers
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  }, [cart])

  const vatAmount = useMemo(() => {
    if (!shop?.vat_enabled) return 0
    return Math.round(((subtotal - discount) * (shop.vat_rate / 100)))
  }, [subtotal, discount, shop?.vat_enabled, shop?.vat_rate])

  const total = useMemo(() => {
    return Math.max(0, subtotal - discount + vatAmount)
  }, [subtotal, discount, vatAmount])

  // Ajustement automatique du montant payé par défaut lors du passage en caisse
  useEffect(() => {
    if (paymentMethod === 'credit') {
      setPaidAmount(0)
    } else if (paymentMethod === 'cash' || paymentMethod === 'mobile_money') {
      setPaidAmount(total)
    }
  }, [paymentMethod, total])

  const remainingAmount = useMemo(() => {
    return Math.max(0, total - paidAmount)
  }, [total, paidAmount])

  // Actions Panier
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { product, quantity: 1, unit_price: Number(product.selling_price) }]
    })
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta
            return newQty > 0 ? { ...item, quantity: newQty } : null
          }
          return item
        })
        .filter(Boolean) as CartItem[]
    )
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }

  // Validation de la vente via la RPC atomique Supabase
  const handleValidateSale = async () => {
    setErrorMsg(null)

    if (cart.length === 0) {
      setErrorMsg('Veuillez ajouter au moins un produit au panier.')
      return
    }

    if (remainingAmount > 0 && !selectedCustomerId) {
      setErrorMsg('Un client doit être sélectionné en cas de vente à crédit ou paiement partiel.')
      return
    }

    setSubmitting(true)

    try {
      const itemsPayload = cart.map((i) => ({
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      }))

      const { data, error } = await supabase.rpc('create_sale_transaction', {
        p_customer_id: selectedCustomerId || null,
        p_discount: discount,
        p_vat_amount: vatAmount,
        p_payment_method: paymentMethod,
        p_paid_amount: paidAmount,
        p_items: itemsPayload,
        p_notes: notes || null,
      })

      if (error) {
        setErrorMsg(error.message || 'Erreur lors de la validation de la vente.')
        setSubmitting(false)
        return
      }

      // Rediriger vers le détail de la vente / facture
      const saleId = data?.sale_id
      if (saleId) {
        onNavigate('sale-detail', { saleId })
      } else {
        onNavigate('sales-history')
      }
    } catch (err) {
      console.error('Erreur vente:', err)
      setErrorMsg('Erreur inattendue lors de la transaction.')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 pb-28 max-w-6xl mx-auto w-full">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => (step === 'checkout' ? setStep('select_products') : onNavigate('dashboard'))}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400 p-2 -ml-2 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{step === 'checkout' ? 'Modifier le panier' : 'Tableau de bord'}</span>
        </button>

        <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-full">
          {step === 'select_products' ? 'Étape 1/2' : 'Étape 2/2'}
        </span>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2.5 p-3.5 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {step === 'select_products' ? (
        <>
          {/* Barre de recherche instantanée */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un produit ou scanner..."
              className="w-full pl-11 pr-4 py-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 shadow-sm"
            />
          </div>

          {/* Liste des produits réels */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Produits en rayon ({filteredProducts.length})
            </h2>

            {filteredProducts.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/80 dark:border-slate-800">
                <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Aucun produit trouvé
                </p>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  {isOwner
                    ? 'Ajoutez vos marchandises pour commencer à vendre.'
                    : 'Aucune marchandise disponible pour le moment.'}
                </p>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => onNavigate('product-detail')}
                    className="py-2 px-4 bg-emerald-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Créer un produit
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredProducts.map((product) => {
                  const cartItem = cart.find((i) => i.product.id === product.id)
                  const isOutOfStock = product.current_stock <= 0

                  return (
                    <div
                      key={product.id}
                      onClick={() => !isOutOfStock && addToCart(product)}
                      className={`flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 transition select-none ${
                        isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.99] cursor-pointer hover:border-emerald-500/50'
                      }`}
                    >
                      <div className="flex-1 pr-3">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                          {product.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(Number(product.selling_price), shop?.currency)}
                          </span>
                          {isOwner ? (
                            <span className="text-[11px] text-slate-400">
                              • Stock: {product.current_stock}
                            </span>
                          ) : (
                            <span
                              className={`text-[11px] font-medium ${
                                isOutOfStock ? 'text-rose-500 font-bold' : 'text-slate-400'
                              }`}
                            >
                              • {isOutOfStock ? 'Rupture de stock' : 'En rayon'}
                            </span>
                          )}
                        </div>
                      </div>

                      {cartItem ? (
                        <div
                          className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 p-1 rounded-xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, -1)}
                            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-sm cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 px-1">
                            {cartItem.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, 1)}
                            className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                          <Plus className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Barre flottante récapitulative Panier (Bouton pouce mobile / Barre d'encaissement desktop) */}
          {cart.length > 0 && (
            <div className="fixed bottom-16 md:bottom-6 left-0 md:left-64 lg:left-72 right-0 p-4 max-w-lg md:max-w-xl mx-auto z-30">
              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full py-4 px-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl shadow-xl flex items-center justify-between font-bold active:scale-[0.98] transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                  <span>Voir l'encaissement</span>
                </div>
                <span className="text-emerald-400 dark:text-emerald-600 text-lg">
                  {formatCurrency(total, shop?.currency)}
                </span>
              </button>
            </div>
          )}
        </>
      ) : (
        /* Étape 2 : Encaissement & Panier détaillé */
        <div className="space-y-4">
          {/* Articles du panier */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Panier en cours
            </h2>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {cart.map((item) => (
                <div key={item.product.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex-1 pr-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {item.quantity} × {formatCurrency(item.unit_price, shop?.currency)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold px-1 text-slate-800 dark:text-slate-200">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sélection Client (Obligatoire si crédit) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Client (Optionnel ou requis pour crédit)</span>
              </label>
              <button
                type="button"
                onClick={() => onNavigate('customer-detail')}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold"
              >
                + Nouveau client
              </button>
            </div>

            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full py-3 px-3.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            >
              <option value="">Client comptoir (anonyme)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''} {c.total_debt > 0 ? `[Dette: ${formatCurrency(c.total_debt, shop?.currency)}]` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Remise & Mode de Paiement */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Règlement
            </h2>

            {/* Remise */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Remise accordée
              </label>
              <div className="relative">
                <Percent className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  value={discount || ''}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Modes de paiement */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { id: 'cash', label: 'Espèces' },
                { id: 'mobile_money', label: 'Mobile Money' },
                { id: 'credit', label: 'Crédit / Dette' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`py-3 px-2 rounded-2xl text-xs font-bold border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                    paymentMethod === m.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/25'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            {/* Montant perçu (Paiement partiel possible) */}
            {paymentMethod !== 'credit' && (
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                  <span>Montant encaissé</span>
                  <button
                    type="button"
                    onClick={() => setPaidAmount(total)}
                    className="text-emerald-600 font-bold"
                  >
                    Tout payé
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  value={paidAmount || ''}
                  onChange={(e) => setPaidAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 font-bold"
                />
              </div>
            )}
          </div>

          {/* Synthèse finale */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-lg space-y-2.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Sous-total</span>
              <span>{formatCurrency(subtotal, shop?.currency)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-xs text-emerald-400">
                <span>Remise</span>
                <span>-{formatCurrency(discount, shop?.currency)}</span>
              </div>
            )}
            {vatAmount > 0 && (
              <div className="flex justify-between text-xs text-slate-400">
                <span>TVA ({shop?.vat_rate}%)</span>
                <span>+{formatCurrency(vatAmount, shop?.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black border-t border-slate-800 pt-2 text-white">
              <span>Total à payer</span>
              <span className="text-xl text-emerald-400">{formatCurrency(total, shop?.currency)}</span>
            </div>
            {remainingAmount > 0 && (
              <div className="flex justify-between text-xs text-rose-400 font-bold bg-rose-950/60 p-2 rounded-xl border border-rose-900/60">
                <span>Reste à payer (Dette client)</span>
                <span>{formatCurrency(remainingAmount, shop?.currency)}</span>
              </div>
            )}

            <button
              type="button"
              disabled={submitting}
              onClick={handleValidateSale}
              className="w-full mt-3 py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black text-base rounded-2xl shadow-lg flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>Valider l'encaissement</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
