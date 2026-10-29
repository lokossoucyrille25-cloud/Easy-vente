import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  ArrowLeft, 
  Save, 
  Store, 
  Phone, 
  MapPin, 
  Percent, 
  AlertCircle, 
  CheckCircle2, 
  DollarSign,
  Upload,
  X,
  Image as ImageIcon
} from 'lucide-react'

interface Page16ShopSettingsProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export const Page16ShopSettings: React.FC<Page16ShopSettingsProps> = ({ onNavigate }) => {
  const { shop, profile, refreshProfile } = useAuth()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [currency, setCurrency] = useState('XOF')
  const [vatEnabled, setVatEnabled] = useState(false)
  const [vatRate, setVatRate] = useState<number>(18)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const isOwner = profile?.role === 'owner'

  useEffect(() => {
    if (shop) {
      setName(shop.name)
      setAddress(shop.address || '')
      setPhone(shop.phone || '')
      setCurrency(shop.currency || 'XOF')
      setVatEnabled(shop.vat_enabled || false)
      setVatRate(Number(shop.vat_rate) || 18)
      setLogoUrl(shop.logo_url || null)
    }
  }, [shop])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Veuillez sélectionner un fichier image valide (PNG, JPG, WebP, SVG).')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("L'image sélectionnée dépasse la taille maximale de 2 Mo.")
      return
    }

    setErrorMsg(null)
    const reader = new FileReader()
    reader.onload = () => {
      setLogoUrl(reader.result as string)
    }
    reader.onerror = () => {
      setErrorMsg('Erreur lors de la lecture du fichier image.')
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!shop?.id) return

    if (!isOwner) {
      setErrorMsg('Seul le propriétaire est autorisé à modifier les paramètres de la boutique.')
      return
    }

    if (!name.trim()) {
      setErrorMsg('Le nom de la boutique est obligatoire.')
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase
        .from('shops')
        .update({
          name: name.trim(),
          address: address.trim() || null,
          phone: phone.trim() || null,
          currency: currency.trim() || 'XOF',
          vat_enabled: vatEnabled,
          vat_rate: vatRate,
          logo_url: logoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shop.id)

      if (error) throw error

      await refreshProfile()
      setSuccessMsg('Paramètres de la boutique mis à jour avec succès.')
    } catch (err: any) {
      console.error('Erreur paramètres:', err)
      setErrorMsg(err.message || 'Erreur lors de l’enregistrement des paramètres.')
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
          onClick={() => onNavigate('dashboard')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400 p-2 -ml-2 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tableau de bord</span>
        </button>
      </div>

      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Paramètres de la boutique
        </h1>
        <p className="text-xs text-slate-500">
          Identité, devise et configuration de facturation
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
        {/* Identité */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3.5 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Coordonnées & Logo
          </h2>

          {/* Logo de la boutique */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Logo de la boutique
            </label>
            <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-2xl">
              {logoUrl ? (
                <div className="relative w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white shrink-0 shadow-xs">
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                  <button
                    type="button"
                    onClick={() => setLogoUrl(null)}
                    aria-label="Supprimer le logo"
                    className="absolute -top-1 -right-1 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md transition cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 bg-white/50 dark:bg-slate-800/50 shrink-0">
                  <ImageIcon className="w-6 h-6 stroke-[1.5]" />
                  <span className="text-[9px] mt-0.5">Aucun</span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 transition cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{logoUrl ? 'Changer de logo' : 'Ajouter un logo'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-slate-400 mt-1">
                  PNG, JPG ou SVG (max 2 Mo). Utilisé sur les reçus et factures.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Nom de la boutique *
            </label>
            <div className="relative">
              <Store className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 font-bold"
              />
            </div>
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
                placeholder="Ex: +229 97 00 00 00"
                className="w-full pl-10 pr-3.5 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Adresse physique / Ville
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Cotonou, Haie Vive"
                className="w-full pl-10 pr-3.5 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Monnaie & TVA */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3.5 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Devise & Fiscalité
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Devise monétaire
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full pl-10 pr-3.5 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 font-bold"
              >
                <option value="XOF">Franc CFA (XOF / UEMOA)</option>
                <option value="XAF">Franc CFA (XAF / CEMAC)</option>
                <option value="EUR">Euro (€)</option>
                <option value="USD">Dollar ($)</option>
                <option value="GNF">Franc Guinéen (GNF)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Activer la TVA
                </p>
                <p className="text-xs text-slate-400">
                  Ajoute automatiquement la taxe sur chaque vente
                </p>
              </div>
              <input
                type="checkbox"
                checked={vatEnabled}
                onChange={(e) => setVatEnabled(e.target.checked)}
                className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {vatEnabled && (
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Taux de TVA (%)
                </label>
                <div className="relative">
                  <Percent className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={vatRate}
                    onChange={(e) => setVatRate(Number(e.target.value))}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 font-bold"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bouton d'action */}
        {isOwner && (
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
                <span>Enregistrer les paramètres</span>
              </>
            )}
          </button>
        )}
      </form>
    </div>
  )
}
