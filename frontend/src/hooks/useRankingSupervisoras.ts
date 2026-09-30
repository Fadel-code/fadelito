import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";
import {
  mesAnterior,
  mesclarDados,
  mesesParciais,
  type Atribuicao,
  type EvolucaoMes,
  type Linha,
  type SistemaMes,
  type Supervisora,
} from "../lib/rankingSupervisoras";

export interface UnidadeBasica {
  id: string;
  nome: string;
  ativo: boolean;
}

// Supabase corta em 1000 linhas por request — pagina até esgotar.
async function buscarTudo<T>(consulta: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const todos: T[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await consulta(de, de + 999);
    if (error) throw error;
    todos.push(...(data ?? []));
    if (!data || data.length < 1000) return todos;
  }
}

/**
 * `inicio`/`fim` (YYYY-MM-DD) definem o período. Carrega também o mês anterior (pra variação)
 * e, se o intervalo corta um mês no meio, os dias exatos do Formulário Diário (função 037).
 * Tudo aqui é só do login Marketing (RLS das tabelas de 036 barra os demais).
 */
export function useRankingSupervisoras(inicio: string, fim: string) {
  const [supervisoras, setSupervisoras] = useState<Supervisora[]>([]);
  const [atribuicoes, setAtribuicoes] = useState<Atribuicao[]>([]);
  const [evolucao, setEvolucao] = useState<EvolucaoMes[]>([]);
  const [sistema, setSistema] = useState<SistemaMes[]>([]);
  const [diasParciais, setDiasParciais] = useState<SistemaMes[]>([]);
  const [unidades, setUnidades] = useState<UnidadeBasica[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const janelaIni = mesAnterior(`${inicio.slice(0, 7)}-01`);
      const janelaFim = `${fim.slice(0, 7)}-01`;
      const parciais = mesesParciais(inicio, fim);
      const [sup, atr, evo, sis, dias, uni] = await Promise.all([
        supabase.from("supervisoras").select("*").order("nome"),
        supabase.from("supervisora_unidades").select("*"),
        buscarTudo<EvolucaoMes>((de, ate) =>
          supabase.from("evolucao_rede_mensal").select("*").gte("mes", janelaIni).lte("mes", janelaFim).order("mes").order("unidade_id").range(de, ate)
        ),
        buscarTudo<SistemaMes>((de, ate) =>
          supabase.from("ranking_dados_sistema").select("*").gte("mes", janelaIni).lte("mes", janelaFim).order("mes").order("unidade_id").range(de, ate)
        ),
        parciais.length
          ? buscarTudo<SistemaMes>((de, ate) => supabase.rpc("ranking_dados_intervalo", { p_inicio: inicio, p_fim: fim }).range(de, ate))
          : Promise.resolve([] as SistemaMes[]),
        supabase.from("profiles").select("id, unidade_nome, ativo").eq("role", "unidade").order("unidade_nome"),
      ]);
      for (const r of [sup, atr, uni]) if (r.error) throw r.error;

      setSupervisoras((sup.data ?? []) as Supervisora[]);
      setAtribuicoes(
        (atr.data ?? []).map((a) => ({
          id: a.id,
          supervisoraId: a.supervisora_id,
          unidadeId: a.unidade_id,
          mesInicio: a.mes_inicio,
          mesFim: a.mes_fim,
        }))
      );
      setEvolucao(evo);
      setSistema(sis);
      setDiasParciais(dias);
      setUnidades(
        (uni.data ?? []).map((u) => ({ id: u.id, nome: u.unidade_nome ?? "—", ativo: u.ativo }))
      );
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar o ranking de supervisoras");
    } finally {
      setLoading(false);
    }
  }, [inicio, fim]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const parciais = useMemo(() => mesesParciais(inicio, fim), [inicio, fim]);
  const dados = useMemo(
    () => mesclarDados(sistema, evolucao, { meses: parciais, linhas: diasParciais.filter((d) => parciais.includes(d.mes)) }),
    [sistema, evolucao, diasParciais, parciais]
  );
  // Meses carregados (mês anterior ao início até o mês do fim) — limite do seletor da Configuração.
  const janela = { min: mesAnterior(`${inicio.slice(0, 7)}-01`).slice(0, 7), max: fim.slice(0, 7) };
  // Mês parcial que a planilha cobre: a planilha só tem o total mensal, então o recorte usa só o Formulário.
  const planilhaIgnorada = parciais.filter((m) => evolucao.some((e) => e.mes === m && e.visitas !== null));

  async function rodar(promessa: PromiseLike<{ error: unknown }>, erroMsg: string) {
    const { error } = await promessa;
    if (error) {
      console.error(error);
      toast.error(erroMsg);
    }
    return !error;
  }

  async function executar(promessa: PromiseLike<{ error: unknown }>, erroMsg: string, sucessoMsg?: string) {
    const ok = await rodar(promessa, erroMsg);
    if (ok) {
      await carregar();
      if (sucessoMsg) toast.success(sucessoMsg);
    }
    return ok;
  }

  const adicionarSupervisora = (nome: string, linha: Linha) =>
    executar(supabase.from("supervisoras").insert({ nome: nome.trim(), linha }), "Erro ao adicionar supervisora (nome já existe?)", "Supervisora adicionada");

  const alternarAtiva = (id: string, ativo: boolean) =>
    executar(supabase.from("supervisoras").update({ ativo }).eq("id", id), "Erro ao atualizar supervisora");

  /**
   * Passa a unidade pra supervisora a partir de `mesInicio`. Na mesma linha (F ou P) a unidade
   * só tem uma supervisora por vez: a carteira anterior é encerrada no mês anterior.
   */
  async function atribuir(supervisoraId: string, unidadeId: string, mesInicio: string) {
    const sup = supervisoras.find((s) => s.id === supervisoraId);
    if (!sup) return false;
    const daLinha = atribuicoes.filter(
      (a) => a.unidadeId === unidadeId && supervisoras.find((s) => s.id === a.supervisoraId)?.linha === sup.linha
    );
    if (daLinha.some((a) => a.supervisoraId === supervisoraId && a.mesInicio <= mesInicio && (a.mesFim === null || a.mesFim >= mesInicio))) {
      toast("Essa unidade já está na carteira dela nesse mês.");
      return false;
    }
    // Carteira anterior da mesma linha: quem começa em `mesInicio` (ou depois) é substituído; quem já cobria o mês é encerrado no mês anterior.
    for (const a of daLinha) {
      const cobre = a.mesInicio <= mesInicio && (a.mesFim === null || a.mesFim >= mesInicio);
      if (a.mesInicio >= mesInicio) {
        if (!(await rodar(supabase.from("supervisora_unidades").delete().eq("id", a.id), "Erro ao ajustar carteira anterior"))) return false;
      } else if (cobre) {
        if (!(await rodar(supabase.from("supervisora_unidades").update({ mes_fim: mesAnterior(mesInicio) }).eq("id", a.id), "Erro ao encerrar carteira anterior"))) return false;
      }
    }
    return executar(
      supabase.from("supervisora_unidades").insert({ supervisora_id: supervisoraId, unidade_id: unidadeId, mes_inicio: mesInicio }),
      "Erro ao atribuir unidade",
      "Carteira atualizada"
    );
  }

  const encerrarAtribuicao = (id: string, mesFim: string) =>
    executar(supabase.from("supervisora_unidades").update({ mes_fim: mesFim }).eq("id", id), "Erro ao encerrar atribuição", "Atribuição encerrada");

  const removerAtribuicao = (id: string) =>
    executar(supabase.from("supervisora_unidades").delete().eq("id", id), "Erro ao remover atribuição", "Atribuição removida");

  /** Alunos ativos por unidade no mês — base do cálculo da perda. Só toca a coluna alunos_base. */
  const salvarAlunosBase = (mes: string, valores: { unidadeId: string; alunosBase: number }[]) =>
    executar(
      supabase
        .from("evolucao_rede_mensal")
        .upsert(
          valores.map((v) => ({ unidade_id: v.unidadeId, mes, alunos_base: v.alunosBase })),
          { onConflict: "unidade_id,mes" }
        ),
      "Erro ao salvar alunos ativos",
      "Alunos ativos salvos"
    );

  return {
    loading,
    carregar,
    supervisoras,
    atribuicoes,
    evolucao,
    unidades,
    dados,
    janela,
    planilhaIgnorada,
    adicionarSupervisora,
    alternarAtiva,
    atribuir,
    encerrarAtribuicao,
    removerAtribuicao,
    salvarAlunosBase,
  };
}
