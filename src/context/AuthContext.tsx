import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile, Shop } from '../types/database'

interface SignInOptions {
  role?: 'owner' | 'seller'
  shopName?: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  shop: Shop | null
  loading: boolean
  signIn: (email: string, password: string, options?: SignInOptions) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, fullName: string, shopName: string, logoUrl?: string) => Promise<{ error: Error | null }>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const normalizeString = (str: string) =>
  str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUserData = async (currentUser: User | null) => {
    if (!currentUser) {
      setUser(null)
      setProfile(null)
      setShop(null)
      setLoading(false)
      return
    }

    setUser(currentUser)

    try {
      // 1. Récupérer le profil existant
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle()

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Erreur chargement profil:', profileError)
      }

      // Détecter si les métadonnées auth indiquent un vendeur
      const isSellerMeta =
        currentUser.user_metadata?.role === 'seller' ||
        (profileData && profileData.role === 'seller')

      const metaShopId = currentUser.user_metadata?.shop_id

      if (profileData) {
        // Si le profil était marqué owner par erreur alors que c'est un vendeur
        let effectiveProfile = profileData as Profile
        if (currentUser.user_metadata?.role === 'seller' && profileData.role === 'owner') {
          console.warn('Correction du rôle vendeur pour le profil:', currentUser.id)
          const targetShopId = metaShopId || profileData.shop_id
          const { data: corrected } = await supabase
            .from('profiles')
            .update({ role: 'seller', shop_id: targetShopId })
            .eq('id', currentUser.id)
            .select()
            .single()
          if (corrected) {
            effectiveProfile = corrected as Profile
          }
        }

        setProfile(effectiveProfile)

        // 2. Récupérer la boutique rattachée
        if (effectiveProfile.shop_id) {
          const { data: shopData } = await supabase
            .from('shops')
            .select('*')
            .eq('id', effectiveProfile.shop_id)
            .maybeSingle()

          if (shopData) {
            setShop(shopData as Shop)
          }
        }
      } else {
        // Aucun profil trouvé en base
        if (isSellerMeta && metaShopId) {
          // Rattachement du vendeur à la boutique de son propriétaire
          const fullName =
            (currentUser.user_metadata?.full_name as string) ||
            currentUser.email?.split('@')[0] ||
            'Vendeur'

          const { data: newProfile } = await supabase
            .from('profiles')
            .upsert({
              id: currentUser.id,
              shop_id: metaShopId,
              full_name: fullName,
              role: 'seller',
              is_active: true,
            })
            .select()
            .single()

          if (newProfile) {
            setProfile(newProfile as Profile)
            const { data: shopData } = await supabase
              .from('shops')
              .select('*')
              .eq('id', metaShopId)
              .maybeSingle()
            if (shopData) setShop(shopData as Shop)
          }
        } else {
          // Initialisation standard Propriétaire uniquement si ce n'est PAS un vendeur
          let { data: existingShop } = await supabase
            .from('shops')
            .select('*')
            .eq('owner_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (!existingShop) {
            const shopName = (currentUser.user_metadata?.shop_name as string) || 'Ma Boutique'
            const { data: createdShop } = await supabase
              .from('shops')
              .insert({
                name: shopName,
                owner_id: currentUser.id,
                currency: 'XOF',
              })
              .select()
              .single()
            existingShop = createdShop
          }

          if (existingShop) {
            setShop(existingShop as Shop)
            const fullName =
              (currentUser.user_metadata?.full_name as string) ||
              currentUser.email?.split('@')[0] ||
              'Propriétaire'

            const { data: newProfile } = await supabase
              .from('profiles')
              .upsert({
                id: currentUser.id,
                shop_id: existingShop.id,
                full_name: fullName,
                role: 'owner',
                is_active: true,
              })
              .select()
              .single()

            if (newProfile) {
              setProfile(newProfile as Profile)
            }
          }
        }
      }
    } catch (err) {
      console.error('Erreur globale auth context:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUserData(session?.user ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUserData(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (
    email: string,
    password: string,
    options?: SignInOptions
  ): Promise<{ error: Error | null }> => {
    // 1. Authentification Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      return { error: authError }
    }

    if (!authData.user) {
      return { error: new Error('Utilisateur non identifié') }
    }

    const currentUserId = authData.user.id

    // 2. Contrôle de sécurité selon le rôle sélectionné
    try {
      // Récupérer le profil et les données de la boutique
      let { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUserId)
        .maybeSingle()

      // Si le compte a été créé avec metadata role: 'seller'
      const isSellerMetadata = authData.user.user_metadata?.role === 'seller'
      const metaShopId = authData.user.user_metadata?.shop_id

      if (isSellerMetadata && userProfile?.role === 'owner') {
        // Corriger immédiatement le profil
        const targetShopId = metaShopId || userProfile.shop_id
        const { data: fixed } = await supabase
          .from('profiles')
          .update({ role: 'seller', shop_id: targetShopId })
          .eq('id', currentUserId)
          .select()
          .single()
        if (fixed) userProfile = fixed
      }

      if (!userProfile && isSellerMetadata && metaShopId) {
        // Profil pas encore inséré
        const { data: inserted } = await supabase
          .from('profiles')
          .insert({
            id: currentUserId,
            shop_id: metaShopId,
            full_name: authData.user.user_metadata?.full_name || 'Vendeur',
            role: 'seller',
            is_active: true,
          })
          .select()
          .single()
        if (inserted) userProfile = inserted
      }

      // Si l'utilisateur a choisi l'onglet "Vendeur"
      if (options?.role === 'seller') {
        if (!options.shopName || !options.shopName.trim()) {
          await supabase.auth.signOut()
          return { error: new Error('Veuillez renseigner le nom de la boutique du propriétaire.') }
        }

        // Vérifier que ce compte n'est pas un propriétaire
        if (userProfile?.role === 'owner') {
          await supabase.auth.signOut()
          return {
            error: new Error(
              "Ce compte est un compte Propriétaire. Veuillez vous connecter via l'onglet « Propriétaire »."
            ),
          }
        }

        // Vérifier si le compte est actif
        if (userProfile && !userProfile.is_active) {
          await supabase.auth.signOut()
          return {
            error: new Error('Ce compte vendeur a été suspendu par le propriétaire de la boutique.'),
          }
        }

        // Vérifier la boutique rattachée
        const targetShopId = userProfile?.shop_id || metaShopId
        if (!targetShopId) {
          await supabase.auth.signOut()
          return {
            error: new Error("Ce compte vendeur n'est rattaché à aucune boutique. Contactez votre propriétaire."),
          }
        }

        const { data: shopData, error: shopErr } = await supabase
          .from('shops')
          .select('id, name')
          .eq('id', targetShopId)
          .maybeSingle()

        if (shopErr || !shopData) {
          await supabase.auth.signOut()
          return {
            error: new Error('La boutique rattachée est introuvable.'),
          }
        }

        // Vérification de concordance du nom de la boutique
        const normalizedEntered = normalizeString(options.shopName)
        const normalizedDb = normalizeString(shopData.name)

        if (normalizedEntered !== normalizedDb && !normalizedDb.includes(normalizedEntered)) {
          await supabase.auth.signOut()
          return {
            error: new Error(
              `Le nom de la boutique ne correspond pas. Ce compte vendeur est rattaché à une autre boutique ou le nom est incorrect.`
            ),
          }
        }
      }

      // Si l'utilisateur a choisi l'onglet "Propriétaire"
      if (options?.role === 'owner') {
        if (userProfile?.role === 'seller') {
          await supabase.auth.signOut()
          return {
            error: new Error(
              "Ce compte est un compte Vendeur. Veuillez vous connecter via l'onglet « Vendeur » en renseignant le nom de la boutique."
            ),
          }
        }
      }
    } catch (err: any) {
      console.error('Erreur vérification rôle et boutique:', err)
    }

    return { error: null }
  }

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    shopName: string,
    logoUrl?: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          shop_name: shopName,
          role: 'owner',
          logo_url: logoUrl || null,
        },
      },
    })

    if (error) return { error }

    if (data.user) {
      try {
        const { data: userShop } = await supabase
          .from('shops')
          .select('id')
          .eq('owner_id', data.user.id)
          .maybeSingle()

        if (userShop && logoUrl) {
          await supabase
            .from('shops')
            .update({ logo_url: logoUrl })
            .eq('id', userShop.id)
        } else if (!userShop) {
          const { data: newShop, error: shopErr } = await supabase
            .from('shops')
            .insert({
              name: shopName,
              owner_id: data.user.id,
              currency: 'XOF',
              logo_url: logoUrl || null,
            })
            .select()
            .single()

          if (!shopErr && newShop) {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              shop_id: newShop.id,
              full_name: fullName,
              role: 'owner',
            })
          }
        }
      } catch (err) {
        console.warn('Création boutique gérée ou en attente de validation:', err)
      }
    }

    return { error: null }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setShop(null)
  }

  const refreshProfile = async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    await loadUserData(currentUser)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        shop,
        loading,
        signIn,
        signUp,
        resetPassword,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth doit être utilisé à l’intérieur d’un AuthProvider')
  }
  return context
}

