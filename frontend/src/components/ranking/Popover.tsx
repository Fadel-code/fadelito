import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  aberto: boolean;
  onFechar: () => void;
  gatilho: ReactNode;
  children: ReactNode;
  rotulo: string;
  /** Lado em que o painel se alinha ao gatilho. */
  alinhar?: "esquerda" | "direita";
}

/** Painel flutuante simples: fecha com Esc e clique fora, devolvendo o foco ao gatilho. */
export default function Popover({ aberto, onFechar, gatilho, children, rotulo, alinhar = "esquerda" }: Props) {
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) onFechar();
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      onFechar();
      raiz.current?.querySelector<HTMLElement>("[data-gatilho]")?.focus();
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto, onFechar]);

  return (
    <div ref={raiz} className="relative inline-block">
      {gatilho}
      {aberto && (
        <div
          role="dialog"
          aria-label={rotulo}
          className={`absolute ${alinhar === "direita" ? "left-0 sm:left-auto sm:right-0" : "left-0"} top-full z-40 mt-2 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-3 shadow-lg shadow-ink/10`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
