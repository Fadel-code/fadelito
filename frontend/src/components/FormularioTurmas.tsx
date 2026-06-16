import { type ChangeEvent } from "react";
import { TURMAS, calcularCampos } from "../types";
import type { RegistroInput } from "../types";

interface Props {
  linhas: RegistroInput[];
  onChange: (linhas: RegistroInput[]) => void;
  readonly?: boolean;
}

const COLUNAS_EDITAVEIS = [
  { key: "visitas" as const,                 label: "Visitas" },
  { key: "visitas_curso_ferias" as const,    label: "Visitas CF" },
  { key: "matriculas" as const,              label: "Matrículas" },
  { key: "matriculas_curso_ferias" as const, label: "Matrículas CF" },
  { key: "desligamentos" as const,           label: "Desligamentos" },
  { key: "transferencias" as const,          label: "Transferências" },
  { key: "religamentos" as const,            label: "Religamentos" },
];

export default function FormularioTurmas({ linhas, onChange, readonly }: Props) {
  function handleChange(turma: string, campo: keyof RegistroInput, valor: string) {
    const num = Math.max(0, parseInt(valor) || 0);
    onChange(
      linhas.map((l) =>
        l.turma === turma ? { ...l, [campo]: num } : l
      )
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-primary-500 text-white">
            <th className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">Turma</th>
            {COLUNAS_EDITAVEIS.map((c) => (
              <th key={c.key} className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">
                {c.label}
              </th>
            ))}
            <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap bg-primary-600">
              Vis. Totais
            </th>
            <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap bg-primary-600">
              Mat. Totais
            </th>
            <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap bg-primary-600">
              % Aprov.
            </th>
            <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap bg-primary-600">
              Saldo
            </th>
          </tr>
        </thead>
        <tbody>
          {TURMAS.map((turma, i) => {
            const linha = linhas.find((l) => l.turma === turma) ?? {
              turma,
              visitas: 0,
              visitas_curso_ferias: 0,
              matriculas: 0,
              matriculas_curso_ferias: 0,
              desligamentos: 0,
              transferencias: 0,
              religamentos: 0,
            };
            const calc = calcularCampos(linha);

            return (
              <tr
                key={turma}
                className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="px-4 py-2 font-medium text-gray-800 whitespace-nowrap border-r border-gray-100">
                  {turma}
                </td>
                {COLUNAS_EDITAVEIS.map((c) => (
                  <td key={c.key} className="px-2 py-1.5 text-center">
                    {readonly ? (
                      <span className="text-gray-700">{linha[c.key]}</span>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        value={linha[c.key]}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          handleChange(turma, c.key, e.target.value)
                        }
                        className="input-numero"
                      />
                    )}
                  </td>
                ))}
                {/* Calculados */}
                <td className="px-3 py-2 celula-calculada border-l border-gray-200">
                  {calc.visitas_totais}
                </td>
                <td className="px-3 py-2 celula-calculada">{calc.matriculas_totais}</td>
                <td className="px-3 py-2 celula-calculada font-semibold">
                  {calc.aproveitamento}
                </td>
                <td
                  className={`px-3 py-2 celula-calculada font-semibold ${
                    calc.saldo < 0 ? "text-red-600" : "text-green-700"
                  }`}
                >
                  {calc.saldo}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
