-- ==============================================================================
-- Migration : 20261023000003_fix_seller_role_and_trigger.sql
-- Projet    : Easy vente
-- Objectif  : Isolation stricte des vendeurs :
--             1. Le trigger ne crée JAMAIS de boutique pour un compte vendeur
--             2. Rattrapage des profils vendeurs existants
--             3. Fonction sécurisée pour valider l'existence de la boutique par son nom
-- ==============================================================================

-- 1. CORRECTION DU TRIGGER HANDLE_NEW_USER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_shop_id UUID;
    v_shop_name TEXT;
    v_full_name TEXT;
    v_role TEXT;
BEGIN
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'owner');
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1));

    IF v_role = 'seller' THEN
        -- Pour un vendeur : NE JAMAIS créer de boutique !
        -- On extrait le shop_id passé dans les métadonnées lors de la création
        IF NEW.raw_user_meta_data->>'shop_id' IS NOT NULL AND (NEW.raw_user_meta_data->>'shop_id') <> '' THEN
            v_shop_id := (NEW.raw_user_meta_data->>'shop_id')::UUID;
        ELSE
            v_shop_id := NULL;
        END IF;

        INSERT INTO public.profiles (id, shop_id, full_name, role, is_active)
        VALUES (NEW.id, v_shop_id, v_full_name, 'seller', true)
        ON CONFLICT (id) DO UPDATE
        SET shop_id = COALESCE(v_shop_id, public.profiles.shop_id),
            full_name = v_full_name,
            role = 'seller',
            is_active = true;
    ELSE
        -- Pour un propriétaire : création de sa nouvelle boutique
        v_shop_name := COALESCE(NEW.raw_user_meta_data->>'shop_name', 'Boutique ' || SPLIT_PART(NEW.email, '@', 1));

        INSERT INTO public.shops (name, owner_id, currency)
        VALUES (v_shop_name, NEW.id, 'XOF')
        RETURNING id INTO v_shop_id;

        INSERT INTO public.profiles (id, shop_id, full_name, role, is_active)
        VALUES (NEW.id, v_shop_id, v_full_name, 'owner', true)
        ON CONFLICT (id) DO UPDATE
        SET shop_id = v_shop_id, full_name = v_full_name, role = 'owner', is_active = true;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- S'assurer que le trigger est bien branché sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. RATTRAPAGE ET NETTOYAGE DES PROFILS VENDEURS EXISTANTS
DO $$
DECLARE
    u RECORD;
    v_s_id UUID;
BEGIN
    -- Parcourir tous les utilisateurs auth ayant le rôle 'seller' dans leurs métadonnées
    FOR u IN 
        SELECT id, raw_user_meta_data 
        FROM auth.users 
        WHERE raw_user_meta_data->>'role' = 'seller' 
    LOOP
        IF u.raw_user_meta_data->>'shop_id' IS NOT NULL THEN
            v_s_id := (u.raw_user_meta_data->>'shop_id')::UUID;

            -- Mettre à jour le profil pour garantir role = 'seller' et shop_id exact
            UPDATE public.profiles
            SET role = 'seller',
                shop_id = v_s_id
            WHERE id = u.id;

            -- Supprimer toute boutique parasite qui aurait été créée à tort avec ce vendeur comme owner_id
            DELETE FROM public.shops 
            WHERE owner_id = u.id;
        END IF;
    END LOOP;
END $$;

-- 3. FONCTION SÉCURISÉE DE RECHERCHE DE BOUTIQUE PAR NOM (pour l'authentification vendeur)
CREATE OR REPLACE FUNCTION public.check_shop_name_exists(p_shop_name TEXT)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.shops 
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(p_shop_name))
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
