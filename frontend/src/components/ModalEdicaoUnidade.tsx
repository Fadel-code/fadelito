import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TURMAS, registroVazio } from "../types";
import type { ConsolidadoUnidade, RegistroInput } from "../types";
import { supabase } from "../lib/supabase";
import { FERIADOS_SET, isDiaUtil } from "../lib/feriados";
import { diasUteisDoMes, dateToIso } from "../lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import FormularioTurmas from "./FormularioTurmas";
import toast from "react-hot-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  unidade: ConsolidadoUnidade | null;
  ano: number;
  mes: number;
}

export default function ModalEdicaoUnidade({ open, onClose, unidade, ano, mes }: Props) {
  const diasUteis = diasUteisDoMes(ano, mes, FERIADOS_SET);
  const [diaSelecionado, setDiaSelecionado] = useState<string>("");
  const [linhas, setLinhas] = useState<RegistroInput[]>(TURMAS.map(registroVazio));
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!diaSelecionado || !unidade) return;
    supabase
      .from("registros")
      .select("*")
      .eq("unidade_id", unidade.unidade_id)
      .eq("data", diaSelecionado)
      .then(({ data }) => {
        setLinhas(
          TURMAS.map((turma) => {
            const r = data?.find((x: { turma: string }) => x.turma === turma);
            return r
              ? {
                  turma: r.turma,
                  visitas: r.visitas,
                  visitas_curso_ferias: r.visitas_curso_ferias,
                  matriculas: r.matriculas,
                  matriculas_curso_ferias: r.matriculas_curso_ferias,
                  desligamentos: r.desligamentos,
                  transferencias: r.transferencias,
                  religamentos: r.religamentos,
                }
              : registroVazio(turma);
          })
        );
      });
  }, [diaSelecionado, unidade]);

  async function handleSalvar() {
    if (!unidade || !diaSelecionado) return;
    setSalvando(true);
    try {
      const { data: anteriores } = await supabase
        .from("registros")
        .select("*")
        .eq("unidade_id", unidade.unidade_id)
        .eq("data", diaSelecionado);

      const anteriorMap = new Map((anteriores ?? []).map((r: { turma: string }) => [r.turma, r]));

      const { error } = await supabase.from("registros").upsert(
        linhas.map((l) => ({
          unidade_id: unidade.unidade_id,
          data: diaSelecionado,
          turma: l.turma,
          visitas: l.visitas,
          visitas_curso_ferias: l.visitas_curso_ferias,
          matriculas: l.matriculas,
          matriculas_curso_ferias: l.matriculas_curso_ferias,
          desligamentos: l.desligamentos,
          transferencias: l.transferencias,
          religamentos: l.religamentos,
        })),
        { onConflict: "unidade_id,data,turma" }
      );

      if (error) throw error;

      // Audit log
      const { data: { user } } = await supabase.auth.getUser();
      const campos = ["visitas","visitas_curso_ferias","matriculas","matriculas_curso_ferias","desligamentos","transferencias","religamentos"] as const;
      const auditEntries: object[] = [];
      for (const linha of linhas) {
        const ant = anteriorMap.get(linha.turma) as Record<string, number> | undefined;
        const acao = ant ? "UPDATE" : "INSERT";
        for (const campo of campos) {
          const valNovo = String(linha[campo]);
          const valAnt = ant ? String(ant[campo]) : null;
          if (acao === "INSERT" || valNovo !== valAnt) {
            auditEntries.push({
              usuario_id: user?.id,
              unidade_nome: unidade.unidade_nome,
              acao,
              data_registro: diaSelecionado,
              turma: linha.turma,
              campo_alterado: campo,
              valor_anterior: valAnt,
              valor_novo: valNovo,
            });
          }
        }
      }
      if (auditEntries.length) await supabase.from("audit_log").insert(auditEntries);

      toast.success("Dados salvos com sucesso!");
      onClose();
    } catch (err) {
      toast.error("Erro ao salvar. Tente novamente.");
      console.error(err);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            Editar — {unidade?.unidade_nome}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-4 space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Dia:</label>
            <Select value={diaSelecionado} onValueChange={setDiaSelecionado}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Selecione o dia" />
              </SelectTrigger>
              <SelectContent>
                {diasUteis.map((d) => {
                  const iso = dateToIso(d);
                  return (
                    <SelectItem key={iso} value={iso}>
                      {format(d, "EEEE, dd/MM", { locale: ptBR })}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {diaSelecionado && (
            <FormularioTurmas linhas={linhas} onChange={setLinhas} />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando || !diaSelecionado}>
            {salvando ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
