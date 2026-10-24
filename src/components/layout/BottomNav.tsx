import React from 'react'
import { LayoutDashboard, ShoppingBag, Package, Users, Settings, History, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

interface BottomNavProps {
  currentPage: string
  onNavigate: (page: string) => void
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentPage, onNavigate }) => {
  const { profile } = useAuth()
  const isSeller = profile?.role === 'seller'

  // Éléments de navigation spécifiques au rôle pour mobile
  const navItems = isSeller
    ? [
        { id: 'sales-history', label: 'Mes Ventes', icon: History },
        { id: 'new-sale', label: 'Caisse', icon: ShoppingBag, isPrimary: true },
        { id: 'customers-list', label: 'Clients', icon: Users },
        { id: 'user-profile', label: 'Mon Compte', icon: User },
      ]
    : [
        { id: 'dashboard', label: 'Accueil', icon: LayoutDashboard },
        { id: 'products-list', label: 'Produits', icon: Package },
        { id: 'new-sale', label: 'Caisse', icon: ShoppingBag, isPrimary: true },
        { id: 'customers-list', label: 'Clients', icon: Users },
        { id: 'shop-settings', label: 'Menu', icon: Settings },
      ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 z-40 w-full no-print pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id

          if (item.isPrimary) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className="relative -top-3 flex flex-col items-center justify-center p-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-600/35 active:scale-95 transition cursor-pointer"
                title={item.label}
              >
                <Icon className="w-6 h-6" />
              </button>
            )
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center w-16 h-full transition cursor-pointer select-none ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-tight">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
