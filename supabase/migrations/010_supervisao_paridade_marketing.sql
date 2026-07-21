-- ============================================================
-- Fadelito — Migration 010: supervisão com paridade total de marketing
-- Antes: supervisão só lia (004). Agora ganha as mesmas permissões
-- de escrita que marketing tem sobre profiles, registros, observações
-- e eventos_lead.
-- ============================================================

-- ---- profiles ----

DROP POLICY IF EXISTS "profiles_update_own_or_marketing" ON profiles;
CREATE POLICY "profiles_update_own_or_marketing"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR get_my_role() IN ('marketing', 'supervisao'));

-- ---- registros ----

DROP POLICY IF EXISTS "registros_insert" ON registros;
CREATE POLICY "registros_insert"
  ON registros FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() IN ('marketing', 'supervisao')
    OR (
      get_my_role() = 'unidade'
      AND unidade_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "registros_update" ON registros;
CREATE POLICY "registros_update"
  ON registros FOR UPDATE TO authenticated
  USING (
    get_my_role() IN ('marketing', 'supervisao')
    OR (
      get_my_role() = 'unidade'
      AND unidade_id = auth.uid()
      AND date_trunc('month', data) >= date_trunc('month', now() - interval '1 month')
    )
  );

DROP POLICY IF EXISTS "registros_delete_marketing" ON registros;
CREATE POLICY "registros_delete_marketing"
  ON registros FOR DELETE TO authenticated
  USING (get_my_role() IN ('marketing', 'supervisao'));

-- ---- observacoes_diarias ----

DROP POLICY IF EXISTS "observacoes_insert" ON observacoes_diarias;
CREATE POLICY "observacoes_insert"
  ON observacoes_diarias FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() IN ('marketing', 'supervisao')
    OR (get_my_role() = 'unidade' AND unidade_id = auth.uid())
  );

DROP POLICY IF EXISTS "observacoes_update" ON observacoes_diarias;
CREATE POLICY "observacoes_update"
  ON observacoes_diarias FOR UPDATE TO authenticated
  USING (
    get_my_role() IN ('marketing', 'supervisao')
    OR (
      get_my_role() = 'unidade'
      AND unidade_id = auth.uid()
      AND date_trunc('month', data) >= date_trunc('month', now() - interval '1 month')
    )
  );

DROP POLICY IF EXISTS "observacoes_delete_marketing" ON observacoes_diarias;
CREATE POLICY "observacoes_delete_marketing"
  ON observacoes_diarias FOR DELETE TO authenticated
  USING (get_my_role() IN ('marketing', 'supervisao'));

-- ---- eventos_lead ----

DROP POLICY IF EXISTS "eventos_lead_delete" ON eventos_lead;
CREATE POLICY "eventos_lead_delete"
  ON eventos_lead FOR DELETE TO authenticated
  USING (
    (get_my_role() = 'unidade' AND unidade_id = auth.uid())
    OR get_my_role() IN ('marketing', 'supervisao')
  );
