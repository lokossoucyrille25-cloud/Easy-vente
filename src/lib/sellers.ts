import { createClient } from '@supabase/supabase-js'
import { supabase } from './supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Crée un compte vendeur sans déconnecter le propriétaire actuellement connecté.
 * Utilise un client Supabase temporaire sans persistance de session locale.
 */
export async function createSellerAccount({
  fullName,
  email,
  password,
  shopId,
}: {
  fullName: string
  email: string
  password: string
  shopId: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Client temporaire qui n'écrase pas la session de l'admin
    const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // 2. Inscription auth du vendeur avec metadata shop_id et role
    const { data, error } = await tempClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          shop_id: shopId,
          role: 'seller',
        },
      },
    })

    if (error) {
      return { success: false, error: error.message }
    }

    // 3. Si l'utilisateur est retourné, s'assurer que le profil est bien lié
    if (data.user) {
      await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          shop_id: shopId,
          full_name: fullName,
          role: 'seller',
          is_active: true,
        })
    }

    return { success: true }
  } catch (err: any) {
    console.error('Erreur création vendeur:', err)
    return { success: false, error: err.message || 'Erreur inattendue' }
  }
}
