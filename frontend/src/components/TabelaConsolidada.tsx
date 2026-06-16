import type { ConsolidadoUnidade } from "../types";
import { Button } from "./ui/button";
import { Edit2 } from "lucide-react";

interface Props {
  dados: ConsolidadoUnidade[];
  mostrarStatus?: boolean;
  onEditar?: (unidade: ConsolidadoUnidade) => void;
}

function calcTotal(dados: ConsolidadoUnidade[], campo: keyof ConsolidadoUnidade): number {
  return dados.reduce((acc, d) => acc + (Number(d[campo]) || 0), 0);
}

function calcAprovTotal(dados: ConsolidadoUnidade[]): string {
  const vt = calcTotal(dados, "visitas_totais");
  const mt = calcTotal(dados, "matriculas_totais");
  return vt > 0 ? `${((mt / vt) * 100).toFixed(1)}%` : "—";
}

export default function TabelaConsolidada({ dados, mostrarStatus, onEditar }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-primary-500 text-white">
            {mostrarStatus && <th className="px-3 py-2.5 text-center w-10" />}
            <th className="px-4 py-2.5 text-left font-semibold">Unidade</th>
            <th className="px-3 py-2.5 text-center font-semibold">Visitas</th>
            <th className="px-3 py-2.5 text-center font-semibold">Vis. CF</th>
            <th className="px-3 py-2.5 text-center font-semibold bg-primary-600">Vis. Totais</th>
            <th className="px-3 py-2.5 text-center font-semibold">Matrículas</th>
            <th className="px-3 py-2.5 text-center font-semibold">Mat. CF</th>
            <th className="px-3 py-2.5 text-center font-semibold bg-primary-600">Mat. Totais</th>
            <th className="px-3 py-2.5 text-center font-semibold bg-primary-600">% Aprov.</th>
            <th className="px-3 py-2.5 text-center font-semibold">Desligam.</th>
            <th className="px-3 py-2.5 text-center font-semibold bg-primary-600">Saldo</th>
            <th className="px-3 py-2.5 text-center font-semibold">Transfer.</th>
            <th className="px-3 py-2.5 text-center font-semibold">Religam.</th>
            {onEditar && <th className="px-3 py-2.5 text-center font-semibold w-16" />}
          </tr>
        </thead>
        <tbody>
          {dados.map((u, i) => (
            <tr
              key={u.unidade_id}
              className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-primary-50 transition-colors`}
            >
              {mostrarStatus && (
                <td className="px-3 py-2 text-center">
                  <span title={u.preencheu_hoje ? "Preencheu hoje" : "Não preencheu hoje"}>
                    {u.preencheu_hoje ? "🟢" : "🔴"}
                  </span>
                </td>
              )}
              <td className="px-4 py-2 font-medium text-gray-800 whitespace-nowrap">
                {u.unidade_nome}
              </td>
              <td className="px-3 py-2 text-center text-gray-700">{u.visitas}</td>
              <td className="px-3 py-2 text-center text-gray-700">{u.visitas_curso_ferias}</td>
              <td className="px-3 py-2 text-center font-semibold text-gray-800 bg-gray-50">
                {u.visitas_totais}
              </td>
              <td className="px-3 py-2 text-center text-gray-700">{u.matriculas}</td>
              <td className="px-3 py-2 text-center text-gray-700">{u.matriculas_curso_ferias}</td>
              <td className="px-3 py-2 text-center font-semibold text-gray-800 bg-gray-50">
                {u.matriculas_totais}
              </td>
              <td className="px-3 py-2 text-center font-semibold text-gray-800 bg-gray-50">
                {u.aproveitamento}
              </td>
              <td className="px-3 py-2 text-center text-gray-700">{u.desligamentos}</td>
              <td
                className={`px-3 py-2 text-center font-semibold bg-gray-50 ${
                  u.saldo < 0 ? "text-red-600" : "text-green-700"
                }`}
              >
                {u.saldo}
              </td>
              <td className="px-3 py-2 text-center text-gray-700">{u.transferencias}</td>
              <td className="px-3 py-2 text-center text-gray-700">{u.religamentos}</td>
              {onEditar && (
                <td className="px-3 py-2 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditar(u)}
                    title="Editar dados desta unidade"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        {/* Linha Total da Rede */}
        {dados.length > 0 && (
          <tfoot>
            <tr className="bg-primary-600 text-white font-bold border-t-2 border-primary-700">
              {mostrarStatus && <td />}
              <td className="px-4 py-3">Total da Rede</td>
              <td className="px-3 py-3 text-center">{calcTotal(dados, "visitas")}</td>
              <td className="px-3 py-3 text-center">{calcTotal(dados, "visitas_curso_ferias")}</td>
              <td className="px-3 py-3 text-center">{calcTotal(dados, "visitas_totais")}</td>
              <td className="px-3 py-3 text-center">{calcTotal(dados, "matriculas")}</td>
              <td className="px-3 py-3 text-center">{calcTotal(dados, "matriculas_curso_ferias")}</td>
              <td className="px-3 py-3 text-center">{calcTotal(dados, "matriculas_totais")}</td>
              <td className="px-3 py-3 text-center">{calcAprovTotal(dados)}</td>
              <td className="px-3 py-3 text-center">{calcTotal(dados, "desligamentos")}</td>
              <td className="px-3 py-3 text-center">{calcTotal(dados, "saldo")}</td>
              <td className="px-3 py-3 text-center">{calcTotal(dados, "transferencias")}</td>
              <td className="px-3 py-3 text-center">{calcTotal(dados, "religamentos")}</td>
              {onEditar && <td />}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
