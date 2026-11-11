import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Baby, CalendarCheck, Phone, AlertTriangle } from "lucide-react";
import { STAGE_LABEL } from "../types";
import type { LeadCRM } from "../types";

// Dados da visita (criança, telefone, data, situação no CRM) exibidos sob o nome
// do lead nos "Desfechos realizados". O lead vem da lista do CRM; se ele não
// estiver mais lá (ou o CRM estiver fora), cai no telefone salvo no eventos_lead.
export function LeadDetalhes({ lead, telefone }: { lead?: LeadCRM; telefone?: string | null }) {
  const fone = lead?.phone ?? telefone;
  return (
    <div className="mt-1 flex flex-col gap-0.5 text-xs font-normal text-gray-500">
      {lead?.child_name && (
        <span className="flex items-center gap-1">
          <Baby className="h-3 w-3" aria-hidden />
          {lead.child_name}{lead.child_age != null && ` — ${lead.child_age} anos`}
        </span>
      )}
      {fone && (
        <span className="flex items-center gap-1">
          <Phone className="h-3 w-3" aria-hidden />{fone}
        </span>
      )}
      {lead?.visit_date && (
        <span className="flex items-center gap-1">
          <CalendarCheck className="h-3 w-3" aria-hidden />
          {format(new Date(lead.visit_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </span>
      )}
      {lead && (
        <span className="flex flex-wrap items-center gap-1">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">{STAGE_LABEL[lead.stage] ?? lead.stage}</span>
          {lead.no_show_count > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-red-700">
              <AlertTriangle className="h-3 w-3" aria-hidden />{lead.no_show_count} falta(s)
            </span>
          )}
        </span>
      )}
    </div>
  );
}
