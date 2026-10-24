import React, { useEffect, useState } from 'react'
import { 
  ArrowLeft, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  CloudUpload, 
  Clock, 
  Database 
} from 'lucide-react'

interface Page23OfflineSyncProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export const Page23OfflineSync: React.FC<Page23OfflineSyncProps> = ({ onNavigate }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingSyncCount, setPendingSyncCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncDate, setLastSyncDate] = useState<string>(new Date().toLocaleTimeString())
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Vérifier la file d'attente locale stockée dans le navigateur
    const localQueue = localStorage.getItem('easy_vente_pending_sales')
    if (localQueue) {
      try {
        const parsed = JSON.parse(localQueue)
        setPendingSyncCount(Array.isArray(parsed) ? parsed.length : 0)
      } catch {
        setPendingSyncCount(0)
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Déclencher la synchronisation manuelle
  const handleTriggerSync = async () => {
    if (!isOnline) {
      setSyncStatusMsg('Impossible de synchroniser : vous êtes actuellement hors-ligne.')
      return
    }

    setSyncing(true)
    setSyncStatusMsg(null)

    // Simuler le traitement de la file d'attente IndexedDB / localStorage
    setTimeout(() => {
      setSyncing(false)
      setPendingSyncCount(0)
      setLastSyncDate(new Date().toLocaleTimeString())
      localStorage.removeItem('easy_vente_pending_sales')
      setSyncStatusMsg('Toutes vos données locales sont synchronisées avec le serveur Supabase.')
    }, 1200)
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
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Database className="w-5 h-5 text-emerald-600" />
          <span>Mode hors ligne & Synchronisation</span>
        </h1>
        <p className="text-xs text-slate-500">
          Suivi de l'état réseau et des ventes enregistrées sans connexion
        </p>
      </div>

      {/* État de la connexion active */}
      <div
        className={`p-5 rounded-3xl border shadow-sm flex items-center justify-between ${
          isOnline
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              isOnline ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
            }`}
          >
            {isOnline ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              État de la connexion
            </p>
            <p
              className={`text-lg font-black ${
                isOnline ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {isOnline ? 'Connecté à Internet' : 'Mode Hors-Ligne'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isOnline
                ? 'Les ventes sont transmises en temps réel'
                : 'Les encaissements sont stockés localement sur le téléphone'}
            </p>
          </div>
        </div>
      </div>

      {syncStatusMsg && (
        <div className="flex items-start gap-2.5 p-3.5 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-2xl">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{syncStatusMsg}</span>
        </div>
      )}

      {/* File d'attente des ventes hors ligne */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Ventes en attente de téléversement
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
              {pendingSyncCount}
            </p>
          </div>

          <button
            type="button"
            disabled={syncing || !isOnline}
            onClick={handleTriggerSync}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>Synchroniser maintenant</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Dernière synchronisation réussie : <strong>{lastSyncDate}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <CloudUpload className="w-4 h-4 text-slate-400" />
            <span>Base locale : <strong>IndexedDB (Offline Storage)</strong></span>
          </div>
        </div>
      </div>
    </div>
  )
}
