import { useMemo } from 'react';
import {
  Navigation,
  Pause,
  Play,
  Square,
  LocateFixed,
  MapPin,
  Clock,
  Radio,
  AlertTriangle,
} from 'lucide-react';
import type { OpcaoRota } from './CardMaisRotas';
import type { Coordenadas, StatusRastreamento } from '../hooks/useGeolocalizacao';
import {
  calcularDistanciaMetros,
  formatarDistancia,
  encontrarProximaParada,
} from '../utils/geo';

interface CardAcompanhamentoProps {
  rota: OpcaoRota;
  posicaoUsuario: Coordenadas | null;
  statusRastreamento: StatusRastreamento;
  destinoNome: string;
  destinoCoordenadas?: { latitude: number; longitude: number } | null;
  onPausar: () => void;
  onRetomar: () => void;
  onEncerrar: () => void;
  onCentralizar: () => void;
  seguindoUsuario: boolean;
}

export function CardAcompanhamento({
  rota,
  posicaoUsuario,
  statusRastreamento,
  destinoNome,
  destinoCoordenadas,
  onPausar,
  onRetomar,
  onEncerrar,
  onCentralizar,
  seguindoUsuario,
}: CardAcompanhamentoProps) {
  // 1. Distância restante até o destino
  const distanciaRestante = useMemo(() => {
    if (!posicaoUsuario || !destinoCoordenadas) return null;
    const metros = calcularDistanciaMetros(
      posicaoUsuario.latitude,
      posicaoUsuario.longitude,
      destinoCoordenadas.latitude,
      destinoCoordenadas.longitude
    );
    return formatarDistancia(metros);
  }, [posicaoUsuario, destinoCoordenadas]);

  // 2. Próxima parada do trajeto
  const proximaParadaInfo = useMemo(() => {
    if (!posicaoUsuario || !rota.detalhes?.trechos) return null;
    return encontrarProximaParada(
      posicaoUsuario.latitude,
      posicaoUsuario.longitude,
      rota.detalhes.trechos
    );
  }, [posicaoUsuario, rota]);

  return (
    <div className="relative z-30 w-full max-w-md mx-auto p-4">
      <div className="w-full bg-white rounded-[28px] shadow-[0_8px_35px_rgba(0,0,0,0.18)] p-5 border border-slate-100 flex flex-col gap-4 animate-in slide-in-from-bottom-6 duration-200">
        
        {/* Barra superior de status do GPS e botão de centralizar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {statusRastreamento === 'rastreando' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                Em acompanhamento
              </span>
            )}
            {statusRastreamento === 'pausado' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                <Pause className="w-3 h-3" />
                Acompanhamento pausado
              </span>
            )}
            {statusRastreamento === 'aguardando_sinal' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                <Radio className="w-3 h-3 animate-spin" />
                Buscando sinal GPS...
              </span>
            )}

            {posicaoUsuario?.precisao && (
              <span className="text-[11px] text-slate-400 font-medium">
                ±{Math.round(posicaoUsuario.precisao)}m
              </span>
            )}
          </div>

          {/* Botão de recentralizar */}
          <button
            type="button"
            onClick={onCentralizar}
            className={`p-2 rounded-full border transition-all cursor-pointer ${
              seguindoUsuario
                ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
            }`}
            title={seguindoUsuario ? 'Mapa acompanhando você' : 'Centralizar mapa na sua posição'}
          >
            <LocateFixed className="w-4 h-4" />
          </button>
        </div>

        {/* Informação principal: Distância até o destino e tempo estimado */}
        <div className="flex items-baseline justify-between border-b border-slate-100 pb-3">
          <div>
            <p className="text-xs text-slate-400 font-medium">Destino</p>
            <h3 className="text-base font-extrabold text-[#05053a] truncate max-w-[220px]">
              {destinoNome}
            </h3>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-[#05053a]">
              {distanciaRestante || `${rota.tempo} min`}
            </span>
            {distanciaRestante && (
              <p className="text-xs text-slate-400 font-medium">restante</p>
            )}
          </div>
        </div>

        {/* Informação da próxima parada ou ponto de referência */}
        {proximaParadaInfo ? (
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#05053a] text-lime-300 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
              <Navigation className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Próxima Parada
              </span>
              <p className="text-xs font-bold text-[#05053a] truncate">
                {proximaParadaInfo.parada.nome}
              </p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                a {formatarDistancia(proximaParadaInfo.distanciaMetros)} de você
                {proximaParadaInfo.linha ? ` · Linha ${proximaParadaInfo.linha}` : ''}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 flex items-center gap-2 text-xs text-slate-600 font-medium">
            <MapPin className="w-4 h-4 text-[#05053a] shrink-0" />
            <span className="truncate">Siga o traçado demarcado no mapa até seu destino.</span>
          </div>
        )}

        {/* Linhas e orientações da rota */}
        {rota.linhas && rota.linhas.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-semibold">Linhas:</span>
            {rota.linhas.map((linha, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-[#05053a] text-lime-300 font-bold text-xs"
              >
                🚌 {linha}
              </span>
            ))}
          </div>
        )}

        {/* Controles de Ação do Acompanhamento */}
        <div className="flex items-center gap-2 pt-1">
          {statusRastreamento === 'rastreando' ? (
            <button
              type="button"
              onClick={onPausar}
              className="flex-1 py-3 px-4 rounded-full bg-slate-100 hover:bg-slate-200 text-[#05053a] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Pause className="w-4 h-4 text-amber-600" />
              <span>Pausar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onRetomar}
              className="flex-1 py-3 px-4 rounded-full bg-[#05053a] hover:bg-[#08085a] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md"
            >
              <Play className="w-4 h-4 text-lime-300" />
              <span>Retomar</span>
            </button>
          )}

          <button
            type="button"
            onClick={onEncerrar}
            className="flex-1 py-3 px-4 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <Square className="w-3.5 h-3.5 fill-rose-700" />
            <span>Encerrar</span>
          </button>
        </div>

      </div>
    </div>
  );
}
