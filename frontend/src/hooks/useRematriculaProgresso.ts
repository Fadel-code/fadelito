import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { REMATRICULA_FORA_DA_META } from "../types";

// Vila Leopoldina: exclusão TEMP, espelha o filtro de pages/marketing/Rematricula.tsx.
const FORA_DA_META = [...REMATRICULA_FORA_DA_META, "Vila Leopoldina"];
const FILTRO_FORA = `(${FORA_DA_META.map((n) => `"${n}"`).join(",")})`;

// % de contratos assinados visível ao usuário logado (RLS: unidade vê só a sua,
// marketing/supervisão veem a rede, sem as unidades fora da meta geral). null enquanto
// carrega ou sem alunos cadastrados.
export function useRematriculaProgresso(visaoRede = false) {
  const [pct, setPct] = useState<number | null>(null);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      const base = () => {
        // inadimplente fora do denominador, igual a calcularKpisRematricula (senão o badge diverge do painel)
        const q = supabase
          .from("rematricula_alunos")
          .select("id, profiles!inner(unidade_nome)", { count: "exact", head: true })
          .eq("inadimplente", false);
        return visaoRede ? q.not("profiles.unidade_nome", "in", FILTRO_FORA) : q;
      };
      const [{ count: total }, { count: assinados }] = await Promise.all([
        base(),
        base().eq("contrato_assinado", true),
      ]);
      if (ativo) setPct(total ? (assinados ?? 0) / total : null);
    }
    carregar();
    // Sem isso o badge fica congelado no valor do primeiro carregamento da sessão.
    const channel = supabase
      .channel(`rematricula-progresso-${visaoRede}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rematricula_alunos" }, carregar)
      .subscribe();
    return () => {
      ativo = false;
      supabase.removeChannel(channel);
    };
  }, [visaoRede]);

  return pct;
}
