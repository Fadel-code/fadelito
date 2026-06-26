-- View consolidado_mensal
-- Agrega registros por unidade + mês com os mesmos cálculos do frontend,
-- eliminando a necessidade de paginação no BI (que bate no limite de 1000 linhas
-- ao consultar a tabela raw com ~4600 registros por mês).

CREATE OR REPLACE VIEW public.consolidado_mensal AS
SELECT
  p.id                                                          AS unidade_id,
  p.unidade_nome,
  DATE_TRUNC('month', r.data)::date                            AS mes,

  -- campos brutos (espelham as colunas da tabela registros)
  SUM(r.visitas)                                                AS visitas,
  SUM(r.visitas_curso_ferias)                                   AS visitas_curso_ferias,
  SUM(r.matriculas)                                             AS matriculas,
  SUM(r.matriculas_curso_ferias)                                AS matriculas_curso_ferias,
  SUM(r.desligamentos)                                          AS desligamentos,
  SUM(r.transferencias)                                         AS transferencias,
  SUM(r.religamentos)                                           AS religamentos,

  -- campos calculados (idênticos ao frontend)
  SUM(r.visitas) + SUM(r.visitas_curso_ferias)                  AS visitas_totais,
  SUM(r.matriculas) + SUM(r.matriculas_curso_ferias)            AS matriculas_totais,
  (SUM(r.matriculas) + SUM(r.matriculas_curso_ferias))
    - SUM(r.desligamentos)                                      AS saldo,

  -- aproveitamento em % (NULL quando não há visitas)
  CASE
    WHEN (SUM(r.visitas) + SUM(r.visitas_curso_ferias)) > 0
    THEN ROUND(
      (SUM(r.matriculas) + SUM(r.matriculas_curso_ferias))::numeric
      / (SUM(r.visitas) + SUM(r.visitas_curso_ferias)) * 100,
      1
    )
    ELSE NULL
  END                                                           AS aproveitamento_pct

FROM public.profiles p
JOIN public.registros r ON r.unidade_id = p.id
WHERE p.role = 'unidade'
  AND p.ativo = true
GROUP BY p.id, p.unidade_nome, DATE_TRUNC('month', r.data)
ORDER BY p.unidade_nome, mes;

-- Garante acesso ao role authenticated (mesma RLS do BI)
GRANT SELECT ON public.consolidado_mensal TO authenticated;

-- View diária — útil para filtros por dia no BI
CREATE OR REPLACE VIEW public.consolidado_diario AS
SELECT
  p.id                                                          AS unidade_id,
  p.unidade_nome,
  r.data,

  SUM(r.visitas)                                                AS visitas,
  SUM(r.visitas_curso_ferias)                                   AS visitas_curso_ferias,
  SUM(r.matriculas)                                             AS matriculas,
  SUM(r.matriculas_curso_ferias)                                AS matriculas_curso_ferias,
  SUM(r.desligamentos)                                          AS desligamentos,
  SUM(r.transferencias)                                         AS transferencias,
  SUM(r.religamentos)                                           AS religamentos,

  SUM(r.visitas) + SUM(r.visitas_curso_ferias)                  AS visitas_totais,
  SUM(r.matriculas) + SUM(r.matriculas_curso_ferias)            AS matriculas_totais,
  (SUM(r.matriculas) + SUM(r.matriculas_curso_ferias))
    - SUM(r.desligamentos)                                      AS saldo,

  CASE
    WHEN (SUM(r.visitas) + SUM(r.visitas_curso_ferias)) > 0
    THEN ROUND(
      (SUM(r.matriculas) + SUM(r.matriculas_curso_ferias))::numeric
      / (SUM(r.visitas) + SUM(r.visitas_curso_ferias)) * 100,
      1
    )
    ELSE NULL
  END                                                           AS aproveitamento_pct

FROM public.profiles p
JOIN public.registros r ON r.unidade_id = p.id
WHERE p.role = 'unidade'
  AND p.ativo = true
GROUP BY p.id, p.unidade_nome, r.data
ORDER BY p.unidade_nome, r.data;

GRANT SELECT ON public.consolidado_diario TO authenticated;
