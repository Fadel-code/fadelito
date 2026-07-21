import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "../../App";
import { useRegistros } from "../../hooks/useRegistros";
import { TURMAS, MESES } from "../../types";
import type { Turma } from "../../types";
import { FERIADOS_SET } from "../../lib/feriados";
import { diasUteisDoMes, dateToIso } from "../../lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Edit2 } from "lucide-react";

const ANO = new Date().getFullYear();

const SECOES = [
  { key: "visitas" as const,                 label: "Visitas" },
  { key: "visitas_curso_ferias" as const,    label: "Visitas CF" },
  { key: "matriculas" as const,              label: "Matrículas" },
  { key: "matriculas_curso_ferias" as const, label: "Matrículas CF" },
  { key: "desligamentos" as const,           label: "Desligamentos" },
  { key: "transferencias" as const,          label: "Transferências" },
  { key: "religamentos" as const,            label: "Religamentos" },
] as const;

type Secao = (typeof SECOES)[number]["key"];

type RegistroMap = Record<string, Record<Turma, Record<Secao, number>>>;

export default function HistoricoMensal() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const mesCorrido = new Date().getMonth() + 1; // 1-indexed

  const [mes, setMes] = useState(mesCorrido);
  const [registros, setRegistros] = useState<RegistroMap>({});
  const [loading, setLoading] = useState(false);

  const { carregarPorMes } = useRegistros({
    unidadeId: profile!.id,
    unidadeNome: profile!.unidade_nome ?? "",
  });

  const diasUteis = diasUteisDoMes(ANO, mes, FERIADOS_SET);
  const mesEditavel = mes >= mesCorrido;

  useEffect(() => {
    let active = true;
    setLoading(true);
    carregarPorMes(ANO, mes)
      .then((data) => {
        if (!active) return;
        const map: RegistroMap = {};
        for (const r of data) {
          if (!map[r.data]) map[r.data] = {} as RegistroMap[string];
          if (!map[r.data][r.turma as Turma])
            map[r.data][r.turma as Turma] = {
              visitas: 0,
              visitas_curso_ferias: 0,
              matriculas: 0,
              matriculas_curso_ferias: 0,
              desligamentos: 0,
              transferencias: 0,
              religamentos: 0,
            };
          const s = r as Record<string, number>;
          for (const sec of SECOES) {
            map[r.data][r.turma as Turma][sec.key] = s[sec.key] ?? 0;
          }
        }
        setRegistros(map);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [mes, carregarPorMes]);

  function getValor(data: string, turma: Turma, campo: Secao): number {
    return registros[data]?.[turma]?.[campo] ?? 0;
  }

  function getTotal(turma: Turma, campo: Secao): number {
    return diasUteis.reduce((acc, d) => acc + getValor(dateToIso(d), turma, campo), 0);
  }

  function getTotalDia(data: string, campo: Secao): number {
    return TURMAS.reduce((acc, t) => acc + getValor(data, t, campo), 0);
  }

  function getTotalGeral(campo: Secao): number {
    return diasUteis.reduce((acc, d) => acc + getTotalDia(dateToIso(d), campo), 0);
  }

  return (
    <div className="max-w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Histórico Mensal</h1>
          <p className="text-gray-500 text-sm mt-1">{profile?.unidade_nome}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={String(mes)}
            onValueChange={(v) => setMes(Number(v))}
          >
            <SelectTrigger className="w-40">
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
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">Carregando...</div>
      ) : (
        <div className="space-y-8">
          {SECOES.map((secao) => (
            <div key={secao.key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-primary-500 px-6 py-3">
                <h2 className="text-white font-semibold">{secao.label}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-2.5 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 border-r border-gray-200 min-w-28">
                        Turma
                      </th>
                      {diasUteis.map((d) => {
                        const iso = dateToIso(d);
                        return (
                          <th
                            key={iso}
                            className="px-2 py-2.5 text-center font-medium text-gray-600 min-w-[42px]"
                          >
                            <div className="text-xs text-gray-400">
                              {format(d, "EEE", { locale: ptBR }).slice(0, 3)}
                            </div>
                            <div>{d.getDate()}</div>
                            {mesEditavel && (
                              <button
                                onClick={() =>
                                  navigate(`/unidade/formulario?data=${iso}`)
                                }
                                title="Editar"
                                aria-label={`Editar dia ${d.getDate()}`}
                                className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded hover:bg-primary-100 transition-colors"
                              >
                                <Edit2 className="h-3 w-3 text-primary-400" />
                              </button>
                            )}
                          </th>
                        );
                      })}
                      <th className="px-3 py-2.5 text-center font-semibold text-gray-700 border-l border-gray-200 min-w-16 bg-gray-100">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {TURMAS.map((turma, ti) => (
                      <tr
                        key={turma}
                        className={ti % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-4 py-2 font-medium text-gray-800 sticky left-0 bg-inherit border-r border-gray-200">
                          {turma}
                        </td>
                        {diasUteis.map((d) => {
                          const iso = dateToIso(d);
                          const val = getValor(iso, turma, secao.key);
                          return (
                            <td
                              key={iso}
                              className="px-2 py-2 text-center text-gray-700"
                            >
                              {val > 0 ? val : <span className="text-gray-200">—</span>}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center font-semibold text-gray-800 border-l border-gray-200 bg-gray-50">
                          {getTotal(turma, secao.key)}
                        </td>
                      </tr>
                    ))}
                    {/* Linha de total */}
                    <tr className="bg-primary-50 border-t-2 border-primary-200">
                      <td className="px-4 py-2 font-bold text-primary-700 sticky left-0 bg-primary-50 border-r border-gray-200">
                        Total
                      </td>
                      {diasUteis.map((d) => {
                        const iso = dateToIso(d);
                        const t = getTotalDia(iso, secao.key);
                        return (
                          <td key={iso} className="px-2 py-2 text-center font-semibold text-primary-700">
                            {t > 0 ? t : <span className="text-primary-200">—</span>}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center font-bold text-primary-700 border-l border-gray-200 bg-primary-100">
                        {getTotalGeral(secao.key)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
