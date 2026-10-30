-- Métricas é só do login Marketing: a supervisão deixa de ler as planilhas importadas.
-- (Na 045 a leitura incluía 'supervisao'.)
DROP POLICY IF EXISTS "metricas_mensais_select" ON public.metricas_mensais;
DROP POLICY IF EXISTS "metricas_anuais_select" ON public.metricas_anuais;

CREATE POLICY "metricas_mensais_select" ON public.metricas_mensais
  FOR SELECT USING (get_my_role() = 'marketing');
CREATE POLICY "metricas_anuais_select" ON public.metricas_anuais
  FOR SELECT USING (get_my_role() = 'marketing');
