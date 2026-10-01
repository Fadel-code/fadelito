import { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "../../lib/supabase";
import { reverterDesfecho } from "../../lib/crm";
import { UNIDADES, MESES, DESFECHOS } from "../../types";
import type { DesfechoTipo } from "../../types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import Segmentado from "../../components/ui/segmentado";
import { ROTULO, CARD_DESTAQUE } from "../../components/ui/estilos";
import SeletorMes from "../../components/ranking/SeletorMes";
import SeletorDatas from "../../components/ranking/SeletorDatas";
import { MessageSquareText, RefreshCw, Search, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { diasUteisDoMes, dateToIso } from "../../lib/utils";
import { FERIADOS_SET } from "../../lib/feriados";

const ANO = new Date().getFullYear();
const ANO_INICIAL = 2026;
const pad = (n: number | string) => String(n).padStart(2, "0");
const semAcento = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

interface ObsRow {
  unidade_id: string;
  data: string;
  observacao: string;
}

interface DesfechoRow {
  id: string;
  crm_lead_id: number;
  unidade_id: string;
  data: string;
  nome: string | null;
  tipo: DesfechoTipo;
  observacao: string | null;
  synced_at: string | null;
}

const DESFECHO_BADGE: Record<DesfechoTipo, string> = {
  visita_realizada: "bg-blue-100 text-blue-800",
  em_negociacao:   "bg-yellow-100 text-yellow-800",
  matricula:       "bg-green-100 text-green-800",
  nao_fechou:      "bg-red-100 text-red-800",
  removido:        "bg-gray-200 text-gray-700",
};

function desfechoLabel(tipo: DesfechoTipo) {
  if (tipo === "removido") return "Removido";
  return DESFECHOS.find((d) => d.value === tipo)?.label ?? tipo;
}

const FILTRO_KEY = "fadelito_filtro_observacoes";

function filtroSalvo(): Partial<{ unidade: string; mes: string; dia: string; dataInicio: string; dataFim: string }> {
  try {
    const salvo = localStorage.getItem(FILTRO_KEY);
    return salvo ? JSON.parse(salvo) : {};
  } catch {
    return {};
  }
}

/** "qui, 02/10" — o ano só aparece quando não é o corrente. */
function rotuloData(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return format(d, d.getFullYear() === ANO ? "EEE, dd/MM" : "EEE, dd/MM/yyyy", { locale: ptBR });
}

function Esqueleto() {
  return (
    <ul className="divide-y divide-gray-100" aria-busy="true" aria-label="Carregando registros">
      {Array.from({ length: 5 }, (_, i) => (
        <li key={i} className="flex animate-pulse items-start gap-4 px-4 py-4 motion-reduce:animate-none sm:px-6">
          <span className="h-4 w-20 rounded bg-gray-100" />
          <span className="h-4 w-32 rounded bg-gray-100" />
          <span className="h-4 flex-1 rounded bg-gray-100" />
        </li>
      ))}
    </ul>
  );
}

export default function Observacoes() {
  const mesCorrido = new Date().getMonth() + 1;
  const [tab, setTab] = useState<"diario" | "desfechos">("diario");

  const [obsRows, setObsRows] = useState<ObsRow[]>([]);
  const [desfechoRows, setDesfechoRows] = useState<DesfechoRow[]>([]);
  const [nomeMap, setNomeMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [removendo, setRemovendoId] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  const inicial = useMemo(() => {
    const f = filtroSalvo();
    // "Todos os meses" deixou de existir: vira o ano até hoje, que mostra o mesmo.
    if (f.mes === "todos" && !f.dataInicio && !f.dataFim) return { ...f, mes: String(mesCorrido), dataInicio: `${ANO}-01-01`, dataFim: dateToIso(new Date()) };
    return f;
  }, [mesCorrido]);
  const [unidade, setUnidade] = useState(inicial.unidade ?? "todas");
  const [mes, setMes] = useState(inicial.mes && inicial.mes !== "todos" ? inicial.mes : String(mesCorrido));
  const [dia, setDia] = useState(inicial.dia ?? "todos");
  const [dataInicio, setDataInicio] = useState(inicial.dataInicio ?? "");
  const [dataFim, setDataFim] = useState(inicial.dataFim ?? "");
  const [modo, setModo] = useState<"mes" | "datas">(inicial.dataInicio || inicial.dataFim ? "datas" : "mes");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    localStorage.setItem(FILTRO_KEY, JSON.stringify({ unidade, mes, dia, dataInicio, dataFim }));
  }, [unidade, mes, dia, dataInicio, dataFim]);

  const hojeIso = dateToIso(new Date());
  const diasUteis = diasUteisDoMes(ANO, Number(mes), FERIADOS_SET)
    .filter((d) => dateToIso(d) <= hojeIso)
    .reverse();

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, unidade_nome")
      .eq("role", "unidade")
      .then(({ data }) => {
        const map: Record<string, string> = {};
        for (const p of data ?? []) map[p.id] = p.unidade_nome ?? "";
        setNomeMap(map);
      });
  }, []);

  function buildDateRange() {
    if (dia !== "todos") return { inicio: dia, fim: dia };
    if (dataInicio || dataFim) return { inicio: dataInicio || undefined, fim: dataFim || undefined };
    const m = parseInt(mes);
    return { inicio: `${ANO}-${pad(m)}-01`, fim: `${ANO}-${pad(m)}-${pad(new Date(ANO, m, 0).getDate())}` };
  }

  const buscar = useCallback(async () => {
    setLoading(true);
    const { inicio, fim } = buildDateRange();

    // Observações diárias
    let q1 = supabase.from("observacoes_diarias").select("unidade_id, data, observacao")
      .order("data", { ascending: false }).limit(1000);
    if (inicio) q1 = q1.gte("data", inicio);
    if (fim)    q1 = q1.lte("data", fim);
    const { data: obs } = await q1;
    let obsFiltered = (obs ?? []) as ObsRow[];
    if (unidade !== "todas") obsFiltered = obsFiltered.filter((r) => nomeMap[r.unidade_id] === unidade);
    setObsRows(obsFiltered);

    // Desfechos de visita
    let q2 = supabase.from("eventos_lead").select("id, crm_lead_id, unidade_id, data, nome, tipo, observacao, synced_at")
      .order("data", { ascending: false }).limit(1000);
    if (inicio) q2 = q2.gte("data", inicio);
    if (fim)    q2 = q2.lte("data", fim);
    const { data: desf } = await q2;
    let desfFiltered = (desf ?? []) as DesfechoRow[];
    if (unidade !== "todas") desfFiltered = desfFiltered.filter((r) => nomeMap[r.unidade_id] === unidade);
    setDesfechoRows(desfFiltered);

    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidade, mes, dia, dataInicio, dataFim, nomeMap]);

  useEffect(() => { buscar(); }, [buscar]);

  async function handleRemoverDesfecho(row: DesfechoRow & { id: string }) {
    setRemovendoId(row.id);
    try {
      // CRM: best-effort — falha não impede a limpeza local (ex.: lead "removido" nunca teve outcome enviado ao CRM)
      try {
        await reverterDesfecho(row.crm_lead_id);
      } catch (crmErr) {
        console.warn("Não foi possível reverter no CRM (ignorado):", crmErr);
      }
      const { error } = await supabase.from("eventos_lead").delete().eq("id", row.id);
      if (error) throw error;
      toast.success("Desfecho removido.");
      setConfirmandoId(null);
      await buscar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover desfecho");
    } finally {
      setRemovendoId(null);
    }
  }

  function trocarModo(novo: "mes" | "datas") {
    setModo(novo);
    setDia("todos");
    if (novo === "mes") {
      setDataInicio("");
      setDataFim("");
    } else if (!dataInicio && !dataFim) {
      // Começa pelo mês que já estava na tela, até hoje se ele ainda está em curso.
      const ultimo = `${ANO}-${pad(mes)}-${pad(new Date(ANO, Number(mes), 0).getDate())}`;
      setDataInicio(`${ANO}-${pad(mes)}-01`);
      setDataFim(ultimo < hojeIso ? ultimo : hojeIso);
    }
  }

  function limparFiltros() {
    setUnidade("todas");
    setModo("mes");
    setMes(String(mesCorrido));
    setDia("todos");
    setDataInicio("");
    setDataFim("");
    setBusca("");
  }

  const termo = semAcento(busca.trim());
  const obsVisiveis = useMemo(
    () => (termo ? obsRows.filter((r) => semAcento(`${r.observacao} ${nomeMap[r.unidade_id] ?? ""}`).includes(termo)) : obsRows),
    [obsRows, termo, nomeMap]
  );
  const desfechosVisiveis = useMemo(
    () => (termo ? desfechoRows.filter((r) => semAcento(`${r.observacao ?? ""} ${r.nome ?? ""} ${nomeMap[r.unidade_id] ?? ""} ${desfechoLabel(r.tipo)}`).includes(termo)) : desfechoRows),
    [desfechoRows, termo, nomeMap]
  );
  const total = tab === "diario" ? obsVisiveis.length : desfechosVisiveis.length;
  const filtrando = unidade !== "todas" || termo !== "" || modo === "datas" || dia !== "todos" || mes !== String(mesCorrido);

  const rotuloPeriodo =
    dia !== "todos" ? rotuloData(dia)
    : modo === "datas" ? [dataInicio && format(new Date(`${dataInicio}T12:00:00`), "dd/MM/yyyy"), dataFim && format(new Date(`${dataFim}T12:00:00`), "dd/MM/yyyy")].filter(Boolean).join(" a ")
    : `${MESES[Number(mes) - 1]} de ${ANO}`;

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Observações</h1>
          <p className="mt-1 text-sm text-gray-600">O que as unidades registraram: formulário diário e desfechos de visita.</p>
        </div>
        <Button variant="outline" size="icon" onClick={buscar} title="Atualizar" aria-label="Atualizar">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`} />
        </Button>
      </div>

      <div className="space-y-4">
        <section aria-label="Filtros" className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-end gap-x-3 gap-y-4">
            <div>
              <span className={ROTULO}>Período</span>
              <Segmentado
                rotulo="Tipo de período"
                valor={modo}
                opcoes={[{ valor: "mes", rotulo: "Mês" }, { valor: "datas", rotulo: "Datas personalizadas", curto: "Datas" }]}
                onChange={trocarModo}
              />
            </div>
            {modo === "mes" ? (
              <div>
                <span className={ROTULO}>Mês</span>
                <SeletorMes
                  valor={`${ANO}-${pad(mes)}`}
                  min={`${ANO}-01`}
                  max={`${ANO}-${pad(mesCorrido)}`}
                  onChange={(ym) => { setMes(String(Number(ym.slice(5, 7)))); setDia("todos"); }}
                />
              </div>
            ) : (
              <SeletorDatas de={dataInicio} ate={dataFim} min={`${ANO_INICIAL}-01-01`} onChange={(d, a) => { setDataInicio(d); setDataFim(a); }} />
            )}
            <div className="grid w-full grid-cols-1 items-end gap-4 sm:contents">
              {modo === "mes" && (
                <div>
                  <span id="obs-dia" className={ROTULO}>Dia</span>
                  <Select value={dia} onValueChange={setDia}>
                    <SelectTrigger className="sm:w-44" aria-labelledby="obs-dia"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os dias</SelectItem>
                      {diasUteis.map((d) => {
                        const iso = dateToIso(d);
                        return <SelectItem key={iso} value={iso}>{format(d, "EEE, dd/MM", { locale: ptBR })}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="sm:ml-auto">
                <span id="obs-unidade" className={ROTULO}>Unidade</span>
                <Select value={unidade} onValueChange={setUnidade}>
                  <SelectTrigger className="sm:w-52" aria-labelledby="obs-unidade"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as unidades</SelectItem>
                    {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="obs-titulo" className={CARD_DESTAQUE}>
          <div className="flex flex-col gap-4 border-b border-gray-100 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 id="obs-titulo" className="text-xl font-bold tracking-tight text-gray-900">Registros</h2>
              <p className="mt-1 text-sm text-gray-700">
                {rotuloPeriodo}
                {unidade !== "todas" && ` · ${unidade}`}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div role="tablist" aria-label="Tipo de registro" className="flex rounded-lg bg-gray-100 p-0.5 text-sm ring-1 ring-inset ring-gray-200 sm:inline-flex">
                {([["diario", "Formulário diário", "Diário", obsVisiveis.length], ["desfechos", "Desfechos de visita", "Desfechos", desfechosVisiveis.length]] as const).map(([t, rotulo, curto, n]) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    className={`inline-flex h-8 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:flex-none ${
                      tab === t ? "bg-primary-600 text-white shadow-sm" : "text-gray-700 hover:bg-white hover:text-gray-900"
                    }`}
                  >
                    <span className="sm:hidden">{curto}</span>
                    <span className="hidden sm:inline">{rotulo}</span>
                    <span className={`tabular-nums ${tab === t ? "font-semibold text-white/85" : "text-gray-500"}`}>{loading ? "" : n}</span>
                  </button>
                ))}
              </div>
              <div className="relative sm:w-64">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden />
                <Input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar no texto"
                  aria-label="Buscar nas observações"
                  className="pl-8 pr-8 [&::-webkit-search-cancel-button]:hidden"
                />
                {busca && (
                  <button type="button" onClick={() => setBusca("")} aria-label="Limpar busca" className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <Esqueleto />
          ) : total === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600"><MessageSquareText className="h-5 w-5" aria-hidden /></span>
              <p className="max-w-sm text-sm text-gray-700">
                {termo ? `Nada encontrado para “${busca.trim()}” neste período.` : tab === "diario" ? "Nenhuma observação neste período." : "Nenhum desfecho de visita neste período."}
              </p>
              {filtrando && <Button variant="outline" size="sm" onClick={limparFiltros}>Limpar filtros</Button>}
            </div>
          ) : tab === "diario" ? (
            <>
              <div className="hidden items-center gap-x-4 border-b border-gray-100 bg-gray-50 px-6 py-2 text-xs font-semibold text-gray-700 md:grid md:grid-cols-[6.5rem_9rem_minmax(0,1fr)]" aria-hidden>
                <span>Data</span><span>Unidade</span><span>Observação</span>
              </div>
              <ul className="divide-y divide-gray-100">
                {obsVisiveis.map((r) => (
                  <li key={`${r.unidade_id}-${r.data}`} className="grid gap-x-4 gap-y-1 px-4 py-3.5 hover:bg-gray-50/70 sm:px-6 md:grid-cols-[6.5rem_9rem_minmax(0,1fr)]">
                    <p className="flex items-baseline gap-2 md:contents">
                      <span className="text-sm font-semibold text-gray-900 md:order-2 md:font-medium">{nomeMap[r.unidade_id] ?? "—"}</span>
                      <span className="text-sm tabular-nums text-gray-600 md:order-1">{rotuloData(r.data)}</span>
                    </p>
                    <p className="max-w-[75ch] whitespace-pre-wrap text-sm leading-relaxed text-gray-800 md:order-3">{r.observacao}</p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <div className="hidden items-center gap-x-4 border-b border-gray-100 bg-gray-50 px-6 py-2 text-xs font-semibold text-gray-700 xl:grid xl:grid-cols-[5.5rem_8.5rem_9rem_9rem_minmax(0,1fr)_4.5rem]" aria-hidden>
                <span>Data</span><span>Unidade</span><span>Lead</span><span>Desfecho</span><span>Observação</span><span />
              </div>
              <ul className="divide-y divide-gray-100">
                {desfechosVisiveis.map((r) => {
                  const confirmando = confirmandoId === r.id;
                  return (
                    <li key={r.id} className="grid gap-x-4 gap-y-1 px-4 py-3.5 hover:bg-gray-50/70 sm:px-6 xl:grid-cols-[5.5rem_8.5rem_9rem_9rem_minmax(0,1fr)_4.5rem] xl:items-start">
                      <div className="flex flex-wrap items-start gap-x-3 gap-y-1 xl:contents">
                        <span className="min-w-0 flex-1 text-sm font-semibold text-gray-900 xl:col-start-3 xl:row-start-1 xl:font-medium">{r.nome ?? "—"}</span>
                        <span title={r.tipo === "removido" ? "Removido (não é desta unidade)" : undefined} className={`inline-flex flex-shrink-0 self-start whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium xl:col-start-4 xl:row-start-1 ${DESFECHO_BADGE[r.tipo]}`}>
                          {desfechoLabel(r.tipo)}
                        </span>
                        <div className="flex items-center justify-end xl:col-start-6 xl:row-start-1 xl:-mt-1">
                          {confirmando ? (
                            <div className="flex items-center gap-2 whitespace-nowrap text-sm">
                              <span className="text-gray-700">Remover?</span>
                              <button type="button" onClick={() => handleRemoverDesfecho(r)} disabled={removendo === r.id} className="rounded px-1.5 py-1 font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50">
                                {removendo === r.id ? "…" : "Sim"}
                              </button>
                              <button type="button" onClick={() => setConfirmandoId(null)} className="rounded px-1.5 py-1 text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                                Não
                              </button>
                            </div>
                          ) : (
                            <button type="button" onClick={() => setConfirmandoId(r.id)} title="Remover desfecho" aria-label={`Remover desfecho de ${r.nome ?? "lead"}`} className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="flex items-baseline gap-2 text-sm text-gray-600 xl:contents">
                        <span className="tabular-nums xl:col-start-1 xl:row-start-1">{rotuloData(r.data)}</span>
                        <span aria-hidden className="xl:hidden">·</span>
                        <span className="xl:col-start-2 xl:row-start-1 xl:font-medium xl:text-gray-800">{nomeMap[r.unidade_id] ?? "—"}</span>
                      </p>
                      <p className="max-w-[75ch] whitespace-pre-wrap text-sm leading-relaxed text-gray-800 xl:col-start-5 xl:row-start-1">{r.observacao ?? "—"}</p>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
