-- Tabela eventos_lead: registro local dos desfechos de visita (espelho/audit do CRM)

CREATE TABLE public.eventos_lead (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  crm_lead_id  integer     NOT NULL,
  nome         text,
  telefone     text,
  turma        text,
  data         date        NOT NULL DEFAULT CURRENT_DATE,
  tipo         text        NOT NULL CHECK (tipo IN (
                             'visita_realizada', 'em_negociacao', 'matricula', 'nao_fechou'
                           )),
  observacao   text,
  synced_at    timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unidade_id, crm_lead_id)
);

CREATE INDEX idx_eventos_lead_unidade ON public.eventos_lead(unidade_id);
CREATE INDEX idx_eventos_lead_tipo    ON public.eventos_lead(tipo);
CREATE INDEX idx_eventos_lead_data    ON public.eventos_lead(data DESC);

CREATE TRIGGER trg_eventos_lead_updated_at
  BEFORE UPDATE ON public.eventos_lead
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.eventos_lead ENABLE ROW LEVEL SECURITY;

-- Leitura: unidade lê os seus; marketing e supervisão leem tudo
CREATE POLICY "eventos_lead_select"
  ON public.eventos_lead FOR SELECT TO authenticated
  USING (
    unidade_id = auth.uid()
    OR get_my_role() IN ('marketing', 'supervisao')
  );

-- Escrita: unidade insere/atualiza apenas os seus
CREATE POLICY "eventos_lead_insert"
  ON public.eventos_lead FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() = 'unidade' AND unidade_id = auth.uid()
  );

CREATE POLICY "eventos_lead_update"
  ON public.eventos_lead FOR UPDATE TO authenticated
  USING  (get_my_role() = 'unidade' AND unidade_id = auth.uid())
  WITH CHECK (get_my_role() = 'unidade' AND unidade_id = auth.uid());

-- Remoção: unidade apaga os seus; marketing apaga qualquer (via página Observações)
CREATE POLICY "eventos_lead_delete"
  ON public.eventos_lead FOR DELETE TO authenticated
  USING (
    (get_my_role() = 'unidade' AND unidade_id = auth.uid())
    OR get_my_role() = 'marketing'
  );
