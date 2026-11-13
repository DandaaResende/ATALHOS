import { ArrowLeft, MapPin, ArrowUpDown, Search, Loader2, AlertCircle, LocateFixed } from 'lucide-react';
import { CampoBuscaLocal } from './CampoBuscaLocal';
import type { SugestaoLocal } from '../services/api';

interface CardSeuTrajetoProps {
  origemTexto: string;
  destinoTexto: string;
  origemLocal: SugestaoLocal | null;
  destinoLocal: SugestaoLocal | null;
  onChangeOrigemTexto: (valor: string) => void;
  onChangeDestinoTexto: (valor: string) => void;
  onSelecionarOrigem: (local: SugestaoLocal) => void;
  onSelecionarDestino: (local: SugestaoLocal) => void;
  onLimparOrigem: () => void;
  onLimparDestino: () => void;
  onInverter: () => void;
  onFechar: () => void;
  onPesquisar: () => void;
  onUsarLocalizacaoAtual?: () => void;
  carregandoLocalizacao?: boolean;
  carregandoRotas: boolean;
  mensagemValidacao?: string | null;
}

export function CardSeuTrajeto({
  origemTexto,
  destinoTexto,
  origemLocal,
  destinoLocal,
  onChangeOrigemTexto,
  onChangeDestinoTexto,
  onSelecionarOrigem,
  onSelecionarDestino,
  onLimparOrigem,
  onLimparDestino,
  onInverter,
  onFechar,
  onPesquisar,
  onUsarLocalizacaoAtual,
  carregandoLocalizacao = false,
  carregandoRotas,
  mensagemValidacao,
}: CardSeuTrajetoProps) {
  const prontoParaPesquisar = Boolean(
    (origemLocal || origemTexto.trim().length >= 3) &&
    (destinoLocal || destinoTexto.trim().length >= 3)
  );

  return (
    <div className="relative z-30 w-full max-w-md mx-auto p-4">
      <div className="w-full bg-white rounded-[28px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-5 transition-all">
        
        {/* Cabeçalho do Card */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={onFechar}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 text-[#05053a] transition-colors cursor-pointer"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-12 h-1 bg-[#05053a] rounded-full opacity-80"></div>
          <div className="w-5"></div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-[#05053a]">Seu trajeto</h2>

          {/* Botão de usar localização atual como origem */}
          {onUsarLocalizacaoAtual && (
            <button
              type="button"
              onClick={onUsarLocalizacaoAtual}
              disabled={carregandoLocalizacao}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 px-2.5 py-1 rounded-full transition-all cursor-pointer disabled:opacity-50"
              title="Preencher partida com sua localização GPS"
            >
              {carregandoLocalizacao ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              ) : (
                <LocateFixed className="w-3.5 h-3.5 text-blue-600" />
              )}
              <span>{carregandoLocalizacao ? 'Localizando...' : 'Minha localização'}</span>
            </button>
          )}
        </div>

        {/* Inputs de Origem e Destino com ícones e linha pontilhada */}
        <div className="relative flex items-center gap-3">
          <div className="absolute left-3 top-7 bottom-7 w-0.5 border-l-2 border-dotted border-[#05053a]"></div>

          <div className="flex flex-col justify-between h-24 py-1 z-10">
            <div className="w-6 h-6 rounded-full border-2 border-[#05053a] bg-white flex items-center justify-center shrink-0">
              <div className="w-2 h-2 rounded-full bg-[#05053a]"></div>
            </div>
            <div className="w-6 h-6 rounded-full border-2 border-[#05053a] bg-[#05053a] flex items-center justify-center shrink-0">
              <MapPin className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-3 min-w-0">
            {/* Campo 1: Origem */}
            <div className="border-b border-slate-200 pb-2">
              <CampoBuscaLocal
                autoFocus
                placeholder="De onde você vai sair?"
                valor={origemTexto}
                localSelecionado={origemLocal}
                onChangeTexto={onChangeOrigemTexto}
                onSelecionarLocal={onSelecionarOrigem}
                onLimpar={onLimparOrigem}
                onEnter={onPesquisar}
              />
            </div>

            {/* Campo 2: Destino */}
            <div className="pt-1">
              <CampoBuscaLocal
                placeholder="Para onde deseja ir?"
                valor={destinoTexto}
                localSelecionado={destinoLocal}
                onChangeTexto={onChangeDestinoTexto}
                onSelecionarLocal={onSelecionarDestino}
                onLimpar={onLimparDestino}
                onEnter={onPesquisar}
              />
            </div>
          </div>

          {/* Botão de Inverter */}
          <button
            type="button"
            onClick={onInverter}
            className="p-2 rounded-full hover:bg-slate-100 text-[#05053a] transition-colors active:scale-90 cursor-pointer shrink-0"
            title="Inverter partida e destino"
          >
            <ArrowUpDown className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagem de validação de locais se houver */}
        {mensagemValidacao && (
          <div className="mt-3 flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <p className="font-medium leading-tight">{mensagemValidacao}</p>
          </div>
        )}

        {/* Botão de Ação: Pesquisar Rotas */}
        <div className="mt-4 pt-1">
          <button
            type="button"
            onClick={onPesquisar}
            disabled={carregandoRotas}
            className={`w-full py-3 px-4 rounded-full font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-[0.98] ${
              prontoParaPesquisar
                ? 'bg-[#05053a] text-lime-300 hover:bg-[#090956]'
                : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
            }`}
          >
            {carregandoRotas ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-lime-300" />
                <span>Buscando rotas de transporte...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Pesquisar rotas</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
