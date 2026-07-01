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
  const [removendo, setRemovendo] = useState(false);

  const carregarPorData = useCallback(
    async (dataIso: string): Promise<{ linhas: RegistroInput[]; existe: boolean }> => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("registros")
          .select("*")
          .eq("unidade_id", unidadeId)
          .eq("data", dataIso);

        if (error) throw error;

        const linhas = TURMAS.map((turma) => {
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

        return { linhas, existe: (data?.length ?? 0) > 0 };
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
        const { data: salvos, error } = await supabase
          .from("registros")
          .upsert(
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
          )
          .select();

        if (error) throw error;
        // A policy de RLS pode bloquear o UPDATE silenciosamente (0 linhas, sem erro)
        // quando a data não é mais editável — sem essa checagem o toast mentiria "sucesso".
        if ((salvos?.length ?? 0) < linhas.length) {
          throw new Error("Permissão negada pelo banco para salvar essa data.");
        }

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

  const carregarObservacao = useCallback(
    async (dataIso: string): Promise<string> => {
      const { data } = await supabase
        .from("observacoes_diarias")
        .select("observacao")
        .eq("unidade_id", unidadeId)
        .eq("data", dataIso)
        .maybeSingle();
      return data?.observacao ?? "";
    },
    [unidadeId]
  );

  const salvarObservacao = useCallback(
    async (dataIso: string, observacao: string): Promise<boolean> => {
      try {
        const { data, error } = await supabase
          .from("observacoes_diarias")
          .upsert(
            { unidade_id: unidadeId, data: dataIso, observacao },
            { onConflict: "unidade_id,data" }
          )
          .select();
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error("Permissão negada pelo banco para salvar a observação dessa data.");
        }
        return true;
      } catch (err) {
        console.error(err);
        toast.error("Erro ao salvar a observação. Tente novamente.");
        return false;
      }
    },
    [unidadeId]
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

  const remover = useCallback(
    async (dataIso: string): Promise<boolean> => {
      setRemovendo(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();

        const { data: existentes } = await supabase
          .from("registros")
          .select("*")
          .eq("unidade_id", unidadeId)
          .eq("data", dataIso);

        const { error } = await supabase
          .from("registros")
          .delete()
          .eq("unidade_id", unidadeId)
          .eq("data", dataIso);

        if (error) throw error;

        await supabase
          .from("observacoes_diarias")
          .delete()
          .eq("unidade_id", unidadeId)
          .eq("data", dataIso);

        if (existentes?.length && user) {
          await supabase.from("audit_log").insert(
            existentes.map((r) => ({
              usuario_id: user.id,
              unidade_nome: unidadeNome,
              acao: "DELETE",
              data_registro: dataIso,
              turma: r.turma,
              campo_alterado: "preenchimento",
              valor_anterior: JSON.stringify({
                visitas: r.visitas,
                visitas_curso_ferias: r.visitas_curso_ferias,
                matriculas: r.matriculas,
                matriculas_curso_ferias: r.matriculas_curso_ferias,
                desligamentos: r.desligamentos,
                transferencias: r.transferencias,
                religamentos: r.religamentos,
              }),
              valor_novo: null,
            }))
          );
        }

        toast.success("Preenchimento removido com sucesso!");
        return true;
      } catch (err) {
        console.error(err);
        toast.error("Erro ao remover. Tente novamente.");
        return false;
      } finally {
        setRemovendo(false);
      }
    },
    [unidadeId, unidadeNome]
  );

  return { loading, salvando, removendo, carregarPorData, salvar, remover, carregarObservacao, salvarObservacao, carregarPorMes };
}
