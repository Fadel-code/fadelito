import { useState, type ComponentType } from "react";
import { ChevronDown, Download } from "lucide-react";
import { Button } from "./button";
import Popover from "../ranking/Popover";

export interface OpcaoExportar {
  chave: string;
  Icone: ComponentType<{ className?: string }>;
  titulo: string;
  descricao: string;
  onSelecionar: () => void | Promise<void>;
}

/** Um botão só para todas as exportações; cada formato explica o que entrega. */
export default function MenuExportar({ opcoes }: { opcoes: OpcaoExportar[] }) {
  const [aberto, setAberto] = useState(false);
  return (
    <Popover
      aberto={aberto}
      onFechar={() => setAberto(false)}
      rotulo="Exportar dados"
      alinhar="direita"
      gatilho={
        <Button variant="outline" data-gatilho aria-haspopup="menu" aria-expanded={aberto} onClick={() => setAberto((a) => !a)} className="gap-2">
          <Download className="h-4 w-4" aria-hidden />
          Exportar
          <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform motion-reduce:transition-none ${aberto ? "rotate-180" : ""}`} aria-hidden />
        </Button>
      }
    >
      <ul className="w-64 space-y-0.5">
        {opcoes.map(({ chave, Icone, titulo, descricao, onSelecionar }) => (
          <li key={chave}>
            <button
              type="button"
              onClick={() => { setAberto(false); void onSelecionar(); }}
              className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <Icone className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" aria-hidden />
              <span>
                <span className="block text-sm font-medium text-gray-900">{titulo}</span>
                <span className="block text-xs text-gray-600">{descricao}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Popover>
  );
}
