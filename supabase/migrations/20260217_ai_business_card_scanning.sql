-- AI Business Card Scanning: user_ai_settings table, encryption functions, fuzzy search
-- Run on server: docker exec supabase-db psql -U postgres -d postgres -f /path/to/this.sql

-- pgcrypto za sifriranje API kljucev
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabela za AI nastavitve per-user
CREATE TABLE IF NOT EXISTS mat_tracker.user_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google')),
  encrypted_api_key BYTEA NOT NULL,
  fast_model TEXT NOT NULL,
  smart_model TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- RLS: uporabnik vidi samo svoje nastavitve
ALTER TABLE mat_tracker.user_ai_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_ai_settings" ON mat_tracker.user_ai_settings
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Funkcija za shranjevanje z enkripcijo (SECURITY DEFINER - dostop do passphrase)
CREATE OR REPLACE FUNCTION mat_tracker.save_ai_setting(
  p_user_id UUID, p_provider TEXT, p_api_key TEXT,
  p_fast_model TEXT, p_smart_model TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_pass TEXT;
BEGIN
  v_pass := current_setting('app.ai_key_passphrase', true);
  INSERT INTO mat_tracker.user_ai_settings (user_id, provider, encrypted_api_key, fast_model, smart_model)
  VALUES (p_user_id, p_provider, extensions.pgp_sym_encrypt(p_api_key, v_pass), p_fast_model, p_smart_model)
  ON CONFLICT (user_id, provider) DO UPDATE SET
    encrypted_api_key = extensions.pgp_sym_encrypt(p_api_key, v_pass),
    fast_model = p_fast_model, smart_model = p_smart_model, updated_at = NOW();
END; $$;

-- Funkcija za branje z dekripcijo (samo Edge Function z service role jo klice)
CREATE OR REPLACE FUNCTION mat_tracker.get_ai_settings_decrypted(p_user_id UUID)
RETURNS TABLE(provider TEXT, decrypted_key TEXT, fast_model TEXT, smart_model TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_pass TEXT;
BEGIN
  v_pass := current_setting('app.ai_key_passphrase', true);
  RETURN QUERY SELECT uas.provider,
    extensions.pgp_sym_decrypt(uas.encrypted_api_key, v_pass),
    uas.fast_model, uas.smart_model
  FROM mat_tracker.user_ai_settings uas
  WHERE uas.user_id = p_user_id AND uas.is_active = true
  ORDER BY uas.updated_at DESC LIMIT 1;
END; $$;

-- Fuzzy search funkcija za slovenian_companies
-- Uporablja similarity() IN ILIKE za ujemanje kratkih imen (npr. "Euronova" → "EURONOVA ... D.O.O.")
CREATE OR REPLACE FUNCTION mat_tracker.search_companies_fuzzy(
  p_name TEXT, p_city TEXT DEFAULT NULL, p_limit INTEGER DEFAULT 10
) RETURNS TABLE(
  id INTEGER, tax_number VARCHAR(20), registration_number VARCHAR(20),
  name TEXT, address_street TEXT, address_postal VARCHAR(10),
  address_city TEXT, activity_code VARCHAR(20), is_vat_payer BOOLEAN,
  legal_form TEXT, similarity_score REAL
) LANGUAGE sql STABLE AS $$
  SELECT sc.id, sc.tax_number, sc.registration_number, sc.name,
    sc.address_street, sc.address_postal, sc.address_city,
    sc.activity_code, sc.is_vat_payer, sc.legal_form,
    GREATEST(similarity(sc.name, p_name),
      CASE WHEN sc.name ILIKE '%' || p_name || '%' THEN 0.7 ELSE 0.0 END
    ) AS similarity_score
  FROM mat_tracker.slovenian_companies sc
  WHERE (similarity(sc.name, p_name) > 0.15
    OR sc.name ILIKE '%' || p_name || '%')
    AND (p_city IS NULL OR sc.address_city ILIKE '%' || p_city || '%')
  ORDER BY similarity_score DESC LIMIT p_limit;
$$;
