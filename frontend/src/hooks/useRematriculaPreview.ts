import { useCallback, useEffect, useState } from "react";
import type { RematriculaAluno } from "../types";

// Mesma interface de useRematricula, mas atualizar/histórico ficam 100% em memória —
// não tocam o Supabase (remover é sobrescrito por fora com o delete real). Não há
// `adicionar` aqui de propósito: incluir aluno precisa gravar de verdade, senão o
// total sobe na tela e volta ao recarregar.
// A lista acompanha `reais` pelo id: aluno incluído/removido no Supabase entra/sai, e
// quem já foi mexido na prévia mantém a cópia local.
export function useRematriculaPreview(reais: RematriculaAluno[]) {
  const [alunos, setAlunos] = useState<RematriculaAluno[]>(reais);
  const [salvando, setSalvando] = useState<string | null>(null);

  useEffect(() => {
    setAlunos((prev) => {
      const locais = new Map(prev.map((a) => [a.id, a]));
      return reais.map((r) => locais.get(r.id) ?? r);
    });
  }, [reais]);

  const atualizar = useCallback(
    async (
      id: string,
      contratoAssinado: boolean,
      motivo: string,
      quemContatou: string,
      observacao: string,
      negociando: boolean,
      inadimplente: boolean,
      aceite: boolean
    ) => {
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
                negociando,
                inadimplente,
                aceite,
              }
            : a
        )
      );
      setSalvando(null);
      return true;
    },
    []
  );

  const remover = useCallback(async (id: string) => {
    setAlunos((prev) => prev.filter((a) => a.id !== id));
    return true;
  }, []);

  const adicionarHistorico = useCallback(async (id: string, texto: string) => {
    setAlunos((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, negociacao_historico: [...(a.negociacao_historico ?? []), { data: new Date().toISOString(), texto: texto.trim() }] }
          : a
      )
    );
    return true;
  }, []);

  return { alunos, loading: false, salvando, atualizar, remover, adicionarHistorico };
}
