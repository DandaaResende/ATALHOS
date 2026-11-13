import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { LocateFixed, Loader2 } from 'lucide-react';
import type { OpcaoRota } from './CardMaisRotas';
import type { Coordenadas } from '../hooks/useGeolocalizacao';

interface PontoCoordenada {
  latitude: number;
  longitude: number;
  nome: string;
}

interface MapaInterativoProps {
  posicaoUsuario: Coordenadas | null;
  pontoOrigem: PontoCoordenada | null;
  pontoDestino: PontoCoordenada | null;
  rotaSelecionada: OpcaoRota | null;
  onLocalizarUsuario: () => void;
  carregandoLocalizacao: boolean;
  seguindoUsuario?: boolean;
  onUsuarioArrastouMapa?: () => void;
  modoAcompanhamento?: boolean;
  className?: string;
}

/**
 * Cria ou atualiza o ícone do usuário, suportando direção (heading) de deslocamento
 */
function criarIconeUsuario(direcao?: number | null) {
  if (direcao !== null && direcao !== undefined && !Number.isNaN(direcao)) {
    return L.divIcon({
      className: 'custom-user-marker-nav',
      html: `
        <div class="relative flex items-center justify-center w-8 h-8 transition-transform duration-300" style="transform: rotate(${direcao}deg);">
          <div class="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xl border-2 border-white">
            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }

  return L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div class="relative flex items-center justify-center w-6 h-6">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white shadow-lg"></span>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

const iconeOrigem = L.divIcon({
  className: 'custom-origin-marker',
  html: `
    <div class="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xl border-2 border-white transform -translate-x-1/2 -translate-y-full hover:scale-110 transition-transform">
      <div class="w-2.5 h-2.5 rounded-full bg-white"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const iconeDestino = L.divIcon({
  className: 'custom-destination-marker',
  html: `
    <div class="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xl border-2 border-white transform -translate-x-1/2 -translate-y-full hover:scale-110 transition-transform">
      <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const iconeParada = L.divIcon({
  className: 'custom-stop-marker',
  html: `
    <div class="w-4 h-4 rounded-full bg-white border-2 border-[#05053a] flex items-center justify-center shadow-sm">
      <div class="w-1.5 h-1.5 rounded-full bg-[#05053a]"></div>
    </div>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8],
});

export function MapaInterativo({
  posicaoUsuario,
  pontoOrigem,
  pontoDestino,
  rotaSelecionada,
  onLocalizarUsuario,
  carregandoLocalizacao,
  seguindoUsuario = false,
  onUsuarioArrastouMapa,
  modoAcompanhamento = false,
  className = '',
}: MapaInterativoProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Grupos de camadas para facilitar limpeza e atualização
  const camadaUsuarioRef = useRef<L.LayerGroup>(L.layerGroup());
  const camadaPontosRef = useRef<L.LayerGroup>(L.layerGroup());
  const camadaRotaRef = useRef<L.LayerGroup>(L.layerGroup());

  // Referência única do marcador e do círculo do usuário para evitar duplicidade
  const marcadorUsuarioRef = useRef<L.Marker | null>(null);
  const circuloPrecisaoRef = useRef<L.Circle | null>(null);

  // Inicialização do mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Posição inicial: Centro do Recife
    const latPadrao = -8.0539;
    const lngPadrao = -34.8811;

    const mapa = L.map(mapContainerRef.current, {
      center: [latPadrao, lngPadrao],
      zoom: 13,
      zoomControl: false,
    });

    // Camada de tiles gratuita do OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(mapa);

    // Reposiciona o controle de zoom
    L.control.zoom({ position: 'bottomright' }).addTo(mapa);

    // Adiciona as camadas ao mapa
    camadaUsuarioRef.current.addTo(mapa);
    camadaPontosRef.current.addTo(mapa);
    camadaRotaRef.current.addTo(mapa);

    // Detecta quando o usuário arrasta manualmente o mapa para desligar o auto-follow
    mapa.on('dragstart', () => {
      if (onUsuarioArrastouMapa) {
        onUsuarioArrastouMapa();
      }
    });

    mapInstanceRef.current = mapa;

    setTimeout(() => {
      mapa.invalidateSize();
    }, 250);

    return () => {
      mapa.remove();
      mapInstanceRef.current = null;
    };
  }, [onUsuarioArrastouMapa]);

  // 1. Atualização do marcador do usuário em tempo real (sem criar duplicatas!)
  useEffect(() => {
    if (!posicaoUsuario || !mapInstanceRef.current) return;

    const latLng: [number, number] = [posicaoUsuario.latitude, posicaoUsuario.longitude];
    const precisao = posicaoUsuario.precisao || 30;

    // Atualiza ou cria o círculo de precisão
    if (circuloPrecisaoRef.current) {
      circuloPrecisaoRef.current.setLatLng(latLng);
      circuloPrecisaoRef.current.setRadius(Math.min(precisao, 500));
    } else {
      circuloPrecisaoRef.current = L.circle(latLng, {
        radius: Math.min(precisao, 500),
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.12,
        weight: 1,
      }).addTo(camadaUsuarioRef.current);
    }

    // Atualiza ou cria o marcador do usuário
    const novoIcone = criarIconeUsuario(posicaoUsuario.direcao);

    if (marcadorUsuarioRef.current) {
      marcadorUsuarioRef.current.setLatLng(latLng);
      marcadorUsuarioRef.current.setIcon(novoIcone);
    } else {
      marcadorUsuarioRef.current = L.marker(latLng, { icon: novoIcone }).addTo(
        camadaUsuarioRef.current
      );
      marcadorUsuarioRef.current.bindPopup(
        '<b>Sua localização atual</b><br><span class="text-xs text-slate-500">Rastreamento GPS em tempo real</span>'
      );
    }

    // Se estiver em modo de acompanhamento ativo e o usuário escolheu seguir:
    if (modoAcompanhamento && seguindoUsuario) {
      mapInstanceRef.current.panTo(latLng, { animate: true, duration: 1 });
    } else if (!pontoOrigem && !pontoDestino && !rotaSelecionada) {
      // Primeira captura quando o mapa ainda está vazio
      mapInstanceRef.current.setView(latLng, 15, { animate: true });
    }
  }, [posicaoUsuario, modoAcompanhamento, seguindoUsuario, pontoOrigem, pontoDestino, rotaSelecionada]);

  // 2. Atualização dos marcadores de Origem e Destino
  useEffect(() => {
    const camada = camadaPontosRef.current;
    camada.clearLayers();

    if (!mapInstanceRef.current) return;

    const limites: [number, number][] = [];

    if (pontoOrigem) {
      const coord: [number, number] = [pontoOrigem.latitude, pontoOrigem.longitude];
      limites.push(coord);
      const marcador = L.marker(coord, { icon: iconeOrigem }).addTo(camada);
      marcador.bindPopup(`<b>Ponto de Partida:</b><br>${pontoOrigem.nome}`);
    }

    if (pontoDestino) {
      const coord: [number, number] = [pontoDestino.latitude, pontoDestino.longitude];
      limites.push(coord);
      const marcador = L.marker(coord, { icon: iconeDestino }).addTo(camada);
      marcador.bindPopup(`<b>Destino:</b><br>${pontoDestino.nome}`);
    }

    // Se ambos os pontos estiverem definidos e não estiver em navegação ativa, enquadra
    if (limites.length >= 2 && !rotaSelecionada && !modoAcompanhamento) {
      const bounds = L.latLngBounds(limites);
      mapInstanceRef.current.fitBounds(bounds, {
        padding: [80, 80],
        maxZoom: 15,
        animate: true,
      });
    } else if (limites.length === 1 && !rotaSelecionada && !modoAcompanhamento) {
      mapInstanceRef.current.setView(limites[0], 15, { animate: true });
    }
  }, [pontoOrigem, pontoDestino, rotaSelecionada, modoAcompanhamento]);

  // 3. Desenho da Rota e Paradas no Mapa
  useEffect(() => {
    const camada = camadaRotaRef.current;
    camada.clearLayers();

    if (!mapInstanceRef.current || !rotaSelecionada?.detalhes) return;

    const trechos = rotaSelecionada.detalhes.trechos || [];
    const coordenadasTotais: [number, number][] = [];

    trechos.forEach((trecho) => {
      const pontosTrecho: [number, number][] = (trecho.coordenadas || []).map((pt) => [
        pt.latitude,
        pt.longitude,
      ]);

      if (pontosTrecho.length > 0) {
        L.polyline(pontosTrecho, {
          color: '#05053a',
          weight: 5,
          opacity: 0.85,
          lineJoin: 'round',
        }).addTo(camada);

        coordenadasTotais.push(...pontosTrecho);
      }

      (trecho.paradas || []).forEach((parada) => {
        const coordParada: [number, number] = [parada.latitude, parada.longitude];
        coordenadasTotais.push(coordParada);

        const marcadorP = L.marker(coordParada, { icon: iconeParada }).addTo(camada);
        marcadorP.bindPopup(`
          <div class="text-xs">
            <span class="font-bold text-[#05053a]">Linha ${trecho.linha}</span><br>
            <b>Parada ${parada.ordem}:</b> ${parada.nome}
            ${parada.horario_chegada ? `<br><span class="text-slate-500">Horário: ${parada.horario_chegada.slice(0, 5)}</span>` : ''}
          </div>
        `);
      });
    });

    if (coordenadasTotais.length > 0 && !modoAcompanhamento) {
      const bounds = L.latLngBounds(coordenadasTotais);
      mapInstanceRef.current.fitBounds(bounds, {
        padding: [70, 70],
        maxZoom: 16,
        animate: true,
      });
    }
  }, [rotaSelecionada, modoAcompanhamento]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Container Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Botão Flutuante de Centralização / Localização Atual */}
      {!modoAcompanhamento && (
        <div className="absolute right-4 bottom-24 z-20">
          <button
            type="button"
            onClick={onLocalizarUsuario}
            disabled={carregandoLocalizacao}
            className="w-12 h-12 rounded-full bg-white text-[#05053a] shadow-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
            title="Minha localização atual"
          >
            {carregandoLocalizacao ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : (
              <LocateFixed className="w-5 h-5 text-blue-600" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
