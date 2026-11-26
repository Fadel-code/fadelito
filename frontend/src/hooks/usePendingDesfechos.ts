import { useState, useEffect } from "react";
import { supabase, EVENTOS_LEAD_ALTERADOS } from "../lib/supabase";

/** null = primeira contagem ainda não chegou (o Layout só abre o pop-up com base nela). */
export function usePendingDesfechos(unidadeId: string | undefined) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!unidadeId) return;
    let ativo = true;
    const contar = () =>
      supabase
        .from("eventos_lead")
        .select("id", { count: "exact", head: true })
        .eq("unidade_id", unidadeId)
        .eq("tipo", "visita_realizada")
        .then(({ count: c }) => { if (ativo) setCount(c ?? 0); });
    contar();
    // Badge do menu acompanha o que a unidade registra, sem precisar sair e entrar de novo.
    window.addEventListener(EVENTOS_LEAD_ALTERADOS, contar);
    return () => {
      ativo = false;
      window.removeEventListener(EVENTOS_LEAD_ALTERADOS, contar);
    };
  }, [unidadeId]);

  return count;
}
