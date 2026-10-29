import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { BottomNav } from './components/layout/BottomNav'
import { Sidebar } from './components/layout/Sidebar'
import { DesktopHeader } from './components/layout/DesktopHeader'
import { syncPendingSales } from './lib/offlineSync'

// Page d'accueil & Vitrine
import { Page00Landing } from './pages/Page00Landing'

// Les 23 Pages d'Easy vente
import { Page01Login } from './pages/Page01Login'
import { Page02Register } from './pages/Page02Register'
import { Page03ForgotPassword } from './pages/Page03ForgotPassword'
import { Page04Dashboard } from './pages/Page04Dashboard'
import { Page05NewSale } from './pages/Page05NewSale'
import { Page06SalesHistory } from './pages/Page06SalesHistory'
import { Page07SaleDetail } from './pages/Page07SaleDetail'
import { Page08ProductsList } from './pages/Page08ProductsList'
import { Page09ProductDetail } from './pages/Page09ProductDetail'
import { Page10StockStatus } from './pages/Page10StockStatus'
import { Page11StockEntry } from './pages/Page11StockEntry'
import { Page12CustomersList } from './pages/Page12CustomersList'
import { Page13CustomerDetail } from './pages/Page13CustomerDetail'
import { Page14InvoicesList } from './pages/Page14InvoicesList'
import { Page15InvoiceView } from './pages/Page15InvoiceView'
import { Page16ShopSettings } from './pages/Page16ShopSettings'
import { Page17SellersManagement } from './pages/Page17SellersManagement'
import { Page18Reports } from './pages/Page18Reports'
import { Page19Inventory } from './pages/Page19Inventory'
import { Page20Categories } from './pages/Page20Categories'
import { Page21AuditLogs } from './pages/Page21AuditLogs'
import { Page22UserProfile } from './pages/Page22UserProfile'
import { Page23OfflineSync } from './pages/Page23OfflineSync'

import { 
  Menu, 
  X, 
  Wifi, 
  WifiOff, 
  BarChart3, 
  FileText, 
  Users, 
  Package, 
  Tag, 
  ClipboardCheck, 
  ShieldAlert, 
  Settings, 
  UserCircle,
  ShoppingBag,
  History,
  ShieldCheck,
  Lock
} from 'lucide-react'

// Pages strictement interdites aux vendeurs
const FORBIDDEN_SELLER_PAGES = [
  'dashboard',
  'products-list',
  'product-detail',
  'stock-status',
  'stock-entry',
  'inventory',
  'categories',
  'reports',
  'sellers-management',
  'shop-settings',
  'audit-logs',
]

function AppContent() {
  const { user, profile, shop, loading } = useAuth()
  const isSeller = profile?.role === 'seller'
  const isOwner = profile?.role === 'owner'

  const [currentPage, setCurrentPage] = useState<string>('dashboard')
  const [pageParams, setPageParams] = useState<Record<string, string>>({})
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true))

  // Écoute de l'état réseau avec synchronisation automatique en arrière-plan à la reconnexion
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      syncPendingSales().catch((err) => console.error('Erreur auto-sync retour en ligne:', err))
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Redirection automatique des vendeurs vers l'espace Caisse
  useEffect(() => {
    if (isSeller && (currentPage === 'dashboard' || FORBIDDEN_SELLER_PAGES.includes(currentPage))) {
      setCurrentPage('new-sale')
    }
  }, [isSeller, currentPage])

  const navigate = (page: string, params: Record<string, string> = {}) => {
    // Garde de sécurité pour les vendeurs
    if (isSeller && FORBIDDEN_SELLER_PAGES.includes(page)) {
      alert("Accès réservé au propriétaire de la boutique. Le personnel de vente n'a pas accès à cette section.")
      setCurrentPage('new-sale')
      setDrawerOpen(false)
      return
    }

    setCurrentPage(page)
    setPageParams(params)
    setDrawerOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Écran de chargement initial de session
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          Chargement d'Easy vente...
        </p>
      </div>
    )
  }

  // Si non connecté : parcours d'accueil et d'authentification (Accueil vitrine, Connexion, Inscription)
  if (!user) {
    if (currentPage === 'register') {
      return <Page02Register onNavigate={navigate} />
    }
    if (currentPage === 'forgot-password') {
      return <Page03ForgotPassword onNavigate={navigate} />
    }
    if (currentPage === 'login') {
      return (
        <Page01Login
          onNavigate={navigate}
          initialTab={(pageParams.defaultTab as 'seller' | 'owner') || 'seller'}
        />
      )
    }
    return <Page00Landing onNavigate={navigate} />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-row">
      {/* 1. Sidebar latérale Desktop (Visible sur écran >= md) */}
      <Sidebar currentPage={currentPage} onNavigate={navigate} isOnline={isOnline} />

      {/* 2. Zone de contenu principale (Web Desktop + Mobile) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen justify-between">
        {/* En-tête Desktop (Visible sur écran >= md) */}
        <DesktopHeader currentPage={currentPage} onNavigate={navigate} isOnline={isOnline} />

        {/* Barre supérieure Mobile (Visible sur mobile uniquement < md) */}
        <header className="md:hidden sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 w-full flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="p-2 -ml-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Menu complet"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {shop?.name || 'Easy vente'}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    isOwner ? 'bg-purple-500' : 'bg-emerald-500'
                  }`}
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                  {profile?.full_name} • {isOwner ? 'Propriétaire' : 'Vendeur (Caisse)'}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('offline-sync')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isOnline ? 'En ligne' : 'Hors-ligne'}</span>
          </button>
        </header>

      {/* Menu Latéral Déroulant (Drawer sécurisé par rôle) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex">
          <div className="bg-white dark:bg-slate-900 w-80 max-w-[85vw] h-full p-5 flex flex-col justify-between shadow-2xl overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {isOwner ? (
                    <ShieldCheck className="w-5 h-5 text-purple-600" />
                  ) : (
                    <ShoppingBag className="w-5 h-5 text-emerald-600" />
                  )}
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {isOwner ? 'Espace Propriétaire' : 'Espace Caisse Vendeur'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation autorisée selon le rôle */}
              <div className="space-y-1 text-sm font-medium">
                {isOwner && (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                      Pilotage & Ventes
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('dashboard')}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
                    >
                      <BarChart3 className="w-4 h-4 text-slate-400" />
                      <span>Tableau de bord</span>
                    </button>
                  </>
                )}

                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                  Opérations de Vente
                </p>
                <button
                  type="button"
                  onClick={() => navigate('new-sale')}
                  className="w-full text-left px-3 py-2 rounded-xl text-emerald-600 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2.5"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>+ Nouvelle vente (Caisse)</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('sales-history')}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
                >
                  <History className="w-4 h-4 text-slate-400" />
                  <span>Historique des ventes</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('invoices-list')}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
                >
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>Liste des factures</span>
                </button>

                {/* Section catalogue & stock RÉSERVÉE AUX PROPRIÉTAIRES */}
                {isOwner ? (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 pt-3">
                      Catalogue & Stocks
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('products-list')}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
                    >
                      <Package className="w-4 h-4 text-slate-400" />
                      <span>Catalogue des produits</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('stock-status')}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
                    >
                      <span>Niveaux de stock & alertes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('stock-entry')}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
                    >
                      <span>Entrée de stock (Réappro)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('inventory')}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
                    >
                      <ClipboardCheck className="w-4 h-4 text-slate-400" />
                      <span>Inventaire physique</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('categories')}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
                    >
                      <Tag className="w-4 h-4 text-slate-400" />
                      <span>Catégories</span>
                    </button>
                  </>
                ) : (
                  <div className="my-2 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center gap-2 text-[11px] text-slate-400">
                    <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Stocks et achats réservés au propriétaire</span>
                  </div>
                )}

                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 pt-3">
                  Clients & Gestion
                </p>
                <button
                  type="button"
                  onClick={() => navigate('customers-list')}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
                >
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>Clients & Dettes</span>
                </button>

                {isOwner && (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate('reports')}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
                    >
                      <BarChart3 className="w-4 h-4 text-slate-400" />
                      <span>Rapports financiers</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('sellers-management')}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
                    >
                      <span>Gestion des vendeurs</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('audit-logs')}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
                    >
                      <ShieldAlert className="w-4 h-4 text-slate-400" />
                      <span>Journal d'audit</span>
                    </button>
                  </>
                )}

                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 pt-3">
                  Paramètres
                </p>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => navigate('shop-settings')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Paramètres boutique</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate('user-profile')}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
                >
                  <UserCircle className="w-4 h-4 text-slate-400" />
                  <span>Mon profil</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('offline-sync')}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
                >
                  <span>État Hors-Ligne & Sync</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenu de la Page active (Responsive Web Desktop & Mobile) */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {currentPage === 'dashboard' && <Page04Dashboard onNavigate={navigate} />}
        {currentPage === 'new-sale' && <Page05NewSale onNavigate={navigate} />}
        {currentPage === 'sales-history' && <Page06SalesHistory onNavigate={navigate} />}
        {currentPage === 'sale-detail' && (
          <Page07SaleDetail saleId={pageParams.saleId} onNavigate={navigate} />
        )}
        {currentPage === 'products-list' && <Page08ProductsList onNavigate={navigate} />}
        {currentPage === 'product-detail' && (
          <Page09ProductDetail productId={pageParams.productId} onNavigate={navigate} />
        )}
        {currentPage === 'stock-status' && <Page10StockStatus onNavigate={navigate} />}
        {currentPage === 'stock-entry' && (
          <Page11StockEntry productId={pageParams.productId} onNavigate={navigate} />
        )}
        {currentPage === 'customers-list' && <Page12CustomersList onNavigate={navigate} />}
        {currentPage === 'customer-detail' && (
          <Page13CustomerDetail customerId={pageParams.customerId} onNavigate={navigate} />
        )}
        {currentPage === 'invoices-list' && <Page14InvoicesList onNavigate={navigate} />}
        {currentPage === 'invoice-view' && (
          <Page15InvoiceView invoiceId={pageParams.invoiceId} onNavigate={navigate} />
        )}
        {currentPage === 'shop-settings' && <Page16ShopSettings onNavigate={navigate} />}
        {currentPage === 'sellers-management' && (
          <Page17SellersManagement onNavigate={navigate} />
        )}
        {currentPage === 'reports' && <Page18Reports onNavigate={navigate} />}
        {currentPage === 'inventory' && <Page19Inventory onNavigate={navigate} />}
        {currentPage === 'categories' && <Page20Categories onNavigate={navigate} />}
        {currentPage === 'audit-logs' && <Page21AuditLogs onNavigate={navigate} />}
        {currentPage === 'user-profile' && <Page22UserProfile onNavigate={navigate} />}
        {currentPage === 'offline-sync' && <Page23OfflineSync onNavigate={navigate} />}
      </main>

      {/* Bottom Bar de navigation au pouce (Visible sur mobile uniquement md:hidden) */}
      <BottomNav currentPage={currentPage} onNavigate={navigate} />
    </div>
  </div>
)
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
