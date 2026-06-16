import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Props {
  dados: { nome: string; valor: number }[];
  cor?: string;
  label?: string;
  horizontal?: boolean;
}

export default function GraficoBarras({ dados, cor = "#F97316", label = "Valor", horizontal }: Props) {
  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={Math.max(300, dados.length * 28)}>
        <BarChart
          data={dados}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 80, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis dataKey="nome" type="category" tick={{ fontSize: 11 }} width={90} />
          <Tooltip
            formatter={(val: number) => [val, label]}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
            {dados.map((_, i) => (
              <Cell key={i} fill={cor} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={dados} margin={{ top: 4, right: 16, left: 0, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="nome"
          tick={{ fontSize: 10 }}
          angle={-45}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(val: number) => [val, label]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
          {dados.map((_, i) => (
            <Cell key={i} fill={cor} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
