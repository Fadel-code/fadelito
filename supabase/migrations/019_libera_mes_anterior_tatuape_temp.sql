-- ============================================================
-- Fadelito — Migration 019: libera TEMPORARIAMENTE a edição do
-- mês anterior para a unidade Tatuapé, sem o limite do dia 5.
-- Pedido pontual — reverter para a regra da 014 quando sinalizado
-- (ver migration 020_bloqueia_mes_anterior_tatuape.sql).
-- ============================================================

-- Helper: nome da unidade do usuário atual (mesmo padrão de get_my_role())
CREATE OR REPLACE FUNCTION get_my_unidade_nome()
RETURNS text AS $$
  SELECT unidade_nome FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

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
          AND (extract(day from now()) < 5 OR get_my_unidade_nome() = 'Tatuapé')
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
          AND (extract(day from now()) < 5 OR get_my_unidade_nome() = 'Tatuapé')
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
        AND (extract(day from now()) < 5 OR get_my_unidade_nome() = 'Tatuapé')
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
          AND (extract(day from now()) < 5 OR get_my_unidade_nome() = 'Tatuapé')
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
          AND (extract(day from now()) < 5 OR get_my_unidade_nome() = 'Tatuapé')
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
        AND (extract(day from now()) < 5 OR get_my_unidade_nome() = 'Tatuapé')
      )
    )
  );
