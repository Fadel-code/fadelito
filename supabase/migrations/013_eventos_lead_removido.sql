-- Permite marcar um lead como "removido" do desfecho de uma unidade — uso local
-- para quando o CRM lista um lead que na verdade é de outra unidade (ver
-- eventos_lead.observacao para o motivo). Não é enviado ao CRM como outcome.

ALTER TABLE public.eventos_lead
  DROP CONSTRAINT IF EXISTS eventos_lead_tipo_check;

ALTER TABLE public.eventos_lead
  ADD CONSTRAINT eventos_lead_tipo_check
    CHECK (tipo IN ('visita_realizada', 'em_negociacao', 'matricula', 'nao_fechou', 'removido'));
