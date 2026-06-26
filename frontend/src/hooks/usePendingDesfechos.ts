import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function usePendingDesfechos(unidadeId: string | undefined) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!unidadeId) return;
    supabase
      .from("eventos_lead")
      .select("id", { count: "exact", head: true })
      .eq("unidade_id", unidadeId)
      .eq("tipo", "visita_realizada")
      .then(({ count: c }) => setCount(c ?? 0));
  }, [unidadeId]);

  return count;
}
