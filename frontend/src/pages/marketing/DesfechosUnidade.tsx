import { useState, useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, CalendarCheck, Phone, RefreshCw } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { fetchLeadsElegiveis } from "../../lib/crm";
import { DESFECHO_BADGE, desfechoLabel, MESES, STAGE_LABEL } from "../../types";
import type { EventoLead, LeadCRM } from "../../types";
import { Button } from "../../components/ui/button";

// Visão só leitura do Desfecho das Visitas de uma unidade (marketing/supervisão):
// o que a unidade ainda tem a registrar e o que já registrou, com a observação.
export default function DesfechosUnidade() {
  const { unidadeId } = useParams();
  const [params, setParams] = useSearchParams();
  const mesFiltro = params.get("mes") ?? "";
  const [unidadeNome, setUnidadeNome] = useState("");
  const [leads, setLeads] = useState<LeadCRM[]>([]);
  const [eventos, setEventos] = useState<EventoLead[]>([]);
  const [crmFalhou, setCrmFalhou] = useState(false);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    setLoading(true);
    const { data: perfil } = await supabase.from("profiles").select("unidade_nome").eq("id", unidadeId!).single();
    const nome = perfil?.unidade_nome ?? "";
    setUnidadeNome(nome);
    const [crm, ev] = await Promise.allSettled([
      fetchLeadsElegiveis(nome),
      supabase.from("eventos_lead").select("*").eq("unidade_id", unidadeId!),
    ]);
    setCrmFalhou(crm.status === "rejected");
    setLeads(crm.status === "fulfilled" ? crm.value : []);
    setEventos(ev.status === "fulfilled" ? ((ev.value.data ?? []) as EventoLead[]) : []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [unidadeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const comEvento = new Set(eventos.map((e) => e.crm_lead_id));
  const mesVisita = (l: LeadCRM) => (l.visit_date ? format(new Date(l.visit_date), "yyyy-MM") : "");
  const pendentes = leads.filter((l) => !comEvento.has(l.id));
  const realizados = [...eventos].sort(
    (a, b) => new Date(b.synced_at ?? b.created_at).getTime() - new Date(a.synced_at ?? a.created_at).getTime()
  );
  const meses = [...new Set([...pendentes.map(mesVisita), ...realizados.map((e) => e.data.slice(0, 7))])]
    .filter(Boolean).sort().reverse();
  // Pendentes pelo mês da visita; realizados pelo mês do registro (mesma regra da tela da unidade)
  const pendentesFiltrados = mesFiltro ? pendentes.filter((l) => mesVisita(l) === mesFiltro) : pendentes;
  const realizadosFiltrados = mesFiltro ? realizados.filter((e) => e.data.startsWith(mesFiltro)) : realizados;

  const vazio = (texto: string) => (
    <div className="card p-8 text-center text-sm text-gray-500">{texto}</div>
  );

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <Link to="/marketing/desfechos" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Desfechos de Matrículas
        </Link>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Desfechos — {unidadeNome || "…"}</h1>
            <p className="mt-1 text-sm text-gray-500">Visualização do que a unidade registrou. Somente leitura.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              Mês
              <select
                className="h-10 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={mesFiltro}
                onChange={(e) => setParams(e.target.value ? { mes: e.target.value } : {}, { replace: true })}
              >
                <option value="">Todos os meses</option>
                {/* mantém o mês vindo da URL mesmo que ainda não tenha nada */}
                {[...new Set([mesFiltro, ...meses])].filter(Boolean).sort().reverse().map((ym) => (
                  <option key={ym} value={ym}>{MESES[Number(ym.slice(5, 7)) - 1]} de {ym.slice(0, 4)}</option>
                ))}
              </select>
            </label>
            <Button variant="outline" onClick={carregar} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          Aguardando desfecho <span className="text-sm font-normal text-gray-500">({pendentesFiltrados.length})</span>
        </h2>
        {loading ? vazio("Carregando…")
          : crmFalhou ? vazio("CRM indisponível — não foi possível carregar as visitas pendentes.")
          : pendentesFiltrados.length === 0 ? vazio("Nenhuma visita aguardando desfecho neste período.")
          : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left font-semibold">Lead</th>
                  <th className="px-4 py-3 text-left font-semibold">Visita</th>
                  <th className="px-4 py-3 text-left font-semibold">Situação no CRM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendentesFiltrados.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{l.name}</div>
                      {l.phone && (
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                          <Phone className="h-3 w-3" aria-hidden />{l.phone}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {l.visit_date ? (
                        <span className="inline-flex items-center gap-1">
                          <CalendarCheck className="h-3.5 w-3.5 text-gray-400" aria-hidden />
                          {format(new Date(l.visit_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{STAGE_LABEL[l.stage] ?? l.stage}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          Desfechos realizados <span className="text-sm font-normal text-gray-500">({realizadosFiltrados.length})</span>
        </h2>
        {loading ? vazio("Carregando…")
          : realizadosFiltrados.length === 0 ? vazio("Nenhum desfecho registrado neste período.")
          : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left font-semibold">Lead</th>
                  <th className="w-40 px-4 py-3 text-left font-semibold">Desfecho</th>
                  <th className="px-4 py-3 text-left font-semibold">Observação</th>
                  <th className="w-28 px-4 py-3 text-left font-semibold">Registrado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {realizadosFiltrados.map((ev) => (
                  <tr key={ev.id}>
                    <td className="px-4 py-3 font-medium text-gray-800">{ev.nome ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DESFECHO_BADGE[ev.tipo]}`}>{desfechoLabel(ev.tipo)}</span>
                    </td>
                    <td className="whitespace-pre-wrap px-4 py-3 text-gray-600">{ev.observacao ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                      {format(new Date(ev.synced_at ?? ev.created_at), "dd/MM HH:mm")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
