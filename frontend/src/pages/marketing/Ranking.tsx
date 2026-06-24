import { useState } from "react";
import { useConsolidado } from "../../hooks/useConsolidado";
import { MESES } from "../../types";
import type { ConsolidadoUnidade } from "../../types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";

const ANO = new Date().getFullYear();

type ColunaOrdem = "matriculas_totais" | "aproveitamento_num" | "saldo";

interface DadoComAprov extends ConsolidadoUnidade {
  aproveitamento_num: number;
}

export default function Ranking() {
  const mesCorrido = new Date().getMonth() + 1;
  const [mes, setMes] = useState(mesCorrido);
  const [ordem, setOrdem] = useState<ColunaOrdem>("matriculas_totais");
  const [asc, setAsc] = useState(false);

  const { dados, loading } = useConsolidado(ANO, mes);

  function toggleOrdem(col: ColunaOrdem) {
    if (ordem === col) setAsc((v) => !v);
    else { setOrdem(col); setAsc(false); }
  }

  const dadosComAprov: DadoComAprov[] = dados.map((d) => ({
    ...d,
    aproveitamento_num:
      d.visitas_totais > 0
        ? parseFloat(((d.matriculas_totais / d.visitas_totais) * 100).toFixed(1))
        : 0,
  }));

  const ordenados = [...dadosComAprov].sort((a, b) => {
    const diff = a[ordem] - b[ordem];
    return asc ? diff : -diff;
  });

  function SortIcon({ col }: { col: ColunaOrdem }) {
    if (ordem !== col) return <span className="opacity-30 ml-1">↕</span>;
    return asc ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />;
  }

  function medalha(i: number, total: number): string {
    if (i === 0) return "🥇";
    if (i === 1) return "🥈";
    if (i === 2) return "🥉";
    if (i >= total - 3) return "🔴";
    return "";
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ranking das Unidades</h1>
          <p className="text-gray-500 text-sm mt-1">Top 3 e bottom 3 do mês</p>
        </div>
        <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MESES.map((nome, i) => {
              const num = i + 1;
              return (
                <SelectItem key={num} value={String(num)} disabled={num > mesCorrido}>
                  {nome} {ANO}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-gray-400">Carregando...</div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-primary-500 text-white">
                <th className="px-4 py-3 text-left w-12">#</th>
                <th className="px-4 py-3 text-left font-semibold">Unidade</th>
                <th
                  className="px-4 py-3 text-center font-semibold cursor-pointer hover:bg-primary-600 select-none"
                  onClick={() => toggleOrdem("matriculas_totais")}
                >
                  Matrículas Totais <SortIcon col="matriculas_totais" />
                </th>
                <th
                  className="px-4 py-3 text-center font-semibold cursor-pointer hover:bg-primary-600 select-none"
                  onClick={() => toggleOrdem("aproveitamento_num")}
                >
                  % Aproveitamento <SortIcon col="aproveitamento_num" />
                </th>
                <th
                  className="px-4 py-3 text-center font-semibold cursor-pointer hover:bg-primary-600 select-none"
                  onClick={() => toggleOrdem("saldo")}
                >
                  Saldo <SortIcon col="saldo" />
                </th>
                <th className="px-4 py-3 text-center font-semibold">Visitas Totais</th>
                <th className="px-4 py-3 text-center font-semibold">Desligamentos</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((u, i) => {
                const isTop3 = i < 3;
                const isBottom3 = i >= ordenados.length - 3 && ordenados.length > 3;
                return (
                  <tr
                    key={u.unidade_id}
                    className={`
                      ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      ${isTop3 ? "border-l-4 border-l-primary-400" : ""}
                      ${isBottom3 && !isTop3 ? "border-l-4 border-l-red-400" : ""}
                    `}
                  >
                    <td className="px-4 py-3 text-center">
                      <span className="text-base">{medalha(i, ordenados.length)}</span>
                      {!medalha(i, ordenados.length) && (
                        <span className="text-gray-400 text-xs">{i + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{u.unidade_nome}</td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-800">
                      {u.matriculas_totais}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-800">
                      {u.aproveitamento}
                    </td>
                    <td
                      className={`px-4 py-3 text-center font-semibold ${
                        u.saldo < 0 ? "text-red-600" : "text-green-700"
                      }`}
                    >
                      {u.saldo > 0 ? "+" : ""}
                      {u.saldo}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">{u.visitas_totais}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{u.desligamentos}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
