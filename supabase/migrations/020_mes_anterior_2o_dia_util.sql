-- ============================================================
-- Fadelito — Migration 020: remove a exceção temporária do
-- Tatuapé (migration 019) e troca a janela de edição do mês
-- anterior de "até o dia 4" para "até o 2º dia útil do mês atual"
-- (considera só fins de semana, sem tabela de feriados no banco).
-- ============================================================

CREATE OR REPLACE FUNCTION mes_anterior_editavel()
RETURNS boolean AS $$
  SELECT current_date <= (
    SELECT d::date
    FROM generate_series(
      date_trunc('month', current_date),
      date_trunc('month', current_date) + interval '10 days',
      interval '1 day'
    ) AS d
    WHERE extract(dow from d) NOT IN (0, 6) -- exclui sábado/domingo
    ORDER BY d
    OFFSET 1 LIMIT 1
  );
$$ LANGUAGE sql STABLE;

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
          AND mes_anterior_editavel()
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
          AND mes_anterior_editavel()
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
        AND mes_anterior_editavel()
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
          AND mes_anterior_editavel()
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
          AND mes_anterior_editavel()
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
        AND mes_anterior_editavel()
      )
    )
  );

DROP FUNCTION IF EXISTS get_my_unidade_nome();
