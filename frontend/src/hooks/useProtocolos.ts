import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { Protocolo } from "../types";
import toast from "react-hot-toast";

export type ProtocoloInput = Omit<Protocolo, "id" | "created_at" | "updated_at">;

export function useProtocolos() {
  const [protocolos, setProtocolos] = useState<Protocolo[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("protocolos")
      .select("*")
      .order("titulo");
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar protocolos");
    } else {
      setProtocolos(data ?? []);
    }
    setLoading(false);
  }, []);

  const criar = useCallback(
    async (input: ProtocoloInput): Promise<boolean> => {
      const { error } = await supabase.from("protocolos").insert(input);
      if (error) {
        console.error(error);
        toast.error("Erro ao criar protocolo");
        return false;
      }
      toast.success("Protocolo criado!");
      await carregar();
      return true;
    },
    [carregar]
  );

  const atualizar = useCallback(
    async (id: string, input: Partial<ProtocoloInput>): Promise<boolean> => {
      const { error } = await supabase.from("protocolos").update(input).eq("id", id);
      if (error) {
        console.error(error);
        toast.error("Erro ao salvar protocolo");
        return false;
      }
      toast.success("Protocolo atualizado!");
      await carregar();
      return true;
    },
    [carregar]
  );

  const remover = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await supabase.from("protocolos").delete().eq("id", id);
      if (error) {
        console.error(error);
        toast.error("Erro ao excluir protocolo");
        return false;
      }
      toast.success("Protocolo excluído.");
      await carregar();
      return true;
    },
    [carregar]
  );

  return { protocolos, loading, carregar, criar, atualizar, remover };
}
