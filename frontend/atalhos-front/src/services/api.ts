/**
 * Serviço de comunicação com o Backend do ATALHOS.
 * Integração com as APIs Django (rotas, busca de locais e IA).
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface ParadaTrecho {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  ordem: number;
  horario_chegada?: string;
  horario_saida?: string;
}

export interface PontoEmbarqueDesembarque {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  distancia_origem?: number;
  distancia_destino?: number;
}

export interface TrechoRota {
  linha: string;
  nome_linha: string;
  sentido: string;
  trip_id: string;
  horario_saida: string;
  horario_chegada: string;
  embarque: PontoEmbarqueDesembarque;
  desembarque: PontoEmbarqueDesembarque;
  paradas: ParadaTrecho[];
  coordenadas: Array<{ latitude: number; longitude: number }>;
}

export interface OpcaoRotaBackend {
  tipo: 'direta' | 'integracao';
  quantidade_integracoes: number;
  horario_saida: string;
  horario_chegada: string;
  tempo_total_minutos: number;
  distancia_caminhada_total: number;
  trechos: TrechoRota[];
  integracoes: unknown[];
}

export interface PontoLocalizacao {
  latitude: number;
  longitude: number;
  nome_completo: string;
}

export interface RespostaBuscaRota {
  origem_info: PontoLocalizacao;
  destino_info: PontoLocalizacao;
  data_viagem: string;
  horario_consulta: string;
  quantidade_opcoes: number;
  opcoes_de_rotas: OpcaoRotaBackend[];
  erro?: string;
}

export interface ParametrosBuscaRota {
  origem: string;
  destino: string;
  origem_latitude?: number;
  origem_longitude?: number;
  destino_latitude?: number;
  destino_longitude?: number;
  data?: string;
  horario?: string;
  limite?: number;
  raio_paradas?: number;
}

export interface SugestaoLocal {
  id: string | number;
  nome: string;
  descricao: string;
  latitude: number;
  longitude: number;
}

export interface ItinerarioLinha {
  linha: string;
  nome: string;
  coordenadas: Array<{ latitude: number; longitude: number }>;
  paradas: ParadaTrecho[];
  erro?: string;
}

export interface RespostaTodasParadas {
  paradas: Array<{
    id: string;
    nome: string;
    latitude: number;
    longitude: number;
  }>;
  erro?: string;
}

/**
 * Busca sugestões de locais correspondentes ao texto digitado (autocomplete).
 */
export async function buscarSugestoesLocais(termo: string): Promise<SugestaoLocal[]> {
  if (!termo || termo.trim().length < 2) {
    return [];
  }

  const query = new URLSearchParams({ q: termo.trim() });
  const url = `${API_BASE_URL}/rotas/api/locais/sugestoes/?${query.toString()}`;

  const resposta = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.erro || 'Não foi possível buscar sugestões de locais.');
  }

  return (dados.sugestoes || []) as SugestaoLocal[];
}

/**
 * Consulta opções de rotas de transporte público entre origem e destino.
 * Aceita nomes ou coordenadas geográficas precisas.
 */
export async function buscarRotas(params: ParametrosBuscaRota): Promise<RespostaBuscaRota> {
  const query = new URLSearchParams();
  query.append('origem', params.origem);
  query.append('destino', params.destino);

  if (params.origem_latitude !== undefined && params.origem_longitude !== undefined) {
    query.append('origem_latitude', params.origem_latitude.toString());
    query.append('origem_longitude', params.origem_longitude.toString());
  }

  if (params.destino_latitude !== undefined && params.destino_longitude !== undefined) {
    query.append('destino_latitude', params.destino_latitude.toString());
    query.append('destino_longitude', params.destino_longitude.toString());
  }

  if (params.data) query.append('data', params.data);
  if (params.horario) query.append('horario', params.horario);
  if (params.limite) query.append('limite', params.limite.toString());
  if (params.raio_paradas) query.append('raio_paradas', params.raio_paradas.toString());

  const url = `${API_BASE_URL}/rotas/buscar/?${query.toString()}`;

  const resposta = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.erro || 'Não foi possível buscar as rotas.');
  }

  return dados as RespostaBuscaRota;
}

/**
 * Consulta o itinerário completo e o trajeto de uma linha de ônibus.
 */
export async function buscarItinerario(codigoLinha: string): Promise<ItinerarioLinha> {
  const url = `${API_BASE_URL}/rotas/api/linhas/${encodeURIComponent(codigoLinha)}/itinerario/`;

  const resposta = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.erro || 'Não foi possível carregar o itinerário da linha.');
  }

  return dados as ItinerarioLinha;
}

/**
 * Consulta todas as paradas cadastradas no sistema.
 */
export async function buscarParadas(): Promise<RespostaTodasParadas> {
  const url = `${API_BASE_URL}/rotas/api/paradas/`;

  const resposta = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.erro || 'Não foi possível carregar as paradas.');
  }

  return dados as RespostaTodasParadas;
}
