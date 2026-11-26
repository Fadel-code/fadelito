import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


/** PostgREST devolve no máximo 1000 linhas por chamada e corta o resto calado.
 *  A consulta precisa de .order() estável, senão as páginas repetem/pulam linhas. */
export async function buscarTudo<T>(consulta: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const todos: T[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await consulta(de, de + 999);
    if (error) throw error;
    todos.push(...(data ?? []));
    if (!data || data.length < 1000) return todos;
  }
}

/** Avisa badge/urgência (Layout, formulário) que eventos_lead mudou nesta aba. */
export const EVENTOS_LEAD_ALTERADOS = "fadelito:eventos-lead-alterados";
export function avisarEventosLeadAlterados() {
  window.dispatchEvent(new Event(EVENTOS_LEAD_ALTERADOS));
}
