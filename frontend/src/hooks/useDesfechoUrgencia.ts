import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// ponytail: limite arbitrário de urgência; ajustar se o negócio definir um SLA formal
export const DIAS_URGENCIA = 3;

export interface DesfechoUrgencia {
  nuncaPreencheu: boolean;
  diasPendente: number | null;
  urgente: boolean;
}

const VAZIO: DesfechoUrgencia = { nuncaPreencheu: false, diasPendente: null, urgente: false };

/** Urgência de desfecho de uma unidade: nunca preencheu nenhum, ou tem "Visitou" pendente há dias. */
export function useDesfechoUrgencia(unidadeId: string | undefined): DesfechoUrgencia {
  const [urgencia, setUrgencia] = useState<DesfechoUrgencia>(VAZIO);

  useEffect(() => {
    if (!unidadeId) return;
    supabase
      .from("eventos_lead")
      .select("tipo, created_at")
      .eq("unidade_id", unidadeId)
      .then(({ data }) => {
        const eventos = data ?? [];
        const pendentes = eventos.filter((e) => e.tipo === "visita_realizada");
        const diasPendente = pendentes.length
          ? Math.floor(
              (Date.now() - Math.min(...pendentes.map((e) => new Date(e.created_at).getTime()))) / 86_400_000
            )
          : null;
        const nuncaPreencheu = eventos.length === 0;
        setUrgencia({
          nuncaPreencheu,
          diasPendente,
          urgente: nuncaPreencheu || (diasPendente ?? 0) >= DIAS_URGENCIA,
        });
      });
  }, [unidadeId]);

  return urgencia;
}
