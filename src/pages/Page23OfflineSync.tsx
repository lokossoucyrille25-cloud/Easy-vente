import React, { useEffect, useState, useCallback } from 'react'
import { 
  ArrowLeft, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  CloudUpload, 
  Clock, 
  Database,
  ShoppingBag,
  Trash2
} from 'lucide-react'
import { 
  getPendingSales, 
  syncPendingSales, 
  getLastSyncTime, 
  removePendingSale,
  type PendingOfflineSale 
} from '../lib/offlineSync'
import { formatCurrency } from '../lib/utils'

interface Page23OfflineSyncProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export const Page23OfflineSync: React.FC<Page23OfflineSyncProps> = ({ onNavigate }) => {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true))
  const [pendingSales, setPendingSales] = useState<PendingOfflineSale[]>(() => getPendingSales())
  const [syncing, setSyncing] = useState(false)
  const [lastSyncDate, setLastSyncDate] = useState<string>(() => {
    const last = getLastSyncTime()
    return last ? new Date(last).toLocaleTimeString() : 'Aucune'
  })
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const reloadQueue = useCallback(() => {
    setPendingSales(getPendingSales())
    const last = getLastSyncTime()
    if (last) {
      setLastSyncDate(new Date(last).toLocaleTimeString())
    }
  }, [])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    const handleQueueChange = () => reloadQueue()

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('easy_vente_offline_queue_updated', handleQueueChange)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('easy_vente_offline_queue_updated', handleQueueChange)
    }
  }, [reloadQueue])

  // Déclencher la synchronisation réelle vers Supabase
  const handleTriggerSync = async () => {
    if (!isOnline) {
      setSyncStatusMsg({
        type: 'error',
        text: 'Impossible de synchroniser : vous êtes actuellement hors-ligne.'
      })
      return
    }

    if (pendingSales.length === 0) {
      setSyncStatusMsg({
        type: 'success',
        text: 'Aucune vente en attente, votre système est déjà à jour.'
      })
      return
    }

    setSyncing(true)
    setSyncStatusMsg(null)

    try {
      const result = await syncPendingSales()
      reloadQueue()

      if (result.failedCount === 0) {
        setSyncStatusMsg({
          type: 'success',
          text: `Synchronisation réussie : ${result.successCount} vente(s) enregistrée(s) avec succès sur Supabase.`
        })
      } else {
        setSyncStatusMsg({
          type: 'error',
          text: `${result.successCount} vente(s) synchronisée(s), mais ${result.failedCount} échec(s) : ${result.errors.join(', ')}`
        })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inattendue'
      setSyncStatusMsg({
        type: 'error',
        text: `Erreur durant la synchronisation : ${msg}`
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleDiscardSale = (offlineId: string) => {
    if (confirm('Voulez-vous vraiment retirer cette vente non synchronisée de la file locale ?')) {
      removePendingSale(offlineId)
      reloadQueue()
    }
  }

  return (
    <div className="space-y-4 pb-24 max-w-2xl mx-auto w-full">
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
                ? 'Les ventes sont transmises en temps réel vers le cloud Supabase'
                : 'Les encaissements sont stockés localement sur votre appareil'}
            </p>
          </div>
        </div>
      </div>

      {syncStatusMsg && (
        <div
          className={`flex items-start gap-2.5 p-3.5 text-xs rounded-2xl border ${
            syncStatusMsg.type === 'success'
              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900'
              : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900'
          }`}
        >
          {syncStatusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{syncStatusMsg.text}</span>
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
              {pendingSales.length}
            </p>
          </div>

          <button
            type="button"
            disabled={syncing || !isOnline || pendingSales.length === 0}
            onClick={handleTriggerSync}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Synchronisation...' : 'Synchroniser maintenant'}</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Dernière synchronisation réussie : <strong>{lastSyncDate}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <CloudUpload className="w-4 h-4 text-slate-400" />
            <span>Base locale : <strong>LocalStorage / IndexedDB Queue</strong></span>
          </div>
        </div>

        {/* Liste détaillée des ventes hors ligne en attente */}
        {pendingSales.length > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Détail des transactions en attente :
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {pendingSales.map((sale) => (
                <div
                  key={sale.offline_id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-between text-xs border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-xl">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(sale.total)} ({sale.items.reduce((acc, i) => acc + i.quantity, 0)} articles)
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(sale.created_at).toLocaleTimeString()} • Mode : {sale.payment_method}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDiscardSale(sale.offline_id)}
                    title="Supprimer cette vente de la file"
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
