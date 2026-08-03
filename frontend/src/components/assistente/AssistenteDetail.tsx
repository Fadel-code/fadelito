import { useState } from "react";
import type { Protocolo } from "../../types";

interface AssistenteDetailProps {
  protocolo: Protocolo;
  onVoltar: () => void;
}

export default function AssistenteDetail({ protocolo, onVoltar }: AssistenteDetailProps) {
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
    <div className="af-answer">
      <div className="p-6 pb-0">
        <button
          onClick={onVoltar}
          className="af-back-link text-sm font-semibold mb-4 px-2.5 py-2 -ml-2.5 rounded-md"
          style={{ color: "var(--af-brand)" }}
        >
          ← Voltar aos protocolos
        </button>
        <h2>{protocolo.titulo}</h2>
        <p className="mt-3 text-sm" style={{ color: "var(--af-muted)" }}>
          {protocolo.resumo}
        </p>
      </div>

      {protocolo.atencao && (
        <div className="af-attention mt-5">
          <span>!</span>
          <div>
            <strong>Atenção</strong>
            <p>{protocolo.atencao}</p>
          </div>
        </div>
      )}

      <div className="p-6">
        <h3 className="text-[11px] font-black uppercase tracking-wide mb-3" style={{ color: "var(--af-muted)" }}>
          Roteiro de ações
        </h3>
        <ol className="grid gap-2.5 list-none p-0 m-0">
          {protocolo.acoes.map((acao, i) => (
            <li key={i} className="af-step">
              <span className="af-step-number">{i + 1}</span>
              <p>{acao}</p>
            </li>
          ))}
        </ol>
      </div>

      {protocolo.mensagem_familia && (
        <div className="af-communication">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h3>{protocolo.area === "Administrativo" ? "Comunicação interna sugerida" : "Como comunicar à família"}</h3>
            <button onClick={copiarMensagem} className={`af-copy-message ${copiado ? "copied" : ""}`}>
              {copiado ? "Mensagem copiada" : "Copiar mensagem"}
            </button>
          </div>
          <blockquote>{protocolo.mensagem_familia}</blockquote>
        </div>
      )}

      <div
        className="px-6 py-3 text-xs"
        style={{ color: "var(--af-muted)", borderTop: "1px solid var(--af-line)", background: "#f9fafb" }}
      >
        Fonte: {protocolo.fonte}
      </div>
    </div>
  );
}
