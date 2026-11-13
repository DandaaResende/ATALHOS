import type { OpcaoRotaBackend } from '../services/api';

export interface OpcaoRota {
  id: number | string;
  tempo: number;
  distancia: string;
  via: string;
  linhas?: string[];
  horarioSaida?: string;
  horarioChegada?: string;
  detalhes?: OpcaoRotaBackend;
}

interface CardMaisRotasProps {
  rotas: OpcaoRota[];
  carregando: boolean;
  mensagemErro?: string | null;
  onSelecionarRota: (rota: OpcaoRota) => void;
}

export function CardMaisRotas({ rotas, carregando, mensagemErro, onSelecionarRota }: CardMaisRotasProps) {
  return (
    <div className="relative z-20 w-full max-w-md mx-auto pointer-events-none">
      <div className="w-full bg-white rounded-t-[28px] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] p-6 transition-all max-h-[60vh] overflow-y-auto pointer-events-auto">
        {carregando ? (
          <div className="animate-pulse flex flex-col gap-4 py-2">
            <div className="h-6 w-32 bg-slate-200 rounded-md"></div>
            <div className="h-16 w-full bg-slate-200 rounded-xl"></div>
            <div className="h-16 w-full bg-slate-200 rounded-xl"></div>
          </div>
        ) : mensagemErro ? (
          <div className="py-4 text-center">
            <h3 className="text-lg font-bold text-[#05053a] mb-2">Não foi possível buscar a rota</h3>
            <p className="text-sm text-rose-600 font-medium">{mensagemErro}</p>
          </div>
        ) : rotas.length === 0 ? (
          <div className="py-4 text-center">
            <h3 className="text-lg font-bold text-[#05053a] mb-2">Nenhuma rota encontrada</h3>
            <p className="text-sm text-slate-500">
              Não encontramos linhas ativas entre esses pontos no horário selecionado. Tente ajustar os locais de partida ou destino.
            </p>
          </div>
        ) : (
          <div>
            <h3 className="text-xl font-bold text-[#05053a] mb-4">Opções de Rotas</h3>

            <div className="divide-y divide-slate-200/80">
              {rotas.map((rota) => (
                <div
                  key={rota.id}
                  className="py-4 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-baseline gap-1 text-[#05053a]">
                      <span className="text-3xl font-extrabold tracking-tight">
                        {rota.tempo}
                      </span>
                      <span className="text-base font-semibold">
                        min · {rota.distancia}
                      </span>
                    </div>

                    {/* Exibe badges das linhas de ônibus se existirem */}
                    {rota.linhas && rota.linhas.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {rota.linhas.map((linha, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-[#05053a] text-lime-300"
                          >
                            🚌 {linha}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-sm text-[#05053a]/80 font-medium mt-1">
                      {rota.via}
                    </p>

                    {rota.horarioSaida && rota.horarioChegada && (
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">
                        Saída: {rota.horarioSaida.slice(0, 5)} · Chegada: {rota.horarioChegada.slice(0, 5)}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => onSelecionarRota(rota)}
                    className="px-4 py-2 rounded-full bg-[#c5dff0] text-[#05053a] text-xs font-semibold hover:brightness-95 transition-all cursor-pointer active:scale-95 shrink-0"
                  >
                    Escolher rota
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
