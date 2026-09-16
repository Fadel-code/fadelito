import { useState, useEffect, useMemo, type FormEvent } from "react";
import { RefreshCw, UserPlus, Trash2, Users, CheckCircle2, XCircle, Clock, FileCheck, Search, X, MessageCircle, AlertTriangle, UserCheck, ThumbsUp } from "lucide-react";
import { calcularKpisRematricula, derivarStatusRematricula, type RematriculaAluno, type RematriculaHistoricoEntry } from "../types";
import { Button } from "./ui/button";
import StatTile from "./StatTile";

const STATUS_PILL: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-700",
  negociando: "bg-blue-100 text-blue-700",
  rematriculado: "bg-green-100 text-green-700",
  nao_rematriculado: "bg-red-100 text-red-700",
};
const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  negociando: "Negociando",
  rematriculado: "Rematriculado",
  nao_rematriculado: "Não rematriculou",
};

const STATUS_FILTROS = ["todos", "pendente", "negociando", "rematriculado", "nao_rematriculado", "inadimplente", "aceite"] as const;
type StatusFiltro = (typeof STATUS_FILTROS)[number];
const STATUS_FILTRO_LABEL: Record<StatusFiltro, string> = {
  todos: "Todos",
  pendente: "Pendentes",
  negociando: "Em conversa",
  rematriculado: "Rematriculados",
  nao_rematriculado: "Não rematriculados",
  inadimplente: "Inadimplentes",
  aceite: "Aceites",
};
// Mesma cor do respectivo StatTile no hero, pra ler "Pendentes" no filtro e
// no card como a mesma categoria em vez de precisar reler o rótulo.
const STATUS_FILTRO_COR: Record<StatusFiltro, { ativo: string; inativo: string }> = {
  todos: { ativo: "bg-primary-500 text-white", inativo: "bg-gray-100 text-gray-600 hover:bg-gray-200" },
  pendente: { ativo: "bg-amber-500 text-white", inativo: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
  negociando: { ativo: "bg-blue-500 text-white", inativo: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
  rematriculado: { ativo: "bg-green-500 text-white", inativo: "bg-green-50 text-green-700 hover:bg-green-100" },
  nao_rematriculado: { ativo: "bg-red-500 text-white", inativo: "bg-red-50 text-red-700 hover:bg-red-100" },
  inadimplente: { ativo: "bg-orange-500 text-white", inativo: "bg-orange-50 text-orange-700 hover:bg-orange-100" },
  aceite: { ativo: "bg-cyan-500 text-white", inativo: "bg-cyan-50 text-cyan-700 hover:bg-cyan-100" },
};

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

interface LinhaState {
  contratoAssinado: boolean;
  motivo: string;
  quemContatou: string;
  observacao: string;
  negociando: boolean;
  inadimplente: boolean;
  aceite: boolean;
}

interface RematriculaPainelProps {
  unidadeId: string;
  alunos: RematriculaAluno[];
  loading: boolean;
  salvando: string | null;
  adicionar: (unidadeId: string, nome: string, turma: string) => Promise<boolean>;
  atualizar: (
    id: string,
    contratoAssinado: boolean,
    motivo: string,
    quemContatou: string,
    observacao: string,
    negociando: boolean,
    inadimplente: boolean,
    aceite: boolean
  ) => Promise<boolean>;
  remover: (id: string) => Promise<boolean>;
  adicionarHistorico: (id: string, texto: string) => Promise<boolean>;
  /** Mostra o botão Remover — só supervisão tem essa permissão (RLS restringe DELETE a role='supervisao'). */
  permiteRemover?: boolean;
}

// Rótulo fixo acima do campo: o placeholder some assim que tem conteúdo, e aí
// o valor gravado (ex. o nome de quem contatou) ficava sem contexto na tela.
function Campo({ label, children, agrupado }: { label: string; children: React.ReactNode; agrupado?: boolean }) {
  // agrupado: o bloco tem mais de um controle, então não pode ser um <label>.
  const Tag = agrupado ? "div" : "label";
  return (
    <Tag className="block min-w-0">
      <span className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-gray-400">
        {label}
      </span>
      {children}
    </Tag>
  );
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

// O histórico costuma guardar quem falou com a família. Some da tela quando o aluno
// vira rematriculado, então é renderizado nos dois estados.
function HistoricoLista({ historico, className = "" }: { historico: RematriculaHistoricoEntry[]; className?: string }) {
  if (historico.length === 0) return null;
  return (
    <ul className={`max-h-24 space-y-0.5 overflow-y-auto text-xs text-gray-500 ${className}`}>
      {historico.map((h, i) => (
        <li key={i}>
          <span className="text-gray-400">{formatarData(h.data)}:</span> {h.texto}
        </li>
      ))}
    </ul>
  );
}

// Tela que a unidade usa pra acompanhar a rematrícula — reaproveitada como prévia
// (mesmo componente, data source local) na tela da supervisão.
export default function RematriculaPainel({ unidadeId, alunos, loading, salvando, adicionar, atualizar, remover, adicionarHistorico, permiteRemover = false }: RematriculaPainelProps) {
  const [nome, setNome] = useState("");
  const [turma, setTurma] = useState("");
  const [adicionando, setAdicionando] = useState(false);
  const [estado, setEstado] = useState<Record<string, LinhaState>>({});
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos");
  const [novosRegistros, setNovosRegistros] = useState<Record<string, string>>({});
  const [registrando, setRegistrando] = useState<string | null>(null);

  const meus = alunos.filter((a) => a.unidade_id === unidadeId);

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return meus.filter((a) => {
      if (statusFiltro === "inadimplente" && !a.inadimplente) return false;
      else if (statusFiltro === "aceite" && !a.aceite) return false;
      else if (statusFiltro !== "todos" && statusFiltro !== "inadimplente" && statusFiltro !== "aceite" && derivarStatusRematricula(a) !== statusFiltro) return false;
      if (termo && !normalizar(a.nome).includes(termo)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meus, busca, statusFiltro]);

  useEffect(() => {
    const init: Record<string, LinhaState> = {};
    for (const a of meus) {
      init[a.id] = {
        contratoAssinado: a.contrato_assinado,
        motivo: a.motivo ?? "",
        quemContatou: a.quem_contatou ?? "",
        observacao: a.observacao ?? "",
        negociando: a.negociando,
        inadimplente: a.inadimplente,
        aceite: a.aceite,
      };
    }
    setEstado(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alunos]);

  const kpis = calcularKpisRematricula(meus);

  function setLinha(id: string, patch: Partial<LinhaState>) {
    setEstado((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function handleAdicionar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setAdicionando(true);
    const ok = await adicionar(unidadeId, nome, turma);
    setAdicionando(false);
    if (ok) {
      setNome("");
      setTurma("");
    }
  }

  async function handleSalvar(id: string) {
    const linha = estado[id];
    if (!linha) return;
    await atualizar(id, linha.contratoAssinado, linha.motivo, linha.quemContatou, linha.observacao, linha.negociando, linha.inadimplente, linha.aceite);
  }

  async function handleAdicionarHistorico(id: string) {
    const texto = (novosRegistros[id] ?? "").trim();
    if (!texto) return;
    setRegistrando(id);
    const ok = await adicionarHistorico(id, texto);
    setRegistrando(null);
    if (ok) setNovosRegistros((prev) => ({ ...prev, [id]: "" }));
  }

  return (
    <div className="space-y-6">
      {/* Hero: indicadores — meta da rede fica só na visão de marketing/supervisão */}
      <div className="card p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          <StatTile icon={Users} label="A rematricular" value={kpis.total} />
          <StatTile icon={CheckCircle2} label="Rematriculados" value={kpis.rematriculados} color="green" />
          <StatTile icon={MessageCircle} label="Em conversa" value={kpis.negociando} color="blue" />
          <StatTile icon={XCircle} label="Não rematriculados" value={kpis.naoRematriculados} color="red" />
          <StatTile icon={Clock} label="Pendentes" value={kpis.pendentes} color="amber" />
          <StatTile icon={AlertTriangle} label="Inadimplentes" value={kpis.inadimplentes} color="orange" />
          <StatTile icon={ThumbsUp} label="Aceites" value={kpis.aceites} color="cyan" />
        </div>
      </div>

      {/* Adicionar aluno — liberado mesmo em modo só-leitura: alguns alunos ficaram
          de fora da importação em lote e precisam de inclusão manual. */}
      <div className="card p-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">ADICIONAR NOVO ALUNO 2026</p>
        <form onSubmit={handleAdicionar} className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <label htmlFor={`rematricula-nome-${unidadeId}`} className="sr-only">Nome completo</label>
            <input
              id={`rematricula-nome-${unidadeId}`}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome completo"
            />
          </div>
          <div className="flex-1">
            <label htmlFor={`rematricula-turma-${unidadeId}`} className="sr-only">Turma / período</label>
            <input
              id={`rematricula-turma-${unidadeId}`}
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={turma}
              onChange={(e) => setTurma(e.target.value)}
              placeholder="Ex: Jardim - manhã"
            />
          </div>
          <Button type="submit" disabled={!nome.trim() || adicionando} className="justify-center gap-2 sm:w-auto">
            <UserPlus className="h-4 w-4" />
            {adicionando ? "Adicionando..." : "Adicionar aluno"}
          </Button>
        </form>
      </div>

      {/* Lista */}
      {loading && meus.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
          Carregando...
        </div>
      ) : meus.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          Nenhum aluno cadastrado ainda.
          <br />
          Adicione o primeiro aluno acima para começar a acompanhar a rematrícula.
        </div>
      ) : (
        <div className="card p-4 sm:p-6">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {STATUS_FILTROS.map((s) => {
              const contagem =
                s === "todos" ? kpis.total
                : s === "pendente" ? kpis.pendentes
                : s === "negociando" ? kpis.negociando
                : s === "rematriculado" ? kpis.rematriculados
                : s === "inadimplente" ? kpis.inadimplentes
                : s === "aceite" ? kpis.aceites
                : kpis.naoRematriculados;
              const cor = STATUS_FILTRO_COR[s];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFiltro(s)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    statusFiltro === s ? cor.ativo : cor.inativo
                  }`}
                >
                  {STATUS_FILTRO_LABEL[s]} ({contagem})
                </button>
              );
            })}
          </div>
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={`Buscar entre ${meus.length} alunos pelo nome...`}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar aluno pelo nome"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:text-gray-600"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {filtrados.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              {busca
                ? `Nenhum aluno encontrado para "${busca}".`
                : `Nenhum aluno em "${STATUS_FILTRO_LABEL[statusFiltro]}".`}
            </p>
          ) : (
            <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
              {filtrados.map((a) => {
                const linha = estado[a.id] ?? {
                  contratoAssinado: a.contrato_assinado,
                  motivo: a.motivo ?? "",
                  quemContatou: a.quem_contatou ?? "",
                  observacao: a.observacao ?? "",
                  negociando: a.negociando,
                  inadimplente: a.inadimplente,
                  aceite: a.aceite,
                };
                const isSalvando = salvando === a.id;
                const alterado =
                  linha.contratoAssinado !== a.contrato_assinado ||
                  linha.motivo !== (a.motivo ?? "") ||
                  linha.quemContatou !== (a.quem_contatou ?? "") ||
                  linha.observacao !== (a.observacao ?? "") ||
                  linha.negociando !== a.negociando ||
                  linha.inadimplente !== a.inadimplente ||
                  linha.aceite !== a.aceite;
                const statusAtual = derivarStatusRematricula(a);
                const historico = a.negociacao_historico ?? [];
                return (
                  <div key={a.id} className="card p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-[180px]">
                        <p className={`font-semibold ${a.inadimplente ? "text-red-600" : "text-gray-900"}`}>{a.nome}</p>
                        {a.turma && <p className="text-xs text-gray-500 mt-0.5">{a.turma}</p>}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_PILL[statusAtual]}`}>
                            {STATUS_LABEL[statusAtual]}
                          </span>
                          {linha.aceite && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-cyan-100 text-cyan-700">
                              <ThumbsUp className="h-3 w-3" />
                              Aceite
                            </span>
                          )}
                        </div>
                        {/* Quem falou com a família fica à vista em qualquer status —
                            no rematriculado o nome sumia no meio dos campos. */}
                        {linha.quemContatou.trim() && (
                          <p className="mt-1.5 flex items-start gap-1 text-xs font-semibold text-primary-700">
                            <UserCheck className="h-3.5 w-3.5 flex-shrink-0 mt-px text-primary-400" />
                            <span className="break-words">{linha.quemContatou}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex-1 min-w-[280px]">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer select-none w-fit">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                              checked={linha.contratoAssinado}
                              onChange={(e) => setLinha(a.id, { contratoAssinado: e.target.checked })}
                            />
                            <FileCheck className="h-3.5 w-3.5 text-gray-400" />
                            Contrato assinado
                          </label>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer select-none w-fit">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                              checked={linha.negociando}
                              onChange={(e) => setLinha(a.id, { negociando: e.target.checked })}
                            />
                            Ainda em conversa com a família
                          </label>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer select-none w-fit">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
                              checked={linha.aceite}
                              onChange={(e) => setLinha(a.id, { aceite: e.target.checked })}
                            />
                            <ThumbsUp className="h-3.5 w-3.5 text-cyan-400" />
                            Aceite verbal
                          </label>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer select-none w-fit">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                              checked={linha.inadimplente}
                              onChange={(e) => setLinha(a.id, { inadimplente: e.target.checked })}
                            />
                            Inadimplente
                          </label>
                        </div>
                        <div className="mt-2 grid sm:grid-cols-2 gap-2">
                          <Campo label="Quem fez contato com a família">
                            <input
                              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder="Nome de quem falou com a família"
                              value={linha.quemContatou}
                              onChange={(e) => setLinha(a.id, { quemContatou: e.target.value })}
                            />
                          </Campo>
                          {linha.contratoAssinado ? (
                            <Campo label="Observação (opcional)">
                              <input
                                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="Alguma observação"
                                value={linha.observacao}
                                onChange={(e) => setLinha(a.id, { observacao: e.target.value })}
                              />
                              <HistoricoLista historico={historico} className="mt-1.5" />
                            </Campo>
                          ) : linha.negociando ? (
                            <Campo label="Negociação com a família" agrupado>
                              <HistoricoLista historico={historico} className="mb-1.5" />
                              <div className="flex gap-1.5">
                                <input
                                  className="w-full min-w-0 rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  placeholder="Novo registro da negociação"
                                  value={novosRegistros[a.id] ?? ""}
                                  onChange={(e) => setNovosRegistros((prev) => ({ ...prev, [a.id]: e.target.value }))}
                                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdicionarHistorico(a.id))}
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleAdicionarHistorico(a.id)}
                                  disabled={!(novosRegistros[a.id] ?? "").trim() || registrando === a.id}
                                >
                                  +
                                </Button>
                              </div>
                            </Campo>
                          ) : (
                            <Campo label="Motivo da não rematrícula">
                              <input
                                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="Se a família já decidiu, registre o motivo"
                                value={linha.motivo}
                                onChange={(e) => setLinha(a.id, { motivo: e.target.value })}
                              />
                            </Campo>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-stretch gap-1.5">
                        <Button onClick={() => handleSalvar(a.id)} disabled={!alterado || isSalvando} size="sm">
                          {isSalvando ? "Salvando..." : "Salvar"}
                        </Button>
                        {permiteRemover && (
                          <Button variant="ghost" size="sm" onClick={() => remover(a.id)} disabled={isSalvando} className="gap-1.5 text-gray-400 hover:text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                            Remover
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
