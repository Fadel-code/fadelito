import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "../../lib/supabase";
import { reverterDesfecho } from "../../lib/crm";
import { UNIDADES, MESES, DESFECHOS } from "../../types";
import type { DesfechoTipo } from "../../types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { diasUteisDoMes, dateToIso } from "../../lib/utils";
import { FERIADOS_SET } from "../../lib/feriados";

const ANO = new Date().getFullYear();

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
  visita_realizada: "bg-blue-100 text-blue-700",
  em_negociacao:   "bg-yellow-100 text-yellow-700",
  matricula:       "bg-green-100 text-green-700",
  nao_fechou:      "bg-red-100 text-red-700",
};

function desfechoLabel(tipo: DesfechoTipo) {
  return DESFECHOS.find((d) => d.value === tipo)?.label ?? tipo;
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

  const [unidade, setUnidade] = useState("todas");
  const [mes, setMes] = useState(String(mesCorrido));
  const [dia, setDia] = useState("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const hojeIso = dateToIso(new Date());
  const diasUteis = mes !== "todos"
    ? diasUteisDoMes(ANO, Number(mes), FERIADOS_SET)
        .filter((d) => dateToIso(d) <= hojeIso)
        .reverse()
    : [];

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
    if (mes !== "todos") {
      const m = parseInt(mes);
      const inicio = `${ANO}-${String(m).padStart(2, "0")}-01`;
      const ultimoDia = new Date(ANO, m, 0).getDate();
      const fim = `${ANO}-${String(m).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
      return { inicio, fim };
    }
    return {};
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
      await reverterDesfecho(row.crm_lead_id);
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

  function formatarData(iso: string) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  const activeRows = tab === "diario" ? obsRows : desfechoRows;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Observações</h1>
        <p className="text-gray-500 text-sm mt-1">
          Registros das unidades — formulário diário e desfechos de visita
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label>Unidade</Label>
            <Select value={unidade} onValueChange={setUnidade}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as unidades</SelectItem>
                {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Mês</Label>
            <Select value={mes} onValueChange={(v) => { setMes(v); setDia("todos"); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os meses</SelectItem>
                {MESES.map((nome, i) => {
                  const num = i + 1;
                  return (
                    <SelectItem key={num} value={String(num)}>
                      {nome}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Dia</Label>
            <Select value={dia} onValueChange={setDia} disabled={mes === "todos"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
          </div>
          <div className="space-y-1.5">
            <Label>Data início</Label>
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Data fim</Label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={buscar} disabled={loading} size="sm">
            <Search className="h-3.5 w-3.5" />
            {loading ? "Buscando..." : "Buscar"}
          </Button>
        </div>
      </div>

      {/* Abas */}
      <div className="flex border-b border-gray-200 mb-0">
        {(["diario", "desfechos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "diario" ? `Formulário Diário (${obsRows.length})` : `Desfechos de Visita (${desfechoRows.length})`}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-b-xl rounded-tr-xl border border-t-0 border-gray-200 overflow-hidden">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-gray-400">Carregando...</div>
        ) : activeRows.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-gray-400">
            Nenhum registro encontrado para os filtros selecionados
          </div>
        ) : tab === "diario" ? (
          <>
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
              {obsRows.length} observações encontradas
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-primary-500 text-white">
                    <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap w-28">Data</th>
                    <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap w-44">Unidade</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {obsRows.map((r, i) => (
                    <tr key={`${r.unidade_id}-${r.data}`} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} border-b border-gray-100`}>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatarData(r.data)}</td>
                      <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{nomeMap[r.unidade_id] ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-pre-wrap">{r.observacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
              {desfechoRows.length} desfechos encontrados
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-primary-500 text-white">
                    <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap w-28">Data</th>
                    <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap w-44">Unidade</th>
                    <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap w-36">Lead</th>
                    <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap w-36">Desfecho</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Observação</th>
                    <th className="px-4 py-2.5 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {desfechoRows.map((r, i) => {
                    const isConfirmando = confirmandoId === r.id;
                    const isRemovendoThis = removendo === r.id;
                    return (
                    <tr key={r.id ?? i} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} border-b border-gray-100`}>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatarData(r.data)}</td>
                      <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{nomeMap[r.unidade_id] ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{r.nome ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DESFECHO_BADGE[r.tipo]}`}>
                          {desfechoLabel(r.tipo)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-pre-wrap">{r.observacao ?? "—"}</td>
                      <td className="px-4 py-3">
                        {isConfirmando ? (
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="text-xs text-gray-500">Remover?</span>
                            <button
                              onClick={() => handleRemoverDesfecho(r)}
                              disabled={isRemovendoThis}
                              className="text-xs text-red-600 font-semibold hover:underline disabled:opacity-50"
                            >
                              {isRemovendoThis ? "..." : "Sim"}
                            </button>
                            <button
                              onClick={() => setConfirmandoId(null)}
                              className="text-xs text-gray-400 hover:underline"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmandoId(r.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Remover desfecho"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
