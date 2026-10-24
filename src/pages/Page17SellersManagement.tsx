import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { createSellerAccount } from '../lib/sellers'
import type { Profile } from '../types/database'
import { 
  ArrowLeft, 
  UserCheck, 
  UserX, 
  Shield, 
  UserPlus, 
  AlertCircle, 
  CheckCircle2, 
  Mail, 
  Lock, 
  User, 
  X,
  MessageCircle
} from 'lucide-react'

interface Page17SellersManagementProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export const Page17SellersManagement: React.FC<Page17SellersManagementProps> = ({ onNavigate }) => {
  const { shop, profile } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Modal d'ajout de vendeur
  const [modalOpen, setModalOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string
    email: string
    password: string
  } | null>(null)

  const isOwner = profile?.role === 'owner'
  const targetShopId = shop?.id || profile?.shop_id

  const loadSellers = async () => {
    if (!targetShopId) return
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('shop_id', targetShopId)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setProfiles(data as Profile[])
      }
    } catch (err) {
      console.error('Erreur chargement vendeurs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSellers()
  }, [targetShopId])

  // Création du compte vendeur
  const handleAddSeller = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!targetShopId) {
      setErrorMsg('Boutique non identifiée.')
      return
    }

    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMsg('Veuillez renseigner tous les champs obligatoires.')
      return
    }

    if (password.length < 6) {
      setErrorMsg('Le mot de passe du vendeur doit contenir au moins 6 caractères.')
      return
    }

    setSaving(true)

    const result = await createSellerAccount({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      shopId: targetShopId,
    })

    setSaving(false)

    if (!result.success) {
      setErrorMsg(result.error || 'Erreur lors de la création du compte vendeur.')
      return
    }

    setCreatedCredentials({
      name: fullName.trim(),
      email: email.trim(),
      password,
    })

    setFullName('')
    setEmail('')
    setPassword('')
    setSuccessMsg(`Compte vendeur créé avec succès pour ${fullName.trim()} !`)
    await loadSellers()
  }

  // Activer ou suspendre un vendeur
  const toggleSellerStatus = async (targetProfile: Profile) => {
    if (targetProfile.role === 'owner') return

    const newStatus = !targetProfile.is_active
    const actionLabel = newStatus ? 'activer' : 'suspendre'

    if (!confirm(`Voulez-vous vraiment ${actionLabel} le compte de ${targetProfile.full_name} ?`)) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', targetProfile.id)
        .eq('shop_id', targetShopId!)

      if (error) throw error

      setProfiles((prev) =>
        prev.map((p) => (p.id === targetProfile.id ? { ...p, is_active: newStatus } : p))
      )
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour.')
    }
  }

  // Partager les identifiants au vendeur par WhatsApp
  const handleShareWhatsApp = (name: string, em: string, pass: string) => {
    const shopTitle = shop?.name || 'Easy vente'
    const text = `Bonjour ${name},\nVoici tes identifiants pour te connecter à la caisse de la boutique *${shopTitle}* :\n\n📱 *Lien :* ${window.location.origin}\n🏪 *Boutique :* *${shopTitle}*\n📧 *Identifiant :* ${em}\n🔑 *Mot de passe :* ${pass}\n\n👉 Sur la page de connexion, choisis l'onglet "Vendeur", écris le nom de la boutique *${shopTitle}* et saisis tes accès !`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
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

        {isOwner && (
          <button
            type="button"
            onClick={() => {
              setCreatedCredentials(null)
              setErrorMsg(null)
              setModalOpen(true)
            }}
            className="inline-flex items-center gap-1.5 py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/25 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Ajouter un vendeur</span>
          </button>
        )}
      </div>

      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Gestion de l'équipe
        </h1>
        <p className="text-xs text-slate-500">
          Gérez l'accès des vendeurs et caissiers à votre boutique
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

      {/* Récapitulatif après création pour transmission */}
      {createdCredentials && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-3xl space-y-2.5">
          <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
            Identifiants à transmettre au vendeur :
          </p>
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl text-xs space-y-1.5 font-mono border border-emerald-100 dark:border-emerald-900/60">
            <p><strong>Nom :</strong> {createdCredentials.name}</p>
            <p className="text-emerald-600 dark:text-emerald-400 font-bold">
              <strong>Nom boutique :</strong> {shop?.name}
            </p>
            <p><strong>E-mail :</strong> {createdCredentials.email}</p>
            <p><strong>Mot de passe :</strong> {createdCredentials.password}</p>
          </div>
          <button
            type="button"
            onClick={() => handleShareWhatsApp(createdCredentials.name, createdCredentials.email, createdCredentials.password)}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Transmettre les accès sur WhatsApp</span>
          </button>
        </div>
      )}

      {/* Liste des vendeurs et du propriétaire */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Membres de la boutique ({profiles.length})
        </h2>

        {loading ? (
          <div className="text-center py-10">
            <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-2">
            {profiles.map((p) => (
              <div
                key={p.id}
                className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {p.full_name}
                    </p>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.role === 'owner'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                      }`}
                    >
                      {p.role === 'owner' ? 'Propriétaire' : 'Vendeur'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-1">
                    Accès :{' '}
                    <strong className={p.is_active ? 'text-emerald-600' : 'text-rose-500'}>
                      {p.is_active ? 'Actif' : 'Suspendu'}
                    </strong>
                  </p>
                </div>

                {isOwner && p.role !== 'owner' && (
                  <button
                    type="button"
                    onClick={() => toggleSellerStatus(p)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      p.is_active
                        ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                    }`}
                  >
                    {p.is_active ? (
                      <>
                        <UserX className="w-3.5 h-3.5" />
                        <span>Suspendre</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Réactiver</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notice explicative sur la sécurité */}
      <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl text-xs text-slate-500 space-y-1 border border-slate-200/60 dark:border-slate-800">
        <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>Isolation stricte et sécurité des données</span>
        </p>
        <p>
          Un compte <strong>Vendeur</strong> est strictement dédié à l'encaissement rapide et aux clients. Il ne peut en aucun cas voir le niveau des stocks, les pertes ou inventaires, les prix d'achat, les marges et bénéfices, ni les paramètres de gestion de votre boutique.
        </p>
      </div>

      {/* Modal d'ajout de vendeur */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <span>Nouveau vendeur</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Créez les accès de caisse pour votre employé. Il pourra utiliser l'application depuis son propre téléphone.
            </p>

            <form onSubmit={handleAddSeller} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Nom complet du vendeur *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Aminata Diallo"
                    required
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  E-mail ou identifiant *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="aminata@boutique.com"
                    required
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Mot de passe de caisse (6 car. min) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {saving ? (
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <span>Créer l'accès</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
