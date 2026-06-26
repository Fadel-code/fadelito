export type Role = "unidade" | "marketing" | "supervisao";

export interface Profile {
  id: string;
  role: Role;
  unidade_nome: string | null;
  email: string | null;
  ativo: boolean;
  senha_temp: string | null;
  created_at: string;
  updated_at: string;
}

export type Turma =
  | "Berçário"
  | "Minimaternal"
  | "Maternal I"
  | "Maternal II"
  | "Jardim"
  | "Pré";

export const TURMAS: Turma[] = [
  "Berçário",
  "Minimaternal",
  "Maternal I",
  "Maternal II",
  "Jardim",
  "Pré",
];

export interface Registro {
  id: string;
  unidade_id: string;
  data: string; // YYYY-MM-DD
  turma: Turma;
  visitas: number;
  visitas_curso_ferias: number;
  matriculas: number;
  matriculas_curso_ferias: number;
  desligamentos: number;
  transferencias: number;
  religamentos: number;
  created_at: string;
  updated_at: string;
}

export interface RegistroInput {
  turma: Turma;
  visitas: number;
  visitas_curso_ferias: number;
  matriculas: number;
  matriculas_curso_ferias: number;
  desligamentos: number;
  transferencias: number;
  religamentos: number;
}

export interface RegistroCalculado extends RegistroInput {
  visitas_totais: number;
  matriculas_totais: number;
  aproveitamento: string;
  saldo: number;
}

export interface AuditLog {
  id: string;
  usuario_id: string;
  unidade_nome: string;
  acao: "INSERT" | "UPDATE" | "DELETE";
  data_registro: string;
  turma: string;
  campo_alterado: string;
  valor_anterior: string | null;
  valor_novo: string;
  alterado_em: string;
}

export interface ConsolidadoUnidade {
  unidade_id: string;
  unidade_nome: string;
  visitas: number;
  visitas_curso_ferias: number;
  visitas_totais: number;
  matriculas: number;
  matriculas_curso_ferias: number;
  matriculas_totais: number;
  aproveitamento: string;
  desligamentos: number;
  transferencias: number;
  religamentos: number;
  saldo: number;
  preencheu_hoje: boolean;
}

export const UNIDADES = [
  "Aclamação",
  "Anália Franco",
  "Boa Vista",
  "Bonfiglioli",
  "Brooklin",
  "Campinas",
  "Campo Belo",
  "Granja",
  "Guarulhos",
  "Higienópolis",
  "Indianópolis",
  "Ipiranga",
  "Jardins",
  "Klabin",
  "Lapa",
  "Marajoara",
  "Moema",
  "Mooca",
  "Osasco",
  "Panamby",
  "Paraíso",
  "Perdizes",
  "Pinheiros",
  "Piracicaba",
  "Portal",
  "Real Parque",
  "Santo André",
  "São Caetano",
  "Saúde",
  "Tatuapé",
  "Vila Gumercindo",
  "Vila Leopoldina",
  "Vila Madalena",
  "Vila Mariana",
  "Vila Sônia",
] as const;

export type UnidadeNome = (typeof UNIDADES)[number];

export const CAMPOS_NUMERICOS: (keyof RegistroInput)[] = [
  "visitas",
  "visitas_curso_ferias",
  "matriculas",
  "matriculas_curso_ferias",
  "desligamentos",
  "transferencias",
  "religamentos",
];

export function calcularCampos(r: RegistroInput): RegistroCalculado {
  const visitas_totais = r.visitas + r.visitas_curso_ferias;
  const matriculas_totais = r.matriculas + r.matriculas_curso_ferias;
  const aproveitamento =
    visitas_totais > 0
      ? `${((matriculas_totais / visitas_totais) * 100).toFixed(1)}%`
      : "—";
  const saldo = matriculas_totais - r.desligamentos;
  return { ...r, visitas_totais, matriculas_totais, aproveitamento, saldo };
}

export function registroVazio(turma: Turma): RegistroInput {
  return {
    turma,
    visitas: 0,
    visitas_curso_ferias: 0,
    matriculas: 0,
    matriculas_curso_ferias: 0,
    desligamentos: 0,
    transferencias: 0,
    religamentos: 0,
  };
}

export const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
