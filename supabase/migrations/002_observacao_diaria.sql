-- ============================================================
-- Fadelito — Migration 002: Observações Diárias por Unidade
-- ============================================================

CREATE TABLE public.observacoes_diarias (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id  uuid REFERENCES profiles(id) ON DELETE CASCADE,
  data        date NOT NULL,
  observacao  text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(unidade_id, data)
);

CREATE INDEX idx_observacoes_unidade_data ON observacoes_diarias(unidade_id, data);

CREATE TRIGGER trg_observacoes_updated_at
  BEFORE UPDATE ON observacoes_diarias
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE observacoes_diarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "observacoes_select"
  ON observacoes_diarias FOR SELECT TO authenticated
  USING (get_my_role() = 'marketing' OR unidade_id = auth.uid());

CREATE POLICY "observacoes_insert"
  ON observacoes_diarias FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() = 'marketing'
    OR (get_my_role() = 'unidade' AND unidade_id = auth.uid())
  );

CREATE POLICY "observacoes_update"
  ON observacoes_diarias FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'marketing'
    OR (
      get_my_role() = 'unidade'
      AND unidade_id = auth.uid()
      AND date_trunc('month', data) >= date_trunc('month', now())
    )
  );
