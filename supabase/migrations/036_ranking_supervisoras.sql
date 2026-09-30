-- ============================================================
-- Fadelito — Migration 036: Ranking de Supervisoras (só login Marketing)
--
--  supervisoras           quem supervisiona (linha F ou P — colunas SUPER F./SUPER P. da planilha)
--  supervisora_unidades   quem cuida de qual unidade e a partir de/até qual mês
--  evolucao_rede_mensal   histórico da planilha "2026- Evolução Rede" (jan–jun) + alunos
--                         ativos por unidade/mês (base da perda). Campo NULL = usa o
--                         Formulário Diário (consolidado_mensal).
--
-- Seed: atribuição inicial = colunas SUPER F./SUPER P. da planilha (vale pra todo o ano).
-- Mudanças de carteira (Amanda, Vanessa, Andreia, Lilian, trocas de abril/maio) são
-- lançadas na aba Configuração do Ranking — não foram inferidas do texto da Planilha1.
-- Aborta inteira se algum nome de unidade não casar com profiles.unidade_nome.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.supervisoras (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text NOT NULL UNIQUE,
  linha      text NOT NULL CHECK (linha IN ('F', 'P')),
  ativo      boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supervisora_unidades (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisora_id uuid NOT NULL REFERENCES public.supervisoras(id) ON DELETE CASCADE,
  unidade_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mes_inicio     date NOT NULL CHECK (mes_inicio = date_trunc('month', mes_inicio)::date),
  mes_fim        date CHECK (mes_fim IS NULL OR mes_fim = date_trunc('month', mes_fim)::date),
  UNIQUE (supervisora_id, unidade_id, mes_inicio)
);

CREATE TABLE IF NOT EXISTS public.evolucao_rede_mensal (
  unidade_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mes           date NOT NULL CHECK (mes = date_trunc('month', mes)::date),
  visitas       integer,
  matriculas    integer,
  desligamentos integer,
  alunos_base   integer,
  PRIMARY KEY (unidade_id, mes)
);

ALTER TABLE public.supervisoras          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisora_unidades  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolucao_rede_mensal  ENABLE ROW LEVEL SECURITY;

-- Só marketing (supervisão e unidade não enxergam nem gravam).
DROP POLICY IF EXISTS "supervisoras_marketing" ON public.supervisoras;
CREATE POLICY "supervisoras_marketing" ON public.supervisoras
  FOR ALL TO authenticated
  USING (get_my_role() = 'marketing') WITH CHECK (get_my_role() = 'marketing');

DROP POLICY IF EXISTS "supervisora_unidades_marketing" ON public.supervisora_unidades;
CREATE POLICY "supervisora_unidades_marketing" ON public.supervisora_unidades
  FOR ALL TO authenticated
  USING (get_my_role() = 'marketing') WITH CHECK (get_my_role() = 'marketing');

DROP POLICY IF EXISTS "evolucao_rede_mensal_marketing" ON public.evolucao_rede_mensal;
CREATE POLICY "evolucao_rede_mensal_marketing" ON public.evolucao_rede_mensal
  FOR ALL TO authenticated
  USING (get_my_role() = 'marketing') WITH CHECK (get_my_role() = 'marketing');

-- Visitas/matrículas/desligamentos por unidade e mês vindos do Formulário Diário.
-- Mesmas somas de consolidado_mensal (inclui curso de férias), mas SEM filtrar
-- unidades inativas (Brooklin, Perdizes, Klabin, Real Parque têm histórico) e com
-- security_invoker: a RLS de registros vale pra quem consulta (o ranking é só marketing).
CREATE OR REPLACE VIEW public.ranking_dados_sistema
WITH (security_invoker = true) AS
SELECT
  unidade_id,
  date_trunc('month', data)::date                                          AS mes,
  SUM(COALESCE(visitas, 0) + COALESCE(visitas_curso_ferias, 0))::int       AS visitas,
  SUM(COALESCE(matriculas, 0) + COALESCE(matriculas_curso_ferias, 0))::int AS matriculas,
  SUM(COALESCE(desligamentos, 0))::int                                     AS desligamentos
FROM public.registros
GROUP BY unidade_id, date_trunc('month', data);

GRANT SELECT ON public.ranking_dados_sistema TO authenticated;

-- ---------------- Seed ----------------

INSERT INTO public.supervisoras (nome, linha) VALUES
  ('Flavia', 'F'),
  ('Moana', 'F'),
  ('Silvia', 'F'),
  ('Marilia', 'P'),
  ('Paty', 'P'),
  ('Thais', 'P')
ON CONFLICT (nome) DO NOTHING;

CREATE TEMP TABLE _seed_evolucao (
  unidade_nome text, mes date, visitas int, matriculas int, desligamentos int, alunos_base int
);

INSERT INTO _seed_evolucao VALUES
  ('Aclimação', '2026-01-01', 11, 5, 1, 65),
  ('Aclimação', '2026-02-01', 7, 5, 1, 71),
  ('Aclimação', '2026-03-01', 7, 1, 0, 72),
  ('Aclimação', '2026-04-01', 8, 1, 2, 73),
  ('Aclimação', '2026-05-01', 9, 0, 1, 72),
  ('Aclimação', '2026-06-01', 6, 3, 0, 73),
  ('Aclimação', '2026-07-01', NULL, NULL, NULL, 76),
  ('Anália Franco', '2026-01-01', 11, 6, 0, 65),
  ('Anália Franco', '2026-02-01', 5, 3, 0, 69),
  ('Anália Franco', '2026-03-01', 8, 2, 1, 69),
  ('Anália Franco', '2026-04-01', 6, 7, 3, 69),
  ('Anália Franco', '2026-05-01', 5, 3, 2, 69),
  ('Anália Franco', '2026-06-01', 6, 3, 0, 72),
  ('Anália Franco', '2026-07-01', NULL, NULL, NULL, 72),
  ('Boa Vista', '2026-01-01', 16, 1, 0, 95),
  ('Boa Vista', '2026-02-01', 12, 2, 0, 97),
  ('Boa Vista', '2026-03-01', 6, 1, 0, 98),
  ('Boa Vista', '2026-04-01', 11, 3, 2, 101),
  ('Boa Vista', '2026-05-01', 8, 1, 1, 102),
  ('Boa Vista', '2026-06-01', 5, 2, 0, 101),
  ('Boa Vista', '2026-07-01', NULL, NULL, NULL, 102),
  ('Bonfiglioli', '2026-01-01', 15, 5, 0, 88),
  ('Bonfiglioli', '2026-02-01', 6, 4, 1, 90),
  ('Bonfiglioli', '2026-03-01', 12, 5, 1, 93),
  ('Bonfiglioli', '2026-04-01', 7, 0, 1, 95),
  ('Bonfiglioli', '2026-05-01', 3, 1, 0, 94),
  ('Bonfiglioli', '2026-06-01', 4, 2, 0, 94),
  ('Bonfiglioli', '2026-07-01', NULL, NULL, NULL, 96),
  ('Brooklin', '2026-01-01', 11, 6, 0, 83),
  ('Brooklin', '2026-02-01', 8, 2, 0, 92),
  ('Brooklin', '2026-03-01', 5, 1, 0, 95),
  ('Brooklin', '2026-04-01', 10, 3, 0, 95),
  ('Brooklin', '2026-05-01', 6, 4, 0, 95),
  ('Brooklin', '2026-06-01', 5, 1, 0, 98),
  ('Brooklin', '2026-07-01', NULL, NULL, NULL, 99),
  ('Campinas', '2026-01-01', 16, 2, 1, 63),
  ('Campinas', '2026-02-01', 6, 2, 1, 68),
  ('Campinas', '2026-03-01', 9, 1, 1, 68),
  ('Campinas', '2026-04-01', 13, 3, 4, 68),
  ('Campinas', '2026-05-01', 12, 0, 3, 66),
  ('Campinas', '2026-06-01', 14, 0, 1, 67),
  ('Campinas', '2026-07-01', NULL, NULL, NULL, 67),
  ('Campo Belo', '2026-01-01', 23, 12, 1, 129),
  ('Campo Belo', '2026-02-01', 12, 1, 1, 146),
  ('Campo Belo', '2026-03-01', 5, 2, 2, 150),
  ('Campo Belo', '2026-04-01', 8, 4, 1, 147),
  ('Campo Belo', '2026-05-01', 8, 3, 1, 151),
  ('Campo Belo', '2026-06-01', 9, 9, 0, 151),
  ('Campo Belo', '2026-07-01', NULL, NULL, NULL, 153),
  ('Granja', '2026-01-01', 10, 2, 0, 40),
  ('Granja', '2026-02-01', 4, 1, 1, 43),
  ('Granja', '2026-03-01', 2, 0, 2, 43),
  ('Granja', '2026-04-01', 6, 1, 0, 42),
  ('Granja', '2026-05-01', 8, 2, 0, 42),
  ('Granja', '2026-06-01', 4, 2, 0, 45),
  ('Granja', '2026-07-01', NULL, NULL, NULL, 46),
  ('Guarulhos', '2026-01-01', 23, 5, 0, 61),
  ('Guarulhos', '2026-02-01', 12, 1, 3, 65),
  ('Guarulhos', '2026-03-01', 8, 3, 2, 62),
  ('Guarulhos', '2026-04-01', 6, 0, 1, 62),
  ('Guarulhos', '2026-05-01', 9, 2, 0, 65),
  ('Guarulhos', '2026-06-01', 11, 3, 0, 66),
  ('Guarulhos', '2026-07-01', NULL, NULL, NULL, 69),
  ('Higienópolis', '2026-01-01', 8, 3, 0, 20),
  ('Higienópolis', '2026-02-01', 5, 2, 0, 24),
  ('Higienópolis', '2026-03-01', 5, 1, 0, 26),
  ('Higienópolis', '2026-04-01', 7, 1, 0, 29),
  ('Higienópolis', '2026-05-01', 5, 3, 0, 29),
  ('Higienópolis', '2026-06-01', 6, 6, 0, 30),
  ('Higienópolis', '2026-07-01', NULL, NULL, NULL, 33),
  ('Indianópolis', '2026-01-01', 8, 4, 0, 33),
  ('Indianópolis', '2026-02-01', 4, 4, 1, 35),
  ('Indianópolis', '2026-03-01', 4, 2, 0, 37),
  ('Indianópolis', '2026-04-01', 4, 2, 0, 42),
  ('Indianópolis', '2026-05-01', 3, 2, 1, 43),
  ('Indianópolis', '2026-06-01', 4, 1, 0, 42),
  ('Indianópolis', '2026-07-01', NULL, NULL, NULL, 42),
  ('Ipiranga', '2026-01-01', 10, 3, 0, 94),
  ('Ipiranga', '2026-02-01', 9, 3, 4, 97),
  ('Ipiranga', '2026-03-01', 7, 0, 2, 96),
  ('Ipiranga', '2026-04-01', 2, 1, 0, 94),
  ('Ipiranga', '2026-05-01', 6, 2, 1, 93),
  ('Ipiranga', '2026-06-01', 10, 1, 1, 94),
  ('Ipiranga', '2026-07-01', NULL, NULL, NULL, 94),
  ('Jardins', '2026-01-01', 14, 2, 0, 53),
  ('Jardins', '2026-02-01', 11, 3, 0, 57),
  ('Jardins', '2026-03-01', 5, 1, 1, 58),
  ('Jardins', '2026-04-01', 6, 1, 2, 60),
  ('Jardins', '2026-05-01', 5, 0, 0, 58),
  ('Jardins', '2026-06-01', 7, 2, 3, 60),
  ('Jardins', '2026-07-01', NULL, NULL, NULL, 60),
  ('Klabin', '2026-01-01', 6, 4, 0, 83),
  ('Klabin', '2026-02-01', 2, 1, 0, 89),
  ('Klabin', '2026-03-01', 6, 3, 0, 90),
  ('Klabin', '2026-04-01', 3, 3, 1, 89),
  ('Klabin', '2026-05-01', 3, 4, 0, 90),
  ('Klabin', '2026-06-01', 4, 2, 0, 93),
  ('Klabin', '2026-07-01', NULL, NULL, NULL, 93),
  ('Lapa', '2026-01-01', 7, 15, 0, 92),
  ('Lapa', '2026-02-01', 7, 3, 1, 101),
  ('Lapa', '2026-03-01', 3, 1, 0, 102),
  ('Lapa', '2026-04-01', 10, 1, 0, 103),
  ('Lapa', '2026-05-01', 6, 2, 1, 107),
  ('Lapa', '2026-06-01', 12, 3, 0, 109),
  ('Lapa', '2026-07-01', NULL, NULL, NULL, 107),
  ('Marajoara', '2026-01-01', 17, 4, 0, 51),
  ('Marajoara', '2026-02-01', 8, 1, 0, 55),
  ('Marajoara', '2026-03-01', 4, 5, 1, 55),
  ('Marajoara', '2026-04-01', 6, 2, 1, 57),
  ('Marajoara', '2026-05-01', 6, 2, 0, 58),
  ('Marajoara', '2026-06-01', 4, 0, 0, 57),
  ('Marajoara', '2026-07-01', NULL, NULL, NULL, 60),
  ('Moema', '2026-01-01', 16, 9, 0, 59),
  ('Moema', '2026-02-01', 10, 3, 0, 69),
  ('Moema', '2026-03-01', 10, 0, 0, 73),
  ('Moema', '2026-04-01', 11, 3, 4, 73),
  ('Moema', '2026-05-01', 8, 3, 1, 70),
  ('Moema', '2026-06-01', 7, 2, 1, 71),
  ('Moema', '2026-07-01', NULL, NULL, NULL, 72),
  ('Mooca', '2026-01-01', 21, 3, 0, 80),
  ('Mooca', '2026-02-01', 9, 8, 0, 88),
  ('Mooca', '2026-03-01', 16, 1, 2, 90),
  ('Mooca', '2026-04-01', 11, 4, 4, 89),
  ('Mooca', '2026-05-01', 13, 2, 4, 91),
  ('Mooca', '2026-06-01', 5, 1, 0, 87),
  ('Mooca', '2026-07-01', NULL, NULL, NULL, 87),
  ('Osasco', '2026-01-01', 25, 4, 0, 63),
  ('Osasco', '2026-02-01', 16, 1, 0, 70),
  ('Osasco', '2026-03-01', 15, 6, 1, 72),
  ('Osasco', '2026-04-01', 12, 1, 0, 75),
  ('Osasco', '2026-05-01', 12, 2, 3, 77),
  ('Osasco', '2026-06-01', 8, 2, 0, 75),
  ('Osasco', '2026-07-01', NULL, NULL, NULL, 77),
  ('Panamby', '2026-01-01', 13, 5, 0, 113),
  ('Panamby', '2026-02-01', 12, 4, 1, 128),
  ('Panamby', '2026-03-01', 9, 2, 3, 128),
  ('Panamby', '2026-04-01', 10, 3, 1, 128),
  ('Panamby', '2026-05-01', 2, 1, 3, 131),
  ('Panamby', '2026-06-01', 11, 3, 3, 125),
  ('Panamby', '2026-07-01', NULL, NULL, NULL, 125),
  ('Paraíso', '2026-01-01', 13, 7, 0, 54),
  ('Paraíso', '2026-02-01', 2, 1, 1, 60),
  ('Paraíso', '2026-03-01', 4, 1, 1, 62),
  ('Paraíso', '2026-04-01', 7, 2, 1, 64),
  ('Paraíso', '2026-05-01', 11, 8, 0, 65),
  ('Paraíso', '2026-06-01', 3, 1, 0, 71),
  ('Paraíso', '2026-07-01', NULL, NULL, NULL, 74),
  ('Perdizes', '2026-01-01', 18, 7, 0, 147),
  ('Perdizes', '2026-02-01', 9, 4, 2, 151),
  ('Perdizes', '2026-03-01', 16, 5, 0, 155),
  ('Perdizes', '2026-04-01', 11, 4, 1, 155),
  ('Perdizes', '2026-05-01', 5, 2, 3, 159),
  ('Perdizes', '2026-06-01', 6, 1, 0, 159),
  ('Perdizes', '2026-07-01', NULL, NULL, NULL, 162),
  ('Pinheiros', '2026-01-01', 15, 12, 0, 107),
  ('Pinheiros', '2026-02-01', 8, 6, 5, 115),
  ('Pinheiros', '2026-03-01', 10, 4, 0, 116),
  ('Pinheiros', '2026-04-01', 3, 0, 0, 120),
  ('Pinheiros', '2026-05-01', 8, 4, 1, 120),
  ('Pinheiros', '2026-06-01', 11, 5, 2, 125),
  ('Pinheiros', '2026-07-01', NULL, NULL, NULL, 126),
  ('Piracicaba', '2026-01-01', 16, 6, 0, 104),
  ('Piracicaba', '2026-02-01', 4, 2, 1, 105),
  ('Piracicaba', '2026-03-01', 4, 2, 1, 111),
  ('Piracicaba', '2026-04-01', 7, 3, 0, 113),
  ('Piracicaba', '2026-05-01', 13, 1, 0, 118),
  ('Piracicaba', '2026-06-01', 5, 2, 0, 120),
  ('Piracicaba', '2026-07-01', NULL, NULL, NULL, 119),
  ('Portal', '2026-01-01', 26, 8, 0, 77),
  ('Portal', '2026-02-01', 8, 3, 2, 85),
  ('Portal', '2026-03-01', 15, 1, 0, 88),
  ('Portal', '2026-04-01', 10, 4, 1, 89),
  ('Portal', '2026-05-01', 7, 2, 0, 92),
  ('Portal', '2026-06-01', 7, 1, 0, 92),
  ('Portal', '2026-07-01', NULL, NULL, NULL, 91),
  ('Real Parque', '2026-01-01', 14, 10, 0, 75),
  ('Real Parque', '2026-02-01', 4, 3, 2, 77),
  ('Real Parque', '2026-03-01', 6, 1, 1, 77),
  ('Real Parque', '2026-04-01', 7, 3, 2, 79),
  ('Real Parque', '2026-05-01', 7, 2, 0, 79),
  ('Real Parque', '2026-06-01', 5, 2, 0, 81),
  ('Real Parque', '2026-07-01', NULL, NULL, NULL, 82),
  ('Santo André', '2026-01-01', 11, 0, 2, 39),
  ('Santo André', '2026-02-01', 12, 7, 1, 37),
  ('Santo André', '2026-03-01', 4, 2, 0, 41),
  ('Santo André', '2026-04-01', 6, 3, 0, 45),
  ('Santo André', '2026-05-01', 6, 2, 3, 45),
  ('Santo André', '2026-06-01', 7, 3, 0, 47),
  ('Santo André', '2026-07-01', NULL, NULL, NULL, 47),
  ('Saúde', '2026-01-01', 17, 3, 0, 67),
  ('Saúde', '2026-02-01', 4, 1, 0, 72),
  ('Saúde', '2026-03-01', 5, 1, 0, 74),
  ('Saúde', '2026-04-01', 5, 2, 1, 75),
  ('Saúde', '2026-05-01', 7, 1, 0, 75),
  ('Saúde', '2026-06-01', 1, 3, 0, 75),
  ('Saúde', '2026-07-01', NULL, NULL, NULL, 76),
  ('São Caetano', '2026-01-01', 16, 8, 2, 30),
  ('São Caetano', '2026-02-01', 7, 2, 0, 35),
  ('São Caetano', '2026-03-01', 7, 3, 0, 37),
  ('São Caetano', '2026-04-01', 10, 3, 1, 39),
  ('São Caetano', '2026-05-01', 6, 0, 1, 41),
  ('São Caetano', '2026-06-01', 9, 2, 3, 40),
  ('São Caetano', '2026-07-01', NULL, NULL, NULL, 37),
  ('Tatuapé', '2026-01-01', 24, 8, 0, 95),
  ('Tatuapé', '2026-02-01', 6, 6, 1, 104),
  ('Tatuapé', '2026-03-01', 9, 4, 0, 106),
  ('Tatuapé', '2026-04-01', 4, 2, 1, 115),
  ('Tatuapé', '2026-05-01', 3, 1, 0, 116),
  ('Tatuapé', '2026-06-01', 6, 1, 0, 116),
  ('Tatuapé', '2026-07-01', NULL, NULL, NULL, 118),
  ('Vila Gumercindo', '2026-01-01', 11, 8, 6, 79),
  ('Vila Gumercindo', '2026-02-01', 6, 1, 2, 81),
  ('Vila Gumercindo', '2026-03-01', 4, 1, 0, 81),
  ('Vila Gumercindo', '2026-04-01', 5, 1, 0, 81),
  ('Vila Gumercindo', '2026-05-01', 8, 1, 1, 88),
  ('Vila Gumercindo', '2026-06-01', 8, 2, 1, 81),
  ('Vila Gumercindo', '2026-07-01', NULL, NULL, NULL, 82),
  ('Vila Leopoldina', '2026-01-01', 10, 1, 0, 70),
  ('Vila Leopoldina', '2026-02-01', 6, 2, 3, 74),
  ('Vila Leopoldina', '2026-03-01', 8, 3, 0, 73),
  ('Vila Leopoldina', '2026-04-01', 6, 0, 3, 74),
  ('Vila Leopoldina', '2026-05-01', 10, 1, 2, 72),
  ('Vila Leopoldina', '2026-06-01', 2, 1, 1, 71),
  ('Vila Leopoldina', '2026-07-01', NULL, NULL, NULL, 72),
  ('Vila Madalena', '2026-01-01', 11, 6, 0, 53),
  ('Vila Madalena', '2026-02-01', 4, 2, 0, 61),
  ('Vila Madalena', '2026-03-01', 4, 2, 0, 64),
  ('Vila Madalena', '2026-04-01', 2, 2, 1, 64),
  ('Vila Madalena', '2026-05-01', 3, 1, 0, 68),
  ('Vila Madalena', '2026-06-01', 5, 1, 0, 69),
  ('Vila Madalena', '2026-07-01', NULL, NULL, NULL, 69),
  ('Vila Mariana', '2026-01-01', 13, 8, 0, 68),
  ('Vila Mariana', '2026-02-01', 2, 2, 1, 74),
  ('Vila Mariana', '2026-03-01', 6, 1, 2, 76),
  ('Vila Mariana', '2026-04-01', 6, 1, 1, 77),
  ('Vila Mariana', '2026-05-01', 6, 0, 1, 76),
  ('Vila Mariana', '2026-06-01', 10, 0, 0, 77),
  ('Vila Mariana', '2026-07-01', NULL, NULL, NULL, 74),
  ('Vila Sônia', '2026-01-01', 12, 2, 1, 69),
  ('Vila Sônia', '2026-02-01', 2, 1, 0, 69),
  ('Vila Sônia', '2026-03-01', 4, 1, 3, 72),
  ('Vila Sônia', '2026-04-01', 1, 0, 2, 70),
  ('Vila Sônia', '2026-05-01', 7, 1, 0, 70),
  ('Vila Sônia', '2026-06-01', 6, 2, 0, 70),
  ('Vila Sônia', '2026-07-01', NULL, NULL, NULL, 68);

CREATE TEMP TABLE _seed_atribuicao (unidade_nome text, supervisora text);

INSERT INTO _seed_atribuicao VALUES
  ('Aclimação', 'Moana'), ('Aclimação', 'Thais'),
  ('Anália Franco', 'Flavia'), ('Anália Franco', 'Paty'),
  ('Boa Vista', 'Moana'), ('Boa Vista', 'Marilia'),
  ('Bonfiglioli', 'Silvia'), ('Bonfiglioli', 'Thais'),
  ('Brooklin', 'Moana'), ('Brooklin', 'Thais'),
  ('Campinas', 'Flavia'), ('Campinas', 'Thais'),
  ('Campo Belo', 'Silvia'), ('Campo Belo', 'Paty'),
  ('Granja', 'Silvia'), ('Granja', 'Thais'),
  ('Guarulhos', 'Flavia'), ('Guarulhos', 'Marilia'),
  ('Higienópolis', 'Silvia'), ('Higienópolis', 'Thais'),
  ('Indianópolis', 'Silvia'), ('Indianópolis', 'Paty'),
  ('Ipiranga', 'Moana'), ('Ipiranga', 'Thais'),
  ('Jardins', 'Flavia'), ('Jardins', 'Marilia'),
  ('Klabin', 'Flavia'), ('Klabin', 'Thais'),
  ('Lapa', 'Silvia'), ('Lapa', 'Paty'),
  ('Marajoara', 'Flavia'), ('Marajoara', 'Marilia'),
  ('Moema', 'Flavia'), ('Moema', 'Marilia'),
  ('Mooca', 'Moana'), ('Mooca', 'Paty'),
  ('Osasco', 'Silvia'), ('Osasco', 'Thais'),
  ('Panamby', 'Flavia'), ('Panamby', 'Marilia'),
  ('Paraíso', 'Flavia'), ('Paraíso', 'Marilia'),
  ('Perdizes', 'Moana'), ('Perdizes', 'Paty'),
  ('Pinheiros', 'Silvia'), ('Pinheiros', 'Paty'),
  ('Piracicaba', 'Flavia'), ('Piracicaba', 'Marilia'),
  ('Portal', 'Flavia'), ('Portal', 'Marilia'),
  ('Real Parque', 'Flavia'), ('Real Parque', 'Thais'),
  ('Santo André', 'Moana'), ('Santo André', 'Paty'),
  ('Saúde', 'Moana'), ('Saúde', 'Paty'),
  ('São Caetano', 'Moana'), ('São Caetano', 'Paty'),
  ('Tatuapé', 'Silvia'), ('Tatuapé', 'Paty'),
  ('Vila Gumercindo', 'Moana'), ('Vila Gumercindo', 'Marilia'),
  ('Vila Leopoldina', 'Silvia'), ('Vila Leopoldina', 'Thais'),
  ('Vila Madalena', 'Silvia'), ('Vila Madalena', 'Paty'),
  ('Vila Mariana', 'Moana'), ('Vila Mariana', 'Marilia'),
  ('Vila Sônia', 'Silvia'), ('Vila Sônia', 'Thais');

DO $$
DECLARE faltando text;
BEGIN
  SELECT string_agg(DISTINCT s.unidade_nome, ', ') INTO faltando
  FROM (SELECT unidade_nome FROM _seed_evolucao UNION SELECT unidade_nome FROM _seed_atribuicao) s
  LEFT JOIN public.profiles p ON p.unidade_nome = s.unidade_nome AND p.role = 'unidade'
  WHERE p.id IS NULL;
  IF faltando IS NOT NULL THEN
    RAISE EXCEPTION 'Unidades sem perfil em profiles: %', faltando;
  END IF;
END $$;

INSERT INTO public.evolucao_rede_mensal (unidade_id, mes, visitas, matriculas, desligamentos, alunos_base)
SELECT p.id, s.mes, s.visitas, s.matriculas, s.desligamentos, s.alunos_base
FROM _seed_evolucao s
JOIN public.profiles p ON p.unidade_nome = s.unidade_nome AND p.role = 'unidade'
ON CONFLICT (unidade_id, mes) DO NOTHING;

INSERT INTO public.supervisora_unidades (supervisora_id, unidade_id, mes_inicio)
SELECT sv.id, p.id, '2026-01-01'
FROM _seed_atribuicao a
JOIN public.supervisoras sv ON sv.nome = a.supervisora
JOIN public.profiles p ON p.unidade_nome = a.unidade_nome AND p.role = 'unidade'
ON CONFLICT (supervisora_id, unidade_id, mes_inicio) DO NOTHING;

DROP TABLE _seed_evolucao;
DROP TABLE _seed_atribuicao;

COMMIT;
