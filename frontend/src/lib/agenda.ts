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
