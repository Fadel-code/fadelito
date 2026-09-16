-- Rematrícula 2027: aceite verbal — família já disse que vai rematricular
-- mas ainda não assinou o contrato. Flag à parte, igual inadimplente.

ALTER TABLE public.rematricula_alunos
  ADD COLUMN aceite boolean NOT NULL DEFAULT false;
