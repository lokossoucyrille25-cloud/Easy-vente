import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { Category } from '../types/database'
import { 
  ArrowLeft, 
  Plus, 
  Tag, 
  Trash2, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react'

interface Page20CategoriesProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export const Page20Categories: React.FC<Page20CategoriesProps> = ({ onNavigate }) => {
  const { shop, profile } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const isOwner = profile?.role === 'owner'

  const loadCategories = async () => {
    if (!shop?.id) return
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('shop_id', shop.id)
        .order('name')

      if (!error && data) {
        setCategories(data as Category[])
      }
    } catch (err) {
      console.error('Erreur chargement catégories:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [shop?.id])

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!name.trim()) {
      setErrorMsg('Le nom de la catégorie est obligatoire.')
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase.from('categories').insert({
        shop_id: shop!.id,
        name: name.trim(),
        description: description.trim() || null,
      })

      if (error) throw error

      setName('')
      setDescription('')
      setSuccessMsg('Nouvelle catégorie ajoutée !')
      await loadCategories()
    } catch (err: any) {
      console.error('Erreur création catégorie:', err)
      setErrorMsg(err.message || 'Erreur lors de l’ajout de la catégorie.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategory = async (id: string, catName: string) => {
    if (!confirm(`Supprimer la catégorie "${catName}" ? Les produits associés ne seront pas supprimés.`)) return

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('shop_id', shop!.id)

      if (error) throw error
      await loadCategories()
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression.')
    }
  }

  if (!isOwner) {
    return (
      <div className="text-center py-20 max-w-sm mx-auto space-y-3">
        <p className="text-sm font-semibold text-slate-700">Accès réservé au propriétaire.</p>
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
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Catégories de produits
        </h1>
        <p className="text-xs text-slate-500">
          Organisez vos rayons pour faciliter l'encaissement et le filtrage
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

      {/* Formulaire d'ajout rapide */}
      <form onSubmit={handleCreateCategory} className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Ajouter une nouvelle catégorie
        </h2>

        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Nom de la catégorie *
          </label>
          <div className="relative">
            <Tag className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Boissons, Épicerie, Cosmétiques..."
              required
              className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Description (Optionnelle)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Produits frais et conserves..."
            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Créer la catégorie</span>
        </button>
      </form>

      {/* Liste des catégories existantes */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Catégories configurées ({categories.length})
        </h2>

        {loading ? (
          <div className="text-center py-8">
            <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent" />
          </div>
        ) : categories.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            Aucune catégorie créée pour l'instant.
          </p>
        ) : (
          <div className="space-y-2">
            {categories.map((c) => (
              <div
                key={c.id}
                className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{c.name}</p>
                  {c.description && <p className="text-xs text-slate-400">{c.description}</p>}
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteCategory(c.id, c.name)}
                  className="p-2 text-slate-400 hover:text-rose-500 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
