import { useState, useEffect, type FormEvent } from "react";
import { RefreshCw, UserPlus, Trash2, Users, CheckCircle2, XCircle, Clock, FileCheck, Phone, ChevronRight } from "lucide-react";
import { useAuth } from "../../App";
import { useRematricula } from "../../hooks/useRematricula";
import { calcularKpisRematricula, derivarStatusRematricula } from "../../types";
import MetaGauge from "../../components/MetaGauge";
import { Button } from "../../components/ui/button";

const STATUS_PILL: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-700",
  rematriculado: "bg-green-100 text-green-700",
  nao_rematriculado: "bg-red-100 text-red-700",
};
const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  rematriculado: "Rematriculado",
  nao_rematriculado: "Não rematriculou",
};

function StepBadge({ n }: { n: number }) {
  return (
    <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white">
      {n}
    </span>
  );
}

const ETAPAS = [
  { icon: UserPlus, titulo: "Cadastre o aluno", desc: "Nome e turma / período de 2025" },
  { icon: Phone, titulo: "Registre o contato", desc: "Quem falou com a família" },
  { icon: FileCheck, titulo: "Confirme o desfecho", desc: "Contrato assinado, ou o motivo se não renovar" },
] as const;

interface LinhaState {
  contratoAssinado: boolean;
  motivo: string;
  quemContatou: string;
}

export default function Rematricula() {
  const { profile } = useAuth();
  const { alunos, loading, salvando, atualizar, adicionar, remover } = useRematricula();

  const [nome, setNome] = useState("");
  const [turma, setTurma] = useState("");
  const [adicionando, setAdicionando] = useState(false);
  const [estado, setEstado] = useState<Record<string, LinhaState>>({});

  const meus = alunos.filter((a) => a.unidade_id === profile?.id);

  useEffect(() => {
    const init: Record<string, LinhaState> = {};
    for (const a of meus) {
      init[a.id] = { contratoAssinado: a.contrato_assinado, motivo: a.motivo ?? "", quemContatou: a.quem_contatou ?? "" };
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
    if (!nome.trim() || !profile) return;
    setAdicionando(true);
    const ok = await adicionar(profile.id, nome, turma);
    setAdicionando(false);
    if (ok) {
      setNome("");
      setTurma("");
    }
  }

  async function handleSalvar(id: string) {
    const linha = estado[id];
    if (!linha) return;
    await atualizar(id, linha.contratoAssinado, linha.motivo, linha.quemContatou);
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rematrícula 2026</h1>
        <p className="text-gray-500 text-sm mt-1">
          {profile?.unidade_nome} — acompanhe a rematrícula dos alunos da unidade.
        </p>
      </div>

      {/* Hero: meta + indicadores */}
      <div className="card p-6 flex flex-col sm:flex-row items-center gap-6">
        <MetaGauge pct={kpis.pct} label="Meta 90%" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1 w-full">
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
            <label htmlFor="rematricula-nome" className="sr-only">Nome completo</label>
            <input
              id="rematricula-nome"
              className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome completo"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="rematricula-turma" className="sr-only">Turma / período</label>
            <input
              id="rematricula-turma"
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
        <div className="space-y-3">
          {meus.map((a) => {
            const linha = estado[a.id] ?? {
              contratoAssinado: a.contrato_assinado,
              motivo: a.motivo ?? "",
              quemContatou: a.quem_contatou ?? "",
            };
            const isSalvando = salvando === a.id;
            const alterado =
              linha.contratoAssinado !== a.contrato_assinado ||
              linha.motivo !== (a.motivo ?? "") ||
              linha.quemContatou !== (a.quem_contatou ?? "");
            const statusAtual = derivarStatusRematricula(a);
            return (
              <div key={a.id} className="card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-[180px]">
                    <p className="font-semibold text-gray-900">{a.nome}</p>
                    {a.turma && <p className="text-xs text-gray-500 mt-0.5">{a.turma}</p>}
                    <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_PILL[statusAtual]}`}>
                      {STATUS_LABEL[statusAtual]}
                    </span>
                  </div>

                  <div className="flex-1 min-w-[280px]">
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
                    <div className="mt-2 grid sm:grid-cols-2 gap-2">
                      <input
                        className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Quem fez contato com a família"
                        value={linha.quemContatou}
                        onChange={(e) => setLinha(a.id, { quemContatou: e.target.value })}
                      />
                      {!linha.contratoAssinado && (
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
  );
}
