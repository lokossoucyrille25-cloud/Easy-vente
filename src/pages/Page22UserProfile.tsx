import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Lock, 
  LogOut, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Shield 
} from 'lucide-react'

interface Page22UserProfileProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export const Page22UserProfile: React.FC<Page22UserProfileProps> = ({ onNavigate }) => {
  const { user, profile, shop, signOut, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState(profile?.phone || '')

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!fullName.trim()) {
      setErrorMsg('Le nom complet est obligatoire.')
      return
    }

    if (newPassword && newPassword.length < 6) {
      setErrorMsg('Le nouveau mot de passe doit comporter au moins 6 caractères.')
      return
    }

    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg('Les mots de passe ne correspondent pas.')
      return
    }

    setSaving(true)

    try {
      // 1. Mettre à jour le nom et téléphone dans profiles
      const { error: profErr } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user!.id)

      if (profErr) throw profErr

      // 2. Mettre à jour le mot de passe si renseigné
      if (newPassword) {
        const { error: passErr } = await supabase.auth.updateUser({
          password: newPassword,
        })
        if (passErr) throw passErr
        setNewPassword('')
        setConfirmPassword('')
      }

      await refreshProfile()
      setSuccessMsg('Profil et mot de passe mis à jour avec succès.')
    } catch (err: any) {
      console.error('Erreur profil:', err)
      setErrorMsg(err.message || 'Erreur lors de la mise à jour.')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
      await signOut()
      onNavigate('login')
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

        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center gap-1.5 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Déconnexion</span>
        </button>
      </div>

      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Mon profil utilisateur
        </h1>
        <p className="text-xs text-slate-500">
          Informations personnelles et sécurité de connexion
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

      {/* Rôle & Boutique */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-2 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Boutique active
            </p>
            <p className="text-base font-black text-slate-900 dark:text-slate-100">
              {shop?.name}
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-full flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" />
            <span className="capitalize">{profile?.role === 'owner' ? 'Propriétaire' : 'Vendeur'}</span>
          </span>
        </div>
        <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
          <Mail className="w-3.5 h-3.5" />
          <span>{user?.email}</span>
        </p>
      </div>

      {/* Formulaire de modification */}
      <form onSubmit={handleUpdateProfile} className="space-y-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3.5 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Informations
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Nom complet *
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Numéro de téléphone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: 97 00 00 00"
              className="w-full px-3.5 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Changer le mot de passe */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3.5 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Changer le mot de passe (Optionnel)
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Nouveau mot de passe (6 car. min)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Laisser vide si inchangé"
                className="w-full pl-10 pr-3.5 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {newPassword && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Confirmer le nouveau mot de passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmez le nouveau mot de passe"
                  className="w-full pl-10 pr-3.5 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          )}
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
              <span>Sauvegarder mon profil</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}
