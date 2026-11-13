import type { TrechoRota, ParadaTrecho } from '../services/api';

/**
 * Calcula a distância geodésica em metros entre duas coordenadas utilizando a fórmula de Haversine.
 */
export function calcularDistanciaMetros(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Raio da Terra em metros
  const rad = (graus: number) => (graus * Math.PI) / 180;

  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formata uma distância em metros para formato legível (m ou km).
 */
export function formatarDistancia(metros: number): string {
  if (metros < 1000) {
    return `${Math.round(metros)} m`;
  }
  return `${(metros / 1000).toFixed(1)} km`;
}

export interface ProximaParadaInfo {
  parada: ParadaTrecho;
  distanciaMetros: number;
  linha: string;
}

/**
 * Encontra a próxima parada de ônibus do trajeto mais próxima da localização atual do usuário.
 */
export function encontrarProximaParada(
  usuarioLat: number,
  usuarioLon: number,
  trechos: TrechoRota[]
): ProximaParadaInfo | null {
  if (!trechos || trechos.length === 0) return null;

  let melhorParada: ParadaTrecho | null = null;
  let menorDistancia = Infinity;
  let linhaAssociada = '';

  for (const trecho of trechos) {
    for (const parada of trecho.paradas || []) {
      const dist = calcularDistanciaMetros(
        usuarioLat,
        usuarioLon,
        parada.latitude,
        parada.longitude
      );

      // Prioriza paradas a uma distância mínima de 30m (que o usuário ainda não passou)
      if (dist < menorDistancia) {
        menorDistancia = dist;
        melhorParada = parada;
        linhaAssociada = trecho.linha;
      }
    }
  }

  if (!melhorParada) return null;

  return {
    parada: melhorParada,
    distanciaMetros: menorDistancia,
    linha: linhaAssociada,
  };
}
