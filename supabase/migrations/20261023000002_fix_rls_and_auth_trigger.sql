-- ==============================================================================
-- Migration : 20261023000002_fix_rls_and_auth_trigger.sql
-- Projet    : Easy vente
-- Résolution : Déverrouillage RLS, Trigger d'inscription automatique et rattrapage du compte
-- ==============================================================================

-- 1. FONCTIONS DE SÉCURITÉ CONTEXTUELLES NON-RÉCURSIVES
CREATE OR REPLACE FUNCTION public.get_auth_shop_id()
RETURNS UUID AS $$
    SELECT shop_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. TRIGGER AUTOMATIQUE POUR TOUTES LES INSCRIPTIONS FUTURES
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_shop_id UUID;
    v_shop_name TEXT;
    v_full_name TEXT;
BEGIN
    v_shop_name := COALESCE(NEW.raw_user_meta_data->>'shop_name', 'Boutique ' || SPLIT_PART(NEW.email, '@', 1));
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1));

    -- Création boutique
    INSERT INTO public.shops (name, owner_id, currency)
    VALUES (v_shop_name, NEW.id, 'XOF')
    RETURNING id INTO v_shop_id;

    -- Création profil propriétaire
    INSERT INTO public.profiles (id, shop_id, full_name, role, is_active)
    VALUES (NEW.id, v_shop_id, v_full_name, 'owner', true)
    ON CONFLICT (id) DO UPDATE
    SET shop_id = v_shop_id, full_name = v_full_name, role = 'owner', is_active = true;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. RATTRAPAGE IMMÉDIAT DE VOTRE COMPTE DÉJÀ INSCRIT
DO $$
DECLARE
    u RECORD;
    v_shop_id UUID;
    v_shop_name TEXT;
    v_full_name TEXT;
BEGIN
    FOR u IN SELECT * FROM auth.users LOOP
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u.id) THEN
            v_shop_name := COALESCE(u.raw_user_meta_data->>'shop_name', 'Boutique ' || SPLIT_PART(u.email, '@', 1));
            v_full_name := COALESCE(u.raw_user_meta_data->>'full_name', SPLIT_PART(u.email, '@', 1));

            INSERT INTO public.shops (name, owner_id, currency)
            VALUES (v_shop_name, u.id, 'XOF')
            RETURNING id INTO v_shop_id;

            INSERT INTO public.profiles (id, shop_id, full_name, role, is_active)
            VALUES (u.id, v_shop_id, v_full_name, 'owner', true)
            ON CONFLICT (id) DO UPDATE
            SET shop_id = v_shop_id, full_name = v_full_name, role = 'owner', is_active = true;
        END IF;
    END LOOP;
END $$;

-- 4. POLITIQUES RLS SUR LES BOUTIQUES (SHOPS)
DROP POLICY IF EXISTS "Les membres peuvent voir leur boutique" ON public.shops;
DROP POLICY IF EXISTS "Le propriétaire peut modifier sa boutique" ON public.shops;
DROP POLICY IF EXISTS "Création de boutique par le propriétaire" ON public.shops;

CREATE POLICY "Voir sa boutique"
    ON public.shops FOR SELECT
    TO authenticated
    USING (owner_id = auth.uid() OR id = public.get_auth_shop_id());

CREATE POLICY "Créer sa boutique"
    ON public.shops FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Modifier sa boutique"
    ON public.shops FOR UPDATE
    TO authenticated
    USING (owner_id = auth.uid());

-- 5. POLITIQUES RLS SUR LES PROFILS (PROFILES)
DROP POLICY IF EXISTS "Les membres peuvent voir les profils de leur boutique" ON public.profiles;
DROP POLICY IF EXISTS "Le propriétaire gère les profils" ON public.profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leur profil" ON public.profiles;
DROP POLICY IF EXISTS "Création du profil initial" ON public.profiles;

CREATE POLICY "Voir les profils"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid() OR shop_id = public.get_auth_shop_id());

CREATE POLICY "Créer son profil"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

CREATE POLICY "Modifier son profil"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid() OR (shop_id = public.get_auth_shop_id() AND public.get_auth_role() = 'owner'));

-- 6. POLITIQUES RLS SUR LES PRODUITS (PRODUCTS)
DROP POLICY IF EXISTS "Lecture des produits pour tous les membres de la boutique" ON public.products;
DROP POLICY IF EXISTS "Modification des produits réservée au propriétaire" ON public.products;

CREATE POLICY "Lecture des produits"
    ON public.products FOR SELECT
    TO authenticated
    USING (
        shop_id = public.get_auth_shop_id() 
        OR shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
    );

CREATE POLICY "Ajout et modification des produits par le propriétaire"
    ON public.products FOR ALL
    TO authenticated
    USING (
        shop_id = public.get_auth_shop_id() 
        OR shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
    )
    WITH CHECK (
        shop_id = public.get_auth_shop_id() 
        OR shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
    );

-- 7. POLITIQUES RLS SUR LES MOUVEMENTS DE STOCK
DROP POLICY IF EXISTS "Lecture des mouvements de stock pour la boutique" ON public.stock_movements;
DROP POLICY IF EXISTS "Insertion des mouvements de stock autorisée pour la boutique" ON public.stock_movements;

CREATE POLICY "Lecture des mouvements de stock"
    ON public.stock_movements FOR SELECT
    TO authenticated
    USING (
        shop_id = public.get_auth_shop_id() 
        OR shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
    );

CREATE POLICY "Insertion des mouvements de stock"
    ON public.stock_movements FOR INSERT
    TO authenticated
    WITH CHECK (
        shop_id = public.get_auth_shop_id() 
        OR shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
    );
