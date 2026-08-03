import { useEffect, useState } from "react";
import { useProtocolos } from "../../hooks/useProtocolos";
import ProtocolBrowser from "../../components/ProtocolBrowser";
import ProtocolDetail from "../../components/ProtocolDetail";
import type { Protocolo } from "../../types";

export default function Assistente() {
  const { protocolos, loading, carregar } = useProtocolos();
  const [selecionado, setSelecionado] = useState<Protocolo | null>(null);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (selecionado) {
    return (
      <div className="max-w-3xl">
        <ProtocolDetail protocolo={selecionado} onVoltar={() => setSelecionado(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assistente Fadelito</h1>
        <p className="text-gray-500 text-sm mt-1">
          Busque um protocolo pela situação — ex: "mordida", "desfralde", "foto".
        </p>
      </div>

      <ProtocolBrowser protocolos={protocolos} loading={loading} onSelect={setSelecionado} />
    </div>
  );
}
