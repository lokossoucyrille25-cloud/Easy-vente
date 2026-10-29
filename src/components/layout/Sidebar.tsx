import React from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePWAInstall } from '../../hooks/usePWAInstall'
import { 
  BarChart3, 
  ShoppingBag, 
  History, 
  FileText, 
  Package, 
  AlertTriangle, 
  PlusCircle, 
  ClipboardCheck, 
  Tag, 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  ShieldAlert, 
  Settings, 
  UserCircle, 
  Wifi, 
  WifiOff, 
  LogOut, 
  Download, 
  Store,
  ChevronRight
} from 'lucide-react'

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
  isOnline: boolean
}

interface NavItemProps {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  currentPage: string
  onNavigate: (page: string) => void
}

const NavItem: React.FC<NavItemProps> = ({
  id,
  label,
  icon: Icon,
  badge,
  currentPage,
  onNavigate,
}) => {
  const isActive = currentPage === id
  return (
    <button
      type="button"
      onClick={() => onNavigate(id)}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer select-none ${
        isActive
          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
      }`}
    >
      <div className="flex items-center gap-2.5 truncate">
        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
        <span className="truncate">{label}</span>
      </div>
      {badge ? (
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
            isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
          }`}
        >
          {badge}
        </span>
      ) : (
        isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
      )}
    </button>
  )
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, isOnline }) => {
  const { profile, shop, signOut } = useAuth()
  const { canInstall, isInstalled, promptInstall } = usePWAInstall()
  const isOwner = profile?.role === 'owner'

  const handleSignOut = async () => {
    if (window.confirm('Voulez-vous vraiment vous déconnecter ?')) {
      await signOut()
    }
  }

  const renderNav = (id: string, label: string, icon: React.ComponentType<{ className?: string }>, badge?: string) => (
    <NavItem
      key={id}
      id={id}
      label={label}
      icon={icon}
      badge={badge}
      currentPage={currentPage}
      onNavigate={onNavigate}
    />
  )

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 h-screen sticky top-0 shrink-0 select-none z-20">
      {/* 1. Header de Marque & Boutique */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-600/25 shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 tracking-tight truncate">
                Easy vente
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400">
                PRO
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
              {shop?.name || 'Ma Boutique'}
            </p>
          </div>
        </div>

        {/* Badge Rôle */}
        <div className="mt-3 flex items-center justify-between px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isOwner ? 'bg-purple-500' : 'bg-emerald-500'}`} />
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              {isOwner ? 'Espace Propriétaire' : 'Espace Caisse Vendeur'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
            {shop?.currency || 'XOF'}
          </span>
        </div>
      </div>

      {/* 2. Bouton Action Caisse Rapide */}
      <div className="p-3">
        <button
          type="button"
          onClick={() => onNavigate('new-sale')}
          className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>+ Nouvelle vente (Caisse)</span>
        </button>
      </div>

      {/* 3. Navigation Scrollable */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-4 scrollbar-thin">
        {/* Pilotage */}
        {isOwner && (
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-0.5">
              Pilotage
            </p>
            {renderNav('dashboard', 'Tableau de bord', BarChart3)}
            {renderNav('reports', 'Rapports financiers', TrendingUp)}
          </div>
        )}

        {/* Opérations de Vente */}
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-0.5">
            Ventes & Caisse
          </p>
          {renderNav('new-sale', 'Encaisser une vente', ShoppingBag)}
          {renderNav('sales-history', 'Historique des ventes', History)}
          {renderNav('invoices-list', 'Factures & Reçus', FileText)}
        </div>

        {/* Catalogue & Stocks (Propriétaire uniquement) */}
        {isOwner && (
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-0.5">
              Catalogue & Stocks
            </p>
            {renderNav('products-list', 'Produits en rayon', Package)}
            {renderNav('stock-status', 'Alertes & Niveaux', AlertTriangle)}
            {renderNav('stock-entry', 'Entrée de stock', PlusCircle)}
            {renderNav('inventory', 'Inventaire physique', ClipboardCheck)}
            {renderNav('categories', 'Catégories', Tag)}
          </div>
        )}

        {/* Clients */}
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-0.5">
            Clients
          </p>
          {renderNav('customers-list', 'Clients & Dettes', Users)}
        </div>

        {/* Administration (Propriétaire) */}
        {isOwner && (
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-0.5">
              Administration
            </p>
            {renderNav('sellers-management', 'Gestion des vendeurs', ShieldCheck)}
            {renderNav('audit-logs', "Journal d'audit", ShieldAlert)}
            {renderNav('shop-settings', 'Paramètres boutique', Settings)}
          </div>
        )}

        {/* Mon Compte & Sync */}
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-0.5">
            Mon compte & Hors-ligne
          </p>
          {renderNav('user-profile', 'Mon profil', UserCircle)}
          {renderNav(
            'offline-sync',
            'État Hors-ligne & Sync',
            isOnline ? Wifi : WifiOff,
            isOnline ? 'En ligne' : 'Hors-ligne'
          )}
        </div>

        {/* CTA Installation PWA App (Desktop & Mobile) */}
        {canInstall && !isInstalled && (
          <div className="pt-2">
            <button
              type="button"
              onClick={promptInstall}
              className="w-full p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-left hover:bg-emerald-100/60 transition cursor-pointer flex items-center gap-2.5"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  Installer l'application
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate">
                  Accès direct sans navigateur
                </p>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* 4. Footer Utilisateur & Déconnexion */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div 
            onClick={() => onNavigate('user-profile')}
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer hover:opacity-80 transition"
          >
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {profile?.full_name?.substring(0, 2) || 'EV'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {profile?.full_name || 'Utilisateur'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {profile?.role === 'owner' ? 'Propriétaire' : 'Caissier'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
