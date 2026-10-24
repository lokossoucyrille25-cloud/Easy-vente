import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { formatDateTime } from '../lib/utils'
import type { AuditLog } from '../types/database'
import { ArrowLeft, ShieldAlert, Clock } from 'lucide-react'

interface Page21AuditLogsProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export const Page21AuditLogs: React.FC<Page21AuditLogsProps> = ({ onNavigate }) => {
  const { shop, profile } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  const isOwner = profile?.role === 'owner'

  useEffect(() => {
    if (!shop?.id || !isOwner) return
    setLoading(true)

    supabase
      .from('audit_logs')
      .select('*')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        setLoading(false)
        if (!error && data) {
          setLogs(data as AuditLog[])
        }
      })
  }, [shop?.id, isOwner])

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create_sale':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">Vente encaissée</span>
      case 'cancel_sale':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400">Vente annulée</span>
      case 'debt_repayment':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400">Dette remboursée</span>
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">{action}</span>
    }
  }

  if (!isOwner) {
    return (
      <div className="text-center py-20 max-w-sm mx-auto space-y-3">
        <p className="text-sm font-semibold text-slate-700">Accès confidentiel réservé au propriétaire.</p>
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="py-2.5 px-4 bg-emerald-600 text-white rounded-xl text-xs font-bold"
        >
          Retour au tableau de bord
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-24 max-w-6xl mx-auto w-full">
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
          <ShieldAlert className="w-5 h-5 text-emerald-600" />
          <span>Journal d'audit</span>
        </h1>
        <p className="text-xs text-slate-500">
          Traçabilité complète des opérations sensibles de la boutique
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <span className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent" />
        </div>
      ) : logs.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-10">
          Aucun événement enregistré dans le journal d'audit pour le moment.
        </p>
      ) : (
        <div className="space-y-2.5">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs shadow-xs"
            >
              <div className="flex items-center justify-between">
                {getActionBadge(log.action)}
                <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                  <Clock className="w-3 h-3" />
                  <span>{formatDateTime(log.created_at)}</span>
                </span>
              </div>

              {log.details && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl font-mono text-[11px] text-slate-700 dark:text-slate-300 overflow-x-auto">
                  {Object.entries(log.details).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-slate-400 font-sans">{k} :</span>
                      <span>{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
