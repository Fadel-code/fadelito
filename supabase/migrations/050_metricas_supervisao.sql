-- Métricas volta a ser visível para a supervisão (leitura); o Ranking continua só do Marketing.
-- Desfaz a restrição da 047.
DROP POLICY IF EXISTS "metricas_mensais_select" ON public.metricas_mensais;
DROP POLICY IF EXISTS "metricas_anuais_select" ON public.metricas_anuais;

CREATE POLICY "metricas_mensais_select" ON public.metricas_mensais
  FOR SELECT USING (get_my_role() IN ('marketing', 'supervisao'));
CREATE POLICY "metricas_anuais_select" ON public.metricas_anuais
  FOR SELECT USING (get_my_role() IN ('marketing', 'supervisao'));
