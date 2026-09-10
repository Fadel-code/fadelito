import { useAuth } from "../../App";
import { useRematricula } from "../../hooks/useRematricula";
import RematriculaPainel from "../../components/RematriculaPainel";

export default function Rematricula() {
  const { profile } = useAuth();
  const rematricula = useRematricula();

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rematrícula 2027</h1>
        <p className="text-gray-500 text-sm mt-1">
          {profile?.unidade_nome} — acompanhe a rematrícula dos alunos da unidade.
        </p>
        <p className="text-gray-400 text-xs mt-1">
          Por enquanto só é possível incluir alunos que ficaram de fora da lista — o resto (contrato, contato,
          status) ainda é só visualização e será liberado em breve, com orientações.
        </p>
      </div>

      <RematriculaPainel unidadeId={profile?.id ?? ""} {...rematricula} readOnly />
    </div>
  );
}
