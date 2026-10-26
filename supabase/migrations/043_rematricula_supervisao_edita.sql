-- Supervisão passa a gravar de verdade todos os campos da rematrícula (contrato,
-- aceite, negociação, motivo, histórico...). Até aqui o trigger da 034/035 descartava
-- tudo exceto `inadimplente`, e a tela da supervisão era só uma prévia local: o número
-- subia na tela e voltava ao recarregar. Unidade continua sem poder mexer em inadimplente.

CREATE OR REPLACE FUNCTION public.rematricula_restringir_campos_por_role()
RETURNS trigger AS $$
BEGIN
  IF get_my_role() <> 'supervisao' THEN
    NEW.inadimplente := OLD.inadimplente;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
