import { useState } from "react";
import { ArrowLeft, AlertTriangle, Copy, Check } from "lucide-react";
import type { Protocolo } from "../types";

interface ProtocolDetailProps {
  protocolo: Protocolo;
  onVoltar: () => void;
}

export default function ProtocolDetail({ protocolo, onVoltar }: ProtocolDetailProps) {
  const [copiado, setCopiado] = useState(false);

  async function copiarMensagem() {
    try {
      await navigator.clipboard.writeText(protocolo.mensagem_familia);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      // clipboard indisponível (ex: contexto não-seguro) — usuário seleciona e copia manualmente
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <button
          onClick={onVoltar}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar à biblioteca
        </button>
        <h2 className="text-2xl font-bold text-gray-900">{protocolo.titulo}</h2>
        <p className="mt-2 text-gray-600">{protocolo.resumo}</p>
      </div>

      {protocolo.atencao && (
        <div className="flex gap-3 items-start px-6 py-4 bg-amber-50 border-b border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{protocolo.atencao}</p>
        </div>
      )}

      <div className="p-6">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Roteiro de ações</h3>
        <ol className="space-y-2">
          {protocolo.acoes.map((acao, i) => (
            <li key={i} className="flex gap-3 items-start bg-gray-50 rounded-lg p-3">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary-500 text-white text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <p className="text-sm text-gray-700 whitespace-pre-line">{acao}</p>
            </li>
          ))}
        </ol>
      </div>

      {protocolo.mensagem_familia && (
        <div className="mx-6 mb-6 p-4 rounded-xl border border-primary-200 bg-primary-50">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-primary-700">
              {protocolo.area === "Administrativo" ? "Comunicação interna sugerida" : "Como comunicar à família"}
            </h3>
            <button
              onClick={copiarMensagem}
              className="flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-900"
            >
              {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiado ? "Copiado" : "Copiar mensagem"}
            </button>
          </div>
          <blockquote className="text-sm text-gray-700 whitespace-pre-line border-l-4 border-primary-300 pl-3">
            {protocolo.mensagem_familia}
          </blockquote>
        </div>
      )}

      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
        Fonte: {protocolo.fonte}
      </div>
    </div>
  );
}
