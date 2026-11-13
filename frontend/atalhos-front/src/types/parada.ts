export interface OnibusParada {
  id: string;
  linha: string;              // e.g. "115"
  nomeLinha: string;          // e.g. "Campo Grande / Afogados"
  tempoMinutos: number;       // e.g. 3
  arCondicionado?: boolean;   // Ícone de floco de neve
  acessivel?: boolean;        // Ícone de acessibilidade / cadeirante
  horarioEstimado?: string;   // e.g. "11:52"
  veiculoNumero?: string;     // e.g. "042"
}

export interface ParadaComOnibus {
  id: string;
  nome: string;               // e.g. "Rua Doutor Adélino, 29"
  bairro?: string;            // e.g. "Afogados / Bongi"
  latitude: number;
  longitude: number;
  distanciaMetros?: number;   // e.g. 92
  tempoCaminhadaMin?: number; // e.g. 1
  favorito?: boolean;
  onibus: OnibusParada[];
}

export interface AvaliacaoOnibus {
  id?: string;
  paradaId: string;
  paradaNome: string;
  linha: string;
  nomeLinha: string;
  chegouNoHorario: 'Sim' | 'Não' | 'Não sei';
  lotacao: 'Cheio' | 'Moderado' | 'Vazio' | 'Não sei';
  observacao?: string;
  dataHora: string;
}
