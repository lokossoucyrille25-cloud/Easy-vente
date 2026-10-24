import React from 'react'
import { 
  Store, 
  ShoppingBag, 
  ShieldCheck, 
  Zap, 
  WifiOff, 
  MessageCircle, 
  TrendingUp, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  Smartphone,
  ChevronRight,
  ShieldAlert
} from 'lucide-react'

interface Page00LandingProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export const Page00Landing: React.FC<Page00LandingProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* 1. Barre de navigation supérieure */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 md:px-8 py-3.5 max-w-6xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Easy vente</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                Web & Mobile
              </span>
            </span>
            <p className="text-[10px] text-slate-400 leading-none">Caisse, Stocks & Commerce XOF</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('login', { defaultTab: 'seller' })}
            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Caisse Vendeur
          </button>
          <button
            type="button"
            onClick={() => onNavigate('login', { defaultTab: 'owner' })}
            className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
          >
            Se connecter
          </button>
        </div>
      </header>

      {/* 2. Contenu principal (Optimisé mobile & desktop) */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-8 py-8 space-y-8">
        {/* Badge Hero */}
        <div className="text-center space-y-3 pt-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs font-semibold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Logiciel de Caisse n°1 en Franc CFA (XOF)</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
            Gérez votre boutique et encaissez vos ventes sur <span className="text-emerald-600 dark:text-emerald-400">Web & Mobile</span>.
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            La solution complète pour les commerces de détail. Fonctionne{' '}
            <strong className="text-emerald-600 dark:text-emerald-400">100% hors-ligne</strong> sur PC, Mac, tablette et smartphone, protège vos marges face aux employés et simplifie la caisse au quotidien.
          </p>
        </div>

        {/* 3. Les Deux Portails d'Accès Principaux (Vendeur vs Propriétaire) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          {/* Carte 1 : Espace Vendeur */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-xl shadow-emerald-600/20 border border-emerald-500/30 transition hover:shadow-emerald-600/30 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full">
                  Espace Employé (Caisse)
                </span>
              </div>

              <h2 className="text-xl font-black tracking-tight mb-2">
                Vous êtes Vendeur / Caissier ?
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100 mb-6 leading-relaxed">
                Accédez directement à la caisse pour enregistrer les ventes au comptoir, imprimer les tickets ou les envoyer par WhatsApp aux clients.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('login', { defaultTab: 'seller' })}
              className="w-full py-3.5 px-4 bg-white text-emerald-800 hover:bg-emerald-50 active:scale-[0.98] font-bold text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>Ouvrir la Caisse Vendeur</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Carte 2 : Espace Propriétaire */}
          <div className="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 transition hover:border-purple-500/40 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-full">
                  Espace Propriétaire
                </span>
              </div>

              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100 mb-2">
                Vous êtes le Propriétaire ?
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Consultez vos bénéfices réels, gérez vos réapprovisionnements de stock, contrôlez votre personnel et suivez les créances clients.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => onNavigate('login', { defaultTab: 'owner' })}
                className="w-full py-3.5 px-4 bg-purple-600 hover:bg-purple-700 text-white active:scale-[0.98] font-bold text-sm rounded-2xl shadow-md shadow-purple-600/25 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <span>Connexion Propriétaire</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-2xl transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Créer une nouvelle boutique (Gratuit)</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4. Les Atouts Majeurs d'Easy vente */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Pourquoi choisir Easy vente ?
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* Feature 1 */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Caisse Ultra-Rapide au pouce
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Encaissez une vente en 3 clics chrono. Conçu spécialement pour smartphone et écran tactile.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
                <WifiOff className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  100% Fonctionnel Hors-Ligne
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Une coupure réseau ? Vous continuez à vendre. Vos données sont synchronisées dès que la connexion revient.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Secret absolu sur vos marges
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Vos employés n'ont aucun accès aux stocks, aux prix d'achat ni à vos bénéfices réels.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Reçus & Factures WhatsApp
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Envoyez instantanément le ticket numérique au client par WhatsApp ou imprimez sur imprimante ticket.
                </p>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Rapports & Bénéfices Nets
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Chiffre d'affaires jour, marge brute, bénéfice net et valorisation de votre stock en Francs CFA.
                </p>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Suivi des Dettes & Règlements
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Fini les carnets papier égarés. Suivez chaque crédit client et encaissez les règlements partiels.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Types de commerces pris en charge */}
        <div className="p-6 bg-slate-100/80 dark:bg-slate-900/80 rounded-3xl border border-slate-200/60 dark:border-slate-800 text-center space-y-3">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Idéal pour toutes les activités de commerce de détail :
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
              🛒 Alimentation générale
            </span>
            <span className="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
              👗 Prêt-à-porter & Chaussures
            </span>
            <span className="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
              💄 Cosmétique & Parfumerie
            </span>
            <span className="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
              🔧 Quincaillerie & Bricolage
            </span>
            <span className="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
              📱 Téléphonie & Accessoires
            </span>
            <span className="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
              🍾 Dépôt de boissons
            </span>
          </div>
        </div>

        {/* 6. Section Call To Action Finale */}
        <div className="p-8 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl text-white text-center space-y-3 shadow-lg shadow-emerald-600/20">
          <Smartphone className="w-9 h-9 mx-auto text-emerald-200" />
          <h3 className="text-xl sm:text-2xl font-black tracking-tight">
            Disponible sur Ordinateur, Tablette et Smartphone
          </h3>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-md mx-auto">
            Easy vente s'adapte à tous vos écrans. Installez l'application en 1 clic sur votre PC ou sur l'écran d'accueil de votre téléphone.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('register')}
            className="py-3.5 px-6 bg-white text-emerald-800 hover:bg-emerald-50 active:scale-95 font-bold text-xs sm:text-sm rounded-xl shadow cursor-pointer transition inline-flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Créer mon compte boutique maintenant</span>
          </button>
        </div>
      </main>

      {/* 7. Pied de page discret */}
      <footer className="text-center py-6 border-t border-slate-200/80 dark:border-slate-800 max-w-6xl mx-auto w-full px-4 text-xs text-slate-400">
        <p>© 2026 Easy vente • Le commerce moderne sur Web & Mobile en Afrique de l'Ouest</p>
      </footer>
    </div>
  )
}
