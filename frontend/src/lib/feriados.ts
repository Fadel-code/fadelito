// Feriados nacionais 2026 (formato YYYY-MM-DD)
export const FERIADOS_2026: string[] = [
  "2026-01-01", // Confraternização Universal
  "2026-04-20", // Paixão de Cristo
  "2026-04-21", // Tiradentes
  "2026-05-01", // Dia do Trabalho
  "2026-09-07", // Independência do Brasil
  "2026-10-12", // Nossa Senhora Aparecida
  "2026-11-02", // Finados
  "2026-11-15", // Proclamação da República
  "2026-12-25", // Natal
];

export const FERIADOS_SET = new Set(FERIADOS_2026);

export function isFeriado(date: Date): boolean {
  const iso = date.toISOString().slice(0, 10);
  return FERIADOS_SET.has(iso);
}

export function isDiaUtil(date: Date): boolean {
  const dia = date.getDay(); // 0=Dom, 6=Sáb
  return dia !== 0 && dia !== 6 && !isFeriado(date);
}
