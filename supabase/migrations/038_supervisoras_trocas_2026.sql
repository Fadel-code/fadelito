-- ============================================================
-- Fadelito — Migration 038: trocas de supervisoras ao longo de 2026
--
-- A 036 carregou só a foto das colunas SUPER F./SUPER P. (cada supervisora com as mesmas
-- 11–12 unidades o ano todo). Esta migration recria a carteira com as trocas descritas na
-- aba Planilha1 de "2026- Evolução Rede": quando uma unidade sai da supervisora X no mês Y,
-- X deixa de receber a unidade dali pra frente (mes_fim) e a nova supervisora começa em Y.
--
-- Regras usadas:
--  * "até março" = mes_fim 03; "a partir de abril/maio/junho" = mes_inicio 04/05/06.
--  * Antes da 1ª citação da unidade na Planilha1, vale a supervisora das colunas SUPER F./P.
--  * Amanda entra em abril nas 5 unidades (as antecessoras saem "até março").
--  * Vanessa: Leopoldina até março (Silvia assume em abril); Moema, Marajoara e Vila Mariana
--    a partir de abril (Flavia/Moana as tinham antes).
--  * Linha P: Thais sai (abril/maio/junho, conforme a sucessora); Andreia e Lilian entram em maio.
--  * Osasco: Thais até março e Marilia de abril a agosto (a planilha diz "jan a ago", mas as
--    médias de janeiro da própria planilha só fecham com Osasco na Thais).
--  * Anália Franco (P) e Guarulhos (P) não aparecem na Planilha1: mantidas como estavam.
--  * Moana/"V. Mariana a partir de abril" foi ignorado (Vanessa assume Vila Mariana em abril).
--
-- Fica SEM supervisora (a planilha não diz quem assumiu; a tela de Configuração avisa):
--  * Linha F: Vila Madalena a partir de abril.
--  * Linha P: Osasco, Moema, Marajoara e Vila Leopoldina a partir de setembro.
--
-- ATENÇÃO: substitui TODA a carteira (supervisora_unidades). Ajustes manuais feitos na
-- aba Configuração antes desta migration serão perdidos.
-- ============================================================

BEGIN;

INSERT INTO public.supervisoras (nome, linha) VALUES
  ('Amanda', 'F'),
  ('Vanessa', 'F'),
  ('Andreia', 'P'),
  ('Lilian', 'P')
ON CONFLICT (nome) DO NOTHING;

CREATE TEMP TABLE _carteira (supervisora text, unidade_nome text, mes_inicio date, mes_fim date);

INSERT INTO _carteira VALUES
  ('Moana', 'Aclimação', '2026-01-01', '2026-03-01'),
  ('Amanda', 'Aclimação', '2026-04-01', NULL),
  ('Flavia', 'Anália Franco', '2026-01-01', NULL),
  ('Moana', 'Boa Vista', '2026-01-01', '2026-03-01'),
  ('Silvia', 'Boa Vista', '2026-04-01', NULL),
  ('Silvia', 'Bonfiglioli', '2026-01-01', NULL),
  ('Moana', 'Brooklin', '2026-01-01', NULL),
  ('Flavia', 'Campinas', '2026-01-01', NULL),
  ('Silvia', 'Campo Belo', '2026-01-01', NULL),
  ('Silvia', 'Granja', '2026-01-01', '2026-03-01'),
  ('Moana', 'Granja', '2026-04-01', NULL),
  ('Flavia', 'Guarulhos', '2026-01-01', NULL),
  ('Silvia', 'Higienópolis', '2026-01-01', '2026-03-01'),
  ('Amanda', 'Higienópolis', '2026-04-01', NULL),
  ('Silvia', 'Indianópolis', '2026-01-01', '2026-03-01'),
  ('Amanda', 'Indianópolis', '2026-04-01', NULL),
  ('Moana', 'Ipiranga', '2026-01-01', NULL),
  ('Flavia', 'Jardins', '2026-01-01', NULL),
  ('Flavia', 'Klabin', '2026-01-01', NULL),
  ('Silvia', 'Lapa', '2026-01-01', '2026-03-01'),
  ('Moana', 'Lapa', '2026-04-01', NULL),
  ('Flavia', 'Marajoara', '2026-01-01', '2026-03-01'),
  ('Vanessa', 'Marajoara', '2026-04-01', NULL),
  ('Flavia', 'Moema', '2026-01-01', '2026-03-01'),
  ('Vanessa', 'Moema', '2026-04-01', NULL),
  ('Moana', 'Mooca', '2026-01-01', NULL),
  ('Silvia', 'Osasco', '2026-01-01', NULL),
  ('Flavia', 'Panamby', '2026-01-01', NULL),
  ('Flavia', 'Paraíso', '2026-01-01', NULL),
  ('Moana', 'Perdizes', '2026-01-01', NULL),
  ('Silvia', 'Pinheiros', '2026-01-01', '2026-03-01'),
  ('Amanda', 'Pinheiros', '2026-04-01', NULL),
  ('Flavia', 'Piracicaba', '2026-01-01', NULL),
  ('Flavia', 'Portal', '2026-01-01', NULL),
  ('Flavia', 'Real Parque', '2026-01-01', NULL),
  ('Moana', 'Santo André', '2026-01-01', '2026-03-01'),
  ('Amanda', 'Santo André', '2026-04-01', NULL),
  ('Moana', 'Saúde', '2026-01-01', NULL),
  ('Moana', 'São Caetano', '2026-01-01', NULL),
  ('Silvia', 'Tatuapé', '2026-01-01', '2026-03-01'),
  ('Flavia', 'Tatuapé', '2026-04-01', NULL),
  ('Moana', 'Vila Gumercindo', '2026-01-01', NULL),
  ('Vanessa', 'Vila Leopoldina', '2026-01-01', '2026-03-01'),
  ('Silvia', 'Vila Leopoldina', '2026-04-01', NULL),
  ('Silvia', 'Vila Madalena', '2026-01-01', '2026-03-01'),
  ('Moana', 'Vila Mariana', '2026-01-01', '2026-03-01'),
  ('Vanessa', 'Vila Mariana', '2026-04-01', NULL),
  ('Silvia', 'Vila Sônia', '2026-01-01', NULL),
  ('Thais', 'Aclimação', '2026-01-01', '2026-03-01'),
  ('Paty', 'Aclimação', '2026-04-01', NULL),
  ('Paty', 'Anália Franco', '2026-01-01', NULL),
  ('Marilia', 'Boa Vista', '2026-01-01', '2026-04-01'),
  ('Andreia', 'Boa Vista', '2026-05-01', NULL),
  ('Thais', 'Bonfiglioli', '2026-01-01', '2026-03-01'),
  ('Paty', 'Bonfiglioli', '2026-04-01', NULL),
  ('Thais', 'Brooklin', '2026-01-01', '2026-04-01'),
  ('Lilian', 'Brooklin', '2026-05-01', NULL),
  ('Thais', 'Campinas', '2026-01-01', '2026-05-01'),
  ('Marilia', 'Campinas', '2026-06-01', NULL),
  ('Paty', 'Campo Belo', '2026-01-01', NULL),
  ('Thais', 'Granja', '2026-01-01', '2026-04-01'),
  ('Lilian', 'Granja', '2026-05-01', NULL),
  ('Marilia', 'Guarulhos', '2026-01-01', NULL),
  ('Thais', 'Higienópolis', '2026-01-01', '2026-03-01'),
  ('Paty', 'Higienópolis', '2026-04-01', NULL),
  ('Paty', 'Indianópolis', '2026-01-01', '2026-04-01'),
  ('Andreia', 'Indianópolis', '2026-05-01', NULL),
  ('Thais', 'Ipiranga', '2026-01-01', '2026-04-01'),
  ('Andreia', 'Ipiranga', '2026-05-01', NULL),
  ('Marilia', 'Jardins', '2026-01-01', '2026-04-01'),
  ('Lilian', 'Jardins', '2026-05-01', NULL),
  ('Thais', 'Klabin', '2026-01-01', '2026-04-01'),
  ('Lilian', 'Klabin', '2026-05-01', NULL),
  ('Paty', 'Lapa', '2026-01-01', '2026-04-01'),
  ('Andreia', 'Lapa', '2026-05-01', NULL),
  ('Marilia', 'Marajoara', '2026-01-01', '2026-08-01'),
  ('Marilia', 'Moema', '2026-01-01', '2026-08-01'),
  ('Paty', 'Mooca', '2026-01-01', '2026-04-01'),
  ('Andreia', 'Mooca', '2026-05-01', NULL),
  ('Thais', 'Osasco', '2026-01-01', '2026-03-01'),
  ('Marilia', 'Osasco', '2026-04-01', '2026-08-01'),
  ('Marilia', 'Panamby', '2026-01-01', NULL),
  ('Marilia', 'Paraíso', '2026-01-01', NULL),
  ('Paty', 'Perdizes', '2026-01-01', '2026-04-01'),
  ('Lilian', 'Perdizes', '2026-05-01', NULL),
  ('Paty', 'Pinheiros', '2026-01-01', NULL),
  ('Marilia', 'Piracicaba', '2026-01-01', NULL),
  ('Marilia', 'Portal', '2026-01-01', NULL),
  ('Thais', 'Real Parque', '2026-01-01', '2026-04-01'),
  ('Lilian', 'Real Parque', '2026-05-01', NULL),
  ('Paty', 'Santo André', '2026-01-01', NULL),
  ('Paty', 'Saúde', '2026-01-01', '2026-04-01'),
  ('Lilian', 'Saúde', '2026-05-01', NULL),
  ('Paty', 'São Caetano', '2026-01-01', NULL),
  ('Paty', 'Tatuapé', '2026-01-01', '2026-04-01'),
  ('Lilian', 'Tatuapé', '2026-05-01', NULL),
  ('Marilia', 'Vila Gumercindo', '2026-01-01', '2026-04-01'),
  ('Andreia', 'Vila Gumercindo', '2026-05-01', NULL),
  ('Thais', 'Vila Leopoldina', '2026-01-01', '2026-03-01'),
  ('Marilia', 'Vila Leopoldina', '2026-04-01', '2026-08-01'),
  ('Paty', 'Vila Madalena', '2026-01-01', '2026-04-01'),
  ('Lilian', 'Vila Madalena', '2026-05-01', NULL),
  ('Marilia', 'Vila Mariana', '2026-01-01', '2026-04-01'),
  ('Andreia', 'Vila Mariana', '2026-05-01', NULL),
  ('Thais', 'Vila Sônia', '2026-01-01', '2026-03-01'),
  ('Paty', 'Vila Sônia', '2026-04-01', NULL);

DO $$
DECLARE faltando text;
BEGIN
  SELECT string_agg(DISTINCT x.nome, ', ') INTO faltando FROM (
    SELECT c.unidade_nome AS nome FROM _carteira c
      LEFT JOIN public.profiles p ON p.unidade_nome = c.unidade_nome AND p.role = 'unidade' WHERE p.id IS NULL
    UNION
    SELECT c.supervisora FROM _carteira c
      LEFT JOIN public.supervisoras s ON s.nome = c.supervisora WHERE s.id IS NULL
  ) x;
  IF faltando IS NOT NULL THEN
    RAISE EXCEPTION 'Sem correspondência em profiles/supervisoras: %', faltando;
  END IF;
END $$;

DELETE FROM public.supervisora_unidades;

INSERT INTO public.supervisora_unidades (supervisora_id, unidade_id, mes_inicio, mes_fim)
SELECT s.id, p.id, c.mes_inicio, c.mes_fim
FROM _carteira c
JOIN public.supervisoras s ON s.nome = c.supervisora
JOIN public.profiles p ON p.unidade_nome = c.unidade_nome AND p.role = 'unidade';

DROP TABLE _carteira;

COMMIT;
