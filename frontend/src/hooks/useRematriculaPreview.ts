import { useCallback, useState } from "react";
import type { RematriculaAluno } from "../types";

// Mesma interface de useRematricula, mas 100% em memória — não toca o Supabase.
// Usada só para a supervisão pré-visualizar a tela da unidade sem gravar dados reais.
export function useRematriculaPreview() {
  const [alunos, setAlunos] = useState<RematriculaAluno[]>([]);
  const [salvando, setSalvando] = useState<string | null>(null);

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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    return true;
  }, []);

  const atualizar = useCallback(async (id: string, contratoAssinado: boolean, motivo: string, quemContatou: string) => {
    setSalvando(id);
    setAlunos((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              contrato_assinado: contratoAssinado,
              motivo: contratoAssinado ? null : motivo.trim() || null,
              quem_contatou: quemContatou.trim() || null,
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
