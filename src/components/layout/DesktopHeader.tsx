import React from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePWAInstall } from '../../hooks/usePWAInstall'
import { 
  Wifi, 
  WifiOff, 
  ShoppingBag, 
  Download, 
  UserCircle 
} from 'lucide-react'

interface DesktopHeaderProps {
  currentPage: string
  onNavigate: (page: string) => void
  isOnline: boolean
}

// Libellés conviviaux par page
const PAGE_TITLES: Record<string, { title: string; category: string }> = {
  'dashboard': { title: 'Tableau de bord', category: 'Pilotage' },
  'new-sale': { title: 'Caisse & Nouvelle vente', category: 'Vente' },
  'sales-history': { title: 'Historique des ventes', category: 'Vente' },
  'sale-detail': { title: 'Détail de la vente', category: 'Vente' },
  'products-list': { title: 'Catalogue des produits', category: 'Catalogue & Stocks' },
  'product-detail': { title: 'Fiche produit', category: 'Catalogue & Stocks' },
  'stock-status': { title: 'Niveaux de stock & Alertes', category: 'Catalogue & Stocks' },
  'stock-entry': { title: 'Entrée de stock (Réappro)', category: 'Catalogue & Stocks' },
  'inventory': { title: 'Inventaire physique', category: 'Catalogue & Stocks' },
  'categories': { title: 'Gestion des catégories', category: 'Catalogue & Stocks' },
  'customers-list': { title: 'Clients & Dettes', category: 'Clients' },
  'customer-detail': { title: 'Fiche client', category: 'Clients' },
  'invoices-list': { title: 'Factures & Reçus', category: 'Facturation' },
  'invoice-view': { title: 'Visualisation de facture', category: 'Facturation' },
  'reports': { title: 'Rapports financiers & Marges', category: 'Pilotage' },
  'sellers-management': { title: 'Gestion du personnel de caisse', category: 'Administration' },
  'audit-logs': { title: "Journal d'audit & Sécurité", category: 'Administration' },
  'shop-settings': { title: 'Paramètres de la boutique', category: 'Paramètres' },
  'user-profile': { title: 'Mon profil utilisateur', category: 'Compte' },
  'offline-sync': { title: 'Synchronisation & Mode Hors-Ligne', category: 'Système' },
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  currentPage,
  onNavigate,
  isOnline
}) => {
  const { profile, shop } = useAuth()
  const { canInstall, isInstalled, promptInstall } = usePWAInstall()
  const isOwner = profile?.role === 'owner'
  const pageInfo = PAGE_TITLES[currentPage] || { title: 'Easy vente', category: 'Boutique' }

  return (
    <header className="hidden md:flex items-center justify-between px-6 py-3.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-30 no-print">
      {/* 1. Fil d'Ariane & Titre de page */}
      <div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <span>{shop?.name || 'Easy vente'}</span>
          <span>/</span>
          <span>{pageInfo.category}</span>
        </div>
        <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
          {pageInfo.title}
        </h1>
      </div>

      {/* 2. Actions & Statuts */}
      <div className="flex items-center gap-3">
        {/* Raccourci Caisse si pas sur la page caisse */}
        {currentPage !== 'new-sale' && (
          <button
            type="button"
            onClick={() => onNavigate('new-sale')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 active:scale-95 transition cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Caisse</span>
          </button>
        )}

        {/* Bouton PWA Install si disponible */}
        {canInstall && !isInstalled && (
          <button
            type="button"
            onClick={promptInstall}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
            title="Installer l'application sur cet appareil"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Installer l'app</span>
          </button>
        )}

        {/* Badge État Hors-Ligne */}
        <button
          type="button"
          onClick={() => onNavigate('offline-sync')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition ${
            isOnline
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 hover:bg-emerald-100'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 hover:bg-amber-200'
          }`}
          title="Cliquez pour voir l'état de la synchronisation"
        >
          {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span>{isOnline ? 'En ligne' : 'Hors-ligne'}</span>
        </button>

        {/* Profil utilisateur rapide */}
        <button
          type="button"
          onClick={() => onNavigate('user-profile')}
          className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs uppercase">
            <UserCircle className="w-4 h-4 text-slate-500" />
          </div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {profile?.full_name?.split(' ')[0] || 'Profil'}
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${isOwner ? 'bg-purple-500' : 'bg-emerald-500'}`} />
        </button>
      </div>
    </header>
  )
}
