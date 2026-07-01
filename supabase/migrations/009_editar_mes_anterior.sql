-- ============================================================
-- Fadelito — Migration 009: unidade pode reescrever o mês anterior inteiro
-- Substitui a regra estreita da 008 ("só o dia anterior") por uma regra
-- rolante: mês atual + mês anterior sempre editáveis.
--   date_trunc('month', data) >= date_trunc('month', now() - interval '1 month')
-- ============================================================

DROP POLICY IF EXISTS "registros_update" ON registros;
CREATE POLICY "registros_update"
  ON registros FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'marketing'
    OR (
      get_my_role() = 'unidade'
      AND unidade_id = auth.uid()
      AND date_trunc('month', data) >= date_trunc('month', now() - interval '1 month')
    )
  );

DROP POLICY IF EXISTS "registros_delete_unidade" ON registros;
CREATE POLICY "registros_delete_unidade"
  ON registros FOR DELETE TO authenticated
  USING (
    get_my_role() = 'unidade'
    AND unidade_id = auth.uid()
    AND date_trunc('month', data) >= date_trunc('month', now() - interval '1 month')
  );

DROP POLICY IF EXISTS "observacoes_update" ON observacoes_diarias;
CREATE POLICY "observacoes_update"
  ON observacoes_diarias FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'marketing'
    OR (
      get_my_role() = 'unidade'
      AND unidade_id = auth.uid()
      AND date_trunc('month', data) >= date_trunc('month', now() - interval '1 month')
    )
  );

DROP POLICY IF EXISTS "observacoes_delete_unidade" ON observacoes_diarias;
CREATE POLICY "observacoes_delete_unidade"
  ON observacoes_diarias FOR DELETE TO authenticated
  USING (
    get_my_role() = 'unidade'
    AND unidade_id = auth.uid()
    AND date_trunc('month', data) >= date_trunc('month', now() - interval '1 month')
  );
