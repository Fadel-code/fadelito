import { useState, useEffect } from "react";
import { useConsolidado } from "../../hooks/useConsolidado";
import { supabase } from "../../lib/supabase";
import { MESES } from "../../types";
import GraficoBarras from "../../components/GraficoBarras";
import GraficoLinha from "../../components/GraficoLinha";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

const ANO = 2026;

interface PontoMensal {
  mes: number;
  visitas_totais: number;
  matriculas_totais: number;
}

export default function Graficos() {
  const mesCorrido = new Date().getMonth() + 1;
  const [mes, setMes] = useState(mesCorrido);
  const [evolucao, setEvolucao] = useState<PontoMensal[]>([]);
  const [loadingEvolucao, setLoadingEvolucao] = useState(true);

  const { dados, loading } = useConsolidado(ANO, mes);

  // Carregar evolução anual
  useEffect(() => {
    setLoadingEvolucao(true);
    const promises = Array.from({ length: mesCorrido }, (_, i) => {
      const m = i + 1;
      const inicio = `${ANO}-${String(m).padStart(2, "0")}-01`;
      const ultimoDia = new Date(ANO, m, 0).getDate();
      const fim = `${ANO}-${String(m).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
      return supabase
        .from("registros")
        .select("visitas, visitas_curso_ferias, matriculas, matriculas_curso_ferias")
        .gte("data", inicio)
        .lte("data", fim)
        .then(({ data }) => {
          let vt = 0, mt = 0;
          for (const r of data ?? []) {
            vt += (r.visitas ?? 0) + (r.visitas_curso_ferias ?? 0);
            mt += (r.matriculas ?? 0) + (r.matriculas_curso_ferias ?? 0);
          }
          return { mes: m, visitas_totais: vt, matriculas_totais: mt };
        });
    });

    Promise.all(promises)
      .then(setEvolucao)
      .finally(() => setLoadingEvolucao(false));
  }, [mesCorrido]);

  const rankingMatriculas = [...dados]
    .sort((a, b) => b.matriculas_totais - a.matriculas_totais)
    .map((d) => ({ nome: d.unidade_nome, valor: d.matriculas_totais }));

  const rankingAproveitamento = [...dados]
    .filter((d) => d.visitas_totais > 0)
    .sort(
      (a, b) =>
        b.matriculas_totais / b.visitas_totais -
        a.matriculas_totais / a.visitas_totais
    )
    .map((d) => ({
      nome: d.unidade_nome,
      valor: parseFloat(
        ((d.matriculas_totais / d.visitas_totais) * 100).toFixed(1)
      ),
    }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gráficos</h1>
          <p className="text-gray-500 text-sm mt-1">Análise visual da rede em {ANO}</p>
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

      <div className="grid grid-cols-1 gap-6">
        {/* Evolução anual */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            Evolução da Rede — Jan a Dez {ANO}
          </h2>
          {loadingEvolucao ? (
            <div className="h-48 flex items-center justify-center text-gray-400">Carregando...</div>
          ) : (
            <GraficoLinha dados={evolucao} />
          )}
        </div>

        {/* Ranking por matrículas */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            Ranking por Matrículas — {MESES[mes - 1]} {ANO}
          </h2>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-gray-400">Carregando...</div>
          ) : (
            <GraficoBarras
              dados={rankingMatriculas}
              label="Matrículas Totais"
              cor="#F97316"
            />
          )}
        </div>

        {/* Aproveitamento */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            % Aproveitamento por Unidade — {MESES[mes - 1]} {ANO}
          </h2>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-gray-400">Carregando...</div>
          ) : (
            <GraficoBarras
              dados={rankingAproveitamento}
              label="% Aproveitamento"
              cor="#3b82f6"
              horizontal
            />
          )}
        </div>
      </div>
    </div>
  );
}
