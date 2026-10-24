import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { 
  LogIn, 
  Mail, 
  Lock, 
  AlertCircle, 
  ArrowRight, 
  Store, 
  ShieldCheck, 
  ShoppingBag, 
  ArrowLeft 
} from 'lucide-react'

interface Page01LoginProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
  initialTab?: 'seller' | 'owner'
}

export const Page01Login: React.FC<Page01LoginProps> = ({ onNavigate, initialTab = 'seller' }) => {
  const { signIn } = useAuth()
  const [roleTab, setRoleTab] = useState<'seller' | 'owner'>(initialTab)
  const [shopName, setShopName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (roleTab === 'seller' && !shopName.trim()) {
      setErrorMsg('Veuillez renseigner le nom de la boutique du propriétaire.')
      return
    }

    if (!email.trim() || !password) {
      setErrorMsg('Veuillez renseigner votre e-mail et votre mot de passe.')
      return
    }

    setLoading(true)
    const { error } = await signIn(email.trim(), password, {
      role: roleTab,
      shopName: roleTab === 'seller' ? shopName.trim() : undefined,
    })
    setLoading(false)

    if (error) {
      setErrorMsg(error.message || 'Identifiants incorrects ou problème de connexion.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 max-w-md mx-auto w-full">
      {/* Bouton retour accueil */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => onNavigate('landing')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 p-2 -ml-2 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à l'accueil</span>
        </button>
      </div>

      {/* En-tête */}
      <div className="pt-2 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 mb-3">
          <Store className="w-9 h-9" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Easy vente
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gestion de boutique & encaissement rapide
        </p>
      </div>

      {/* Carte de Connexion avec Sélecteur de Rôle */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 my-4">
        {/* Onglets Vendeur vs Propriétaire */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => {
              setRoleTab('seller')
              setErrorMsg(null)
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              roleTab === 'seller'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Vendeur</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRoleTab('owner')
              setErrorMsg(null)
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              roleTab === 'owner'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Propriétaire</span>
          </button>
        </div>

        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {roleTab === 'seller' ? 'Espace Vendeur / Caisse' : 'Connexion Propriétaire'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {roleTab === 'seller'
              ? 'Renseignez le nom de votre boutique pour commencer vos ventes.'
              : 'Accédez à la gestion intégrale de vos boutiques, stocks et bénéfices.'}
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3.5 mb-4 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Champ spécifique vendeur : Nom de la boutique */}
          {roleTab === 'seller' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Nom de la boutique du propriétaire *
              </label>
              <div className="relative">
                <Store className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Ex: Cyrille"
                  required
                  className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 font-medium transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              {roleTab === 'seller' ? 'E-mail ou identifiant vendeur *' : 'Adresse e-mail propriétaire *'}
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={roleTab === 'seller' ? 'vendeur@boutique.com' : 'proprietaire@boutique.com'}
                required
                className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Mot de passe *
              </label>
              {roleTab === 'owner' && (
                <button
                  type="button"
                  onClick={() => onNavigate('forgot-password')}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
                >
                  Oublié ?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-2 py-3.5 px-6 font-semibold text-sm sm:text-base rounded-2xl shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer ${
              roleTab === 'seller'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25 active:scale-[0.98]'
                : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/25 active:scale-[0.98]'
            }`}
          >
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>
                  {roleTab === 'seller' ? 'Accéder à la caisse' : 'Se connecter'}
                </span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Pied de page / Inscription pour les nouveaux propriétaires */}
      <div className="text-center pb-4">
        {roleTab === 'owner' ? (
          <div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Vous êtes nouveau propriétaire ?
            </p>
            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              <span>Créer une nouvelle boutique</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Vos identifiants et le nom de boutique vous sont fournis par votre propriétaire.
          </p>
        )}
      </div>
    </div>
  )
}
