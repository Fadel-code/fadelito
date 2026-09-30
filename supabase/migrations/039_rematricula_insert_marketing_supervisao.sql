-- Marketing e supervisão incluem aluno na lista de qualquer unidade pela tela de
-- Rematrícula deles ("Adicionar novo aluno"). Até aqui só a própria unidade podia
-- inserir (022), então o INSERT desses papéis era barrado pela policy.
-- A unidade mantém o INSERT que já tinha.

DROP POLICY IF EXISTS "rematricula_insert" ON public.rematricula_alunos;

CREATE POLICY "rematricula_insert"
  ON public.rematricula_alunos FOR INSERT TO authenticated
  WITH CHECK (
    (get_my_role() = 'unidade' AND unidade_id = auth.uid())
    OR get_my_role() IN ('marketing', 'supervisao')
  );
