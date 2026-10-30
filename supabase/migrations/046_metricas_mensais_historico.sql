-- Visitas, matrículas e desligamentos de janeiro a maio: o formulário diário só tem registros
-- a partir de junho/2026, então o histórico anterior vem das planilhas "Métricas - <Unidade>.xlsx".
-- O app só usa estas colunas nos meses anteriores a MES_INICIO_FORMULARIO (Metricas.tsx);
-- de junho em diante vale `registros` (consolidado_mensal).
ALTER TABLE public.metricas_mensais
  ADD COLUMN IF NOT EXISTS visitas       integer,
  ADD COLUMN IF NOT EXISTS matriculas    integer,
  ADD COLUMN IF NOT EXISTS desligamentos integer;
