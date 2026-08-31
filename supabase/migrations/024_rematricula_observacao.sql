-- Campo livre de observação, preenchido quando o contrato já está assinado
-- (ocupa o espaço que ficava em branco ao lado do checkbox nesse caso).

ALTER TABLE public.rematricula_alunos
  ADD COLUMN observacao text;
