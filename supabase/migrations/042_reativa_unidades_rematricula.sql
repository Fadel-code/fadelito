-- Reativa Brooklin, Klabin, Real Parque e Perdizes para atualizarem status da Rematrícula.
-- Seguem fora da meta geral (REMATRICULA_FORA_DA_META no frontend).
UPDATE public.profiles
SET ativo = true
WHERE role = 'unidade'
  AND unidade_nome IN ('Brooklin', 'Klabin', 'Real Parque', 'Perdizes')
RETURNING unidade_nome, ativo;
