import { useAuth } from "../../App";
import { useRematricula } from "../../hooks/useRematricula";
import { useRematriculaAceites } from "../../hooks/useRematriculaAceites";
import RematriculaPainel from "../../components/RematriculaPainel";

export default function Rematricula() {
  const { profile } = useAuth();
  const rematricula = useRematricula();
  const { porUnidade } = useRematriculaAceites();
  const aceites = porUnidade.find((u) => u.unidade_id === profile?.id)?.quantidade ?? 0;

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rematrícula 2027</h1>
        <p className="text-gray-500 text-sm mt-1">
          {profile?.unidade_nome} — acompanhe a rematrícula dos alunos da unidade.
        </p>
      </div>

      <RematriculaPainel unidadeId={profile?.id ?? ""} aceites={aceites} {...rematricula} />
    </div>
  );
}
