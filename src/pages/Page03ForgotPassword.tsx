import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Mail, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react'

interface Page03ForgotPasswordProps {
  onNavigate: (page: string) => void
}

export const Page03ForgotPassword: React.FC<Page03ForgotPasswordProps> = ({ onNavigate }) => {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!email.trim()) {
      setErrorMsg('Veuillez renseigner votre adresse e-mail.')
      return
    }

    setLoading(true)
    const { error } = await resetPassword(email.trim())
    setLoading(false)

    if (error) {
      setErrorMsg(error.message || 'Impossible d’envoyer le lien de réinitialisation.')
    } else {
      setSuccessMsg(
        'Un lien de réinitialisation vous a été envoyé par e-mail. Vérifiez votre boîte de réception.'
      )
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 max-w-md mx-auto w-full">
      <div className="pt-4">
        <button
          type="button"
          onClick={() => onNavigate('login')}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 p-2 -ml-2 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à la connexion</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 my-auto">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">
          Mot de passe oublié
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6">
          Saisissez votre e-mail de connexion pour recevoir les instructions de réinitialisation.
        </p>

        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3.5 mb-4 text-xs sm:text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg ? (
          <div className="text-center py-4 space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {successMsg}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="w-full py-3 px-6 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-sm rounded-2xl shadow transition"
            >
              Retour à la page de connexion
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Adresse e-mail du compte
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vendeur@boutique.com"
                  required
                  className="w-full pl-11 pr-4 py-3.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-base rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <span>Envoyer le lien</span>
              )}
            </button>
          </form>
        )}
      </div>

      <div className="pb-6" />
    </div>
  )
}
