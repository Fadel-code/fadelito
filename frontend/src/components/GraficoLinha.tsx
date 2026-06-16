import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { MESES } from "../types";

interface PontoMensal {
  mes: number;
  visitas_totais: number;
  matriculas_totais: number;
}

interface Props {
  dados: PontoMensal[];
}

export default function GraficoLinha({ dados }: Props) {
  const dataFormatada = dados.map((d) => ({
    ...d,
    nome: MESES[d.mes - 1]?.slice(0, 3) ?? "",
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={dataFormatada} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Legend
          formatter={(value: string) =>
            value === "visitas_totais" ? "Visitas Totais" : "Matrículas Totais"
          }
        />
        <Line
          type="monotone"
          dataKey="visitas_totais"
          stroke="#F97316"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#F97316" }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="matriculas_totais"
          stroke="#3b82f6"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#3b82f6" }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
