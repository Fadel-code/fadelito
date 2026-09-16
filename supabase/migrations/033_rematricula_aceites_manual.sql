-- Rematrícula 2027: Aceites vira contagem manual por unidade, dia e turma
-- (mesmo padrão do preenchimento diário de visitas em `registros`), em vez de
-- marcação por aluno. Substitui o uso da coluna rematricula_alunos.aceite
-- (mantida, mas não lida mais pelo frontend).

CREATE TABLE public.rematricula_aceites (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data        date        NOT NULL,
  turma       text        NOT NULL CHECK (turma IN (
                            'Berçário', 'Minimaternal', 'Maternal I',
                            'Maternal II', 'Jardim', 'Pré'
                          )),
  quantidade  integer     NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(unidade_id, data, turma)
);

CREATE INDEX idx_rematricula_aceites_unidade ON public.rematricula_aceites(unidade_id);

CREATE TRIGGER trg_rematricula_aceites_updated_at
  BEFORE UPDATE ON public.rematricula_aceites
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.rematricula_aceites ENABLE ROW LEVEL SECURITY;

-- Leitura: unidade lê a sua; marketing e supervisão leem todas
CREATE POLICY "rematricula_aceites_select"
  ON public.rematricula_aceites FOR SELECT TO authenticated
  USING (
    unidade_id = auth.uid()
    OR get_my_role() IN ('marketing', 'supervisao')
  );

-- Escrita: a própria unidade grava os seus registros diários; supervisão grava
-- por qualquer unidade (única tabela onde supervisão edita — pedido explícito,
-- foge da regra geral de só-leitura do papel). Marketing ainda não entra aqui:
-- liberado só pra supervisão validar o fluxo antes de abrir pro marketing.
CREATE POLICY "rematricula_aceites_insert"
  ON public.rematricula_aceites FOR INSERT TO authenticated
  WITH CHECK (
    (get_my_role() = 'unidade' AND unidade_id = auth.uid())
    OR get_my_role() = 'supervisao'
  );

CREATE POLICY "rematricula_aceites_update"
  ON public.rematricula_aceites FOR UPDATE TO authenticated
  USING (
    (get_my_role() = 'unidade' AND unidade_id = auth.uid())
    OR get_my_role() = 'supervisao'
  )
  WITH CHECK (
    (get_my_role() = 'unidade' AND unidade_id = auth.uid())
    OR get_my_role() = 'supervisao'
  );
