// ============================================================
// Cliente da API do CRM Fadelito (Neon/FastAPI)
// Opção B — sync fadelito-b ↔ CRM
// ============================================================
import type { LeadCRM, DesfechoTipo } from "../types";

const CRM_API_URL = (import.meta.env.VITE_CRM_API_URL ?? "").replace(/\/$/, "");

function assertConfigured() {
  if (!CRM_API_URL) {
    throw new Error(
      "VITE_CRM_API_URL não configurada — defina a URL do CRM no .env"
    );
  }
}

/** Leads de uma unidade aptos a receber desfecho (visita agendada em diante). */
export async function fetchLeadsElegiveis(unidade: string): Promise<LeadCRM[]> {
  assertConfigured();
  const url = `${CRM_API_URL}/leads/visit-eligible?unit=${encodeURIComponent(unidade)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`CRM respondeu ${res.status} ao buscar leads elegíveis`);
  }
  return res.json();
}

/** Reverte o desfecho de um lead, retornando-o para VISITA_AGENDADA. */
export async function reverterDesfecho(crmLeadId: number): Promise<void> {
  assertConfigured();
  const res = await fetch(`${CRM_API_URL}/leads/${crmLeadId}/revert-visit-outcome`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`CRM respondeu ${res.status} ao reverter desfecho`);
}

/** Envia o desfecho de um lead ao CRM (avança stage + dispara nutrição). */
export async function enviarDesfecho(
  crmLeadId: number,
  outcome: DesfechoTipo,
  observacao: string | null,
  unidade: string
): Promise<void> {
  assertConfigured();
  const res = await fetch(`${CRM_API_URL}/leads/${crmLeadId}/visit-outcome`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      outcome,
      observacao: observacao || null,
      source: `unidade:${unidade}`,
    }),
  });
  if (!res.ok) {
    throw new Error(`CRM respondeu ${res.status} ao registrar desfecho`);
  }
}
