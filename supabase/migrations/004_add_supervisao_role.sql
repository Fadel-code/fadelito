-- Adiciona role 'supervisao': visualização geral (como marketing) sem edição

-- 1. Atualiza o CHECK constraint da tabela profiles
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('unidade', 'marketing', 'supervisao'));

-- 2. Atualiza a função auxiliar de RLS (sem mudança necessária, retorna o valor exato)

-- 3. Políticas de SELECT: supervisao lê igual ao marketing
DROP POLICY IF EXISTS "profiles_select_own_or_marketing" ON profiles;
CREATE POLICY "profiles_select_own_or_marketing"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR get_my_role() IN ('marketing', 'supervisao'));

DROP POLICY IF EXISTS "registros_select" ON registros;
CREATE POLICY "registros_select"
  ON registros FOR SELECT TO authenticated
  USING (
    get_my_role() IN ('marketing', 'supervisao')
    OR unidade_id = auth.uid()
  );

DROP POLICY IF EXISTS "audit_log_select_marketing" ON audit_log;
CREATE POLICY "audit_log_select_marketing"
  ON audit_log FOR SELECT TO authenticated
  USING (get_my_role() IN ('marketing', 'supervisao'));

-- INSERT/UPDATE de registros: supervisao NÃO tem permissão (inalterado, apenas 'marketing' e 'unidade')
