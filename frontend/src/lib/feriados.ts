function calcularPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, month - 1, day);
}

function addDias(date: Date, dias: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + dias);
  return d;
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getFeriadosNacionais(ano: number): string[] {
  const pascoa = calcularPascoa(ano);
  const sextaFeiraSanta = addDias(pascoa, -2);
  return [
    `${ano}-01-01`, // Confraternização Universal
    toIso(sextaFeiraSanta), // Paixão de Cristo (calculada via Páscoa)
    `${ano}-04-21`, // Tiradentes
    `${ano}-05-01`, // Dia do Trabalho
    `${ano}-09-07`, // Independência do Brasil
    `${ano}-10-12`, // Nossa Senhora Aparecida
    `${ano}-11-02`, // Finados
    `${ano}-11-15`, // Proclamação da República
    `${ano}-12-25`, // Natal
  ];
}

export function getFeriadosSet(ano: number): Set<string> {
  return new Set(getFeriadosNacionais(ano));
}

export const FERIADOS_SET = getFeriadosSet(new Date().getFullYear());

export function isFeriado(date: Date): boolean {
  const iso = date.toISOString().slice(0, 10);
  return FERIADOS_SET.has(iso);
}

export function isDiaUtil(date: Date): boolean {
  const dia = date.getDay();
  return dia !== 0 && dia !== 6 && !isFeriado(date);
}
