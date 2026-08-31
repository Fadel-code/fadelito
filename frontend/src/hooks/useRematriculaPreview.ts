import { useCallback, useEffect, useRef, useState } from "react";
import type { RematriculaAluno } from "../types";

// Mesma interface de useRematricula, mas 100% em memória — não toca o Supabase.
// Usada pela supervisão para testar a tela da unidade sem gravar no banco real.
// Aceita uma carga inicial (ex: dados reais de uma unidade) só pra semear a lista —
// a partir daí toda edição fica local, nunca é escrita de volta no Supabase.
export function useRematriculaPreview(seed?: RematriculaAluno[]) {
  const [alunos, setAlunos] = useState<RematriculaAluno[]>(seed ?? []);
  const [salvando, setSalvando] = useState<string | null>(null);
  const jaSemeou = useRef(!!seed?.length);

  useEffect(() => {
    if (!jaSemeou.current && seed?.length) {
      setAlunos(seed);
      jaSemeou.current = true;
    }
  }, [seed]);

  const adicionar = useCallback(async (unidadeId: string, nome: string, turma: string) => {
    setAlunos((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        unidade_id: unidadeId,
        nome: nome.trim(),
        turma: turma.trim() || null,
        contrato_assinado: false,
        motivo: null,
        quem_contatou: null,
        observacao: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    return true;
  }, []);

  const atualizar = useCallback(async (id: string, contratoAssinado: boolean, motivo: string, quemContatou: string, observacao: string) => {
    setSalvando(id);
    setAlunos((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              contrato_assinado: contratoAssinado,
              motivo: contratoAssinado ? null : motivo.trim() || null,
              quem_contatou: quemContatou.trim() || null,
              observacao: observacao.trim() || null,
            }
          : a
      )
    );
    setSalvando(null);
    return true;
  }, []);

  const remover = useCallback(async (id: string) => {
    setAlunos((prev) => prev.filter((a) => a.id !== id));
    return true;
  }, []);

  return { alunos, loading: false, salvando, adicionar, atualizar, remover };
}
