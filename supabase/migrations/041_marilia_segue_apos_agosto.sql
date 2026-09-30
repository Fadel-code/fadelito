-- ============================================================
-- Fadelito — Migration 041: Marilia segue após agosto (linha P)
--
-- A 038 encerrou a Marilia em agosto em Osasco, Moema, Marajoara e Vila Leopoldina
-- ("DE JANEIRO A AGOSTO" / "DE ABRIL A AGOSTO" na Planilha1), o que deixou as 4 unidades
-- sem supervisora na linha P de setembro em diante. A planilha não cita outra supervisora,
-- então a Marilia continua nelas. Rode depois da 038. Pode rodar de novo sem efeito.
-- ============================================================

BEGIN;

UPDATE public.supervisora_unidades su
SET mes_fim = NULL
FROM public.supervisoras s, public.profiles p
WHERE su.supervisora_id = s.id AND su.unidade_id = p.id
  AND s.nome = 'Marilia' AND s.linha = 'P'
  AND p.role = 'unidade'
  AND p.unidade_nome IN ('Osasco', 'Moema', 'Marajoara', 'Vila Leopoldina')
  AND su.mes_fim = '2026-08-01';

COMMIT;
