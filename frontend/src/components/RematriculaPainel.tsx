import { useState, useEffect, useMemo, type FormEvent } from "react";
import { RefreshCw, UserPlus, Trash2, Users, CheckCircle2, XCircle, Clock, FileCheck, Phone, ChevronRight, Search, X, MessageCircle, AlertTriangle } from "lucide-react";
import { calcularKpisRematricula, derivarStatusRematricula, type RematriculaAluno } from "../types";
import { Button } from "./ui/button";

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

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white">
      {n}
    </span>
  );
}

const ETAPAS = [
  { icon: UserPlus, titulo: "Cadastre o aluno", desc: "Nome e turma / período de 2026" },
  { icon: Phone, titulo: "Registre o contato", desc: "Quem falou com a família" },
  { icon: FileCheck, titulo: "Confirme o desfecho", desc: "Contrato assinado, ou o motivo se não renovar" },
] as const;

interface LinhaState {
  contratoAssinado: boolean;
  motivo: string;
  quemContatou: string;
  observacao: string;
  negociando: boolean;
  inadimplente: boolean;
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
    inadimplente: boolean
  ) => Promise<boolean>;
  remover: (id: string) => Promise<boolean>;
  adicionarHistorico: (id: string, texto: string) => Promise<boolean>;
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

// Tela que a unidade usa para acompanhar a rematrícula — reaproveitada como prévia
// (read-only nos dados reais, mas com um data source local) na tela da supervisão.
export default function RematriculaPainel({ unidadeId, alunos, loading, salvando, adicionar, atualizar, remover, adicionarHistorico }: RematriculaPainelProps) {
  const [nome, setNome] = useState("");
  const [turma, setTurma] = useState("");
  const [adicionando, setAdicionando] = useState(false);
  const [estado, setEstado] = useState<Record<string, LinhaState>>({});
  const [busca, setBusca] = useState("");
  const [novosRegistros, setNovosRegistros] = useState<Record<string, string>>({});
  const [registrando, setRegistrando] = useState<string | null>(null);

  const meus = alunos.filter((a) => a.unidade_id === unidadeId);

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return meus;
    return meus.filter((a) => normalizar(a.nome).includes(termo));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meus, busca]);

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
    await atualizar(id, linha.contratoAssinado, linha.motivo, linha.quemContatou, linha.observacao, linha.negociando, linha.inadimplente);
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Users className="h-3.5 w-3.5" />
              <p className="text-xs font-medium uppercase tracking-wide">A rematricular</p>
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-1">{kpis.total}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-green-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Rematriculados</p>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-1">{kpis.rematriculados}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-blue-500">
              <MessageCircle className="h-3.5 w-3.5" />
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Em conversa</p>
            </div>
            <p className="text-2xl font-bold text-blue-500 mt-1">{kpis.negociando}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-red-500">
              <XCircle className="h-3.5 w-3.5" />
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Não rematriculados</p>
            </div>
            <p className="text-2xl font-bold text-red-500 mt-1">{kpis.naoRematriculados}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-amber-500">
              <Clock className="h-3.5 w-3.5" />
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Pendentes</p>
            </div>
            <p className="text-2xl font-bold text-amber-500 mt-1">{kpis.pendentes}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-orange-500">
              <AlertTriangle className="h-3.5 w-3.5" />
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Inadimplentes</p>
            </div>
            <p className="text-2xl font-bold text-orange-500 mt-1">{kpis.inadimplentes}</p>
          </div>
        </div>
      </div>

      {/* Como funciona — explicação pura, sem elementos interativos falsos */}
      <div className="card p-6">
        <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide mb-5">Como funciona a rematrícula</p>
        <div className="grid sm:grid-cols-3 gap-6 sm:gap-4">
          {ETAPAS.map((etapa, i) => (
            <div key={etapa.titulo} className="relative flex items-start gap-3 sm:flex-col sm:items-center sm:text-center">
              {i < ETAPAS.length - 1 && (
                <ChevronRight className="hidden sm:block absolute top-2.5 -right-5 h-4 w-4 text-gray-300" aria-hidden="true" />
              )}
              <StepBadge n={i + 1} />
              <div className="sm:mt-1">
                <div className="flex items-center gap-1.5 sm:justify-center">
                  <etapa.icon className="h-3.5 w-3.5 text-primary-500" aria-hidden="true" />
                  <p className="font-semibold text-gray-800 text-sm">{etapa.titulo}</p>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{etapa.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Adicionar aluno — a ação de verdade, separada da explicação acima */}
      <div className="card p-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Adicionar aluno</p>
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
            <p className="py-8 text-center text-sm text-gray-400">Nenhum aluno encontrado para "{busca}".</p>
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
                };
                const isSalvando = salvando === a.id;
                const alterado =
                  linha.contratoAssinado !== a.contrato_assinado ||
                  linha.motivo !== (a.motivo ?? "") ||
                  linha.quemContatou !== (a.quem_contatou ?? "") ||
                  linha.observacao !== (a.observacao ?? "") ||
                  linha.negociando !== a.negociando ||
                  linha.inadimplente !== a.inadimplente;
                const statusAtual = derivarStatusRematricula(a);
                const historico = a.negociacao_historico ?? [];
                return (
                  <div key={a.id} className="card p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-[180px]">
                        <p className={`font-semibold ${a.inadimplente ? "text-red-600" : "text-gray-900"}`}>{a.nome}</p>
                        {a.turma && <p className="text-xs text-gray-500 mt-0.5">{a.turma}</p>}
                        <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_PILL[statusAtual]}`}>
                          {STATUS_LABEL[statusAtual]}
                        </span>
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
                              className="h-4 w-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                              checked={linha.inadimplente}
                              onChange={(e) => setLinha(a.id, { inadimplente: e.target.checked })}
                            />
                            Inadimplente
                          </label>
                        </div>
                        <div className="mt-2 grid sm:grid-cols-2 gap-2">
                          <input
                            className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Quem fez contato com a família"
                            value={linha.quemContatou}
                            onChange={(e) => setLinha(a.id, { quemContatou: e.target.value })}
                          />
                          {linha.contratoAssinado ? (
                            <input
                              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder="Observação (opcional)"
                              value={linha.observacao}
                              onChange={(e) => setLinha(a.id, { observacao: e.target.value })}
                            />
                          ) : linha.negociando ? (
                            <div className="min-w-0">
                              {historico.length > 0 && (
                                <ul className="mb-1.5 max-h-24 space-y-0.5 overflow-y-auto text-xs text-gray-500">
                                  {historico.map((h, i) => (
                                    <li key={i}>
                                      <span className="text-gray-400">{formatarData(h.data)}:</span> {h.texto}
                                    </li>
                                  ))}
                                </ul>
                              )}
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
                            </div>
                          ) : (
                            <input
                              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder="Motivo da não rematrícula (se já decidido)"
                              value={linha.motivo}
                              onChange={(e) => setLinha(a.id, { motivo: e.target.value })}
                            />
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-stretch gap-1.5">
                        <Button onClick={() => handleSalvar(a.id)} disabled={!alterado || isSalvando} size="sm">
                          {isSalvando ? "Salvando..." : "Salvar"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => remover(a.id)} disabled={isSalvando} className="gap-1.5 text-gray-400 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                          Remover
                        </Button>
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
