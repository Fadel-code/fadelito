import { useState, useCallback } from "react";
import { supabase, buscarTudo, avisarEventosLeadAlterados } from "../lib/supabase";
import { fetchLeadsElegiveis, enviarDesfecho, reverterDesfecho } from "../lib/crm";
import { dateToIso } from "../lib/utils";
import type { LeadCRM, EventoLead, DesfechoTipo } from "../types";
import toast from "react-hot-toast";
import { BANNER_KEY } from "../components/Layout";

interface UseEventosLeadOptions {
  unidadeId: string;
  unidadeNome: string;
}

type EventoSync = Pick<EventoLead, "id" | "crm_lead_id" | "tipo" | "observacao">;

/** Envia o desfecho já gravado localmente ao CRM e marca synced_at. Falha não desfaz o local:
 *  synced_at fica nulo e a próxima carga da tela tenta de novo. */
async function sincronizarCrm(ev: EventoSync, unidadeNome: string): Promise<string | null> {
  try {
    await enviarDesfecho(ev.crm_lead_id, ev.tipo, ev.observacao, unidadeNome);
    const agora = new Date().toISOString();
    const { error } = await supabase.from("eventos_lead").update({ synced_at: agora }).eq("id", ev.id);
    if (error) throw error;
    return agora;
  } catch (err) {
    console.warn("Desfecho salvo, envio ao CRM pendente:", err);
    return null;
  }
}

/** Apaga o desfecho local e devolve o lead ao estado de visita no CRM.
 *  "removido" nunca foi enviado ao CRM (lead de outra unidade): reverter ali
 *  desfaria o desfecho que a unidade certa registrou. */
export async function apagarEventoLead(evento: Pick<EventoLead, "id" | "crm_lead_id" | "tipo">) {
  if (evento.tipo !== "removido") {
    // CRM: best-effort — falha não impede a limpeza local
    try {
      await reverterDesfecho(evento.crm_lead_id);
    } catch (crmErr) {
      console.warn("Não foi possível reverter no CRM (ignorado):", crmErr);
    }
  }
  const { data, error } = await supabase.from("eventos_lead").delete().eq("id", evento.id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Permissão negada pelo banco para remover este desfecho.");
  avisarEventosLeadAlterados();
}

export function useEventosLead({ unidadeId, unidadeNome }: UseEventosLeadOptions) {
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState<number | null>(null);

  const carregar = useCallback(async (): Promise<{
    leads: LeadCRM[];
    eventos: Map<number, EventoLead>;
  }> => {
    setLoading(true);
    try {
      // CRM e Supabase em paralelo; CRM pode falhar sem apagar os eventos locais
      const [leadsResult, eventosRes] = await Promise.allSettled([
        fetchLeadsElegiveis(unidadeNome),
        buscarTudo<EventoLead>((de, ate) =>
          supabase.from("eventos_lead").select("*").eq("unidade_id", unidadeId).order("id").range(de, ate)
        ),
      ]);

      if (leadsResult.status === "rejected") {
        console.error("CRM indisponível:", leadsResult.reason);
        toast.error("CRM indisponível — leads não carregados");
      }
      if (eventosRes.status === "rejected") {
        console.error(eventosRes.reason);
        toast.error("Erro ao carregar os desfechos registrados");
      }

      const leads = leadsResult.status === "fulfilled" ? leadsResult.value : [];
      const eventosData = eventosRes.status === "fulfilled" ? eventosRes.value : [];

      // CRM respondeu: reenvia o que ficou pendente de uma queda anterior.
      if (leadsResult.status === "fulfilled") {
        const pendentes = eventosData.filter((e) => !e.synced_at && e.tipo !== "removido");
        await Promise.all(
          pendentes.map(async (e) => {
            e.synced_at = await sincronizarCrm(e, unidadeNome);
          })
        );
      }

      const eventos = new Map<number, EventoLead>(eventosData.map((e) => [e.crm_lead_id, e]));
      return { leads, eventos };
    } finally {
      setLoading(false);
    }
  }, [unidadeId, unidadeNome]);

  const registrarDesfecho = useCallback(
    async (lead: LeadCRM, tipo: DesfechoTipo, observacao: string): Promise<boolean> => {
      setSalvando(lead.id);
      try {
        // Local primeiro: se o CRM avançasse o stage e a gravação local falhasse, o lead
        // sumiria da lista de elegíveis sem nenhum registro aqui.
        const { data, error } = await supabase
          .from("eventos_lead")
          .upsert(
            {
              unidade_id: unidadeId,
              crm_lead_id: lead.id,
              nome: lead.name,
              telefone: lead.phone,
              data: dateToIso(new Date()), // dia local (São Paulo), não UTC
              tipo,
              observacao: observacao.trim() || null,
              synced_at: null,
            },
            { onConflict: "unidade_id,crm_lead_id" }
          )
          .select("id, crm_lead_id, tipo, observacao")
          .single();
        if (error) throw error;
        const enviado = await sincronizarCrm(data as EventoSync, unidadeNome);
        if (enviado) toast.success("Desfecho registrado e enviado ao CRM!");
        else toast("Desfecho salvo. CRM fora do ar — o envio será refeito automaticamente.", { icon: "⚠️" });
        localStorage.setItem(BANNER_KEY, "1");
        avisarEventosLeadAlterados();
        return true;
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : "Erro ao registrar desfecho");
        return false;
      } finally {
        setSalvando(null);
      }
    },
    [unidadeId, unidadeNome]
  );

  const editarDesfecho = useCallback(
    async (evento: EventoLead, novoTipo: DesfechoTipo, novaObs: string, novoNome: string): Promise<boolean> => {
      setSalvando(evento.crm_lead_id);
      try {
        const { data, error } = await supabase
          .from("eventos_lead")
          .update({
            nome: novoNome.trim() || evento.nome,
            tipo: novoTipo,
            observacao: novaObs.trim() || null,
            synced_at: null,
          })
          .eq("id", evento.id)
          .select("id, crm_lead_id, tipo, observacao");
        if (error) throw error;
        if (!data?.length) throw new Error("Permissão negada pelo banco para editar este desfecho.");
        // "removido" é só local (editar só o nome de um lead removido não vai ao CRM)
        const enviado = novoTipo === "removido" || (await sincronizarCrm(data[0] as EventoSync, unidadeNome));
        if (enviado) toast.success("Desfecho atualizado!");
        else toast("Desfecho atualizado. CRM fora do ar — o envio será refeito automaticamente.", { icon: "⚠️" });
        avisarEventosLeadAlterados();
        return true;
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : "Erro ao editar desfecho");
        return false;
      } finally {
        setSalvando(null);
      }
    },
    [unidadeNome]
  );

  const descartarLead = useCallback(
    async (lead: LeadCRM, motivo: string): Promise<boolean> => {
      setSalvando(lead.id);
      try {
        // Local apenas — não é um outcome de visita, então não chama o CRM.
        const { error } = await supabase.from("eventos_lead").upsert(
          {
            unidade_id: unidadeId,
            crm_lead_id: lead.id,
            nome: lead.name,
            telefone: lead.phone,
            data: dateToIso(new Date()),
            tipo: "removido",
            observacao: motivo.trim(),
            synced_at: null,
          },
          { onConflict: "unidade_id,crm_lead_id" }
        );
        if (error) throw error;
        toast.success("Lead removido do desfecho desta unidade.");
        avisarEventosLeadAlterados();
        return true;
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : "Erro ao remover lead");
        return false;
      } finally {
        setSalvando(null);
      }
    },
    [unidadeId]
  );

  const removerDesfecho = useCallback(async (evento: EventoLead): Promise<boolean> => {
    setSalvando(evento.crm_lead_id);
    try {
      await apagarEventoLead(evento);
      toast.success("Desfecho removido.");
      return true;
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erro ao remover desfecho");
      return false;
    } finally {
      setSalvando(null);
    }
  }, []);

  return { loading, salvando, carregar, registrarDesfecho, editarDesfecho, removerDesfecho, descartarLead };
}
