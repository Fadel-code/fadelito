/** Botões de opção única lado a lado; a opção ativa fica preenchida na cor da marca. */
export default function Segmentado<T extends string>({ rotulo, valor, opcoes, onChange }: { rotulo: string; valor: T; opcoes: { valor: T; rotulo: string; curto?: string; extra?: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={rotulo} className="inline-flex max-w-full rounded-lg bg-gray-100 p-0.5 text-sm ring-1 ring-inset ring-gray-200">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          aria-pressed={valor === o.valor}
          onClick={() => onChange(o.valor)}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
            valor === o.valor ? "bg-primary-600 text-white shadow-sm" : "text-gray-700 hover:bg-white hover:text-gray-900"
          }`}
        >
          {o.curto ? (
            <>
              <span className="sm:hidden">{o.curto}</span>
              <span className="hidden sm:inline">{o.rotulo}</span>
            </>
          ) : (
            o.rotulo
          )}
          {o.extra && <span className={`tabular-nums ${valor === o.valor ? "font-semibold text-white/85" : "text-gray-500"}`}>{o.extra}</span>}
        </button>
      ))}
    </div>
  );
}
