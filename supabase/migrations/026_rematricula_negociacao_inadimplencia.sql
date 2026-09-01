-- Rematrícula 2027: opção "negociando" (família ainda pensando), destaque de
-- inadimplência e histórico de registros de negociação (append-only).

ALTER TABLE public.rematricula_alunos
  ADD COLUMN negociando boolean NOT NULL DEFAULT false,
  ADD COLUMN inadimplente boolean NOT NULL DEFAULT false,
  ADD COLUMN negociacao_historico jsonb NOT NULL DEFAULT '[]'::jsonb;
