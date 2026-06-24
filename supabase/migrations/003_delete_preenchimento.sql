-- ============================================================
-- Fadelito — Migration 003: Remoção de preenchimento
-- ============================================================

-- Permite marketing deletar qualquer registro
CREATE POLICY "registros_delete_marketing"
  ON registros FOR DELETE TO authenticated
  USING (get_my_role() = 'marketing');

-- Permite unidade deletar seus próprios registros no mês atual
CREATE POLICY "registros_delete_unidade"
  ON registros FOR DELETE TO authenticated
  USING (
    get_my_role() = 'unidade'
    AND unidade_id = auth.uid()
    AND date_trunc('month', data) >= date_trunc('month', now())
  );

-- Permite marketing deletar observações
CREATE POLICY "observacoes_delete_marketing"
  ON observacoes_diarias FOR DELETE TO authenticated
  USING (get_my_role() = 'marketing');

-- Permite unidade deletar suas próprias observações no mês atual
CREATE POLICY "observacoes_delete_unidade"
  ON observacoes_diarias FOR DELETE TO authenticated
  USING (
    get_my_role() = 'unidade'
    AND unidade_id = auth.uid()
    AND date_trunc('month', data) >= date_trunc('month', now())
  );

-- Estende o CHECK de audit_log para incluir DELETE
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_acao_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_acao_check
  CHECK (acao IN ('INSERT', 'UPDATE', 'DELETE'));

-- Habilita realtime para a tabela registros
-- (Execute isto no painel Supabase > Database > Replication se preferir via UI)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE registros;
EXCEPTION WHEN OTHERS THEN
  NULL; -- tabela já está na publication ou publication não existe
END;
$$;
