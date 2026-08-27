import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// % de contratos assinados visível ao usuário logado (RLS: unidade vê só a sua,
// marketing/supervisão veem a rede). null enquanto carrega ou sem alunos cadastrados.
export function useRematriculaProgresso() {
  const [pct, setPct] = useState<number | null>(null);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      const [{ count: total }, { count: assinados }] = await Promise.all([
        supabase.from("rematricula_alunos").select("id", { count: "exact", head: true }),
        supabase
          .from("rematricula_alunos")
          .select("id", { count: "exact", head: true })
          .eq("contrato_assinado", true),
      ]);
      if (ativo) setPct(total ? (assinados ?? 0) / total : null);
    }
    carregar();
    return () => {
      ativo = false;
    };
  }, []);

  return pct;
}
