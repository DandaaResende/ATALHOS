export type IntencaoAgente =
  | 'buscar_rota'
  | 'consultar_linha'
  | 'saudacao'
  | 'outro';

export type PapelHistorico =
  | 'usuario'
  | 'user'
  | 'assistente'
  | 'assistant';

export interface MensagemHistorico {
  papel: PapelHistorico;
  texto: string;
}

export interface RequisicaoAgente {
  mensagem: string;
  historico?: MensagemHistorico[] | null;
}

export interface PreferenciasAgente {
  evitar_baldeacoes?: boolean;
  ar_condicionado?: boolean;
  mais_rapido?: boolean;
  menor_caminhada?: boolean;
  linha?: string;
  [chave: string]: unknown;
}

export interface Coordenadas {
  latitude: number;
  longitude: number;
}

export interface Parada {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  ordem?: number;
  horario_chegada?: string;
  horario_saida?: string;
}

export interface ParadaTrecho extends Parada {
  distancia_origem?: number;
  distancia_destino?: number;
}

export interface Trecho {
  linha: string;
  nome_linha: string;
  sentido: string;
  trip_id: string;
  horario_saida: string;
  horario_chegada: string;
  embarque: ParadaTrecho;
  desembarque: ParadaTrecho;
  paradas: Parada[];
  coordenadas: Coordenadas[];
}

export interface Integracao {
  parada: Parada;
  horario_chegada: string;
  horario_proxima_saida: string;
  tempo_espera_minutos: number;
}

export type TipoViagem = 'direta' | 'com_integracao';

export interface Viagem {
  tipo: TipoViagem;
  quantidade_integracoes: number;
  horario_saida: string;
  horario_chegada: string;
  tempo_total_minutos: number;
  distancia_caminhada_total: number;
  trechos: Trecho[];
  integracoes: Integracao[];
}

export interface LocalConsulta {
  endereco: string;
  latitude: number;
  longitude: number;
  nome_completo: string | null;
}

export interface ResultadoViagensSucesso {
  sucesso: true;
  origem: LocalConsulta;
  destino: LocalConsulta;
  data: string;
  horario: string;
  permitir_integracao: boolean;
  viagens: Viagem[];
  total_opcoes: number;
  preferencias_nao_atendidas: string[];
  mensagem?: string;
}

export interface ResultadoConsultaFalha {
  sucesso: false;
  erro: string;
  tipo_erro: string;
  campo?: string;
  mensagem?: string;
}

export interface Linha {
  route_id: string;
  route_short_name: string;
  route_long_name?: string;
  route_type?: string;
  [campo: string]: string | undefined;
}

export interface Itinerario {
  linha: string;
  nome: string;
  sentido: string;
  destino: string;
  coordenadas: Coordenadas[];
  paradas: Parada[];
}

export interface ResultadoLinhaSucesso {
  sucesso: true;
  linha: Linha;
  itinerario: Itinerario | null;
  aviso?: string;
}

export interface ResultadoLinhaFalha extends ResultadoConsultaFalha {
  linha?: Linha | null;
  itinerario?: Itinerario | null;
}

export type ResultadoConsulta =
  | ResultadoViagensSucesso
  | ResultadoLinhaSucesso
  | ResultadoLinhaFalha
  | ResultadoConsultaFalha
  | null;

export interface RespostaAgente {
  intencao: IntencaoAgente;
  origem: string | null;
  destino: string | null;
  data: string | null;
  horario: string | null;
  preferencias: PreferenciasAgente;
  informacoes_faltantes: string[];
  mensagem: string;
  resultado: ResultadoConsulta;
}
