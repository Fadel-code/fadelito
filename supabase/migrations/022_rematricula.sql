-- Tabela rematricula_alunos: acompanhamento da Rematrícula 2026 (KPIs por unidade)

CREATE TABLE public.rematricula_alunos (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome           text        NOT NULL,
  turma          text,
  status         text        NOT NULL DEFAULT 'pendente' CHECK (status IN (
                               'pendente', 'rematriculado', 'nao_rematriculado'
                             )),
  motivo         text,
  quem_contatou  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rematricula_unidade ON public.rematricula_alunos(unidade_id);
CREATE INDEX idx_rematricula_status  ON public.rematricula_alunos(status);

CREATE TRIGGER trg_rematricula_updated_at
  BEFORE UPDATE ON public.rematricula_alunos
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.rematricula_alunos ENABLE ROW LEVEL SECURITY;

-- Leitura: unidade lê os seus; marketing e supervisão leem tudo
CREATE POLICY "rematricula_select"
  ON public.rematricula_alunos FOR SELECT TO authenticated
  USING (
    unidade_id = auth.uid()
    OR get_my_role() IN ('marketing', 'supervisao')
  );

-- Escrita: unidade insere/atualiza apenas os seus
CREATE POLICY "rematricula_insert"
  ON public.rematricula_alunos FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() = 'unidade' AND unidade_id = auth.uid()
  );

CREATE POLICY "rematricula_update"
  ON public.rematricula_alunos FOR UPDATE TO authenticated
  USING  (get_my_role() = 'unidade' AND unidade_id = auth.uid())
  WITH CHECK (get_my_role() = 'unidade' AND unidade_id = auth.uid());

-- Remoção: unidade apaga os seus; marketing apaga qualquer
CREATE POLICY "rematricula_delete"
  ON public.rematricula_alunos FOR DELETE TO authenticated
  USING (
    (get_my_role() = 'unidade' AND unidade_id = auth.uid())
    OR get_my_role() = 'marketing'
  );
