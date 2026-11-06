import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RefreshCw, AlertOctagon, CheckCircle2, Clock, Eye, GraduationCap, MessageCircle, XCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { fetchLeadsElegiveis } from "../../lib/crm";
import type { DesfechoTipo } from "../../types";
import { MESES } from "../../types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import SeletorMes from "../../components/ranking/SeletorMes";
import KpiCard, { KpiGrid } from "../../components/KpiCard";
import { ROTULO, CARD_DESTAQUE } from "../../components/ui/estilos";
import { diasUteisDoMes, dateToIso } from "../../lib/utils";
import { FERIADOS_SET } from "../../lib/feriados";
import { atualizarOuRecarregar } from "../../lib/versao";

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
  visitasNoPeriodo: number;
  visitasSemDesfecho: number;
}

const FILTRO_KEY = "fadelito_filtro_desfechos_marketing";

// Urgente = o que a coluna "Visitas no período" mostra: visita já ocorrida no período
// sem nenhum desfecho registrado, ou unidade que nunca registrou desfecho algum.
const ehUrgente = (r: UnidadeRow) => r.nuncaPreencheu || r.visitasSemDesfecho > 0;

export default function DesfechosMarketing() {
  const mesCorrido = new Date().getMonth() + 1;
  const hojeIso = dateToIso(new Date());
  const [mes, setMes] = useState(() => {
    const salvo = localStorage.getItem(FILTRO_KEY);
    return salvo ? (JSON.parse(salvo).mes ?? mesCorrido) : mesCorrido;
  });
  const [dia, setDia] = useState(() => {
    const salvo = localStorage.getItem(FILTRO_KEY);
    return salvo ? (JSON.parse(salvo).dia ?? "todos") : "todos";
  });

  useEffect(() => {
    localStorage.setItem(FILTRO_KEY, JSON.stringify({ mes, dia }));
  }, [mes, dia]);
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
      // Sem filtro de período: quem já registrou algum desfecho (nunca preencheu / lead já resolvido)
      supabase.from("eventos_lead").select("unidade_id, crm_lead_id"),
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
        contagens.set(e.unidade_id, { visita_realizada: 0, em_negociacao: 0, matricula: 0, nao_fechou: 0, removido: 0 });
      }
      contagens.get(e.unidade_id)![e.tipo as DesfechoTipo]++;
    }

    const jaPreencheu = new Set((todosEventos ?? []).map((e) => e.unidade_id));

    const result: UnidadeRow[] = (profiles ?? []).map((p) => {
      const c = contagens.get(p.id) ?? { visita_realizada: 0, em_negociacao: 0, matricula: 0, nao_fechou: 0 };
      const crm = crmStats.get(p.id) ?? { visitasNoPeriodo: 0, visitasSemDesfecho: 0 };
      return {
        unidade_id: p.id,
        unidade_nome: p.unidade_nome ?? p.id,
        ...c,
        total: c.visita_realizada + c.em_negociacao + c.matricula + c.nao_fechou,
        nuncaPreencheu: !jaPreencheu.has(p.id),
        visitasNoPeriodo: crm.visitasNoPeriodo,
        visitasSemDesfecho: crm.visitasSemDesfecho,
      };
    });

    // Urgentes primeiro (mais visitas sem desfecho no topo), depois pendentes do período, depois total
    result.sort((a, b) =>
      Number(ehUrgente(b)) - Number(ehUrgente(a)) ||
      b.visitasSemDesfecho - a.visitasSemDesfecho ||
      b.visita_realizada - a.visita_realizada ||
      b.total - a.total
    );
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

  const pad = (n: number) => String(n).padStart(2, "0");
  const urgentes = rows.filter(ehUrgente).length;
  const rotuloPeriodo = dia !== "todos"
    ? format(new Date(`${dia}T12:00:00`), "EEEE, dd/MM", { locale: ptBR })
    : `${MESES[mes - 1]} de ${ANO}`;
  const traco = <span className="text-gray-400" aria-label="nenhum">—</span>;

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Desfechos de Matrículas</h1>
          <p className="mt-1 text-sm text-gray-600">O que aconteceu com as visitas registradas pelas unidades.</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => atualizarOuRecarregar(carregar)} title="Atualizar" aria-label="Atualizar">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`} />
        </Button>
      </div>

      <div className="space-y-4">
        <section aria-label="Filtros" className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-end gap-x-3 gap-y-4">
            <div>
              <span className={ROTULO}>Mês</span>
              <SeletorMes
                valor={`${ANO}-${pad(mes)}`}
                min={`${ANO}-01`}
                max={`${ANO}-${pad(mesCorrido)}`}
                onChange={(ym) => { setMes(Number(ym.slice(5, 7))); setDia("todos"); }}
              />
            </div>
            <div>
              <span id="df-dia" className={ROTULO}>Dia</span>
              <Select value={dia} onValueChange={setDia}>
                <SelectTrigger className="w-48" aria-labelledby="df-dia"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os dias</SelectItem>
                  {diasUteis.map((d) => {
                    const iso = dateToIso(d);
                    return <SelectItem key={iso} value={iso}>{format(d, "EEE, dd/MM", { locale: ptBR })}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <KpiGrid rotulo="Resumo dos desfechos" colunas={4}>
          <KpiCard rotulo="Pendentes" valor={totais.visita_realizada} Icone={Clock} tom="amber" carregando={loading} sub="Visitaram, aguardando desfecho" />
          <KpiCard rotulo="Em negociação" valor={totais.em_negociacao} Icone={MessageCircle} tom="blue" carregando={loading} sub="Leads em andamento" />
          <KpiCard rotulo="Matrículas" valor={totais.matricula} Icone={GraduationCap} tom="green" carregando={loading} sub="Leads convertidos" />
          <KpiCard rotulo="Não fechou" valor={totais.nao_fechou} Icone={XCircle} tom="red" carregando={loading} sub="Não convertidos" />
        </KpiGrid>

        <section aria-labelledby="df-titulo" className={CARD_DESTAQUE}>
          <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-5 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 id="df-titulo" className="text-xl font-bold tracking-tight text-gray-900">Resultado por unidade</h2>
              <p className="mt-1 text-sm text-gray-700">{rotuloPeriodo}</p>
            </div>
            {!loading && (
              <p className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-sm font-medium ${urgentes > 0 ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}>
                {urgentes > 0 ? <AlertOctagon className="h-4 w-4" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
                {urgentes > 0 ? `${urgentes} ${urgentes === 1 ? "unidade em urgência" : "unidades em urgência"}` : "Nenhuma unidade em urgência"}
              </p>
            )}
          </div>
          {loading ? (
            <div className="flex h-48 items-center justify-center text-gray-600">
              <RefreshCw className="mr-2 h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />
              Carregando…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[64rem] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs">
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Unidade</th>
                    <th className="px-4 py-3 text-left font-semibold text-red-700">Urgência</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Visitas no período (CRM)</th>
                    <th className="px-4 py-3 text-center font-semibold text-amber-800">Pendentes</th>
                    <th className="px-4 py-3 text-center font-semibold text-blue-800">Em negociação</th>
                    <th className="px-4 py-3 text-center font-semibold text-green-800">Matrículas</th>
                    <th className="px-4 py-3 text-center font-semibold text-red-700">Não fechou</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Total</th>
                    <th className="px-4 py-3"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r) => {
                    const urgente = ehUrgente(r);
                    return (
                      <tr key={r.unidade_id} className={urgente ? "bg-red-50/60" : r.visita_realizada > 0 ? "bg-amber-50/40" : ""}>
                        <td className="px-6 py-3 font-medium text-gray-900">
                          {r.unidade_nome}
                          {!urgente && r.visita_realizada > 0 && (
                            <span className="ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800">pendente</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {urgente ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                              <AlertOctagon className="h-3 w-3" aria-hidden />
                              {r.nuncaPreencheu ? "Nunca preencheu" : "Visitas sem desfecho"}
                            </span>
                          ) : traco}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs">
                          {r.visitasNoPeriodo === 0 ? traco : (
                            <span className={r.visitasSemDesfecho > 0 ? "font-semibold text-red-700" : "text-gray-700"}>
                              {r.visitasNoPeriodo} visita{r.visitasNoPeriodo === 1 ? "" : "s"} realizada{r.visitasNoPeriodo === 1 ? "" : "s"},{" "}
                              {r.visitasSemDesfecho} sem desfecho
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums">{r.visita_realizada > 0 ? <span className="font-semibold text-amber-700">{r.visita_realizada}</span> : traco}</td>
                        <td className="px-4 py-3 text-center tabular-nums">{r.em_negociacao > 0 ? <span className="font-semibold text-blue-700">{r.em_negociacao}</span> : traco}</td>
                        <td className="px-4 py-3 text-center tabular-nums">{r.matricula > 0 ? <span className="font-semibold text-green-700">{r.matricula}</span> : traco}</td>
                        <td className="px-4 py-3 text-center tabular-nums">{r.nao_fechou > 0 ? <span className="font-semibold text-red-700">{r.nao_fechou}</span> : traco}</td>
                        <td className="px-4 py-3 text-center tabular-nums text-gray-700">{r.total > 0 ? r.total : traco}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/marketing/desfechos/${r.unidade_id}?mes=${dia !== "todos" ? dia.slice(0, 7) : `${ANO}-${pad(mes)}`}`}
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                            aria-label={`Visualizar desfechos de ${r.unidade_nome}`}
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden /> Visualizar desfechos
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
