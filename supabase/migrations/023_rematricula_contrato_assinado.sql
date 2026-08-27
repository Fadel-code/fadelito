-- Substitui o campo "status" (escolha manual) pelo campo real da planilha:
-- CONTRATO ASSINADO. O status (rematriculado / não rematriculado / pendente)
-- passa a ser derivado no frontend a partir de contrato_assinado + motivo.

ALTER TABLE public.rematricula_alunos
  ADD COLUMN contrato_assinado boolean NOT NULL DEFAULT false;

UPDATE public.rematricula_alunos
  SET contrato_assinado = true
  WHERE status = 'rematriculado';

ALTER TABLE public.rematricula_alunos
  DROP COLUMN status;
