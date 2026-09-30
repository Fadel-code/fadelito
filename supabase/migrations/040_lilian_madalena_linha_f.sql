-- ============================================================
-- Fadelito — Migration 040: Vila Madalena na linha F
--
-- A 038 deixou a Vila Madalena sem supervisora na linha F de abril em diante (Silvia sai
-- "até março" e a Planilha1 só cita Lilian, que entrou na linha P). Decisão: Silvia segue em
-- abril e Lilian assume a linha F da Madalena a partir de maio, além da linha P que já tinha.
--
-- Lilian passa a ter um registro por linha, então o nome deixa de ser único sozinho.
-- Rode depois da 038. Pode rodar de novo sem efeito.
-- ============================================================

BEGIN;

ALTER TABLE public.supervisoras DROP CONSTRAINT IF EXISTS supervisoras_nome_key;
ALTER TABLE public.supervisoras DROP CONSTRAINT IF EXISTS supervisoras_nome_linha_key;
ALTER TABLE public.supervisoras ADD CONSTRAINT supervisoras_nome_linha_key UNIQUE (nome, linha);

INSERT INTO public.supervisoras (nome, linha) VALUES ('Lilian', 'F')
ON CONFLICT (nome, linha) DO NOTHING;

UPDATE public.supervisora_unidades su
SET mes_fim = '2026-04-01'
FROM public.supervisoras s, public.profiles p
WHERE su.supervisora_id = s.id AND su.unidade_id = p.id
  AND s.nome = 'Silvia' AND s.linha = 'F'
  AND p.unidade_nome = 'Vila Madalena' AND p.role = 'unidade'
  AND su.mes_fim = '2026-03-01';

INSERT INTO public.supervisora_unidades (supervisora_id, unidade_id, mes_inicio, mes_fim)
SELECT s.id, p.id, '2026-05-01', NULL
FROM public.supervisoras s, public.profiles p
WHERE s.nome = 'Lilian' AND s.linha = 'F'
  AND p.unidade_nome = 'Vila Madalena' AND p.role = 'unidade'
ON CONFLICT (supervisora_id, unidade_id, mes_inicio) DO NOTHING;

COMMIT;
