-- Marcar "Inadimplente" passa a ser exclusivo da Supervisão. Unidade continua
-- editando os outros campos normalmente (contrato, motivo, negociação etc.), mas
-- não pode mais alterar inadimplente — nem pela UI (já removida) nem via API direta.
-- Supervisão ganha permissão de UPDATE (hoje só "unidade" podia gravar), mas só o
-- campo inadimplente realmente é aplicado quando quem grava é supervisão.

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
  ELSE
    NEW.inadimplente := OLD.inadimplente;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_rematricula_restringir_campos
  BEFORE UPDATE ON public.rematricula_alunos
  FOR EACH ROW EXECUTE FUNCTION public.rematricula_restringir_campos_por_role();

DROP POLICY "rematricula_update" ON public.rematricula_alunos;

CREATE POLICY "rematricula_update"
  ON public.rematricula_alunos FOR UPDATE TO authenticated
  USING (
    (get_my_role() = 'unidade' AND unidade_id = auth.uid())
    OR get_my_role() = 'supervisao'
  )
  WITH CHECK (
    (get_my_role() = 'unidade' AND unidade_id = auth.uid())
    OR get_my_role() = 'supervisao'
  );
