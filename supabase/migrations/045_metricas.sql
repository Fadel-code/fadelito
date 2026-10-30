-- Métricas das unidades: o que vem das planilhas "Métricas - <Unidade>.xlsx" do Drive
-- e não existe em `registros`. Visitas, matrículas e desligamentos continuam vindo de
-- `registros` (consolidado_mensal); aqui entra só o resto.
-- Percentuais ficam como fração (0.24 = 24%), igual ao `pct()` do frontend.
-- Carga: `node frontend/scripts/importar-metricas.mjs <pasta> > metricas.sql` e colar no SQL Editor.

CREATE TABLE public.metricas_mensais (
  unidade_id      uuid     NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ano             smallint NOT NULL,
  mes             smallint NOT NULL CHECK (mes BETWEEN 1 AND 12),
  alunos          integer,
  treinamento_pct numeric(7,4),
  equipe_pct      numeric(7,4),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (unidade_id, ano, mes)
);

-- Mesma granularidade (unidade × ano): a meta de visitas e as perdas anuais que o
-- sistema não registra (não rematriculados e saída do Pré).
CREATE TABLE public.metricas_anuais (
  unidade_id         uuid     NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ano                smallint NOT NULL,
  meta_visitas       integer,
  perdas_rematricula integer,
  saidas_pre         integer,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (unidade_id, ano)
);

ALTER TABLE public.metricas_mensais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metricas_anuais  ENABLE ROW LEVEL SECURITY;

-- Só marketing e supervisão leem. Sem policy de escrita: a carga roda no SQL Editor.
CREATE POLICY "metricas_mensais_select" ON public.metricas_mensais
  FOR SELECT USING (get_my_role() IN ('marketing', 'supervisao'));
CREATE POLICY "metricas_anuais_select" ON public.metricas_anuais
  FOR SELECT USING (get_my_role() IN ('marketing', 'supervisao'));
