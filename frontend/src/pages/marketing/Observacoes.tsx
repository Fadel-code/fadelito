import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { UNIDADES, MESES } from "../../types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { Search } from "lucide-react";

const ANO = new Date().getFullYear();

interface ObsRow {
  unidade_id: string;
  data: string;
  observacao: string;
  profiles: { unidade_nome: string }[] | null;
}

export default function Observacoes() {
  const mesCorrido = new Date().getMonth() + 1;
  const [registros, setRegistros] = useState<ObsRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [unidade, setUnidade] = useState("todas");
  const [mes, setMes] = useState(String(mesCorrido));
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const buscar = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("observacoes_diarias")
      .select("unidade_id, data, observacao, profiles(unidade_nome)")
      .order("data", { ascending: false })
      .limit(1000);

    if (mes !== "todos" && !dataInicio && !dataFim) {
      const m = parseInt(mes);
      const inicio = `${ANO}-${String(m).padStart(2, "0")}-01`;
      const ultimoDia = new Date(ANO, m, 0).getDate();
      const fim = `${ANO}-${String(m).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
      query = query.gte("data", inicio).lte("data", fim);
    }

    if (dataInicio) query = query.gte("data", dataInicio);
    if (dataFim) query = query.lte("data", dataFim);

    const { data, error } = await query;
    if (error) console.error(error);

    let rows = (data ?? []) as ObsRow[];
    if (unidade !== "todas") {
      rows = rows.filter((r) => r.profiles?.[0]?.unidade_nome === unidade);
    }
    setRegistros(rows);
    setLoading(false);
  }, [unidade, mes, dataInicio, dataFim]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  function formatarData(iso: string) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Observações</h1>
        <p className="text-gray-500 text-sm mt-1">
          Campo de observação preenchido pelas unidades ao salvar os dados do dia
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Unidade</Label>
            <Select value={unidade} onValueChange={setUnidade}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as unidades</SelectItem>
                {UNIDADES.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Mês</Label>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os meses</SelectItem>
                {MESES.map((nome, i) => {
                  const num = i + 1;
                  return (
                    <SelectItem key={num} value={String(num)} disabled={num > mesCorrido}>
                      {nome}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Data início</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Data fim</Label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={buscar} disabled={loading} size="sm">
            <Search className="h-3.5 w-3.5" />
            {loading ? "Buscando..." : "Buscar"}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-gray-400">Carregando...</div>
        ) : registros.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-gray-400">
            Nenhuma observação encontrada para os filtros selecionados
          </div>
        ) : (
          <>
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
              {registros.length} observações encontradas
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
                  {registros.map((r, i) => (
                    <tr
                      key={`${r.unidade_id}-${r.data}`}
                      className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} border-b border-gray-100`}
                    >
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatarData(r.data)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                        {r.profiles?.[0]?.unidade_nome ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-pre-wrap">{r.observacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
