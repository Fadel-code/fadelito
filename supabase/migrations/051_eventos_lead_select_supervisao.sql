-- Supervisão não enxergava nenhum desfecho (eventos_lead): em produção o login
-- supervisao@ recebia 0 linhas mesmo com get_my_role() = 'supervisao'.
-- A política ativa no banco divergiu da 007; recria a leitura como na 007.
--
-- Diagnóstico (rode antes, se quiser ver o que está ativo):
--   SELECT policyname, permissive, roles, cmd, qual
--   FROM pg_policies WHERE tablename = 'eventos_lead';

DROP POLICY IF EXISTS "eventos_lead_select" ON public.eventos_lead;
CREATE POLICY "eventos_lead_select"
  ON public.eventos_lead FOR SELECT TO authenticated
  USING (
    unidade_id = auth.uid()
    OR get_my_role() IN ('marketing', 'supervisao')
  );
