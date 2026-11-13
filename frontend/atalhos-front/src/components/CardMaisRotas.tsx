export interface OpcaoRota {
  id: number;
  tempo: number;
  distancia: string;
  via: string;
}

interface CardMaisRotasProps {
  rotas: OpcaoRota[];
  carregando: boolean;
  onSelecionarRota: (rota: OpcaoRota) => void;
}

export function CardMaisRotas({ rotas, carregando, onSelecionarRota }: CardMaisRotasProps) {
  return (
    <div className="relative z-20 w-full max-w-md mx-auto">
      <div className="w-full bg-white rounded-t-[28px] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] p-6 transition-all">
        {carregando ? (
          <div className="animate-pulse flex flex-col gap-4 py-2">
            <div className="h-6 w-32 bg-slate-200 rounded-md"></div>
            <div className="h-16 w-full bg-slate-200 rounded-xl"></div>
            <div className="h-16 w-full bg-slate-200 rounded-xl"></div>
          </div>
        ) : (
          <div>
            <h3 className="text-xl font-bold text-[#05053a] mb-4">Mais Rotas</h3>

            <div className="divide-y divide-slate-200/80">
              {rotas.map((rota) => (
                <div
                  key={rota.id}
                  className="py-4 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-baseline gap-1 text-[#05053a]">
                      <span className="text-3xl font-extrabold tracking-tight">
                        {rota.tempo}
                      </span>
                      <span className="text-base font-semibold">
                        min · {rota.distancia}
                      </span>
                    </div>
                    <p className="text-sm text-[#05053a]/80 font-medium mt-0.5">
                      {rota.via}
                    </p>
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