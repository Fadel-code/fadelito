import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RefreshCw, ClipboardCheck, AlertOctagon } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { fetchLeadsElegiveis } from "../../lib/crm";
import { DIAS_URGENCIA } from "../../hooks/useDesfechoUrgencia";
import type { DesfechoTipo } from "../../types";
import { MESES } from "../../types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { diasUteisDoMes, dateToIso } from "../../lib/utils";
import { FERIADOS_SET } from "../../lib/feriados";

const ANO = new Date().getFullYear();

interface UnidadeRow {
  unidade_id: string;
  unidade_nome: string;
  visita_realizada: number;
  em_negociacao: number;
  matricula: number;
  nao_fechou: number;
  total: number;
  nuncaPreencheu: boolean;
  diasPendente: number | null;
  visitasNoPeriodo: number;
  visitasSemDesfecho: number;
}

const TIPO_STYLE: Record<DesfechoTipo, string> = {
  visita_realizada: "bg-amber-100 text-amber-800",
  em_negociacao:   "bg-blue-100 text-blue-800",
  matricula:       "bg-green-100 text-green-800",
  nao_fechou:      "bg-red-100 text-red-800",
};

export default function DesfechosMarketing() {
  const mesCorrido = new Date().getMonth() + 1;
  const hojeIso = dateToIso(new Date());
  const [mes, setMes] = useState(mesCorrido);
  const [dia, setDia] = useState("todos");
  const [rows, setRows] = useState<UnidadeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const diasUteis = diasUteisDoMes(ANO, mes, FERIADOS_SET)
    .filter((d) => dateToIso(d) <= hojeIso)
    .reverse();

  function buildDateRange() {
    if (dia !== "todos") return { inicio: dia, fim: dia };
    const m = mes;
    const inicio = `${ANO}-${String(m).padStart(2, "0")}-01`;
    const ultimoDia = new Date(ANO, m, 0).getDate();
    const fim = `${ANO}-${String(m).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
    return { inicio, fim };
  }

  async function carregar() {
    setLoading(true);
    const { inicio, fim } = buildDateRange();
    const [{ data: profiles }, { data: eventos }, { data: todosEventos }] = await Promise.all([
      supabase.from("profiles").select("id, unidade_nome").eq("role", "unidade").eq("ativo", true),
      supabase.from("eventos_lead").select("unidade_id, tipo").gte("data", inicio).lte("data", fim),
      // Sem filtro de período: usado só para o alerta de urgência (nunca preencheu / pendente há dias)
      supabase.from("eventos_lead").select("unidade_id, tipo, created_at, crm_lead_id"),
    ]);

    // Lead com desfecho local já registrado (qualquer tipo, a qualquer momento)
    const leadsComDesfecho = new Set(
      (todosEventos ?? []).map((e) => `${e.unidade_id}:${e.crm_lead_id}`)
    );

    // CRM: leads elegíveis por unidade, para achar visitas já ocorridas sem nenhum desfecho local
    const crmResultados = await Promise.allSettled(
      (profiles ?? []).map((p) => fetchLeadsElegiveis(p.unidade_nome ?? ""))
    );
    const agora = Date.now();
    const crmStats = new Map<string, { visitasNoPeriodo: number; visitasSemDesfecho: number }>();
    (profiles ?? []).forEach((p, i) => {
      const res = crmResultados[i];
      const leads = res.status === "fulfilled" ? res.value : [];
      let visitasNoPeriodo = 0;
      let visitasSemDesfecho = 0;
      for (const l of leads) {
        if (!l.visit_date) continue;
        const dataVisita = l.visit_date.slice(0, 10);
        if (new Date(l.visit_date).getTime() > agora) continue; // visita ainda não aconteceu
        if (dataVisita < inicio || dataVisita > fim) continue; // fora do período selecionado
        visitasNoPeriodo++;
        if (!leadsComDesfecho.has(`${p.id}:${l.id}`)) visitasSemDesfecho++;
      }
      crmStats.set(p.id, { visitasNoPeriodo, visitasSemDesfecho });
    });

    const contagens = new Map<string, Record<DesfechoTipo, number>>();
    for (const e of eventos ?? []) {
      if (!contagens.has(e.unidade_id)) {
        contagens.set(e.unidade_id, { visita_realizada: 0, em_negociacao: 0, matricula: 0, nao_fechou: 0 });
      }
      contagens.get(e.unidade_id)![e.tipo as DesfechoTipo]++;
    }

    const historico = new Map<string, { pendenteMaisAntigo: string | null }>();
    for (const e of todosEventos ?? []) {
      const h = historico.get(e.unidade_id) ?? { pendenteMaisAntigo: null };
      if (e.tipo === "visita_realizada" && (!h.pendenteMaisAntigo || e.created_at < h.pendenteMaisAntigo)) {
        h.pendenteMaisAntigo = e.created_at;
      }
      historico.set(e.unidade_id, h);
    }

    const result: UnidadeRow[] = (profiles ?? []).map((p) => {
      const c = contagens.get(p.id) ?? { visita_realizada: 0, em_negociacao: 0, matricula: 0, nao_fechou: 0 };
      const h = historico.get(p.id);
      const diasPendente = h?.pendenteMaisAntigo
        ? Math.floor((Date.now() - new Date(h.pendenteMaisAntigo).getTime()) / 86_400_000)
        : null;
      const crm = crmStats.get(p.id) ?? { visitasNoPeriodo: 0, visitasSemDesfecho: 0 };
      return {
        unidade_id: p.id,
        unidade_nome: p.unidade_nome ?? p.id,
        ...c,
        total: c.visita_realizada + c.em_negociacao + c.matricula + c.nao_fechou,
        nuncaPreencheu: !h,
        diasPendente,
        visitasNoPeriodo: crm.visitasNoPeriodo,
        visitasSemDesfecho: crm.visitasSemDesfecho,
      };
    });

    // Urgência (nunca preencheu / pendente há muitos dias) primeiro, depois pendentes do período, depois total
    result.sort((a, b) => {
      const urgA = a.nuncaPreencheu || (a.diasPendente ?? 0) >= DIAS_URGENCIA ? 1 : 0;
      const urgB = b.nuncaPreencheu || (b.diasPendente ?? 0) >= DIAS_URGENCIA ? 1 : 0;
      return urgB - urgA || b.visita_realizada - a.visita_realizada || b.total - a.total;
    });
    setRows(result);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [mes, dia]); // eslint-disable-line react-hooks/exhaustive-deps

  const totais = rows.reduce(
    (acc, r) => ({
      visita_realizada: acc.visita_realizada + r.visita_realizada,
      em_negociacao:    acc.em_negociacao    + r.em_negociacao,
      matricula:        acc.matricula        + r.matricula,
      nao_fechou:       acc.nao_fechou       + r.nao_fechou,
    }),
    { visita_realizada: 0, em_negociacao: 0, matricula: 0, nao_fechou: 0 }
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary-500" />
            Desfechos de Matrículas
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Resultado das visitas registradas pelas unidades
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(mes)} onValueChange={(v) => { setMes(Number(v)); setDia("todos"); }}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((nome, i) => {
                const num = i + 1;
                return (
                  <SelectItem key={num} value={String(num)}>
                    {nome} {ANO}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Select value={dia} onValueChange={setDia}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os dias</SelectItem>
              {diasUteis.map((d) => {
                const iso = dateToIso(d);
                return (
                  <SelectItem key={iso} value={iso}>
                    {format(d, "EEE, dd/MM", { locale: ptBR })}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <button
            onClick={carregar}
            title="Atualizar"
            aria-label="Atualizar"
            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-amber-200 p-5">
          <p className="text-xs text-amber-700 font-medium uppercase tracking-wide">Pendentes</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{totais.visita_realizada}</p>
          <p className="text-xs text-gray-400 mt-1">Visitaram, aguardando desfecho</p>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-5">
          <p className="text-xs text-blue-700 font-medium uppercase tracking-wide">Em Negociação</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{totais.em_negociacao}</p>
          <p className="text-xs text-gray-400 mt-1">Leads em andamento</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-5">
          <p className="text-xs text-green-700 font-medium uppercase tracking-wide">Matrículas</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{totais.matricula}</p>
          <p className="text-xs text-gray-400 mt-1">Leads convertidos</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-5">
          <p className="text-xs text-red-700 font-medium uppercase tracking-wide">Não Fechou</p>
          <p className="text-3xl font-bold text-red-500 mt-1">{totais.nao_fechou}</p>
          <p className="text-xs text-gray-400 mt-1">Não convertidos</p>
        </div>
      </div>

      {/* Tabela por unidade */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Resultado por Unidade</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            Carregando...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-left font-semibold text-gray-600">Unidade</th>
                  <th className="px-4 py-3 text-left font-semibold text-red-600">Urgência</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Visitas no período (CRM)</th>
                  <th className="px-4 py-3 text-center font-semibold text-amber-600">Pendentes</th>
                  <th className="px-4 py-3 text-center font-semibold text-blue-600">Em Negociação</th>
                  <th className="px-4 py-3 text-center font-semibold text-green-600">Matrículas</th>
                  <th className="px-4 py-3 text-center font-semibold text-red-500">Não Fechou</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((r) => {
                  const urgente = r.nuncaPreencheu || (r.diasPendente ?? 0) >= DIAS_URGENCIA;
                  return (
                  <tr
                    key={r.unidade_id}
                    className={urgente ? "bg-red-50/60" : r.visita_realizada > 0 ? "bg-amber-50/40" : ""}
                  >
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {r.unidade_nome}
                      {!urgente && r.visita_realizada > 0 && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                          pendente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.nuncaPreencheu ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">
                          <AlertOctagon className="h-3 w-3" />
                          Nunca preencheu
                        </span>
                      ) : (r.diasPendente ?? 0) >= DIAS_URGENCIA ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">
                          <AlertOctagon className="h-3 w-3" />
                          Pendente há {r.diasPendente}d
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {r.visitasNoPeriodo === 0 ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <span className={r.visitasSemDesfecho > 0 ? "text-red-600 font-semibold" : "text-gray-500"}>
                          {r.visitasNoPeriodo} visita{r.visitasNoPeriodo === 1 ? "" : "s"} realizada{r.visitasNoPeriodo === 1 ? "" : "s"},{" "}
                          {r.visitasSemDesfecho} sem desfecho
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.visita_realizada > 0
                        ? <span className="font-semibold text-amber-600">{r.visita_realizada}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.em_negociacao > 0
                        ? <span className="font-semibold text-blue-600">{r.em_negociacao}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.matricula > 0
                        ? <span className="font-semibold text-green-600">{r.matricula}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.nao_fechou > 0
                        ? <span className="font-semibold text-red-500">{r.nao_fechou}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">
                      {r.total > 0 ? r.total : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
