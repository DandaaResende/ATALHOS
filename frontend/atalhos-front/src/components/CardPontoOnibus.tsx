import { useState } from 'react';
import { Star, Snowflake, X, Navigation } from 'lucide-react';
import type { ParadaComOnibus, OnibusParada } from '../types/parada';
import { alternarFavoritoParada } from '../services/paradasService';

interface CardPontoOnibusProps {
  parada: ParadaComOnibus;
  onFechar: () => void;
  onClicarInfo: (onibus: OnibusParada) => void;
  onTracadoRota?: (parada: ParadaComOnibus) => void;
}

export function CardPontoOnibus({
  parada,
  onFechar,
  onClicarInfo,
  onTracadoRota,
}: CardPontoOnibusProps) {
  const [favorito, setFavorito] = useState(parada.favorito || false);

  const handleToggleFavorito = () => {
    const novo = alternarFavoritoParada(parada.id);
    setFavorito(novo);
  };

  const distanciaTexto =
    parada.distanciaMetros !== undefined
      ? `${parada.distanciaMetros} metros`
      : '92 metros';

  const tempoTexto =
    parada.tempoCaminhadaMin !== undefined
      ? `${parada.tempoCaminhadaMin} min`
      : '1 min';

  return (
    <aside
      aria-label="Informações da Parada de Ônibus"
      className="w-full max-w-md mx-auto bg-[#f8fbff] text-[#05053a] rounded-t-[32px] sm:rounded-[32px] shadow-2xl border-t sm:border border-indigo-100 p-5 pb-7 flex flex-col gap-4 animate-slide-up pointer-events-auto select-none"
    >
      {/* Barra superior de arraste / indicador de drawer */}
      <div className="w-16 h-1 bg-[#151558] rounded-full mx-auto -mt-1 opacity-80" />

      {/* Cabeçalho da parada */}
      <header className="flex items-start justify-between gap-3 pt-1">
        <div>
          <h2 className="text-xl font-bold text-[#0c0c4f] tracking-tight leading-snug">
            {parada.nome}
          </h2>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">
            {distanciaTexto} · {tempoTexto}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleToggleFavorito}
            title={favorito ? 'Remover dos favoritos' : 'Salvar como favorita'}
            aria-label={favorito ? 'Remover dos favoritos' : 'Salvar como favorita'}
            className="p-1.5 rounded-full hover:bg-slate-100 active:scale-90 transition-all cursor-pointer text-[#0c0c4f]"
          >
            <Star
              className={`w-6 h-6 ${
                favorito
                  ? 'fill-amber-400 text-amber-500'
                  : 'text-[#0c0c4f] hover:text-amber-500'
              }`}
            />
          </button>

          <button
            type="button"
            onClick={onFechar}
            title="Fechar detalhes da parada"
            aria-label="Fechar detalhes da parada"
            className="p-1.5 rounded-full hover:bg-slate-100 active:scale-90 transition-all cursor-pointer text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Lista de ônibus que passam nesta parada */}
      <div className="flex flex-col divide-y divide-indigo-100/70 max-h-[50vh] overflow-y-auto pr-1">
        {parada.onibus.map((onibus) => (
          <article
            key={onibus.id}
            className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
          >
            {/* Bloco esquerdo: número da linha, ícone (i), opcionais e nome */}
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2">
                {/* Badge com o número da linha */}
                <span className="bg-[#05053a] text-lime-300 font-extrabold text-xs px-3 py-1 rounded-full shadow-sm tracking-wide shrink-0">
                  {onibus.linha}
                </span>

                {/* Botão de informações (i) que abre a Tela do Ônibus */}
                <button
                  type="button"
                  onClick={() => onClicarInfo(onibus)}
                  title={`Informações e avaliação da linha ${onibus.linha} - ${onibus.nomeLinha}`}
                  aria-label={`Informações e avaliação da linha ${onibus.linha}`}
                  className="w-5 h-5 rounded-full border-[1.5px] border-[#0c0c4f] text-[#0c0c4f] flex items-center justify-center text-xs font-bold hover:bg-indigo-100/60 active:scale-95 transition-transform cursor-pointer shrink-0"
                >
                  i
                </button>

                {/* Ícones de comodidade: ar-condicionado e acessibilidade */}
                {onibus.arCondicionado && (
                  <span title="Ônibus com ar-condicionado" className="flex items-center">
                    <Snowflake className="w-4 h-4 text-[#0c0c4f] shrink-0" aria-hidden="true" />
                  </span>
                )}

                {onibus.acessivel && (
                  <span title="Acessível para cadeirantes" className="flex items-center">
                    <svg
                      className="w-4 h-4 text-[#0c0c4f] shrink-0"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-1 6a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h3.15l-1.4 2.8A4.99 4.99 0 0 1 7 21a1 1 0 1 0 0 2 7 7 0 0 0 6.13-3.61l1.64-3.28A2 2 0 0 0 13.9 14H11v-4h4a1 1 0 0 0 .9-.55l1.5-3a1 1 0 1 0-1.8-.9L14.4 7H11z" />
                    </svg>
                  </span>
                )}
              </div>

              {/* Nome do itinerário / sentido da linha */}
              <h3 className="text-sm font-semibold text-[#0c0c4f] truncate">
                {onibus.nomeLinha}
              </h3>
            </div>

            {/* Bloco direito: tempo estimado de chegada */}
            <div className="flex flex-col items-center justify-center shrink-0 min-w-12 text-right">
              <span className="text-2xl font-bold text-[#0c0c4f] leading-none">
                {onibus.tempoMinutos}
              </span>
              <span className="text-xs font-semibold text-[#0c0c4f] mt-0.5">
                min
              </span>
            </div>
          </article>
        ))}
      </div>

      {/* Ação rápida para traçar rota a partir desta parada */}
      {onTracadoRota && (
        <button
          type="button"
          onClick={() => onTracadoRota(parada)}
          className="w-full mt-1 py-2 px-4 rounded-xl bg-indigo-50/70 hover:bg-indigo-100/70 text-[#0c0c4f] text-xs font-bold flex items-center justify-center gap-2 border border-indigo-100 transition-colors cursor-pointer"
        >
          <Navigation className="w-3.5 h-3.5 text-indigo-700" />
          <span>Planejar viagem saindo desta parada</span>
        </button>
      )}
    </aside>
  );
}
