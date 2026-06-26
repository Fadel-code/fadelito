import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { fetchLeadsElegiveis, enviarDesfecho, reverterDesfecho } from "../lib/crm";
import type { LeadCRM, EventoLead, DesfechoTipo } from "../types";
import toast from "react-hot-toast";
import { BANNER_KEY } from "../components/Layout";

interface UseEventosLeadOptions {
  unidadeId: string;
  unidadeNome: string;
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
        supabase.from("eventos_lead").select("*").eq("unidade_id", unidadeId),
      ]);

      if (leadsResult.status === "rejected") {
        console.error("CRM indisponível:", leadsResult.reason);
        toast.error("CRM indisponível — leads não carregados");
      }

      const leads = leadsResult.status === "fulfilled" ? leadsResult.value : [];
      const eventosData = eventosRes.status === "fulfilled" ? (eventosRes.value.data ?? []) : [];
      const eventos = new Map<number, EventoLead>(
        eventosData.map((e) => [e.crm_lead_id, e as EventoLead])
      );
      return { leads, eventos };
    } finally {
      setLoading(false);
    }
  }, [unidadeId, unidadeNome]);

  const registrarDesfecho = useCallback(
    async (lead: LeadCRM, tipo: DesfechoTipo, observacao: string): Promise<boolean> => {
      setSalvando(lead.id);
      try {
        await enviarDesfecho(lead.id, tipo, observacao.trim() || null, unidadeNome);
        const { error } = await supabase.from("eventos_lead").upsert(
          {
            unidade_id: unidadeId,
            crm_lead_id: lead.id,
            nome: lead.name,
            telefone: lead.phone,
            data: new Date().toISOString().slice(0, 10),
            tipo,
            observacao: observacao.trim() || null,
            synced_at: new Date().toISOString(),
          },
          { onConflict: "unidade_id,crm_lead_id" }
        );
        if (error) throw error;
        toast.success("Desfecho registrado e enviado ao CRM!");
        localStorage.setItem(BANNER_KEY, "1");
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
    async (evento: EventoLead, novoTipo: DesfechoTipo, novaObs: string): Promise<boolean> => {
      setSalvando(evento.crm_lead_id);
      try {
        await enviarDesfecho(evento.crm_lead_id, novoTipo, novaObs.trim() || null, unidadeNome);
        const { error } = await supabase
          .from("eventos_lead")
          .update({
            tipo: novoTipo,
            observacao: novaObs.trim() || null,
            synced_at: new Date().toISOString(),
          })
          .eq("id", evento.id);
        if (error) throw error;
        toast.success("Desfecho atualizado!");
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

  const removerDesfecho = useCallback(async (evento: EventoLead): Promise<boolean> => {
    setSalvando(evento.crm_lead_id);
    try {
      // CRM: best-effort — falha não impede a limpeza local
      try {
        await reverterDesfecho(evento.crm_lead_id);
      } catch (crmErr) {
        console.warn("Não foi possível reverter no CRM (ignorado):", crmErr);
      }
      const { error } = await supabase.from("eventos_lead").delete().eq("id", evento.id);
      if (error) throw error;
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

  return { loading, salvando, carregar, registrarDesfecho, editarDesfecho, removerDesfecho };
}
