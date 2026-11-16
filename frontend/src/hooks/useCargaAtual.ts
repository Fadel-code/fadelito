import { useCallback, useRef } from "react";

// Recarga por filtro/realtime pode sobrepor outra: a resposta antiga que chega depois da
// nova mostraria o mês/valor errado ("salvei e voltou"). Chame no início da carga e só
// grave o estado se `atual()` ainda for true.
export function useCargaAtual() {
  const ultima = useRef(0);
  return useCallback(() => {
    const minha = ++ultima.current;
    return () => minha === ultima.current;
  }, []);
}
