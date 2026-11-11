import { supabase } from "./supabase";

const AGENDA_API_URL = (import.meta.env.VITE_AGENDA_API_URL ?? "").replace(/\/$/, "");
const AGENDA_FRONTEND_URL = import.meta.env.VITE_AGENDA_FRONTEND_URL ?? "";

function assertConfigured() {
  if (!AGENDA_API_URL || !AGENDA_FRONTEND_URL) {
    throw new Error(
      "Agenda não configurada: defina VITE_AGENDA_API_URL e VITE_AGENDA_FRONTEND_URL"
    );
  }
}

/** Loga na agenda usando a sessão já aberta aqui — sem tela de login separada.
 *  A agenda seta um cookie de sessão próprio ao responder; depois disso o
 *  iframe apontado pro frontend dela já abre autenticado. */
export async function ssoLoginAgenda(): Promise<void> {
  assertConfigured();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sessão expirada — faça login novamente");

  const res = await fetch(`${AGENDA_API_URL}/auth/sso`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: session.access_token }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Erro ${res.status}`);
  }
}

/** A raiz do fadelito-agenda sempre manda pro /login, sem checar sessão — o
 *  destino autenticado de verdade é /admin (marketing/supervisão) ou
 *  /unidade, igual ao redirect pós-login do próprio app deles.
 *  `theme=light` força o tema claro só dentro deste embed — o padrão escuro
 *  do app standalone (acesso direto) não muda. */
export function agendaFrontendUrl(role: "unidade" | "marketing" | "supervisao") {
  return `${AGENDA_FRONTEND_URL}${role === "unidade" ? "/unidade" : "/admin"}?theme=light`;
}

/** Chave de telefone pra casar CRM ↔ agenda independente de formatação/DDI:
 *  DDD + últimos 8 dígitos (tolera o 9º dígito presente ou não). */
export function chaveTelefone(raw: string | null | undefined): string {
  let d = (raw ?? "").replace(/\D/g, "");
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  return d.length >= 10 ? d.slice(0, 2) + d.slice(-8) : "";
}

let emailsCache: Promise<Map<string, string>> | null = null;

/** Email do responsável por telefone, direto dos agendamentos da agenda
 *  (unidade só recebe os da própria unidade; marketing/supervisão, a rede).
 *  Best-effort: agenda fora do ar → mapa vazio, a tela segue sem email. */
export function fetchEmailsAgenda(): Promise<Map<string, string>> {
  // ponytail: busca os últimos 12 meses de agendamentos inteiros; criar endpoint enxuto na agenda se pesar
  emailsCache ??= (async () => {
    await ssoLoginAgenda();
    const desde = new Date();
    desde.setFullYear(desde.getFullYear() - 1);
    const res = await fetch(`${AGENDA_API_URL}/appointments?start=${encodeURIComponent(desde.toISOString())}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Agenda respondeu ${res.status}`);
    const ags: { start_at: string; guardian_phone: string; guardian_email: string | null }[] = await res.json();
    const mapa = new Map<string, string>();
    // ordenado por data: o agendamento mais recente sobrescreve
    for (const a of ags) {
      const k = chaveTelefone(a.guardian_phone);
      if (k && a.guardian_email) mapa.set(k, a.guardian_email);
    }
    return mapa;
  })().catch((err) => {
    console.error(err);
    emailsCache = null;
    return new Map<string, string>();
  });
  return emailsCache;
}
