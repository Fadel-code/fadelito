import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { RematriculaAluno } from "../types";
import toast from "react-hot-toast";

// Busca todos os alunos visíveis ao usuário logado (RLS filtra: unidade vê só os seus,
// marketing/supervisão veem todos). Mesmo hook serve as duas telas.
export function useRematricula() {
  const [alunos, setAlunos] = useState<RematriculaAluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("rematricula_alunos")
        .select("*, profiles!inner(unidade_nome)")
        .order("nome");
      if (error) throw error;
      setAlunos((data ?? []) as RematriculaAluno[]);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados de rematrícula");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    const channel = supabase
      .channel("rematricula-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "rematricula_alunos" }, () => carregar())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [carregar]);

  const adicionar = useCallback(
    async (unidadeId: string, nome: string, turma: string) => {
      const { error } = await supabase
        .from("rematricula_alunos")
        .insert({ unidade_id: unidadeId, nome: nome.trim(), turma: turma.trim() || null });
      if (error) {
        toast.error("Erro ao adicionar aluno");
        return false;
      }
      await carregar();
      return true;
    },
    [carregar]
  );

  const atualizar = useCallback(
    async (
      id: string,
      contratoAssinado: boolean,
      motivo: string,
      quemContatou: string,
      observacao: string,
      negociando: boolean,
      inadimplente: boolean
    ) => {
      setSalvando(id);
      try {
        const { error } = await supabase
          .from("rematricula_alunos")
          .update({
            contrato_assinado: contratoAssinado,
            motivo: contratoAssinado ? null : motivo.trim() || null,
            quem_contatou: quemContatou.trim() || null,
            observacao: observacao.trim() || null,
            negociando,
            inadimplente,
          })
          .eq("id", id);
        if (error) throw error;
        await carregar();
        return true;
      } catch (err) {
        console.error(err);
        toast.error("Erro ao atualizar aluno");
        return false;
      } finally {
        setSalvando(null);
      }
    },
    [carregar]
  );

  const remover = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("rematricula_alunos").delete().eq("id", id);
      if (error) {
        toast.error("Erro ao remover aluno");
        return false;
      }
      await carregar();
      return true;
    },
    [carregar]
  );

  // Append-only: soma um registro datado ao histórico de negociação e salva na hora,
  // separado do botão "Salvar" da linha pra não se perder junto com edições em rascunho.
  const adicionarHistorico = useCallback(
    async (id: string, texto: string) => {
      const aluno = alunos.find((a) => a.id === id);
      if (!aluno) return false;
      const historico = [...(aluno.negociacao_historico ?? []), { data: new Date().toISOString(), texto: texto.trim() }];
      const { error } = await supabase.from("rematricula_alunos").update({ negociacao_historico: historico }).eq("id", id);
      if (error) {
        toast.error("Erro ao registrar histórico");
        return false;
      }
      await carregar();
      return true;
    },
    [alunos, carregar]
  );

  return { alunos, loading, salvando, carregar, adicionar, atualizar, remover, adicionarHistorico };
}
