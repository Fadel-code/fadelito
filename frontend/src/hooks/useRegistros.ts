import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { TURMAS, CAMPOS_NUMERICOS, registroVazio } from "../types";
import type { RegistroInput, Turma } from "../types";
import toast from "react-hot-toast";

interface UseRegistrosOptions {
  unidadeId: string;
  unidadeNome: string;
}

export function useRegistros({ unidadeId, unidadeNome }: UseRegistrosOptions) {
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const carregarPorData = useCallback(
    async (dataIso: string): Promise<RegistroInput[]> => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("registros")
          .select("*")
          .eq("unidade_id", unidadeId)
          .eq("data", dataIso);

        if (error) throw error;

        return TURMAS.map((turma) => {
          const reg = data?.find((r) => r.turma === turma);
          return reg
            ? {
                turma: reg.turma as Turma,
                visitas: reg.visitas,
                visitas_curso_ferias: reg.visitas_curso_ferias,
                matriculas: reg.matriculas,
                matriculas_curso_ferias: reg.matriculas_curso_ferias,
                desligamentos: reg.desligamentos,
                transferencias: reg.transferencias,
                religamentos: reg.religamentos,
              }
            : registroVazio(turma);
        });
      } finally {
        setLoading(false);
      }
    },
    [unidadeId]
  );

  const salvar = useCallback(
    async (dataIso: string, linhas: RegistroInput[]): Promise<boolean> => {
      setSalvando(true);
      try {
        // 1. Buscar valores anteriores para audit log
        const { data: anteriores } = await supabase
          .from("registros")
          .select("*")
          .eq("unidade_id", unidadeId)
          .eq("data", dataIso);

        const anteriorMap = new Map(
          (anteriores ?? []).map((r) => [r.turma, r])
        );

        // 2. Upsert
        const { error } = await supabase.from("registros").upsert(
          linhas.map((l) => ({
            unidade_id: unidadeId,
            data: dataIso,
            turma: l.turma,
            visitas: l.visitas,
            visitas_curso_ferias: l.visitas_curso_ferias,
            matriculas: l.matriculas,
            matriculas_curso_ferias: l.matriculas_curso_ferias,
            desligamentos: l.desligamentos,
            transferencias: l.transferencias,
            religamentos: l.religamentos,
          })),
          { onConflict: "unidade_id,data,turma" }
        );

        if (error) throw error;

        // 3. Gravar audit log
        const auditEntries: object[] = [];
        for (const linha of linhas) {
          const anterior = anteriorMap.get(linha.turma);
          const acao = anterior ? "UPDATE" : "INSERT";

          for (const campo of CAMPOS_NUMERICOS) {
            const valNovo = String(linha[campo]);
            const valAnt = anterior ? String(anterior[campo]) : null;

            if (acao === "INSERT" || valNovo !== valAnt) {
              auditEntries.push({
                usuario_id: unidadeId,
                unidade_nome: unidadeNome,
                acao,
                data_registro: dataIso,
                turma: linha.turma,
                campo_alterado: campo,
                valor_anterior: valAnt,
                valor_novo: valNovo,
              });
            }
          }
        }

        if (auditEntries.length > 0) {
          await supabase.from("audit_log").insert(auditEntries);
        }

        toast.success("Dados salvos com sucesso!");
        return true;
      } catch (err) {
        console.error(err);
        toast.error("Erro ao salvar. Tente novamente.");
        return false;
      } finally {
        setSalvando(false);
      }
    },
    [unidadeId, unidadeNome]
  );

  const carregarPorMes = useCallback(
    async (ano: number, mes: number) => {
      const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
      const fim = new Date(ano, mes, 0);
      const fimIso = `${ano}-${String(mes).padStart(2, "0")}-${String(fim.getDate()).padStart(2, "0")}`;

      const { data, error } = await supabase
        .from("registros")
        .select("*")
        .eq("unidade_id", unidadeId)
        .gte("data", inicio)
        .lte("data", fimIso)
        .order("data");

      if (error) throw error;
      return data ?? [];
    },
    [unidadeId]
  );

  return { loading, salvando, carregarPorData, salvar, carregarPorMes };
}
