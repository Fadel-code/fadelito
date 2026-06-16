-- ============================================================
-- Fadelito — Schema Inicial
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABELAS
-- ============================================================

CREATE TABLE public.profiles (
  id            uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role          text NOT NULL CHECK (role IN ('unidade', 'marketing')),
  unidade_nome  text,
  email         text,
  ativo         boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE TABLE public.registros (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id              uuid REFERENCES profiles(id) ON DELETE CASCADE,
  data                    date NOT NULL,
  turma                   text NOT NULL CHECK (turma IN (
                            'Berçário', 'Minimaternal', 'Maternal I',
                            'Maternal II', 'Jardim', 'Pré'
                          )),
  visitas                 integer DEFAULT 0,
  visitas_curso_ferias    integer DEFAULT 0,
  matriculas              integer DEFAULT 0,
  matriculas_curso_ferias integer DEFAULT 0,
  desligamentos           integer DEFAULT 0,
  transferencias          integer DEFAULT 0,
  religamentos            integer DEFAULT 0,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now(),
  UNIQUE(unidade_id, data, turma)
);

CREATE TABLE public.audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      uuid REFERENCES profiles(id),
  unidade_nome    text,
  acao            text CHECK (acao IN ('INSERT', 'UPDATE')),
  data_registro   date,
  turma           text,
  campo_alterado  text,
  valor_anterior  text,
  valor_novo      text,
  alterado_em     timestamptz DEFAULT now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_registros_unidade_data ON registros(unidade_id, data);
CREATE INDEX idx_registros_data ON registros(data);
CREATE INDEX idx_audit_log_usuario ON audit_log(usuario_id);
CREATE INDEX idx_audit_log_data ON audit_log(alterado_em DESC);
CREATE INDEX idx_audit_log_unidade ON audit_log(unidade_nome);

-- ============================================================
-- TRIGGER updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER trg_registros_updated_at
  BEFORE UPDATE ON registros
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper: retorna role do usuário atual
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ---- profiles ----

CREATE POLICY "profiles_select_own_or_marketing"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR get_my_role() = 'marketing');

CREATE POLICY "profiles_update_own_or_marketing"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR get_my_role() = 'marketing');

-- ---- registros ----

CREATE POLICY "registros_select"
  ON registros FOR SELECT TO authenticated
  USING (
    get_my_role() = 'marketing'
    OR unidade_id = auth.uid()
  );

CREATE POLICY "registros_insert"
  ON registros FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() = 'marketing'
    OR (
      get_my_role() = 'unidade'
      AND unidade_id = auth.uid()
    )
  );

-- Unidade só edita mês atual; marketing edita tudo
CREATE POLICY "registros_update"
  ON registros FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'marketing'
    OR (
      get_my_role() = 'unidade'
      AND unidade_id = auth.uid()
      AND date_trunc('month', data) >= date_trunc('month', now())
    )
  );

-- ---- audit_log ----

CREATE POLICY "audit_log_insert"
  ON audit_log FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "audit_log_select_marketing"
  ON audit_log FOR SELECT TO authenticated
  USING (get_my_role() = 'marketing');

-- ============================================================
-- SEED — Usuário Marketing
-- (Substitua o UUID e senha após criar o usuário no painel Supabase)
-- ============================================================

-- Crie o usuário marketing via Supabase Auth (Dashboard ou Admin API)
-- e depois rode o INSERT abaixo com o UUID gerado:

-- INSERT INTO public.profiles (id, role, unidade_nome, email, ativo)
-- VALUES (
--   '<UUID_DO_USUARIO_MARKETING>',
--   'marketing',
--   NULL,
--   'marketing@fadelito.com.br',
--   true
-- );

-- ============================================================
-- SEED — 35 Unidades (execute após criar os usuários via seed-users.js)
-- ============================================================

-- Ver arquivo supabase/seed-users.js para criar os 35 usuários
-- e os respectivos profiles automaticamente via Admin API.
