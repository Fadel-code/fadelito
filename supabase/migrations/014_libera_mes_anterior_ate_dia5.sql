-- ============================================================
-- Fadelito — Migration 014: libera edição do mês anterior para
-- unidade até o dia 4 do mês corrente (bloqueia a partir do dia 5).
-- Mantém mês atual + meses futuros do ano corrente sempre editáveis
-- (regra da 012). Mês anterior ao mês passado continua travado.
-- ============================================================

DROP POLICY IF EXISTS "registros_insert" ON registros;
CREATE POLICY "registros_insert"
  ON registros FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() IN ('marketing', 'supervisao')
    OR (
      get_my_role() = 'unidade'
      AND unidade_id = auth.uid()
      AND (
        (date_trunc('month', data) >= date_trunc('month', now())
          AND date_trunc('year', data) = date_trunc('year', now()))
        OR (
          date_trunc('month', data) = date_trunc('month', now() - interval '1 month')
          AND extract(day from now()) < 5
        )
      )
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
      AND (
        (date_trunc('month', data) >= date_trunc('month', now())
          AND date_trunc('year', data) = date_trunc('year', now()))
        OR (
          date_trunc('month', data) = date_trunc('month', now() - interval '1 month')
          AND extract(day from now()) < 5
        )
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
      (date_trunc('month', data) >= date_trunc('month', now())
        AND date_trunc('year', data) = date_trunc('year', now()))
      OR (
        date_trunc('month', data) = date_trunc('month', now() - interval '1 month')
        AND extract(day from now()) < 5
      )
    )
  );

DROP POLICY IF EXISTS "observacoes_insert" ON observacoes_diarias;
CREATE POLICY "observacoes_insert"
  ON observacoes_diarias FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() IN ('marketing', 'supervisao')
    OR (
      get_my_role() = 'unidade'
      AND unidade_id = auth.uid()
      AND (
        (date_trunc('month', data) >= date_trunc('month', now())
          AND date_trunc('year', data) = date_trunc('year', now()))
        OR (
          date_trunc('month', data) = date_trunc('month', now() - interval '1 month')
          AND extract(day from now()) < 5
        )
      )
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
      AND (
        (date_trunc('month', data) >= date_trunc('month', now())
          AND date_trunc('year', data) = date_trunc('year', now()))
        OR (
          date_trunc('month', data) = date_trunc('month', now() - interval '1 month')
          AND extract(day from now()) < 5
        )
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
      (date_trunc('month', data) >= date_trunc('month', now())
        AND date_trunc('year', data) = date_trunc('year', now()))
      OR (
        date_trunc('month', data) = date_trunc('month', now() - interval '1 month')
        AND extract(day from now()) < 5
      )
    )
  );
