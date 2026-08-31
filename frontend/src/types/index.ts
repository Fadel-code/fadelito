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
  "Campinas",
  "Campo Belo",
  "Granja",
  "Guarulhos",
  "Higienópolis",
  "Indianópolis",
  "Ipiranga",
  "Jardins",
  "Lapa",
  "Marajoara",
  "Moema",
  "Mooca",
  "Osasco",
  "Panamby",
  "Paraíso",
  "Pinheiros",
  "Piracicaba",
  "Portal",
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

// ============================================================
// Opção B — Eventos por lead (integração com o CRM)
// ============================================================

export type DesfechoTipo =
  | "visita_realizada"
  | "em_negociacao"
  | "matricula"
  | "nao_fechou"
  | "removido"; // local apenas — lead não é desta unidade, nunca enviado ao CRM

export const DESFECHOS: { value: DesfechoTipo; label: string }[] = [
  { value: "visita_realizada", label: "Visitou" },
  { value: "em_negociacao", label: "Em negociação" },
  { value: "matricula", label: "Matriculou" },
  { value: "nao_fechou", label: "Não fechou" },
];

// Lead vindo do CRM (apto a receber desfecho)
export interface LeadCRM {
  id: number;
  name: string;
  phone: string | null;
  child_name: string | null;
  child_age: number | null;
  stage: string;
  unit_name: string | null;
  visit_date: string | null;
  no_show_count: number;
}

// Registro local (Supabase) do desfecho — espelho/audit do que foi enviado ao CRM
export interface EventoLead {
  id: string;
  unidade_id: string;
  crm_lead_id: number;
  nome: string | null;
  telefone: string | null;
  turma: string | null;
  data: string;
  tipo: DesfechoTipo;
  observacao: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Rematrícula 2026 — acompanhamento por unidade
// ============================================================

export type RematriculaStatus = "pendente" | "rematriculado" | "nao_rematriculado";

export const REMATRICULA_META = 0.9; // meta de 90% de rematriculados

export interface RematriculaAluno {
  id: string;
  unidade_id: string;
  nome: string;
  turma: string | null;
  contrato_assinado: boolean;
  motivo: string | null;
  quem_contatou: string | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { unidade_nome: string | null };
}

export interface RematriculaKpis {
  total: number;
  rematriculados: number;
  naoRematriculados: number;
  pendentes: number;
  pct: number; // 0-1, rematriculados / total
}

// Contrato assinado = rematriculado. Sem contrato, mas com motivo registrado = não
// rematriculou (família já decidiu). Sem nenhum dos dois = ainda em aberto.
export function derivarStatusRematricula(a: { contrato_assinado: boolean; motivo: string | null }): RematriculaStatus {
  if (a.contrato_assinado) return "rematriculado";
  if (a.motivo && a.motivo.trim()) return "nao_rematriculado";
  return "pendente";
}

export function calcularKpisRematricula(
  alunos: { contrato_assinado: boolean; motivo: string | null }[]
): RematriculaKpis {
  const total = alunos.length;
  const rematriculados = alunos.filter((a) => a.contrato_assinado).length;
  const naoRematriculados = alunos.filter((a) => derivarStatusRematricula(a) === "nao_rematriculado").length;
  const pendentes = total - rematriculados - naoRematriculados;
  const pct = total > 0 ? rematriculados / total : 0;
  return { total, rematriculados, naoRematriculados, pendentes, pct };
}

// ============================================================
// Assistente Fadelito — biblioteca de protocolos
// ============================================================

export interface Protocolo {
  id: string;
  titulo: string;
  area: "Pedagógico" | "Administrativo" | "Em comum";
  categoria: string;
  palavras_chave: string[];
  status: "validado" | "revisao";
  resumo: string;
  acoes: string[];
  mensagem_familia: string;
  atencao: string;
  publicado: boolean;
  fonte: string;
  created_at: string;
  updated_at: string;
}
