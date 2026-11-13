import type { OpcaoRota } from '../components/CardMaisRotas';

interface CardRotaSelecionadaProps {
  rota: OpcaoRota;
  onVerMaisRotas: () => void;
  onCancelar: () => void;
}

export function CardRotaSelecionada({
  rota,
  onVerMaisRotas,
  onCancelar,
}: CardRotaSelecionadaProps) {
  const trechos = rota.detalhes?.trechos || [];

  return (
    <div className="relative z-20 w-full max-w-md mx-auto">
      <div className="w-full bg-white rounded-t-[28px] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] p-6 transition-all max-h-[75vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xl font-bold text-[#05053a]">Transporte</h3>
          <button
            onClick={onVerMaisRotas}
            className="px-3.5 py-1 rounded-full bg-[#c5dff0] text-[#05053a] text-xs font-semibold hover:brightness-95 transition-all cursor-pointer"
          >
            + Rotas
          </button>
        </div>

        {/* Tempo estimado da rota escolhida */}
        <div className="flex items-baseline gap-1.5 text-[#05053a] my-1">
          <span className="text-4xl font-extrabold tracking-tight">{rota.tempo}</span>
          <span className="text-xl font-semibold">min</span>
          <span className="text-sm font-medium text-slate-500">· {rota.distancia}</span>
        </div>

        {/* Linhas envolvidas */}
        {rota.linhas && rota.linhas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {rota.linhas.map((linha, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#05053a] text-lime-300"
              >
                🚌 Linha {linha}
              </span>
            ))}
          </div>
        )}

        {/* Via / Endereço da rota escolhida */}
        <p className="text-sm text-[#05053a]/80 font-medium mb-4">
          {rota.via}
        </p>

        {/* Detalhes dos trechos da rota quando vindos do backend */}
        {trechos.length > 0 && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 mb-5 flex flex-col gap-3">
            <h4 className="text-xs font-bold text-[#05053a] uppercase tracking-wider">
              Itinerário do percurso
            </h4>

            {trechos.map((trecho, index) => (
              <div key={index} className="text-xs text-slate-700 flex flex-col gap-1 border-l-2 border-[#05053a] pl-3 py-1">
                <div className="flex items-center justify-between font-bold text-[#05053a]">
                  <span>🚌 Linha {trecho.linha} {trecho.nome_linha ? `· ${trecho.nome_linha}` : ''}</span>
                  {trecho.sentido && <span className="text-[11px] font-normal text-slate-500">({trecho.sentido})</span>}
                </div>

                <div className="mt-1 flex items-start justify-between">
                  <div>
                    <span className="font-semibold text-emerald-700">Embarque:</span> {trecho.embarque.nome}
                  </div>
                  {trecho.horario_saida && (
                    <span className="text-[11px] text-slate-500 shrink-0 ml-1">
                      {trecho.horario_saida.slice(0, 5)}
                    </span>
                  )}
                </div>

                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-semibold text-rose-700">Desembarque:</span> {trecho.desembarque.nome}
                  </div>
                  {trecho.horario_chegada && (
                    <span className="text-[11px] text-slate-500 shrink-0 ml-1">
                      {trecho.horario_chegada.slice(0, 5)}
                    </span>
                  )}
                </div>

                {trecho.paradas.length > 0 && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {trecho.paradas.length} paradas intermediárias
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex items-center gap-3">
          <button
            onClick={onCancelar}
            className="flex-1 py-3.5 px-4 rounded-full bg-[#c5dff0] text-[#05053a] font-semibold text-sm hover:brightness-95 transition-all cursor-pointer active:scale-95"
          >
            Mais tarde
          </button>
          <button
            onClick={() => alert(`Acompanhando percurso da linha ${rota.linhas?.join(', ') || rota.via}`)}
            className="flex-1 py-3.5 px-4 rounded-full bg-[#05053a] text-white font-semibold text-sm leading-tight hover:bg-[#08085a] transition-all cursor-pointer active:scale-95 shadow-md"
          >
            Acompanhar<br />Percurso
          </button>
        </div>
      </div>
    </div>
  );
}
