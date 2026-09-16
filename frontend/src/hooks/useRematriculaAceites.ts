import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import type { RematriculaAceiteDia, RematriculaAceiteInput } from "../types";
import toast from "react-hot-toast";

interface AceitesPorUnidade {
  unidade_id: string;
  unidade_nome: string;
  quantidade: number;
}

// Um registro por unidade+dia+turma, igual ao preenchimento diário de visitas
// em `registros`. RLS filtra: unidade vê/grava só os seus dias; marketing/
// supervisão gravam por qualquer unidade.
export function useRematriculaAceites() {
  const [linhas, setLinhas] = useState<RematriculaAceiteDia[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("rematricula_aceites")
        .select("*, profiles!inner(unidade_nome)")
        .order("data", { ascending: false });
      if (error) throw error;
      setLinhas((data ?? []) as RematriculaAceiteDia[]);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar aceites");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    const channel = supabase
      .channel("rematricula-aceites-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "rematricula_aceites" }, () => carregar())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [carregar]);

  const salvar = useCallback(
    async (unidadeId: string, dataIso: string, linhasPorTurma: RematriculaAceiteInput[]) => {
      setSalvando(true);
      try {
        const { data: salvos, error } = await supabase
          .from("rematricula_aceites")
          .upsert(
            linhasPorTurma.map((l) => ({ unidade_id: unidadeId, data: dataIso, turma: l.turma, quantidade: l.quantidade })),
            { onConflict: "unidade_id,data,turma" }
          )
          .select();
        if (error) throw error;
        // RLS pode bloquear o upsert silenciosamente (0 linhas, sem erro) — sem essa
        // checagem o toast mentiria "sucesso" (mesmo bug já visto em useRegistros).
        if ((salvos?.length ?? 0) < linhasPorTurma.length) {
          throw new Error("Permissão negada pelo banco para salvar esse dia.");
        }
        await carregar();
        toast.success("Aceites salvos!");
        return true;
      } catch (err) {
        console.error(err);
        toast.error("Erro ao salvar aceites");
        return false;
      } finally {
        setSalvando(false);
      }
    },
    [carregar]
  );

  const remover = useCallback(
    async (unidadeId: string, dataIso: string) => {
      setRemovendo(true);
      try {
        const { data: removidos, error } = await supabase
          .from("rematricula_aceites")
          .delete()
          .eq("unidade_id", unidadeId)
          .eq("data", dataIso)
          .select();
        if (error) throw error;
        // Mesmo cuidado do salvar(): RLS bloqueia DELETE sem erro explícito.
        if ((removidos?.length ?? 0) === 0) {
          throw new Error("Permissão negada pelo banco para remover esse dia.");
        }
        await carregar();
        toast.success("Aceites removidos!");
        return true;
      } catch (err) {
        console.error(err);
        toast.error("Erro ao remover aceites");
        return false;
      } finally {
        setRemovendo(false);
      }
    },
    [carregar]
  );

  const porUnidade = useMemo(() => {
    const mapa = new Map<string, AceitesPorUnidade>();
    for (const l of linhas) {
      const atual = mapa.get(l.unidade_id) ?? {
        unidade_id: l.unidade_id,
        unidade_nome: l.profiles?.unidade_nome ?? "—",
        quantidade: 0,
      };
      atual.quantidade += l.quantidade;
      mapa.set(l.unidade_id, atual);
    }
    return Array.from(mapa.values());
  }, [linhas]);

  const total = useMemo(() => linhas.reduce((soma, l) => soma + l.quantidade, 0), [linhas]);

  return { linhas, porUnidade, total, loading, salvando, removendo, carregar, salvar, remover };
}
