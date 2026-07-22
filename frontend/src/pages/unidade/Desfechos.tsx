import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RefreshCw, Phone, Baby, CalendarCheck, AlertTriangle, Pencil, Trash2, X, Check } from "lucide-react";
import { useAuth } from "../../App";
import { useEventosLead } from "../../hooks/useEventosLead";
import { useDesfechoUrgencia } from "../../hooks/useDesfechoUrgencia";
import { DESFECHOS } from "../../types";
import type { LeadCRM, EventoLead, DesfechoTipo } from "../../types";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";

const STAGE_LABEL: Record<string, string> = {
  VISITA_AGENDADA: "Visita agendada",
  NAO_COMPARECEU: "Não compareceu",
  VISITA_REALIZADA: "Visitou",
  EM_NEGOCIACAO: "Em negociação",
};

const DESFECHO_BADGE: Record<DesfechoTipo, string> = {
  visita_realizada: "bg-blue-100 text-blue-700",
  em_negociacao:   "bg-yellow-100 text-yellow-700",
  matricula:       "bg-green-100 text-green-700",
  nao_fechou:      "bg-red-100 text-red-700",
};

interface LinhaState {
  tipo: DesfechoTipo | "";
  observacao: string;
}

export default function Desfechos() {
  const { profile } = useAuth();
  const { loading, salvando, carregar, registrarDesfecho, editarDesfecho, removerDesfecho } = useEventosLead({
    unidadeId: profile!.id,
    unidadeNome: profile!.unidade_nome ?? "",
  });
  const { nuncaPreencheu, diasPendente: diasPendenteAntigo, urgente } = useDesfechoUrgencia(profile?.id);

  const [leads, setLeads] = useState<LeadCRM[]>([]);
  const [eventos, setEventos] = useState<Map<number, EventoLead>>(new Map());
  const [estado, setEstado] = useState<Record<number, LinhaState>>({});

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editEstado, setEditEstado] = useState<LinhaState>({ tipo: "", observacao: "" });
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  // Modal "próximo passo" após registrar "Visitou"
  const [modalVisita, setModalVisita] = useState<{ lead: LeadCRM; observacao: string } | null>(null);

  const recarregar = useCallback(async () => {
    const { leads, eventos } = await carregar();
    setLeads(leads);
    setEventos(eventos);
    const init: Record<number, LinhaState> = {};
    for (const l of leads) {
      const ev = eventos.get(l.id);
      init[l.id] = { tipo: ev?.tipo ?? "", observacao: ev?.observacao ?? "" };
    }
    setEstado(init);
    setEditandoId(null);
    setConfirmandoId(null);
  }, [carregar]);

  useEffect(() => { recarregar(); }, [recarregar]);

  function setLinha(leadId: number, patch: Partial<LinhaState>) {
    setEstado((prev) => ({ ...prev, [leadId]: { ...prev[leadId], ...patch } }));
  }

  async function handleSalvar(lead: LeadCRM) {
    const linha = estado[lead.id];
    if (!linha?.tipo) return;
    const ok = await registrarDesfecho(lead, linha.tipo, linha.observacao);
    if (ok) {
      if (linha.tipo === "visita_realizada") {
        setModalVisita({ lead, observacao: linha.observacao });
      } else {
        await recarregar();
      }
    }
  }

  async function handleDecisaoModal(tipo: DesfechoTipo) {
    if (!modalVisita) return;
    const ok = await registrarDesfecho(modalVisita.lead, tipo, modalVisita.observacao);
    if (ok) { setModalVisita(null); await recarregar(); }
  }

  async function handleEditar(evento: EventoLead) {
    if (!editEstado.tipo) return;
    const ok = await editarDesfecho(evento, editEstado.tipo as DesfechoTipo, editEstado.observacao);
    if (ok) await recarregar();
  }

  async function handleRemover(evento: EventoLead) {
    const ok = await removerDesfecho(evento);
    if (ok) {
      await recarregar();
      // Garante remoção do estado mesmo se o Supabase ainda não propagou o delete
      setEventos((prev) => {
        const next = new Map(prev);
        next.delete(evento.crm_lead_id);
        return next;
      });
      setEstado((prev) => ({
        ...prev,
        [evento.crm_lead_id]: { tipo: "", observacao: "" },
      }));
    }
  }

  const realizados = Array.from(eventos.values()).sort(
    (a, b) => new Date(b.synced_at ?? b.created_at).getTime() - new Date(a.synced_at ?? a.created_at).getTime()
  );
  const pendingVisitas = realizados.filter((ev) => ev.tipo === "visita_realizada").length;

  return (
    <div className="max-w-5xl space-y-8">
      {/* ── Banner de urgência (não bloqueia o preenchimento, só avisa) ── */}
      {urgente && (
        <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">
            <strong>Urgência:</strong>{" "}
            {nuncaPreencheu
              ? "esta unidade ainda não registrou nenhum Desfecho de Visitas."
              : `há um "Visitou" pendente de decisão há ${diasPendenteAntigo} dia${diasPendenteAntigo === 1 ? "" : "s"} sem atualização.`}
          </p>
        </div>
      )}

      {/* ── Banner de pendentes ── */}
      {pendingVisitas > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{pendingVisitas} lead{pendingVisitas > 1 ? "s" : ""}</strong>{" "}
            com "Visitou" aguarda{pendingVisitas > 1 ? "m" : ""} decisão de desfecho — atualize abaixo em{" "}
            <strong>Desfechos Realizados</strong>.
          </p>
        </div>
      )}

      {/* ── Aguardando desfecho ── */}
      <div>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Desfecho das Visitas</h1>
            <p className="text-gray-500 text-sm mt-1">
              {profile?.unidade_nome} — aponte quem visitou, matriculou ou não fechou.
            </p>
          </div>
          <Button variant="outline" onClick={recarregar} disabled={loading}>
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Atualizar
          </Button>
        </div>

        {loading && leads.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            Carregando leads do CRM...
          </div>
        ) : leads.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <CalendarCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum lead aguardando desfecho nesta unidade no momento.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => {
              const linha = estado[lead.id] ?? { tipo: "", observacao: "" };
              const ev = eventos.get(lead.id);
              const isSalvando = salvando === lead.id;
              return (
                <div key={lead.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{lead.name}</span>
                        <span className="text-xs rounded-full bg-gray-100 text-gray-600 px-2 py-0.5">
                          {STAGE_LABEL[lead.stage] ?? lead.stage}
                        </span>
                        {lead.no_show_count > 0 && (
                          <span className="text-xs rounded-full bg-red-100 text-red-700 px-2 py-0.5 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {lead.no_show_count} falta(s)
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-col gap-0.5 text-xs text-gray-500">
                        {lead.child_name && (
                          <span className="flex items-center gap-1">
                            <Baby className="h-3 w-3" />
                            {lead.child_name}{lead.child_age != null && ` — ${lead.child_age} anos`}
                          </span>
                        )}
                        {lead.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />{lead.phone}
                          </span>
                        )}
                        {lead.visit_date && (
                          <span className="flex items-center gap-1">
                            <CalendarCheck className="h-3 w-3" />
                            {format(new Date(lead.visit_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                      {ev?.synced_at && (
                        <p className="mt-1 text-[11px] text-emerald-600">
                          ✓ registrado em {format(new Date(ev.synced_at), "dd/MM HH:mm")}
                        </p>
                      )}
                    </div>

                    <div className="flex-1 min-w-[260px]">
                      <div className="flex flex-wrap gap-2">
                        {DESFECHOS.map((d) => (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => setLinha(lead.id, { tipo: d.value })}
                            className={
                              "px-3 py-1.5 rounded-md text-sm font-medium border transition-colors " +
                              (linha.tipo === d.value
                                ? "bg-primary-500 text-white border-primary-500"
                                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50")
                            }
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                      <textarea
                        className={`mt-2 w-full rounded-md border p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          linha.tipo && !linha.observacao.trim() ? "border-red-400" : "border-gray-300"
                        }`}
                        rows={2}
                        placeholder="Observação obrigatória — ex: matriculou turma Jardim, voltaria em agosto, achou caro..."
                        value={linha.observacao}
                        onChange={(e) => setLinha(lead.id, { observacao: e.target.value })}
                      />
                    </div>

                    <div className="flex items-center">
                      <Button
                        onClick={() => handleSalvar(lead)}
                        disabled={!linha.tipo || !linha.observacao.trim() || isSalvando}
                      >
                        {isSalvando ? "Salvando..." : ev ? "Atualizar" : "Registrar"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal: próximo passo após "Visitou" ── */}
      <Dialog open={!!modalVisita} onOpenChange={(open) => { if (!open) { setModalVisita(null); recarregar(); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>E agora, qual o próximo passo?</DialogTitle>
            <DialogDescription>
              Visita de <strong>{modalVisita?.lead.name}</strong> registrada.
              Se já souber o resultado, selecione abaixo — senão, feche e atualize depois.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            {DESFECHOS.filter((d) => d.value !== "visita_realizada").map((d) => (
              <button
                key={d.value}
                onClick={() => handleDecisaoModal(d.value)}
                disabled={salvando !== null}
                className={`w-full px-4 py-3 rounded-lg text-sm font-semibold border-2 transition-colors disabled:opacity-50 ${
                  d.value === "matricula"
                    ? "border-green-400 text-green-700 hover:bg-green-50"
                    : d.value === "em_negociacao"
                    ? "border-yellow-400 text-yellow-700 hover:bg-yellow-50"
                    : "border-red-300 text-red-600 hover:bg-red-50"
                }`}
              >
                {salvando !== null ? "Salvando..." : d.label}
              </button>
            ))}
            <button
              onClick={() => { setModalVisita(null); recarregar(); }}
              className="mt-1 text-sm text-gray-400 hover:text-gray-600 text-center py-2"
            >
              Deixar em aberto por enquanto
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Desfechos Realizados ── */}
      {realizados.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Desfechos Realizados</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-semibold">Lead</th>
                  <th className="px-4 py-3 text-left font-semibold w-36">Desfecho</th>
                  <th className="px-4 py-3 text-left font-semibold">Observação</th>
                  <th className="px-4 py-3 text-left font-semibold w-28">Registrado</th>
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody>
                {realizados.map((ev, i) => {
                  const isEditando = editandoId === ev.id;
                  const isConfirmando = confirmandoId === ev.id;
                  const isSalvando = salvando === ev.crm_lead_id;

                  return (
                    <tr key={ev.id} className={`border-b border-gray-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                      {isEditando ? (
                        <td colSpan={5} className="px-4 py-4">
                          <div className="flex flex-col gap-3">
                            <p className="font-medium text-gray-800">{ev.nome ?? "—"}</p>
                            <div className="flex flex-wrap gap-2">
                              {DESFECHOS.map((d) => (
                                <button
                                  key={d.value}
                                  type="button"
                                  onClick={() => setEditEstado((s) => ({ ...s, tipo: d.value }))}
                                  className={
                                    "px-3 py-1.5 rounded-md text-sm font-medium border transition-colors " +
                                    (editEstado.tipo === d.value
                                      ? "bg-primary-500 text-white border-primary-500"
                                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50")
                                  }
                                >
                                  {d.label}
                                </button>
                              ))}
                            </div>
                            <textarea
                              className="w-full rounded-md border border-gray-300 p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                              rows={2}
                              value={editEstado.observacao}
                              onChange={(e) => setEditEstado((s) => ({ ...s, observacao: e.target.value }))}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleEditar(ev)}
                                disabled={!editEstado.tipo || !editEstado.observacao.trim() || isSalvando}
                              >
                                <Check className="h-3.5 w-3.5" />
                                {isSalvando ? "Salvando..." : "Salvar"}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditandoId(null)}>
                                <X className="h-3.5 w-3.5" />
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-medium text-gray-800">{ev.nome ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DESFECHO_BADGE[ev.tipo]}`}>
                              {DESFECHOS.find((d) => d.value === ev.tipo)?.label ?? ev.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-pre-wrap">{ev.observacao ?? "—"}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                            {ev.synced_at ? format(new Date(ev.synced_at), "dd/MM HH:mm") : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {isConfirmando ? (
                              <div className="flex items-center gap-1.5 whitespace-nowrap">
                                <span className="text-xs text-gray-500">Remover?</span>
                                <button
                                  onClick={() => handleRemover(ev)}
                                  disabled={isSalvando}
                                  className="text-xs text-red-600 font-semibold hover:underline disabled:opacity-50"
                                >
                                  {isSalvando ? "..." : "Sim"}
                                </button>
                                <button
                                  onClick={() => setConfirmandoId(null)}
                                  className="text-xs text-gray-400 hover:underline"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditandoId(ev.id);
                                    setEditEstado({ tipo: ev.tipo, observacao: ev.observacao ?? "" });
                                    setConfirmandoId(null);
                                  }}
                                  className="text-gray-400 hover:text-primary-500 transition-colors"
                                  title="Editar"
                                  aria-label="Editar desfecho"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => { setConfirmandoId(ev.id); setEditandoId(null); }}
                                  className="text-gray-400 hover:text-red-500 transition-colors"
                                  title="Remover"
                                  aria-label="Remover desfecho"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
