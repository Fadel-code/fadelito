-- ============================================================
-- Fadelito — Migration 012: libera lançamento em meses futuros
-- Permite à unidade preencher/editar/remover registros e observações
-- de qualquer mês futuro dentro do ano corrente (ex: lançar em julho
-- uma matrícula que só vale a partir de agosto). O mês anterior ao
-- atual continua travado (regra da 011).
-- ============================================================

DROP POLICY IF EXISTS "registros_insert" ON registros;
CREATE POLICY "registros_insert"
  ON registros FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() IN ('marketing', 'supervisao')
    OR (
      get_my_role() = 'unidade'
      AND unidade_id = auth.uid()
      AND date_trunc('month', data) >= date_trunc('month', now())
      AND date_trunc('year', data) = date_trunc('year', now())
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
      AND date_trunc('month', data) >= date_trunc('month', now())
      AND date_trunc('year', data) = date_trunc('year', now())
    )
  );

DROP POLICY IF EXISTS "registros_delete_unidade" ON registros;
CREATE POLICY "registros_delete_unidade"
  ON registros FOR DELETE TO authenticated
  USING (
    get_my_role() = 'unidade'
    AND unidade_id = auth.uid()
    AND date_trunc('month', data) >= date_trunc('month', now())
    AND date_trunc('year', data) = date_trunc('year', now())
  );

DROP POLICY IF EXISTS "observacoes_insert" ON observacoes_diarias;
CREATE POLICY "observacoes_insert"
  ON observacoes_diarias FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() IN ('marketing', 'supervisao')
    OR (
      get_my_role() = 'unidade'
      AND unidade_id = auth.uid()
      AND date_trunc('month', data) >= date_trunc('month', now())
      AND date_trunc('year', data) = date_trunc('year', now())
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
      AND date_trunc('month', data) >= date_trunc('month', now())
      AND date_trunc('year', data) = date_trunc('year', now())
    )
  );

DROP POLICY IF EXISTS "observacoes_delete_unidade" ON observacoes_diarias;
CREATE POLICY "observacoes_delete_unidade"
  ON observacoes_diarias FOR DELETE TO authenticated
  USING (
    get_my_role() = 'unidade'
    AND unidade_id = auth.uid()
    AND date_trunc('month', data) >= date_trunc('month', now())
    AND date_trunc('year', data) = date_trunc('year', now())
  );
