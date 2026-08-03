-- Tabela protocolos: biblioteca de protocolos oficiais do Assistente Fadelito

CREATE TABLE public.protocolos (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo           text        NOT NULL,
  area             text        NOT NULL CHECK (area IN ('Pedagógico','Administrativo','Em comum')),
  categoria        text        NOT NULL,
  palavras_chave   text[]      NOT NULL DEFAULT '{}',
  status           text        NOT NULL CHECK (status IN ('validado','revisao')),
  resumo           text        NOT NULL,
  acoes            text[]      NOT NULL DEFAULT '{}',
  mensagem_familia text        NOT NULL DEFAULT '',
  atencao          text        NOT NULL DEFAULT '',
  publicado        boolean     NOT NULL DEFAULT true,
  fonte            text        NOT NULL DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_protocolos_area      ON public.protocolos(area);
CREATE INDEX idx_protocolos_categoria ON public.protocolos(categoria);
CREATE INDEX idx_protocolos_publicado ON public.protocolos(publicado);

CREATE TRIGGER trg_protocolos_updated_at
  BEFORE UPDATE ON public.protocolos
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.protocolos ENABLE ROW LEVEL SECURITY;

-- Leitura: publicados para todo mundo autenticado; marketing/supervisão veem tudo (inclusive rascunhos)
CREATE POLICY "protocolos_select"
  ON public.protocolos FOR SELECT TO authenticated
  USING (
    publicado = true
    OR get_my_role() IN ('marketing', 'supervisao')
  );

-- Escrita: só marketing
CREATE POLICY "protocolos_insert"
  ON public.protocolos FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'marketing');

CREATE POLICY "protocolos_update"
  ON public.protocolos FOR UPDATE TO authenticated
  USING (get_my_role() = 'marketing')
  WITH CHECK (get_my_role() = 'marketing');

CREATE POLICY "protocolos_delete"
  ON public.protocolos FOR DELETE TO authenticated
  USING (get_my_role() = 'marketing');
