import { ArrowLeft, MapPin, ArrowUpDown } from 'lucide-react';

interface CardSeuTrajetoProps {
  origem: string;
  destino: string;
  onChangeOrigem: (valor: string) => void;
  onChangeDestino: (valor: string) => void;
  onInverter: () => void;
  onFechar: () => void;
}

export function CardSeuTrajeto({
  origem,
  destino,
  onChangeOrigem,
  onChangeDestino,
  onInverter,
  onFechar,
}: CardSeuTrajetoProps) {
  return (
    <div className="relative z-20 w-full max-w-md mx-auto p-4">
      <div className="w-full bg-white rounded-[28px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-5 transition-all">
        
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onFechar}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 text-[#05053a] transition-colors cursor-pointer"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-12 h-1 bg-[#05053a] rounded-full opacity-80"></div>
          <div className="w-5"></div>
        </div>

        <h2 className="text-xl font-bold text-[#05053a] mb-4">Seu trajeto</h2>

        <div className="relative flex items-center gap-3">
          <div className="absolute left-3 top-7 bottom-7 w-0.5 border-l-2 border-dotted border-[#05053a]"></div>

          <div className="flex flex-col justify-between h-24 py-1 z-10">
            <div className="w-6 h-6 rounded-full border-2 border-[#05053a] bg-white flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#05053a]"></div>
            </div>
            <div className="w-6 h-6 rounded-full border-2 border-[#05053a] bg-[#05053a] flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-3">
            <div className="border-b border-slate-200 pb-2">
              <input
                type="text"
                autoFocus
                value={origem}
                onChange={(e) => onChangeOrigem(e.target.value)}
                placeholder="Digite seu local de partida"
                className="w-full bg-transparent border-none outline-none text-sm text-[#05053a] placeholder-[#05053a]/50 font-medium"
              />
            </div>
            <div className="pt-1">
              <input
                type="text"
                value={destino}
                onChange={(e) => onChangeDestino(e.target.value)}
                placeholder="Digite seu local de destino"
                className="w-full bg-transparent border-none outline-none text-sm text-[#05053a] placeholder-[#05053a]/50 font-medium"
              />
            </div>
          </div>

          <button
            onClick={onInverter}
            className="p-2 rounded-full hover:bg-slate-100 text-[#05053a] transition-colors active:scale-90 cursor-pointer"
            title="Inverter partida e destino"
          >
            <ArrowUpDown className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}