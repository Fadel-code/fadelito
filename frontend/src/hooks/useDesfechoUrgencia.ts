import { useState, useEffect } from "react";
import { supabase, buscarTudo, EVENTOS_LEAD_ALTERADOS } from "../lib/supabase";
import { fetchLeadsElegiveis } from "../lib/crm";

// ponytail: limite arbitrário de urgência; ajustar se o negócio definir um SLA formal
export const DIAS_URGENCIA = 3;

export interface DesfechoUrgencia {
  nuncaPreencheu: boolean;
  diasPendente: number | null;
  visitasSemDesfecho: number;
  urgente: boolean;
}

const VAZIO: DesfechoUrgencia = {
  nuncaPreencheu: false,
  diasPendente: null,
  visitasSemDesfecho: 0,
  urgente: false,
};

/**
 * Urgência de desfecho de uma unidade:
 * - nunca preencheu nenhum desfecho;
 * - tem "Visitou" pendente de decisão há dias;
 * - já preencheu antes, mas tem visitas novas (do CRM) ainda sem nenhum desfecho.
 */
export function useDesfechoUrgencia(
  unidadeId: string | undefined,
  unidadeNome: string | null | undefined
): DesfechoUrgencia {
  const [urgencia, setUrgencia] = useState<DesfechoUrgencia>(VAZIO);

  useEffect(() => {
    if (!unidadeId) return;
    let ativo = true;
    let carga = 0;
    const calcular = async () => {
      const minha = ++carga;
      const [data, leads] = await Promise.all([
        buscarTudo<{ crm_lead_id: number; tipo: string; created_at: string }>((de, ate) =>
          supabase.from("eventos_lead").select("crm_lead_id, tipo, created_at").eq("unidade_id", unidadeId).order("id").range(de, ate)
        ).catch(() => null),
        fetchLeadsElegiveis(unidadeNome ?? "").catch(() => []),
      ]);
      // Falha do banco não vira "nunca preencheu"; resposta antiga não sobrescreve a nova.
      if (!ativo || minha !== carga || !data) return;

      const eventos = data;
      const comDesfecho = new Set(eventos.map((e) => e.crm_lead_id));
      const pendentes = eventos.filter((e) => e.tipo === "visita_realizada");
      const diasPendente = pendentes.length
        ? Math.floor(
            (Date.now() - Math.min(...pendentes.map((e) => new Date(e.created_at).getTime()))) / 86_400_000
          )
        : null;
      const nuncaPreencheu = eventos.length === 0;

      const agora = Date.now();
      const visitasSemDesfecho = leads.filter(
        (l) => l.visit_date && new Date(l.visit_date).getTime() <= agora && !comDesfecho.has(l.id)
      ).length;

      setUrgencia({
        nuncaPreencheu,
        diasPendente,
        visitasSemDesfecho,
        urgente: nuncaPreencheu || (diasPendente ?? 0) >= DIAS_URGENCIA || visitasSemDesfecho > 0,
      });
    };
    calcular();
    // Registrar/editar/remover desfecho recalcula o aviso na hora (antes ficava o de quando a tela abriu).
    window.addEventListener(EVENTOS_LEAD_ALTERADOS, calcular);
    return () => {
      ativo = false;
      window.removeEventListener(EVENTOS_LEAD_ALTERADOS, calcular);
    };
  }, [unidadeId, unidadeNome]);

  return urgencia;
}
