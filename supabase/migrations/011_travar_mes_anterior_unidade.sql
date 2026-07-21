-- ============================================================
-- Fadelito — Migration 011: unidade só edita o mês corrente
-- Reverte a regra da 009 ("mês atual + mês anterior sempre editáveis"
-- para unidade). A partir do 1º dia do mês seguinte, o mês anterior
-- fica travado para unidade — só marketing/supervisão continuam
-- podendo corrigir qualquer mês.
-- ============================================================

DROP POLICY IF EXISTS "registros_insert" ON registros;
CREATE POLICY "registros_insert"
  ON registros FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() IN ('marketing', 'supervisao')
    OR (
      get_my_role() = 'unidade'
      AND unidade_id = auth.uid()
      AND date_trunc('month', data) = date_trunc('month', now())
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
      AND date_trunc('month', data) = date_trunc('month', now())
    )
  );

DROP POLICY IF EXISTS "registros_delete_unidade" ON registros;
CREATE POLICY "registros_delete_unidade"
  ON registros FOR DELETE TO authenticated
  USING (
    get_my_role() = 'unidade'
    AND unidade_id = auth.uid()
    AND date_trunc('month', data) = date_trunc('month', now())
  );

DROP POLICY IF EXISTS "observacoes_insert" ON observacoes_diarias;
CREATE POLICY "observacoes_insert"
  ON observacoes_diarias FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() IN ('marketing', 'supervisao')
    OR (
      get_my_role() = 'unidade'
      AND unidade_id = auth.uid()
      AND date_trunc('month', data) = date_trunc('month', now())
    )
  );

DROP POLICY IF EXISTS "observacoes_update" ON observacoes_diarias;
CREATE POLICY "observacoes_update"
  ON observacoes_diarias FOR UPDATE TO authenticated
  USING (
    get_my_role() IN ('marketing', 'supervisao')
    OR (
      get_my_role() = 'unidade'
      AND unidade_id = auth.uid()
      AND date_trunc('month', data) = date_trunc('month', now())
    )
  );

DROP POLICY IF EXISTS "observacoes_delete_unidade" ON observacoes_diarias;
CREATE POLICY "observacoes_delete_unidade"
  ON observacoes_diarias FOR DELETE TO authenticated
  USING (
    get_my_role() = 'unidade'
    AND unidade_id = auth.uid()
    AND date_trunc('month', data) = date_trunc('month', now())
  );
