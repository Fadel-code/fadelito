import type { LinhaTurma } from "../types";
import { aproveitamentoTurma } from "../lib/turmas";

interface Props {
  linhas: LinhaTurma[];
  /** Mostra a coluna Unidade (recorte com mais de uma unidade). */
  comUnidade?: boolean;
  /** Linha de total ao pé da tabela. */
  total?: LinhaTurma;
  /** Limita a altura e mantém o cabeçalho visível em listas longas. */
  rolavel?: boolean;
}

function Celulas({ l }: { l: LinhaTurma }) {
  const vt = l.visitas + l.visitas_curso_ferias;
  const mt = l.matriculas + l.matriculas_curso_ferias;
  return (
    <>
      <td className="px-3 py-2 text-center text-gray-700">{l.visitas}</td>
      <td className="px-3 py-2 text-center text-gray-700">{l.visitas_curso_ferias}</td>
      <td className="px-3 py-2 text-center font-semibold text-gray-800 bg-gray-50">{vt}</td>
      <td className="px-3 py-2 text-center text-gray-700">{l.matriculas}</td>
      <td className="px-3 py-2 text-center text-gray-700">{l.matriculas_curso_ferias}</td>
      <td className="px-3 py-2 text-center font-semibold text-gray-800 bg-gray-50">{mt}</td>
      <td className="px-3 py-2 text-center font-semibold text-gray-800 bg-gray-50">
        {aproveitamentoTurma(vt, mt)}
      </td>
      <td className="px-3 py-2 text-center text-gray-700">{l.desligamentos}</td>
      <td className="px-3 py-2 text-center font-semibold text-gray-800 bg-gray-50">
        {mt - l.desligamentos}
      </td>
      <td className="px-3 py-2 text-center text-gray-700">{l.transferencias}</td>
      <td className="px-3 py-2 text-center text-gray-700">{l.religamentos}</td>
    </>
  );
}

export default function TabelaTurmas({ linhas, comUnidade, total, rolavel }: Props) {
  return (
    <div
      className={`overflow-x-auto rounded-lg border border-gray-200 ${rolavel ? "max-h-[70vh] overflow-y-auto" : ""}`}
    >
      <table className="w-full text-sm border-collapse">
        <thead className={rolavel ? "sticky top-0 z-10" : ""}>
          <tr className="bg-primary-500 text-white">
            {comUnidade && (
              <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Unidade</th>
            )}
            <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Turma</th>
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
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr
              key={`${l.unidade}-${l.turma}`}
              className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-primary-50 transition-colors`}
            >
              {comUnidade && (
                <td className="px-4 py-2 font-medium text-gray-800 whitespace-nowrap">
                  {l.unidade}
                </td>
              )}
              <td className="px-4 py-2 font-medium text-gray-800 whitespace-nowrap">{l.turma}</td>
              <Celulas l={l} />
            </tr>
          ))}
          {total && (
            <tr className="bg-primary-50 border-t-2 border-primary-200 font-bold text-primary-700">
              <td className="px-4 py-2" colSpan={comUnidade ? 2 : 1}>
                Total
              </td>
              <Celulas l={total} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
