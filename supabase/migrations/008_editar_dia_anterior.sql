-- ============================================================
-- Fadelito — Migration 008: Permite unidade corrigir o dia anterior
-- mesmo quando ele cai no mês passado (ex: hoje é dia 1)
-- ============================================================

DROP POLICY IF EXISTS "registros_update" ON registros;
CREATE POLICY "registros_update"
  ON registros FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'marketing'
    OR (
      get_my_role() = 'unidade'
      AND unidade_id = auth.uid()
      AND (
        date_trunc('month', data) >= date_trunc('month', now())
        OR data = (current_date - 1)
      )
    )
  );

DROP POLICY IF EXISTS "registros_delete_unidade" ON registros;
CREATE POLICY "registros_delete_unidade"
  ON registros FOR DELETE TO authenticated
  USING (
    get_my_role() = 'unidade'
    AND unidade_id = auth.uid()
    AND (
      date_trunc('month', data) >= date_trunc('month', now())
      OR data = (current_date - 1)
    )
  );

DROP POLICY IF EXISTS "observacoes_update" ON observacoes_diarias;
CREATE POLICY "observacoes_update"
  ON observacoes_diarias FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'marketing'
    OR (
      get_my_role() = 'unidade'
      AND unidade_id = auth.uid()
      AND (
        date_trunc('month', data) >= date_trunc('month', now())
        OR data = (current_date - 1)
      )
    )
  );

DROP POLICY IF EXISTS "observacoes_delete_unidade" ON observacoes_diarias;
CREATE POLICY "observacoes_delete_unidade"
  ON observacoes_diarias FOR DELETE TO authenticated
  USING (
    get_my_role() = 'unidade'
    AND unidade_id = auth.uid()
    AND (
      date_trunc('month', data) >= date_trunc('month', now())
      OR data = (current_date - 1)
    )
  );
