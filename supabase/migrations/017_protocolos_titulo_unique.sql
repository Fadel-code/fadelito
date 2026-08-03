-- Remove duplicatas geradas por uma reexecução acidental do seed (016)
-- e adiciona uma constraint pra impedir que isso volte a acontecer em silêncio.

DELETE FROM public.protocolos
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY titulo ORDER BY created_at, id) AS rn
    FROM public.protocolos
  ) ranked
  WHERE ranked.rn > 1
);

ALTER TABLE public.protocolos ADD CONSTRAINT protocolos_titulo_key UNIQUE (titulo);
