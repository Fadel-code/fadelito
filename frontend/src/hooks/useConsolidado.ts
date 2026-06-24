import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { ConsolidadoUnidade } from "../types";
import { dateToIso } from "../lib/utils";

// dia: ISO date string para filtrar por dia específico; undefined = mês inteiro
export function useConsolidado(ano: number, mes: number, dia?: string) {
  const [dados, setDados] = useState<ConsolidadoUnidade[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const padMes = String(mes).padStart(2, "0");
      const inicio = dia ?? `${ano}-${padMes}-01`;
      const ultimoDia = new Date(ano, mes, 0).getDate();
      const fim = dia ?? `${ano}-${padMes}-${String(ultimoDia).padStart(2, "0")}`;
      const hojeIso = dateToIso(new Date());

      // Buscar registros do período com paginação (servidor limita a 1000/página)
      const PAGE = 1000;
      let from = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const registros: any[] = [];
      while (true) {
        const { data: batch, error: errReg } = await supabase
          .from("registros")
          .select("*, profiles!inner(unidade_nome, ativo)")
          .gte("data", inicio)
          .lte("data", fim)
          .range(from, from + PAGE - 1);
        if (errReg) throw errReg;
        registros.push(...(batch ?? []));
        if (!batch || batch.length < PAGE) break;
        from += PAGE;
      }

      // Buscar todas as unidades ativas
      const { data: unidades, error: errUn } = await supabase
        .from("profiles")
        .select("id, unidade_nome")
        .eq("role", "unidade")
        .eq("ativo", true)
        .order("unidade_nome");

      if (errUn) throw errUn;

      // No modo mês (sem dia fixo), buscar quem preencheu hoje
      let preencheramHoje = new Set<string>();
      if (!dia) {
        const { data: hoje } = await supabase
          .from("registros")
          .select("unidade_id")
          .eq("data", hojeIso);
        preencheramHoje = new Set(
          (hoje ?? []).map((r: { unidade_id: string }) => r.unidade_id)
        );
      }

      // Agregar por unidade
      const consolidado: ConsolidadoUnidade[] = (unidades ?? []).map(
        (u: { id: string; unidade_nome: string }) => {
          const regsUnidade = registros.filter(
            (r: { unidade_id: string }) => r.unidade_id === u.id
          );

          const soma = {
            visitas: 0,
            visitas_curso_ferias: 0,
            matriculas: 0,
            matriculas_curso_ferias: 0,
            desligamentos: 0,
            transferencias: 0,
            religamentos: 0,
          };

          for (const r of regsUnidade) {
            soma.visitas += r.visitas ?? 0;
            soma.visitas_curso_ferias += r.visitas_curso_ferias ?? 0;
            soma.matriculas += r.matriculas ?? 0;
            soma.matriculas_curso_ferias += r.matriculas_curso_ferias ?? 0;
            soma.desligamentos += r.desligamentos ?? 0;
            soma.transferencias += r.transferencias ?? 0;
            soma.religamentos += r.religamentos ?? 0;
          }

          const visitas_totais = soma.visitas + soma.visitas_curso_ferias;
          const matriculas_totais = soma.matriculas + soma.matriculas_curso_ferias;
          const aproveitamento =
            visitas_totais > 0
              ? `${((matriculas_totais / visitas_totais) * 100).toFixed(1)}%`
              : "—";
          const saldo = matriculas_totais - soma.desligamentos;

          return {
            unidade_id: u.id,
            unidade_nome: u.unidade_nome,
            ...soma,
            visitas_totais,
            matriculas_totais,
            aproveitamento,
            saldo,
            // No modo dia: preencheu = tem registros naquele dia
            // No modo mês: preencheu = tem registros hoje
            preencheu_hoje: dia ? regsUnidade.length > 0 : preencheramHoje.has(u.id),
          };
        }
      );

      setDados(consolidado);
    } finally {
      setLoading(false);
    }
  }, [ano, mes, dia]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("registros-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "registros" },
        () => {
          carregar();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [carregar]);

  // Polling de 30s como fallback caso o realtime não dispare
  useEffect(() => {
    const id = setInterval(carregar, 30_000);
    return () => clearInterval(id);
  }, [carregar]);

  return { dados, loading, recarregar: carregar };
}
