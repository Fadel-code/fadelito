import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Info, Plus, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { MESES, mesAnterior, type Linha } from "../../lib/rankingSupervisoras";
import type { useRankingSupervisoras } from "../../hooks/useRankingSupervisoras";

type Ranking = ReturnType<typeof useRankingSupervisoras>;

const CAMPO = "h-9 rounded-md border border-gray-300 bg-white px-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";
const SEM_SETAS = "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function rotuloMes(iso: string) {
  const [a, m] = iso.split("-").map(Number);
  return `${MESES[m - 1]}/${a}`;
}

function TagLinha({ linha }: { linha: Linha }) {
  return (
    <span
      title={`Linha ${linha}: coluna SUPER ${linha}. da planilha`}
      className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-700"
    >
      Linha {linha}
    </span>
  );
}

export default function ConfiguracaoRanking({ ranking, mesInicial }: { ranking: Ranking; mesInicial: string }) {
  const { janela, supervisoras, atribuicoes, unidades, evolucao, adicionarSupervisora, alternarAtiva, atribuir, encerrarAtribuicao, removerAtribuicao, salvarAlunosBase } = ranking;

  // Um único mês de referência pra carteira, alerta de unidades sem supervisora e alunos ativos.
  const [mesRef, setMesRef] = useState(mesInicial.slice(0, 7));
  const mesIsoRef = `${mesRef}-01`;
  const mesAnt = mesAnterior(mesIsoRef);
  const nomeUnidade = (id: string) => unidades.find((u) => u.id === id)?.nome ?? "—";
  const ativaNoMes = (a: { mesInicio: string; mesFim: string | null }) => a.mesInicio <= mesIsoRef && (a.mesFim === null || mesIsoRef <= a.mesFim);

  // ---- Supervisoras ----
  const [novoNome, setNovoNome] = useState("");
  const [novaLinha, setNovaLinha] = useState<Linha>("F");
  const [supId, setSupId] = useState("");
  const supSel = supervisoras.find((s) => s.id === supId) ?? supervisoras[0];

  async function handleNovaSupervisora(e: FormEvent) {
    e.preventDefault();
    if (!novoNome.trim()) return;
    if (await adicionarSupervisora(novoNome, novaLinha)) setNovoNome("");
  }

  // ---- Carteira ----
  const [unidadeNova, setUnidadeNova] = useState("");
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const carteira = supSel
    ? atribuicoes
        .filter((a) => a.supervisoraId === supSel.id)
        .sort((a, b) => Number(ativaNoMes(b)) - Number(ativaNoMes(a)) || nomeUnidade(a.unidadeId).localeCompare(nomeUnidade(b.unidadeId), "pt-BR") || a.mesInicio.localeCompare(b.mesInicio))
    : [];

  // Por linha: unidades sem nenhuma supervisora no mês de referência e unidades com duas (contariam em dobro).
  const problemasCarteira = useMemo(() => {
    const ativas = atribuicoes.filter((a) => a.mesInicio <= mesIsoRef && (a.mesFim === null || mesIsoRef <= a.mesFim));
    return (["F", "P"] as Linha[]).flatMap((linha) => {
      const contagem = new Map<string, number>();
      for (const a of ativas) if (supervisoras.find((s) => s.id === a.supervisoraId)?.linha === linha) contagem.set(a.unidadeId, (contagem.get(a.unidadeId) ?? 0) + 1);
      const ativasNomes = unidades.filter((u) => u.ativo);
      return [
        { linha, tipo: "sem" as const, unidades: ativasNomes.filter((u) => !contagem.has(u.id)) },
        { linha, tipo: "duas" as const, unidades: ativasNomes.filter((u) => (contagem.get(u.id) ?? 0) > 1) },
      ].filter((p) => p.unidades.length);
    });
  }, [atribuicoes, supervisoras, unidades, mesIsoRef]);

  async function handleAtribuir(e: FormEvent) {
    e.preventDefault();
    if (!supSel || !unidadeNova) return;
    if (await atribuir(supSel.id, unidadeNova, mesIsoRef)) setUnidadeNova("");
  }

  // ---- Alunos ativos (base da perda) ----
  const [alunos, setAlunos] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const baseDoMes = (mes: string) => new Map(evolucao.filter((e) => e.mes === mes && e.alunos_base !== null).map((e) => [e.unidade_id, e.alunos_base!]));
  const salvos = baseDoMes(mesIsoRef);
  const unidadesAlunos = unidades.filter((u) => u.ativo || salvos.has(u.id));

  // Cada unidade parte do último valor salvo antes do mês de referência (a base muda devagar).
  const anterioresComBase = useMemo(
    () => evolucao.filter((e) => e.mes < mesIsoRef && e.alunos_base !== null).sort((a, b) => b.mes.localeCompare(a.mes)),
    [evolucao, mesIsoRef]
  );
  const mesOrigem = anterioresComBase[0]?.mes;

  useEffect(() => {
    const inicial: Record<string, string> = {};
    for (const u of unidades) {
      const v = evolucao.find((e) => e.unidade_id === u.id && e.mes === mesIsoRef && e.alunos_base !== null)?.alunos_base
        ?? anterioresComBase.find((e) => e.unidade_id === u.id)?.alunos_base;
      if (v !== undefined && v !== null) inicial[u.id] = String(v);
    }
    setAlunos(inicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesIsoRef, evolucao, unidades]);

  const valido = (id: string) => alunos[id] !== undefined && alunos[id] !== "" && Number(alunos[id]) >= 0;
  const aSalvar = unidadesAlunos.filter((u) => valido(u.id) && Math.round(Number(alunos[u.id])) !== salvos.get(u.id));
  const semValor = unidadesAlunos.filter((u) => !valido(u.id)).length;

  async function handleSalvarAlunos() {
    setSalvando(true);
    await salvarAlunosBase(mesIsoRef, aSalvar.map((u) => ({ unidadeId: u.id, alunosBase: Math.round(Number(alunos[u.id])) })));
    setSalvando(false);
  }

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
        <label htmlFor="mes-ref" className="text-sm font-medium text-gray-800">Mês de referência</label>
        <input id="mes-ref" type="month" min={janela.min} max={janela.max} className={CAMPO} value={mesRef} onChange={(e) => e.target.value && setMesRef(e.target.value)} />
        <p className="text-xs text-gray-600">Vale para a carteira e para os alunos ativos. Para outros meses, mude o período na aba Ranking.</p>
      </div>

      {problemasCarteira.length > 0 && (
        <div role="status" className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" aria-hidden />
          <div className="space-y-0.5">
            {problemasCarteira.map((p) => {
              const varias = p.unidades.length > 1;
              const nomes = p.unidades.map((u) => u.nome).join(", ");
              return (
                <p key={p.linha + p.tipo}>
                  {p.tipo === "sem"
                    ? `${nomes} ${varias ? "estão" : "está"} sem supervisora na linha ${p.linha} em ${rotuloMes(mesIsoRef)} e ${varias ? "ficam" : "fica"} fora do ranking.`
                    : `${nomes} ${varias ? "têm" : "tem"} duas supervisoras na linha ${p.linha} em ${rotuloMes(mesIsoRef)} e ${varias ? "contam" : "conta"} duas vezes.`}
                </p>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        {/* Quem supervisiona */}
        <section aria-labelledby="cfg-sup" className="card h-fit p-4">
          <h2 id="cfg-sup" className="text-base font-semibold text-gray-900">Supervisoras</h2>
          <p className="mt-1 text-xs text-gray-700">
            Cada unidade tem uma supervisora na linha F e outra na linha P. Contagem em {rotuloMes(mesIsoRef)}.
          </p>
          {(["F", "P"] as Linha[]).map((linha) => {
            const daLinha = supervisoras.filter((s) => s.linha === linha);
            if (!daLinha.length) return null;
            const total = new Set(atribuicoes.filter((a) => daLinha.some((s) => s.id === a.supervisoraId) && ativaNoMes(a)).map((a) => a.unidadeId)).size;
            return (
              <div key={linha} className="mt-4">
                <p className="flex items-baseline justify-between px-3 text-xs font-semibold text-gray-700">
                  <span>Linha {linha}</span>
                  <span className="font-normal tabular-nums">{total} de {unidades.filter((u) => u.ativo).length} unidades</span>
                </p>
                <ul className="mt-1 space-y-0.5">
                  {daLinha.map((s) => {
                    const n = atribuicoes.filter((a) => a.supervisoraId === s.id && ativaNoMes(a)).length;
                    const selecionada = s.id === supSel?.id;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          aria-current={selecionada}
                          onClick={() => { setSupId(s.id); setConfirmando(null); }}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                            selecionada ? "bg-primary-50 text-primary-800" : "text-gray-800 hover:bg-gray-50"
                          }`}
                        >
                          <span className={`min-w-0 truncate text-sm font-medium ${s.ativo ? "" : "text-gray-600 line-through"}`}>{s.nome}</span>
                          <span className="flex-shrink-0 text-xs text-gray-700 tabular-nums">
                            {!s.ativo ? "inativa" : n === 0 ? "sem carteira" : `${n} ${n === 1 ? "unidade" : "unidades"}`}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          <form onSubmit={handleNovaSupervisora} className="mt-4 space-y-2 border-t border-gray-100 pt-4">
            <label htmlFor="nova-sup" className="block text-xs font-medium text-gray-700">Nova supervisora</label>
            <input id="nova-sup" className={`${CAMPO} w-full`} placeholder="Nome" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
            <div className="flex gap-2">
              <select className={`${CAMPO} flex-1`} aria-label="Linha da nova supervisora" value={novaLinha} onChange={(e) => setNovaLinha(e.target.value as Linha)}>
                <option value="F">Linha F</option>
                <option value="P">Linha P</option>
              </select>
              <Button type="submit" size="sm" className="h-9 gap-1.5" disabled={!novoNome.trim()}><Plus className="h-4 w-4" aria-hidden />Adicionar</Button>
            </div>
          </form>
        </section>

        {/* Carteira da selecionada */}
        <section aria-labelledby="cfg-carteira" className="card p-5">
          {!supSel ? (
            <p className="py-8 text-center text-sm text-gray-600">Cadastre a primeira supervisora para montar a carteira.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 id="cfg-carteira" className="text-base font-semibold text-gray-900">Carteira de {supSel.nome}</h2>
                  <TagLinha linha={supSel.linha} />
                </div>
                <Button variant="ghost" size="sm" onClick={() => alternarAtiva(supSel.id, !supSel.ativo)}>
                  {supSel.ativo ? "Desativar supervisora" : "Reativar supervisora"}
                </Button>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                {supSel.ativo ? "Aparece no ranking com as unidades abaixo." : "Desativada: não aparece no ranking."} Na mesma linha, cada unidade tem uma supervisora por vez.
              </p>

              {carteira.length === 0 ? (
                <p className="my-6 rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-600">
                  Nenhuma unidade na carteira de {supSel.nome}. Escolha uma abaixo.
                </p>
              ) : (
                <div className="mt-4 max-h-80 overflow-y-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 text-xs text-gray-600">
                      <tr>
                        <th scope="col" className="px-3 py-2 text-left font-medium">Unidade</th>
                        <th scope="col" className="px-3 py-2 text-left font-medium">Vigência</th>
                        <th scope="col" className="px-3 py-2"><span className="sr-only">Ações</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {carteira.map((a) => {
                        const vigente = ativaNoMes(a);
                        return (
                          <tr key={a.id} className={`border-t border-gray-100 ${vigente ? "" : "text-gray-600"}`}>
                            <th scope="row" className={`px-3 py-1.5 text-left font-medium ${vigente ? "text-gray-900" : ""}`}>{nomeUnidade(a.unidadeId)}</th>
                            <td className="px-3 py-1.5 tabular-nums">
                              {rotuloMes(a.mesInicio)} → {a.mesFim ? rotuloMes(a.mesFim) : "em aberto"}
                              {!vigente && <span className="ml-2 text-xs">(fora de {rotuloMes(mesIsoRef)})</span>}
                            </td>
                            <td className="whitespace-nowrap px-3 py-1 text-right">
                              {a.mesFim === null && a.mesInicio < mesIsoRef && (
                                <Button variant="ghost" size="sm" title={`Encerra a carteira em ${rotuloMes(mesAnt)}`} aria-label={`Encerrar ${nomeUnidade(a.unidadeId)} em ${rotuloMes(mesAnt)}`} onClick={() => encerrarAtribuicao(a.id, mesAnt)}>Encerrar</Button>
                              )}
                              {confirmando === a.id ? (
                                <Button variant="destructive" size="sm" autoFocus onBlur={() => setConfirmando(null)} onClick={() => { setConfirmando(null); removerAtribuicao(a.id); }}>
                                  Confirmar remoção
                                </Button>
                              ) : (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-600" aria-label={`Remover ${nomeUnidade(a.unidadeId)} da carteira`} onClick={() => setConfirmando(a.id)}>
                                  <Trash2 className="h-4 w-4" aria-hidden />
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <form onSubmit={handleAtribuir} className="mt-4 flex flex-col gap-2 sm:flex-row">
                <label htmlFor="un-nova" className="sr-only">Unidade a passar para {supSel.nome}</label>
                <select id="un-nova" className={`${CAMPO} flex-1`} value={unidadeNova} onChange={(e) => setUnidadeNova(e.target.value)}>
                  <option value="">Passar uma unidade para {supSel.nome}…</option>
                  {unidades.filter((u) => u.ativo).map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
                <Button type="submit" className="h-9" disabled={!unidadeNova}>A partir de {rotuloMes(mesIsoRef)}</Button>
              </form>
              <p className="mt-2 text-xs text-gray-600">Quem cuidava da unidade nessa linha é encerrada no mês anterior.</p>
            </>
          )}
        </section>
      </div>

      {/* Alunos ativos */}
      <section aria-labelledby="cfg-alunos" className="card p-5">
        <h2 id="cfg-alunos" className="text-base font-semibold text-gray-900">Alunos ativos em {rotuloMes(mesIsoRef)}</h2>
        <p className="mt-1 text-xs text-gray-600">
          É a base da perda (desligamentos ÷ alunos ativos). {salvos.size} de {unidadesAlunos.length} unidades já têm valor salvo neste mês.
          {salvos.size < unidadesAlunos.length && mesOrigem && ` Os campos vazios vêm do último valor salvo (${rotuloMes(mesOrigem)}): ajuste o que mudou e salve.`}
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {unidadesAlunos.map((u) => {
            const salvo = salvos.has(u.id);
            return (
              <li key={u.id}>
                <label className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-1.5 text-sm ${!valido(u.id) ? "border-amber-300 bg-amber-50" : "border-gray-200"}`}>
                  <span className="min-w-0 truncate text-gray-900">
                    {u.nome}
                    {!salvo && valido(u.id) && <span className="ml-1.5 text-xs text-amber-800">a salvar</span>}
                  </span>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    className={`h-8 w-20 rounded border border-gray-300 bg-white px-2 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-500 ${SEM_SETAS}`}
                    value={alunos[u.id] ?? ""}
                    onChange={(e) => setAlunos((prev) => ({ ...prev, [u.id]: e.target.value }))}
                  />
                </label>
              </li>
            );
          })}
        </ul>
        <div className="sticky bottom-0 -mx-5 -mb-5 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-gray-200 bg-white/95 px-5 py-3 backdrop-blur">
          <p className="text-sm text-gray-700" aria-live="polite">
            {aSalvar.length > 0 ? `${aSalvar.length} ${aSalvar.length === 1 ? "unidade" : "unidades"} a salvar` : semValor > 0 ? "Nada a salvar" : "Tudo salvo"}
            {semValor > 0 && <span className="text-amber-800"> · {semValor} sem valor</span>}
          </p>
          <Button onClick={handleSalvarAlunos} disabled={salvando || aSalvar.length === 0}>{salvando ? "Salvando..." : "Salvar alunos ativos"}</Button>
        </div>
      </section>
    </div>
  );
}
