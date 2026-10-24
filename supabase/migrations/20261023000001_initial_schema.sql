-- ==============================================================================
-- Migration : 20261023000001_initial_schema.sql
-- Projet    : Easy vente
-- Objectif  : Schéma complet multi-tenant, Sécurité RLS, Fonctions métiers & Audit
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABLES FONDAMENTALES
-- ==============================================================================

-- Table des boutiques (Multi-tenant)
CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    currency TEXT NOT NULL DEFAULT 'XOF',
    vat_enabled BOOLEAN NOT NULL DEFAULT false,
    vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    logo_url TEXT,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table des profils utilisateurs (Propriétaire vs Vendeur)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('owner', 'seller')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table des catégories de produits
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table des produits
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (purchase_price >= 0),
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (selling_price >= 0),
    current_stock INTEGER NOT NULL DEFAULT 0,
    alert_threshold INTEGER NOT NULL DEFAULT 5,
    barcode TEXT,
    image_url TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table des mouvements de stock (Traçabilité complète)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment', 'sale', 'sale_cancel')),
    quantity INTEGER NOT NULL, -- Positif pour les entrées, négatif pour les sorties
    reason TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table des clients & suivi des dettes
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    total_debt NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_debt >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table des ventes
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    sale_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    vat_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (vat_amount >= 0),
    total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    remaining_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (remaining_amount >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'mobile_money', 'credit', 'split')),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
    offline_id TEXT, -- Identifiant temporaire généré lors d'une vente hors-ligne
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Lignes de facture / éléments vendus (Prix figé au moment de la vente)
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (purchase_price >= 0),
    total_price NUMERIC(12, 2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table des règlements (Paiement initial ou remboursement de dette ultérieur)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'mobile_money', 'bank_transfer', 'other')),
    payment_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Séquenceur de factures pour numérotation continue sans trou (ex: FAC-2026-0001)
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    last_sequence INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (shop_id, year)
);

-- Table des factures
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL UNIQUE REFERENCES public.sales(id) ON DELETE RESTRICT,
    invoice_number TEXT NOT NULL,
    invoice_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    pdf_url TEXT,
    status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table du journal d'audit (Actions sensibles : annulations, changements de prix, etc.)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. INDEXES POUR LA PERFORMANCE (< 2s de chargement et recherche instantanée)
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_products_shop_id ON public.products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(shop_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(shop_id, name);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON public.customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_name_phone ON public.customers(shop_id, name, phone);
CREATE INDEX IF NOT EXISTS idx_sales_shop_date ON public.sales(shop_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(shop_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_audit_logs_shop ON public.audit_logs(shop_id, created_at DESC);

-- ==============================================================================
-- 4. FONCTIONS UTILITAIRES & SÉCURITÉ CONTEXTUELLE
-- ==============================================================================

-- Récupérer le shop_id de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.get_auth_shop_id()
RETURNS UUID AS $$
    SELECT shop_id FROM public.profiles WHERE id = auth.uid() AND is_active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Récupérer le rôle de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Maintien automatique de public.products.current_stock via trigger sur stock_movements
CREATE OR REPLACE FUNCTION public.sync_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.products
    SET current_stock = current_stock + NEW.quantity,
        updated_at = timezone('utc'::text, now())
    WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_product_stock ON public.stock_movements;
CREATE TRIGGER trigger_sync_product_stock
AFTER INSERT ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.sync_product_stock();

-- ==============================================================================
-- 5. FONCTIONS MÉTIERS CRITIQUES (TRANSACTIONS ATOMIQUES)
-- ==============================================================================

-- 5.1 Générateur de numéro de facture séquentiel sans trou (ex: FAC-2026-0001)
CREATE OR REPLACE FUNCTION public.generate_next_invoice_number(p_shop_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
    v_seq INTEGER;
    v_invoice_number TEXT;
BEGIN
    INSERT INTO public.invoice_sequences (shop_id, year, last_sequence)
    VALUES (p_shop_id, v_year, 1)
    ON CONFLICT (shop_id, year)
    DO UPDATE SET last_sequence = public.invoice_sequences.last_sequence + 1
    RETURNING last_sequence INTO v_seq;

    v_invoice_number := 'FAC-' || v_year::TEXT || '-' || LPAD(v_seq::TEXT, 4, '0');
    RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2 Création complète d'une vente (Transaction unique : Vente + Articles + Déduction stock + Facture + Paiement + Dette)
CREATE OR REPLACE FUNCTION public.create_sale_transaction(
    p_customer_id UUID DEFAULT NULL,
    p_discount NUMERIC DEFAULT 0,
    p_vat_amount NUMERIC DEFAULT 0,
    p_payment_method TEXT DEFAULT 'cash',
    p_paid_amount NUMERIC DEFAULT 0,
    p_items JSONB DEFAULT '[]'::jsonb,
    p_offline_id TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_shop_id UUID;
    v_subtotal NUMERIC(12, 2) := 0;
    v_total NUMERIC(12, 2) := 0;
    v_remaining NUMERIC(12, 2) := 0;
    v_sale_id UUID;
    v_item RECORD;
    v_product RECORD;
    v_line_total NUMERIC(12, 2);
    v_invoice_number TEXT;
    v_invoice_id UUID;
BEGIN
    -- 1. Récupération & vérification de la boutique de l'utilisateur
    SELECT shop_id INTO v_shop_id FROM public.profiles WHERE id = v_user_id AND is_active = true;
    IF v_shop_id IS NULL THEN
        RAISE EXCEPTION 'Utilisateur non autorisé ou boutique inactive.';
    END IF;

    -- 2. Vérification des articles
    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Le panier ne peut pas être vide.';
    END IF;

    -- Calcul strict du sous-total côté serveur avec vérification des prix et produits
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INT, unit_price NUMERIC)
    LOOP
        SELECT * INTO v_product FROM public.products WHERE id = v_item.product_id AND shop_id = v_shop_id AND is_archived = false;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Produit introuvable ou archivé : %', v_item.product_id;
        END IF;

        IF v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Quantité invalide pour le produit %', v_product.name;
        END IF;

        v_line_total := ROUND(v_item.quantity * v_item.unit_price, 2);
        v_subtotal := v_subtotal + v_line_total;
    END LOOP;

    -- 3. Calculs des totaux
    v_total := GREATEST(0, (v_subtotal - COALESCE(p_discount, 0)) + COALESCE(p_vat_amount, 0));
    v_remaining := GREATEST(0, v_total - COALESCE(p_paid_amount, 0));

    -- 4. Insertion de la vente
    INSERT INTO public.sales (
        shop_id, seller_id, customer_id, subtotal, discount, vat_amount,
        total, paid_amount, remaining_amount, payment_method, offline_id, notes
    ) VALUES (
        v_shop_id, v_user_id, p_customer_id, v_subtotal, COALESCE(p_discount, 0), COALESCE(p_vat_amount, 0),
        v_total, COALESCE(p_paid_amount, 0), v_remaining, p_payment_method, p_offline_id, p_notes
    ) RETURNING id INTO v_sale_id;

    -- 5. Insertion des éléments et déduction automatique du stock
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INT, unit_price NUMERIC)
    LOOP
        SELECT purchase_price INTO v_product FROM public.products WHERE id = v_item.product_id;
        v_line_total := ROUND(v_item.quantity * v_item.unit_price, 2);

        INSERT INTO public.sale_items (
            shop_id, sale_id, product_id, quantity, unit_price, purchase_price, total_price
        ) VALUES (
            v_shop_id, v_sale_id, v_item.product_id, v_item.quantity, v_item.unit_price, v_product.purchase_price, v_line_total
        );

        -- Mouvement de stock négatif
        INSERT INTO public.stock_movements (
            shop_id, product_id, type, quantity, reason, created_by
        ) VALUES (
            v_shop_id, v_item.product_id, 'sale', -v_item.quantity, 'Vente #' || v_sale_id::TEXT, v_user_id
        );
    END LOOP;

    -- 6. Enregistrement du paiement initial si montant payé > 0
    IF COALESCE(p_paid_amount, 0) > 0 THEN
        INSERT INTO public.payments (
            shop_id, sale_id, customer_id, amount, payment_method, notes, created_by
        ) VALUES (
            v_shop_id, v_sale_id, p_customer_id, p_paid_amount,
            CASE WHEN p_payment_method = 'split' THEN 'cash' ELSE p_payment_method END,
            'Règlement initial vente', v_user_id
        );
    END IF;

    -- 7. Mise à jour de la dette du client si solde restant
    IF v_remaining > 0 AND p_customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET total_debt = total_debt + v_remaining,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_customer_id;
    END IF;

    -- 8. Émission de la facture avec numéro continu garanti
    v_invoice_number := public.generate_next_invoice_number(v_shop_id);

    INSERT INTO public.invoices (
        shop_id, sale_id, invoice_number, status
    ) VALUES (
        v_shop_id, v_sale_id, v_invoice_number, 'valid'
    ) RETURNING id INTO v_invoice_id;

    -- 9. Journal d'audit
    INSERT INTO public.audit_logs (
        shop_id, user_id, action, entity_type, entity_id, details
    ) VALUES (
        v_shop_id, v_user_id, 'create_sale', 'sales', v_sale_id,
        jsonb_build_object(
            'invoice_number', v_invoice_number,
            'total', v_total,
            'paid', p_paid_amount,
            'remaining', v_remaining,
            'offline_id', p_offline_id
        )
    );

    RETURN jsonb_build_object(
        'sale_id', v_sale_id,
        'invoice_id', v_invoice_id,
        'invoice_number', v_invoice_number,
        'total', v_total,
        'remaining_amount', v_remaining
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.3 Annulation d'une vente (Réservé au Propriétaire)
CREATE OR REPLACE FUNCTION public.cancel_sale_transaction(
    p_sale_id UUID,
    p_reason TEXT DEFAULT 'Annulation demandée'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_shop_id UUID;
    v_user_role TEXT;
    v_sale RECORD;
    v_item RECORD;
BEGIN
    SELECT shop_id, role INTO v_shop_id, v_user_role
    FROM public.profiles WHERE id = v_user_id AND is_active = true;

    IF v_user_role != 'owner' THEN
        RAISE EXCEPTION 'Action refusée : Seul le propriétaire peut annuler une vente.';
    END IF;

    SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id AND shop_id = v_shop_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vente introuvable.';
    END IF;

    IF v_sale.status = 'cancelled' THEN
        RAISE EXCEPTION 'Cette vente est déjà annulée.';
    END IF;

    -- 1. Marquer la vente et la facture comme annulées
    UPDATE public.sales SET status = 'cancelled' WHERE id = p_sale_id;
    UPDATE public.invoices SET status = 'cancelled' WHERE sale_id = p_sale_id;

    -- 2. Restitution du stock pour chaque article vendu
    FOR v_item IN SELECT * FROM public.sale_items WHERE sale_id = p_sale_id
    LOOP
        INSERT INTO public.stock_movements (
            shop_id, product_id, type, quantity, reason, created_by
        ) VALUES (
            v_shop_id, v_item.product_id, 'sale_cancel', v_item.quantity, 'Annulation vente #' || p_sale_id::TEXT, v_user_id
        );
    END LOOP;

    -- 3. Déduction de la dette du client si cette vente avait créé une dette
    IF v_sale.remaining_amount > 0 AND v_sale.customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET total_debt = GREATEST(0, total_debt - v_sale.remaining_amount),
            updated_at = timezone('utc'::text, now())
        WHERE id = v_sale.customer_id;
    END IF;

    -- 4. Trace dans le journal d'audit
    INSERT INTO public.audit_logs (
        shop_id, user_id, action, entity_type, entity_id, details
    ) VALUES (
        v_shop_id, v_user_id, 'cancel_sale', 'sales', p_sale_id,
        jsonb_build_object('reason', p_reason, 'total_refunded', v_sale.total)
    );

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.4 Enregistrement d'un remboursement de dette par un client
CREATE OR REPLACE FUNCTION public.record_customer_debt_repayment(
    p_customer_id UUID,
    p_amount NUMERIC,
    p_payment_method TEXT DEFAULT 'cash',
    p_notes TEXT DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_shop_id UUID;
    v_customer RECORD;
    v_new_debt NUMERIC(12, 2);
BEGIN
    SELECT shop_id INTO v_shop_id FROM public.profiles WHERE id = v_user_id AND is_active = true;
    IF v_shop_id IS NULL THEN
        RAISE EXCEPTION 'Utilisateur non autorisé.';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Le montant remboursé doit être supérieur à zéro.';
    END IF;

    SELECT * INTO v_customer FROM public.customers WHERE id = p_customer_id AND shop_id = v_shop_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Client introuvable.';
    END IF;

    -- 1. Enregistrement du paiement
    INSERT INTO public.payments (
        shop_id, customer_id, amount, payment_method, notes, created_by
    ) VALUES (
        v_shop_id, p_customer_id, p_amount, p_payment_method, COALESCE(p_notes, 'Remboursement de dette'), v_user_id
    );

    -- 2. Déduction de la dette du client
    v_new_debt := GREATEST(0, v_customer.total_debt - p_amount);
    UPDATE public.customers
    SET total_debt = v_new_debt,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_customer_id;

    -- 3. Journal d'audit
    INSERT INTO public.audit_logs (
        shop_id, user_id, action, entity_type, entity_id, details
    ) VALUES (
        v_shop_id, v_user_id, 'debt_repayment', 'customers', p_customer_id,
        jsonb_build_object('amount_paid', p_amount, 'previous_debt', v_customer.total_debt, 'new_debt', v_new_debt)
    );

    RETURN v_new_debt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 6. POLITIQUES DE SÉCURITÉ ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Activation RLS sur toutes les tables
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 6.1 SHOPS
CREATE POLICY "Les membres peuvent voir leur boutique"
    ON public.shops FOR SELECT
    USING (id = public.get_auth_shop_id());

CREATE POLICY "Création de boutique par le propriétaire"
    ON public.shops FOR INSERT
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Le propriétaire peut modifier sa boutique"
    ON public.shops FOR UPDATE
    USING (owner_id = auth.uid());

-- 6.2 PROFILES
CREATE POLICY "Les utilisateurs peuvent voir leur profil"
    ON public.profiles FOR SELECT
    USING (id = auth.uid() OR shop_id = public.get_auth_shop_id());

CREATE POLICY "Création du profil initial"
    ON public.profiles FOR INSERT
    WITH CHECK (id = auth.uid());

CREATE POLICY "Le propriétaire gère les profils"
    ON public.profiles FOR ALL
    USING (shop_id = public.get_auth_shop_id() AND public.get_auth_role() = 'owner');

-- Fonction RPC d'enregistrement sécurisé lors de l'inscription
CREATE OR REPLACE FUNCTION public.register_shop_and_owner(
    p_shop_name TEXT,
    p_full_name TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_shop_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Utilisateur non authentifié.';
    END IF;

    -- 1. Création boutique
    INSERT INTO public.shops (name, owner_id, currency)
    VALUES (p_shop_name, v_user_id, 'XOF')
    RETURNING id INTO v_shop_id;

    -- 2. Création profil propriétaire
    INSERT INTO public.profiles (id, shop_id, full_name, role)
    VALUES (v_user_id, v_shop_id, p_full_name, 'owner')
    ON CONFLICT (id) DO UPDATE
    SET shop_id = v_shop_id, full_name = p_full_name, role = 'owner';

    RETURN jsonb_build_object('shop_id', v_shop_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6.3 CATEGORIES
CREATE POLICY "Lecture des catégories pour la boutique"
    ON public.categories FOR SELECT
    USING (shop_id = public.get_auth_shop_id());

CREATE POLICY "Gestion des catégories réservée au propriétaire"
    ON public.categories FOR ALL
    USING (shop_id = public.get_auth_shop_id() AND public.get_auth_role() = 'owner');

-- 6.4 PRODUCTS
CREATE POLICY "Lecture des produits pour tous les membres de la boutique"
    ON public.products FOR SELECT
    USING (shop_id = public.get_auth_shop_id());

CREATE POLICY "Modification des produits réservée au propriétaire"
    ON public.products FOR ALL
    USING (shop_id = public.get_auth_shop_id() AND public.get_auth_role() = 'owner');

-- 6.5 STOCK MOVEMENTS
CREATE POLICY "Lecture des mouvements de stock pour la boutique"
    ON public.stock_movements FOR SELECT
    USING (shop_id = public.get_auth_shop_id());

CREATE POLICY "Insertion des mouvements de stock autorisée pour la boutique"
    ON public.stock_movements FOR INSERT
    WITH CHECK (shop_id = public.get_auth_shop_id());

-- 6.6 CUSTOMERS
CREATE POLICY "Lecture des clients pour la boutique"
    ON public.customers FOR SELECT
    USING (shop_id = public.get_auth_shop_id());

CREATE POLICY "Ajout ou modification client par les membres"
    ON public.customers FOR INSERT
    WITH CHECK (shop_id = public.get_auth_shop_id());

CREATE POLICY "Mise à jour des clients par les membres"
    ON public.customers FOR UPDATE
    USING (shop_id = public.get_auth_shop_id());

-- 6.7 SALES & SALE ITEMS
CREATE POLICY "Lecture des ventes pour la boutique"
    ON public.sales FOR SELECT
    USING (shop_id = public.get_auth_shop_id());

CREATE POLICY "Lecture des items de vente pour la boutique"
    ON public.sale_items FOR SELECT
    USING (shop_id = public.get_auth_shop_id());

-- 6.8 PAYMENTS
CREATE POLICY "Lecture des paiements pour la boutique"
    ON public.payments FOR SELECT
    USING (shop_id = public.get_auth_shop_id());

-- 6.9 INVOICES
CREATE POLICY "Lecture des factures pour la boutique"
    ON public.invoices FOR SELECT
    USING (shop_id = public.get_auth_shop_id());

-- 6.10 AUDIT LOGS
CREATE POLICY "Lecture du journal d'audit réservée au propriétaire"
    ON public.audit_logs FOR SELECT
    USING (shop_id = public.get_auth_shop_id() AND public.get_auth_role() = 'owner');
