-- Só supervisão pode remover aluno da lista de rematrícula enviada/importada.
-- UI já escondia o botão de unidade, mas RLS ainda permitia via API direta;
-- marketing perde a permissão e supervisão ganha botão de remoção real (não-prévia).
DROP POLICY "rematricula_delete" ON public.rematricula_alunos;

CREATE POLICY "rematricula_delete"
  ON public.rematricula_alunos FOR DELETE TO authenticated
  USING (get_my_role() = 'supervisao');
