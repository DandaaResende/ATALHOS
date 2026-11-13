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
  return (
    <div className="relative z-20 w-full max-w-md mx-auto">
      <div className="w-full bg-white rounded-t-[28px] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] p-6 transition-all">
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
        <div className="flex items-baseline gap-0.5 text-[#05053a] my-1">
          <span className="text-4xl font-extrabold tracking-tight">{rota.tempo}</span>
          <span className="text-xl font-semibold">min</span>
        </div>

        {/* Via / Endereço da rota escolhida */}
        <p className="text-sm text-[#05053a]/80 font-medium mb-6">
          {rota.via}
        </p>

        {/* Botões de Ação */}
        <div className="flex items-center gap-3">
          <button
            onClick={onCancelar}
            className="flex-1 py-3.5 px-4 rounded-full bg-[#c5dff0] text-[#05053a] font-semibold text-sm hover:brightness-95 transition-all cursor-pointer active:scale-95"
          >
            Mais tarde
          </button>
          <button
            onClick={() => alert(`Iniciando percurso: ${rota.via}`)}
            className="flex-1 py-3.5 px-4 rounded-full bg-[#05053a] text-white font-semibold text-sm leading-tight hover:bg-[#08085a] transition-all cursor-pointer active:scale-95 shadow-md"
          >
            Acompanhar<br />Percurso
          </button>
        </div>
      </div>
    </div>
  );
}