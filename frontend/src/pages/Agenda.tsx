import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useAuth } from "../App";
import { Button } from "../components/ui/button";
import { ssoLoginAgenda, agendaFrontendUrl } from "../lib/agenda";

export default function Agenda() {
  const { profile } = useAuth();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [erro, setErro] = useState("");

  const carregar = useCallback(() => {
    setStatus("loading");
    ssoLoginAgenda()
      .then(() => setStatus("ready"))
      .catch((e) => {
        setErro(e instanceof Error ? e.message : "Não foi possível abrir a agenda");
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Agenda em /marketing é só pra supervisão por enquanto — bloqueia acesso direto
  // por URL mesmo sem o item aparecer no menu da marketing.
  if (profile?.role === "marketing") {
    return <Navigate to="/marketing/dashboard" replace />;
  }

  return (
    <div className="h-full bg-white">
      {status === "loading" && (
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-500" />
        </div>
      )}
      {status === "error" && (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <p className="max-w-sm text-sm text-red-700">{erro}</p>
          <Button variant="outline" onClick={carregar}>
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      )}
      {status === "ready" && (
        <iframe
          src={agendaFrontendUrl(profile?.role ?? "unidade")}
          title="Agenda"
          className="block h-full w-full border-0"
        />
      )}
    </div>
  );
}
