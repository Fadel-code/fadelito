-- Supervisão só grava "inadimplente". O trigger da 034 esquecia de `aceite`
-- ("Aguardando contrato assinado"): o valor desatualizado da prévia da supervisão
-- podia sobrescrever o que a unidade marcou. Recria a função protegendo aceite também.

CREATE OR REPLACE FUNCTION public.rematricula_restringir_campos_por_role()
RETURNS trigger AS $$
BEGIN
  IF get_my_role() = 'supervisao' THEN
    NEW.nome := OLD.nome;
    NEW.turma := OLD.turma;
    NEW.contrato_assinado := OLD.contrato_assinado;
    NEW.motivo := OLD.motivo;
    NEW.quem_contatou := OLD.quem_contatou;
    NEW.observacao := OLD.observacao;
    NEW.negociando := OLD.negociando;
    NEW.negociacao_historico := OLD.negociacao_historico;
    NEW.aceite := OLD.aceite;
  ELSE
    NEW.inadimplente := OLD.inadimplente;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
