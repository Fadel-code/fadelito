-- Ranking de Supervisoras: período com datas personalizadas.
-- Quando o intervalo corta um mês no meio (ex.: 10/08 a 20/08), a view mensal não serve:
-- esta função soma o Formulário Diário só dos dias pedidos, por unidade e mês.
-- SECURITY INVOKER: a RLS de registros vale pra quem chama (o ranking é só marketing).
CREATE OR REPLACE FUNCTION public.ranking_dados_intervalo(p_inicio date, p_fim date)
RETURNS TABLE (unidade_id uuid, mes date, visitas int, matriculas int, desligamentos int)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public AS $$
  SELECT
    r.unidade_id,
    date_trunc('month', r.data)::date,
    SUM(COALESCE(r.visitas, 0) + COALESCE(r.visitas_curso_ferias, 0))::int,
    SUM(COALESCE(r.matriculas, 0) + COALESCE(r.matriculas_curso_ferias, 0))::int,
    SUM(COALESCE(r.desligamentos, 0))::int
  FROM public.registros r
  WHERE r.data BETWEEN p_inicio AND p_fim
  GROUP BY r.unidade_id, date_trunc('month', r.data)
  ORDER BY 2, 1
$$;

GRANT EXECUTE ON FUNCTION public.ranking_dados_intervalo(date, date) TO authenticated;
