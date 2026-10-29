import { describe, it, expect } from 'vitest'

interface CartItem {
  product: {
    id: string
    name: string
    selling_price: number
    purchase_price: number
    current_stock: number
  }
  quantity: number
  unit_price: number
}

// Fonctions pures représentatives de la logique de calcul de Page05NewSale
function calculateSubtotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
}

function calculateVatAmount(subtotal: number, discount: number, vatEnabled: boolean, vatRate: number): number {
  if (!vatEnabled) return 0
  const taxableBase = Math.max(0, subtotal - discount)
  return Math.round(taxableBase * (vatRate / 100))
}

function calculateTotal(subtotal: number, discount: number, vatAmount: number): number {
  return Math.max(0, subtotal - discount + vatAmount)
}

function validateSaleParameters(params: {
  cart: CartItem[]
  total: number
  paidAmount: number
  customerId: string | null
  paymentMethod: 'cash' | 'mobile_money' | 'credit' | 'split'
}): { valid: boolean; error?: string } {
  if (params.cart.length === 0) {
    return { valid: false, error: 'Panier vide' }
  }

  const remaining = Math.max(0, params.total - params.paidAmount)
  if (remaining > 0 && !params.customerId) {
    return { valid: false, error: 'Client obligatoire en cas de crédit ou solde impayé' }
  }

  if (params.paymentMethod === 'credit' && params.paidAmount > 0) {
    return { valid: false, error: 'Le mode crédit intégral suppose un acompte nul ou partiel via split' }
  }

  return { valid: true }
}

describe('Parcours Critique Caisse & Panier (POS)', () => {
  const dummyProductA = {
    id: 'prod-1',
    name: 'Sac de Riz 25kg',
    selling_price: 18500,
    purchase_price: 15000,
    current_stock: 10,
  }

  const dummyProductB = {
    id: 'prod-2',
    name: 'Bidon Huile 5L',
    selling_price: 7000,
    purchase_price: 5500,
    current_stock: 4,
  }

  it('calcule correctement le sous-total du panier avec plusieurs articles', () => {
    const cart: CartItem[] = [
      { product: dummyProductA, quantity: 2, unit_price: dummyProductA.selling_price }, // 2 * 18500 = 37000
      { product: dummyProductB, quantity: 3, unit_price: dummyProductB.selling_price }, // 3 * 7000 = 21000
    ]

    const subtotal = calculateSubtotal(cart)
    expect(subtotal).toBe(58000)
  })

  it('gère correctement la remise commerciale', () => {
    const subtotal = 58000
    const discount = 3000
    const total = calculateTotal(subtotal, discount, 0)
    expect(total).toBe(55000)
  })

  it('applique la TVA à 18% uniquement si la boutique est assujettie', () => {
    const subtotal = 50000
    const discount = 0

    // Cas 1 : Boutique non assujettie (TVA désactivée)
    const vatDisabled = calculateVatAmount(subtotal, discount, false, 18)
    expect(vatDisabled).toBe(0)

    // Cas 2 : Boutique assujettie (TVA 18% UEMOA)
    const vatEnabled = calculateVatAmount(subtotal, discount, true, 18)
    expect(vatEnabled).toBe(9000) // 50000 * 0.18 = 9000

    const totalWithVat = calculateTotal(subtotal, discount, vatEnabled)
    expect(totalWithVat).toBe(59000)
  })

  it('rejette une vente à crédit si aucun client n’est sélectionné', () => {
    const cart: CartItem[] = [
      { product: dummyProductA, quantity: 1, unit_price: 18500 },
    ]
    const total = 18500
    const paidAmount = 0 // Crédit intégral

    const result = validateSaleParameters({
      cart,
      total,
      paidAmount,
      customerId: null, // Pas de client sélectionné
      paymentMethod: 'credit',
    })

    expect(result.valid).toBe(false)
    expect(result.error).toContain('Client obligatoire')
  })

  it('autorise une vente à crédit lorsque le client est renseigné', () => {
    const cart: CartItem[] = [
      { product: dummyProductA, quantity: 1, unit_price: 18500 },
    ]
    const total = 18500
    const paidAmount = 0

    const result = validateSaleParameters({
      cart,
      total,
      paidAmount,
      customerId: 'cust-uuid-1234',
      paymentMethod: 'credit',
    })

    expect(result.valid).toBe(true)
  })

  it('autorise un paiement partiel (acompte) avec client enregistré', () => {
    const cart: CartItem[] = [
      { product: dummyProductA, quantity: 2, unit_price: 18500 },
    ]
    const total = 37000
    const paidAmount = 20000 // Acompte de 20.000 XOF, reste 17.000 XOF

    const result = validateSaleParameters({
      cart,
      total,
      paidAmount,
      customerId: 'cust-uuid-1234',
      paymentMethod: 'cash',
    })

    expect(result.valid).toBe(true)
    const remaining = total - paidAmount
    expect(remaining).toBe(17000)
  })
})
