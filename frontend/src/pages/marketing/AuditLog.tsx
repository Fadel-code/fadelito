import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import type { AuditLog as AuditEntry } from "../../types";
import { UNIDADES, MESES } from "../../types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Search } from "lucide-react";

const ANO = new Date().getFullYear();

export default function AuditLog() {
  const [registros, setRegistros] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [unidade, setUnidade] = useState("todas");
  const [mes, setMes] = useState("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const buscar = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("audit_log")
      .select("*")
      .order("alterado_em", { ascending: false })
      .limit(500);

    if (unidade !== "todas") query = query.eq("unidade_nome", unidade);

    if (mes !== "todos" && !dataInicio && !dataFim) {
      const m = parseInt(mes);
      const inicio = `${ANO}-${String(m).padStart(2, "0")}-01`;
      const ultimoDia = new Date(ANO, m, 0).getDate();
      const fim = `${ANO}-${String(m).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
      query = query.gte("data_registro", inicio).lte("data_registro", fim);
    }

    if (dataInicio) query = query.gte("data_registro", dataInicio);
    if (dataFim) query = query.lte("data_registro", dataFim);

    const { data, error } = await query;
    if (error) console.error(error);
    setRegistros(data ?? []);
    setLoading(false);
  }, [unidade, mes, dataInicio, dataFim]);

  useEffect(() => { buscar(); }, [buscar]);

  function formatarDataHora(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function formatarDataRegistro(iso: string): string {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  const LABELS: Record<string, string> = {
    visitas: "Visitas",
    visitas_curso_ferias: "Visitas CF",
    matriculas: "Matrículas",
    matriculas_curso_ferias: "Matrículas CF",
    desligamentos: "Desligamentos",
    transferencias: "Transferências",
    religamentos: "Religamentos",
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-500 text-sm mt-1">
          Histórico de todas as alterações nos registros
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
                  <SelectItem key={u} value={u}>{u}</SelectItem>
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
                    <SelectItem key={num} value={String(num)}>
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
            Nenhum registro encontrado para os filtros selecionados
          </div>
        ) : (
          <>
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
              {registros.length} registros encontrados
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-primary-500 text-white">
                    <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Data/Hora</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Unidade</th>
                    <th className="px-4 py-2.5 text-center font-semibold">Ação</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Turma</th>
                    <th className="px-4 py-2.5 text-center font-semibold whitespace-nowrap">Data Registro</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Campo</th>
                    <th className="px-4 py-2.5 text-center font-semibold">Anterior</th>
                    <th className="px-4 py-2.5 text-center font-semibold">Novo</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r, i) => (
                    <tr
                      key={r.id}
                      className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} border-b border-gray-100`}
                    >
                      <td className="px-4 py-2 text-gray-500 whitespace-nowrap text-xs">
                        {formatarDataHora(r.alterado_em)}
                      </td>
                      <td className="px-4 py-2 font-medium text-gray-800 whitespace-nowrap">
                        {r.unidade_nome}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Badge variant={r.acao === "INSERT" ? "success" : "default"}>
                          {r.acao}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{r.turma}</td>
                      <td className="px-4 py-2 text-center text-gray-500 whitespace-nowrap">
                        {formatarDataRegistro(r.data_registro)}
                      </td>
                      <td className="px-4 py-2 text-gray-700">
                        {LABELS[r.campo_alterado] ?? r.campo_alterado}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {r.valor_anterior !== null ? (
                          <span className="font-mono text-red-500">{r.valor_anterior}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="font-mono text-green-600 font-medium">{r.valor_novo}</span>
                      </td>
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
