import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { LocateFixed, Loader2 } from 'lucide-react';
import type { OpcaoRota } from './CardMaisRotas';
import type { Coordenadas } from '../hooks/useGeolocalizacao';
import type { ParadaComOnibus } from '../types/parada';
import type { TrechoRota } from '../services/api';
import { calcularDistanciaMetros } from '../utils/geo';

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
  paradas?: ParadaComOnibus[];
  paradaSelecionada?: ParadaComOnibus | null;
  onSelecionarParada?: (parada: ParadaComOnibus) => void;
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
    <div class="w-3.5 h-3.5 rounded-full bg-white border-2 border-[#05053a] flex items-center justify-center shadow-sm hover:scale-125 transition-transform">
      <div class="w-1.5 h-1.5 rounded-full bg-[#05053a]"></div>
    </div>
  `,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -7],
});

/**
 * Cria o marcador visual do ponto/parada de ônibus no mapa interativo
 */
function criarIconeParadaOnibus(selecionada = false) {
  return L.divIcon({
    className: 'custom-bus-stop-pin',
    html: `
      <div class="relative flex flex-col items-center cursor-pointer transition-transform duration-200 ${
        selecionada ? 'scale-125 z-50' : 'hover:scale-110'
      }">
        <div class="w-8 h-8 rounded-full ${
          selecionada
            ? 'bg-[#05053a] ring-4 ring-lime-400 shadow-2xl'
            : 'bg-[#05053a] hover:bg-[#0c0c5c] shadow-lg'
        } text-lime-300 flex items-center justify-center border-2 border-white transition-all">
          <svg class="w-4 h-4 text-lime-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 6v6"/>
            <path d="M15 6v6"/>
            <path d="M2 12h19.6"/>
            <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5c-.3-1-1.1-1.8-2.2-1.8H5.8c-1.1 0-1.9.8-2.2 1.8l-1.4 5c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"/>
            <circle cx="7" cy="18" r="2"/>
            <path d="M9 18h5"/>
            <circle cx="16" cy="18" r="2"/>
          </svg>
        </div>
        <div class="w-2 h-2 ${
          selecionada ? 'bg-lime-400' : 'bg-[#05053a]'
        } transform rotate-45 -mt-1 border-r border-b border-white shadow-sm"></div>
      </div>
    `,
    iconSize: [32, 38],
    iconAnchor: [16, 36],
    popupAnchor: [0, -36],
  });
}

function criarIconeEmbarque(linha: string) {
  return L.divIcon({
    className: 'custom-board-marker',
    html: `
      <div class="flex items-center gap-1 bg-[#05053a] text-lime-300 font-bold px-2.5 py-1 rounded-full shadow-xl border-2 border-white text-[11px] whitespace-nowrap transform -translate-x-1/2 -translate-y-full hover:scale-105 transition-transform">
        <svg class="w-3 h-3 text-lime-300 shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
        </svg>
        <span>Embarque ${linha}</span>
      </div>
    `,
    iconSize: [85, 26],
    iconAnchor: [42, 26],
    popupAnchor: [0, -26],
  });
}

function criarIconeDesembarque(linha: string) {
  return L.divIcon({
    className: 'custom-alight-marker',
    html: `
      <div class="flex items-center gap-1 bg-amber-600 text-white font-bold px-2.5 py-1 rounded-full shadow-xl border-2 border-white text-[11px] whitespace-nowrap transform -translate-x-1/2 -translate-y-full hover:scale-105 transition-transform">
        <svg class="w-3 h-3 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
        </svg>
        <span>Desembarque ${linha}</span>
      </div>
    `,
    iconSize: [95, 26],
    iconAnchor: [47, 26],
    popupAnchor: [0, -26],
  });
}

/**
 * Obtém estritamente as coordenadas do trecho percorrido pelo usuário a bordo do ônibus
 * (entre o embarque e o desembarque), evitando desenhar o trajeto completo da linha inteira.
 */
function obterPontosTrechoViagem(trecho: TrechoRota): [number, number][] {
  const coordEmbarque: [number, number] = [trecho.embarque.latitude, trecho.embarque.longitude];
  const coordDesembarque: [number, number] = [trecho.desembarque.latitude, trecho.desembarque.longitude];

  // Se houver coordenadas de shape, recorta os pontos entre o embarque e o desembarque
  if (trecho.coordenadas && trecho.coordenadas.length > 0) {
    const pontosShape = trecho.coordenadas;
    const distSq = (p: { latitude: number; longitude: number }, lat: number, lng: number) =>
      (p.latitude - lat) ** 2 + (p.longitude - lng) ** 2;

    let idxEmb = 0;
    let menorDistEmb = Infinity;
    let idxDes = 0;
    let menorDistDes = Infinity;

    for (let i = 0; i < pontosShape.length; i++) {
      const dEmb = distSq(pontosShape[i], coordEmbarque[0], coordEmbarque[1]);
      if (dEmb < menorDistEmb) {
        menorDistEmb = dEmb;
        idxEmb = i;
      }
      const dDes = distSq(pontosShape[i], coordDesembarque[0], coordDesembarque[1]);
      if (dDes < menorDistDes) {
        menorDistDes = dDes;
        idxDes = i;
      }
    }

    if (idxEmb < idxDes) {
      const pontosRecortados: [number, number][] = pontosShape
        .slice(idxEmb, idxDes + 1)
        .map((pt) => [pt.latitude, pt.longitude]);

      return [coordEmbarque, ...pontosRecortados, coordDesembarque];
    }
  }

  // Fallback direto: sequência ordenada de paradas do trajeto do usuário
  const pontosParadas: [number, number][] = [
    coordEmbarque,
    ...(trecho.paradas || []).map((p): [number, number] => [p.latitude, p.longitude]),
    coordDesembarque,
  ];

  return pontosParadas.filter((pt, index, arr) => {
    if (index === 0) return true;
    const ant = arr[index - 1];
    return Math.abs(pt[0] - ant[0]) > 0.00001 || Math.abs(pt[1] - ant[1]) > 0.00001;
  });
}

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
  paradas = [],
  paradaSelecionada = null,
  onSelecionarParada,
  className = '',
}: MapaInterativoProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Grupos de camadas para limpeza e atualização reativa
  const camadaUsuarioRef = useRef<L.LayerGroup>(L.layerGroup());
  const camadaPontosRef = useRef<L.LayerGroup>(L.layerGroup());
  const camadaRotaRef = useRef<L.LayerGroup>(L.layerGroup());
  const camadaParadasGeraisRef = useRef<L.LayerGroup>(L.layerGroup());

  // Referência única do marcador e círculo do usuário
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
    camadaParadasGeraisRef.current.addTo(mapa);

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

  // 1. Atualização do marcador do usuário em tempo real
  useEffect(() => {
    if (!posicaoUsuario || !mapInstanceRef.current) return;

    const latLng: [number, number] = [posicaoUsuario.latitude, posicaoUsuario.longitude];
    const precisao = posicaoUsuario.precisao || 30;

    // Atualiza ou cria o círculo de precisão (com interactive: false para nunca bloquear o arraste do mapa)
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
        interactive: false,
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

    // Se estiver em modo de acompanhamento ativo e seguindo o usuário:
    if (modoAcompanhamento && seguindoUsuario) {
      mapInstanceRef.current.panTo(latLng, { animate: true, duration: 1 });
    } else if (!pontoOrigem && !pontoDestino && !rotaSelecionada) {
      mapInstanceRef.current.setView(latLng, 15, { animate: true });
    }
  }, [posicaoUsuario, modoAcompanhamento, seguindoUsuario, pontoOrigem, pontoDestino, rotaSelecionada]);

  // 2. Atualização dos marcadores de Origem e Destino gerais
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

    // Se ambos os pontos estiverem definidos e não houver rota selecionada nem navegação ativa, enquadra
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

  // 3. Desenho do Trajeto Sugerido no Mapa: do local de partida até o destino
  useEffect(() => {
    const camada = camadaRotaRef.current;
    camada.clearLayers();

    if (!mapInstanceRef.current || !rotaSelecionada?.detalhes) return;

    const trechos = rotaSelecionada.detalhes.trechos || [];
    if (trechos.length === 0) return;

    const coordenadasTotais: [number, number][] = [];

    // A. Ponto de Partida do usuário
    const coordPartida: [number, number] | null = pontoOrigem
      ? [pontoOrigem.latitude, pontoOrigem.longitude]
      : null;

    if (coordPartida) {
      coordenadasTotais.push(coordPartida);
    }

    // B. Ponto de Destino do usuário
    const coordDestino: [number, number] | null = pontoDestino
      ? [pontoDestino.latitude, pontoDestino.longitude]
      : null;

    if (coordDestino) {
      coordenadasTotais.push(coordDestino);
    }

    // C. Caminhada Inicial: do local de partida até a parada de embarque do 1º ônibus
    const primeiroTrecho = trechos[0];
    const coordPrimeiroEmbarque: [number, number] = [
      primeiroTrecho.embarque.latitude,
      primeiroTrecho.embarque.longitude,
    ];

    if (coordPartida) {
      const distOrigem = calcularDistanciaMetros(
        coordPartida[0],
        coordPartida[1],
        coordPrimeiroEmbarque[0],
        coordPrimeiroEmbarque[1]
      );

      if (distOrigem > 10) {
        // Linha de contorno suave verde (interactive: false para não bloquear arrastes)
        L.polyline([coordPartida, coordPrimeiroEmbarque], {
          color: '#a7f3d0',
          weight: 8,
          opacity: 0.5,
          lineCap: 'round',
          interactive: false,
        }).addTo(camada);

        // Linha tracejada da caminhada inicial
        L.polyline([coordPartida, coordPrimeiroEmbarque], {
          color: '#059669',
          weight: 4.5,
          opacity: 0.95,
          dashArray: '6, 8',
          lineCap: 'round',
          interactive: false,
        }).addTo(camada);
      }
    }

    // D. Trecho(s) de Ônibus e Paradas do Trajeto
    trechos.forEach((trecho, idx) => {
      const pontosTrecho = obterPontosTrechoViagem(trecho);

      if (pontosTrecho.length > 0) {
        coordenadasTotais.push(...pontosTrecho);

        // Halo / contorno suave para dar contraste e beleza sobre o mapa (interactive: false)
        L.polyline(pontosTrecho, {
          color: '#38bdf8',
          weight: 9,
          opacity: 0.45,
          lineJoin: 'round',
          lineCap: 'round',
          interactive: false,
        }).addTo(camada);

        // Linha sólida destacando a rota do trajeto de ônibus (interactive: false para arraste livre)
        L.polyline(pontosTrecho, {
          color: '#05053a',
          weight: 5.5,
          opacity: 0.95,
          lineJoin: 'round',
          lineCap: 'round',
          interactive: false,
        }).addTo(camada);
      }

      // Marcador no ponto de embarque do ônibus
      const coordEmbarque: [number, number] = [trecho.embarque.latitude, trecho.embarque.longitude];
      const marcadorEmbarque = L.marker(coordEmbarque, {
        icon: criarIconeEmbarque(trecho.linha),
      }).addTo(camada);

      marcadorEmbarque.bindPopup(`
        <div class="text-xs p-1">
          <span class="font-bold text-emerald-700">🟢 Ponto de Embarque</span><br/>
          <b class="text-[#05053a]">Linha ${trecho.linha} - ${trecho.nome_linha || trecho.sentido}</b><br/>
          <span class="font-medium">${trecho.embarque.nome}</span>
          ${trecho.horario_saida ? `<br/><span class="text-slate-500 font-semibold">Saída prevista: ${trecho.horario_saida.slice(0, 5)}</span>` : ''}
        </div>
      `);

      // Marcadores nas paradas intermediárias onde o usuário passa durante o trajeto
      (trecho.paradas || []).forEach((parada) => {
        const coordParada: [number, number] = [parada.latitude, parada.longitude];

        // Evita sobrepor exatamente com embarque ou desembarque
        const distEmb = calcularDistanciaMetros(coordParada[0], coordParada[1], coordEmbarque[0], coordEmbarque[1]);
        const distDes = calcularDistanciaMetros(
          coordParada[0],
          coordParada[1],
          trecho.desembarque.latitude,
          trecho.desembarque.longitude
        );

        if (distEmb > 15 && distDes > 15) {
          const marcadorP = L.marker(coordParada, { icon: iconeParada }).addTo(camada);
          marcadorP.bindPopup(`
            <div class="text-xs">
              <span class="font-bold text-[#05053a]">Linha ${trecho.linha}</span><br/>
              <b>Parada:</b> ${parada.nome}
              ${parada.horario_chegada ? `<br/><span class="text-slate-500">Chegada prevista: ${parada.horario_chegada.slice(0, 5)}</span>` : ''}
            </div>
          `);
        }
      });

      // Marcador no ponto de desembarque do ônibus
      const coordDesembarque: [number, number] = [
        trecho.desembarque.latitude,
        trecho.desembarque.longitude,
      ];
      const marcadorDesembarque = L.marker(coordDesembarque, {
        icon: criarIconeDesembarque(trecho.linha),
      }).addTo(camada);

      marcadorDesembarque.bindPopup(`
        <div class="text-xs p-1">
          <span class="font-bold text-amber-700">🔴 Ponto de Desembarque</span><br/>
          <b class="text-[#05053a]">Linha ${trecho.linha}</b><br/>
          <span class="font-medium">${trecho.desembarque.nome}</span>
          ${trecho.horario_chegada ? `<br/><span class="text-slate-500 font-semibold">Chegada prevista: ${trecho.horario_chegada.slice(0, 5)}</span>` : ''}
        </div>
      `);

      // E. Transbordo / Conexão entre ônibus se houver integração
      if (idx < trechos.length - 1) {
        const proximoTrecho = trechos[idx + 1];
        const coordProximoEmbarque: [number, number] = [
          proximoTrecho.embarque.latitude,
          proximoTrecho.embarque.longitude,
        ];

        const distTransbordo = calcularDistanciaMetros(
          coordDesembarque[0],
          coordDesembarque[1],
          coordProximoEmbarque[0],
          coordProximoEmbarque[1]
        );

        if (distTransbordo > 5) {
          L.polyline([coordDesembarque, coordProximoEmbarque], {
            color: '#d97706',
            weight: 4.5,
            opacity: 0.95,
            dashArray: '5, 8',
            lineCap: 'round',
            interactive: false,
          }).addTo(camada);
        }
      }
    });

    // F. Caminhada Final: da última parada de desembarque até o ponto de destino
    const ultimoTrecho = trechos[trechos.length - 1];
    const coordUltimoDesembarque: [number, number] = [
      ultimoTrecho.desembarque.latitude,
      ultimoTrecho.desembarque.longitude,
    ];

    if (coordDestino) {
      const distDestino = calcularDistanciaMetros(
        coordUltimoDesembarque[0],
        coordUltimoDesembarque[1],
        coordDestino[0],
        coordDestino[1]
      );

      if (distDestino > 10) {
        // Linha de contorno suave rosa
        L.polyline([coordUltimoDesembarque, coordDestino], {
          color: '#fda4af',
          weight: 8,
          opacity: 0.5,
          lineCap: 'round',
          interactive: false,
        }).addTo(camada);

        // Linha tracejada da caminhada final
        L.polyline([coordUltimoDesembarque, coordDestino], {
          color: '#e11d48',
          weight: 4.5,
          opacity: 0.95,
          dashArray: '6, 8',
          lineCap: 'round',
          interactive: false,
        }).addTo(camada);
      }
    }

    // G. Enquadramento no Leaflet cobrindo estritamente o trajeto do local de partida ao destino
    if (coordenadasTotais.length > 0 && !modoAcompanhamento) {
      const bounds = L.latLngBounds(coordenadasTotais);
      mapInstanceRef.current.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 16,
        animate: true,
      });
    }
  }, [rotaSelecionada, pontoOrigem, pontoDestino, modoAcompanhamento]);

  // 4. Exibição de Paradas de Ônibus Interativas no Mapa
  useEffect(() => {
    const camada = camadaParadasGeraisRef.current;
    camada.clearLayers();

    if (!mapInstanceRef.current || modoAcompanhamento || !paradas || paradas.length === 0) {
      return;
    }

    paradas.forEach((parada) => {
      const isSelecionada = paradaSelecionada?.id === parada.id;
      const icone = criarIconeParadaOnibus(isSelecionada);

      const marcador = L.marker([parada.latitude, parada.longitude], {
        icon: icone,
        zIndexOffset: isSelecionada ? 1000 : 100,
      }).addTo(camada);

      const proxLinha =
        parada.onibus && parada.onibus.length > 0
          ? `Linha ${parada.onibus[0].linha} em ${parada.onibus[0].tempoMinutos} min`
          : `${parada.onibus?.length || 0} linhas`;

      marcador.bindTooltip(
        `<div style="font-family: inherit; font-size: 11px; padding: 2px 4px;">
           <b style="color: #05053a;">${parada.nome}</b><br>
           <span style="color: #15803d; font-weight: 600;">● ${proxLinha}</span>
         </div>`,
        {
          direction: 'top',
          offset: [0, -32],
          opacity: 0.95,
        }
      );

      marcador.on('click', () => {
        if (onSelecionarParada) {
          onSelecionarParada(parada);
        }
      });
    });
  }, [paradas, paradaSelecionada, modoAcompanhamento, onSelecionarParada]);

  // 5. Centralização suave ao selecionar uma parada de ônibus
  useEffect(() => {
    if (!paradaSelecionada || !mapInstanceRef.current || modoAcompanhamento) return;

    mapInstanceRef.current.panTo(
      [paradaSelecionada.latitude, paradaSelecionada.longitude],
      { animate: true, duration: 0.8 }
    );
  }, [paradaSelecionada, modoAcompanhamento]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Container Leaflet com cursor de arrastar */}
      <div ref={mapContainerRef} className="w-full h-full z-0 cursor-grab active:cursor-grabbing" />

      {/* Botão Flutuante de Centralização / Localização Atual */}
      {!modoAcompanhamento && (
        <div className="absolute right-4 bottom-24 z-20 pointer-events-auto">
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
