import type { ParadaComOnibus, AvaliacaoOnibus } from '../types/parada';
import { calcularDistanciaMetros } from '../utils/geo';

const CHAVE_AVALIACOES = 'atalhos_avaliacoes_onibus';
const CHAVE_FAVORITOS = 'atalhos_paradas_favoritas';

/**
 * Paradas de ônibus pré-cadastradas na Região Metropolitana do Recife,
 * incluindo a parada solicitada "Rua Doutor Adélino, 29" (Afogados / Bongi)
 * com as mesmas linhas de ônibus da imagem de referência.
 */
export const PARADAS_INICIAIS: ParadaComOnibus[] = [
  {
    id: 'parada-adelino-29',
    nome: 'Rua Doutor Adélino, 29',
    bairro: 'Afogados / Bongi',
    latitude: -8.0782,
    longitude: -34.9084,
    distanciaMetros: 92,
    tempoCaminhadaMin: 1,
    favorito: false,
    onibus: [
      {
        id: 'onibus-115-cg',
        linha: '115',
        nomeLinha: 'Campo Grande / Afogados',
        tempoMinutos: 3,
        arCondicionado: false,
        acessivel: false,
        horarioEstimado: '11:52',
        veiculoNumero: '1042',
      },
      {
        id: 'onibus-115-ti',
        linha: '115',
        nomeLinha: 'T.I. Aeroporto / T.I. Afogados',
        tempoMinutos: 6,
        arCondicionado: true,
        acessivel: true,
        horarioEstimado: '11:55',
        veiculoNumero: '1088',
      },
      {
        id: 'onibus-212-jsp',
        linha: '212',
        nomeLinha: 'Jardim São Paulo (Afogados)',
        tempoMinutos: 9,
        arCondicionado: false,
        acessivel: false,
        horarioEstimado: '11:58',
        veiculoNumero: '2145',
      },
      {
        id: 'onibus-311-bongi',
        linha: '311',
        nomeLinha: 'Bongi (Afogados)',
        tempoMinutos: 11,
        arCondicionado: false,
        acessivel: false,
        horarioEstimado: '12:00',
        veiculoNumero: '3110',
      },
      {
        id: 'onibus-315-bongi',
        linha: '315',
        nomeLinha: 'Bongi',
        tempoMinutos: 12,
        arCondicionado: false,
        acessivel: false,
        horarioEstimado: '12:01',
        veiculoNumero: '3158',
      },
    ],
  },
  {
    id: 'parada-ti-afogados',
    nome: 'T.I. Afogados - Terminal Integrado',
    bairro: 'Afogados',
    latitude: -8.0773,
    longitude: -34.9068,
    distanciaMetros: 230,
    tempoCaminhadaMin: 3,
    favorito: false,
    onibus: [
      {
        id: 'onibus-115-ti-2',
        linha: '115',
        nomeLinha: 'T.I. Aeroporto / T.I. Afogados',
        tempoMinutos: 2,
        arCondicionado: true,
        acessivel: true,
        horarioEstimado: '11:51',
      },
      {
        id: 'onibus-021-ti',
        linha: '021',
        nomeLinha: 'T.I. Afogados / T.I. Aeroporto',
        tempoMinutos: 5,
        arCondicionado: true,
        acessivel: true,
        horarioEstimado: '11:54',
      },
      {
        id: 'onibus-080-ti',
        linha: '080',
        nomeLinha: 'Joana Bezerra / Boa Viagem',
        tempoMinutos: 8,
        arCondicionado: false,
        acessivel: true,
        horarioEstimado: '11:57',
      },
      {
        id: 'onibus-914-ti',
        linha: '914',
        nomeLinha: 'PE-15 / Afogados',
        tempoMinutos: 10,
        arCondicionado: true,
        acessivel: false,
        horarioEstimado: '11:59',
      },
    ],
  },
  {
    id: 'parada-praca-derby',
    nome: 'Praça do Derby (Parada Central)',
    bairro: 'Derby',
    latitude: -8.0573,
    longitude: -34.8992,
    distanciaMetros: 450,
    tempoCaminhadaMin: 6,
    favorito: false,
    onibus: [
      {
        id: 'onibus-044-derby',
        linha: '044',
        nomeLinha: 'Massangana (Boa Vista)',
        tempoMinutos: 4,
        arCondicionado: false,
        acessivel: true,
        horarioEstimado: '11:53',
      },
      {
        id: 'onibus-2040-derby',
        linha: '2040',
        nomeLinha: 'CDU / Boa Viagem / Caxangá',
        tempoMinutos: 7,
        arCondicionado: true,
        acessivel: true,
        horarioEstimado: '11:56',
      },
      {
        id: 'onibus-2437-derby',
        linha: '2437',
        nomeLinha: 'TI Caxangá (Centro)',
        tempoMinutos: 10,
        arCondicionado: true,
        acessivel: false,
        horarioEstimado: '11:59',
      },
      {
        id: 'onibus-061-derby',
        linha: '061',
        nomeLinha: 'Piedade',
        tempoMinutos: 14,
        arCondicionado: false,
        acessivel: false,
        horarioEstimado: '12:03',
      },
    ],
  },
  {
    id: 'parada-conde-boa-vista',
    nome: 'Av. Conde da Boa Vista (Soledade)',
    bairro: 'Boa Vista',
    latitude: -8.0578,
    longitude: -34.8878,
    distanciaMetros: 820,
    tempoCaminhadaMin: 10,
    favorito: false,
    onibus: [
      {
        id: 'onibus-101-cbv',
        linha: '101',
        nomeLinha: 'Circular (Conde da Boa Vista)',
        tempoMinutos: 2,
        arCondicionado: true,
        acessivel: true,
        horarioEstimado: '11:51',
      },
      {
        id: 'onibus-2441-cbv',
        linha: '2441',
        nomeLinha: 'TI CDU (Conde da Boa Vista)',
        tempoMinutos: 5,
        arCondicionado: true,
        acessivel: true,
        horarioEstimado: '11:54',
      },
      {
        id: 'onibus-2450-cbv',
        linha: '2450',
        nomeLinha: 'TI Camaragibe (Centro)',
        tempoMinutos: 8,
        arCondicionado: false,
        acessivel: false,
        horarioEstimado: '11:57',
      },
      {
        id: 'onibus-032-cbv',
        linha: '032',
        nomeLinha: 'Setúbal (Conde da Boa Vista)',
        tempoMinutos: 12,
        arCondicionado: true,
        acessivel: false,
        horarioEstimado: '12:01',
      },
    ],
  },
  {
    id: 'parada-shopping-recife',
    nome: 'Shopping Recife (Tancredo Neves)',
    bairro: 'Boa Viagem',
    latitude: -8.1190,
    longitude: -34.9048,
    distanciaMetros: 1200,
    tempoCaminhadaMin: 15,
    favorito: false,
    onibus: [
      {
        id: 'onibus-024-sr',
        linha: '024',
        nomeLinha: 'TI Tancredo Neves (Circular)',
        tempoMinutos: 3,
        arCondicionado: true,
        acessivel: true,
        horarioEstimado: '11:52',
      },
      {
        id: 'onibus-026-sr',
        linha: '026',
        nomeLinha: 'TI Aeroporto / TI Joana Bezerra',
        tempoMinutos: 6,
        arCondicionado: true,
        acessivel: false,
        horarioEstimado: '11:55',
      },
      {
        id: 'onibus-031-sr',
        linha: '031',
        nomeLinha: 'Shopping Recife / Casuarinas',
        tempoMinutos: 9,
        arCondicionado: false,
        acessivel: true,
        horarioEstimado: '11:58',
      },
    ],
  },
  {
    id: 'parada-ufpe-reitoria',
    nome: 'UFPE - Campus Universitário (Reitoria)',
    bairro: 'Cidade Universitária',
    latitude: -8.0526,
    longitude: -34.9511,
    distanciaMetros: 1600,
    tempoCaminhadaMin: 20,
    favorito: false,
    onibus: [
      {
        id: 'onibus-2040-ufpe',
        linha: '2040',
        nomeLinha: 'CDU / Boa Viagem / Caxangá',
        tempoMinutos: 3,
        arCondicionado: true,
        acessivel: true,
        horarioEstimado: '11:52',
      },
      {
        id: 'onibus-2060-ufpe',
        linha: '2060',
        nomeLinha: 'TI Tancredo Neves / TI Macaxeira',
        tempoMinutos: 6,
        arCondicionado: true,
        acessivel: true,
        horarioEstimado: '11:55',
      },
      {
        id: 'onibus-060-ufpe',
        linha: '060',
        nomeLinha: 'TI Tancredo Neves / TI Macaxeira',
        tempoMinutos: 11,
        arCondicionado: false,
        acessivel: false,
        horarioEstimado: '12:00',
      },
    ],
  },
  {
    id: 'parada-rua-benfica',
    nome: 'Rua Benfica (Clube Internacional)',
    bairro: 'Madalena',
    latitude: -8.0585,
    longitude: -34.9042,
    distanciaMetros: 560,
    tempoCaminhadaMin: 7,
    favorito: false,
    onibus: [
      {
        id: 'onibus-312-benfica',
        linha: '312',
        nomeLinha: 'Mustardinha',
        tempoMinutos: 4,
        arCondicionado: false,
        acessivel: false,
        horarioEstimado: '11:53',
      },
      {
        id: 'onibus-313-benfica',
        linha: '313',
        nomeLinha: 'San Martin (Abdias de Carvalho)',
        tempoMinutos: 8,
        arCondicionado: true,
        acessivel: true,
        horarioEstimado: '11:57',
      },
      {
        id: 'onibus-324-benfica',
        linha: '324',
        nomeLinha: 'Jardim São Paulo (Piracicaba)',
        tempoMinutos: 13,
        arCondicionado: false,
        acessivel: true,
        horarioEstimado: '12:02',
      },
    ],
  },
];

/**
 * Retorna as paradas carregadas com favoritos aplicados a partir do localStorage.
 */
export function carregarParadas(): ParadaComOnibus[] {
  try {
    const salvos = localStorage.getItem(CHAVE_FAVORITOS);
    const favoritosSet = new Set<string>(salvos ? JSON.parse(salvos) : []);

    return PARADAS_INICIAIS.map((parada) => ({
      ...parada,
      favorito: favoritosSet.has(parada.id),
    }));
  } catch {
    return PARADAS_INICIAIS;
  }
}

/**
 * Atualiza distâncias e tempos de caminhada calculados em relação à posição do usuário.
 */
export function atualizarDistanciasParadas(
  paradas: ParadaComOnibus[],
  usuarioCoords: { latitude: number; longitude: number } | null
): ParadaComOnibus[] {
  if (!usuarioCoords) return paradas;

  return paradas.map((parada) => {
    const distancia = Math.round(
      calcularDistanciaMetros(
        usuarioCoords.latitude,
        usuarioCoords.longitude,
        parada.latitude,
        parada.longitude
      )
    );
    const tempoMin = Math.max(1, Math.round(distancia / 80)); // ~80m/min velocidade média de caminhada

    return {
      ...parada,
      distanciaMetros: distancia,
      tempoCaminhadaMin: tempoMin,
    };
  });
}

/**
 * Alterna status de favorito de uma parada e persiste no localStorage.
 */
export function alternarFavoritoParada(paradaId: string): boolean {
  try {
    const salvos = localStorage.getItem(CHAVE_FAVORITOS);
    const favoritosSet = new Set<string>(salvos ? JSON.parse(salvos) : []);

    let novoEstado = false;
    if (favoritosSet.has(paradaId)) {
      favoritosSet.delete(paradaId);
      novoEstado = false;
    } else {
      favoritosSet.add(paradaId);
      novoEstado = true;
    }

    localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(Array.from(favoritosSet)));
    return novoEstado;
  } catch {
    return false;
  }
}

/**
 * Salva uma nova avaliação de ônibus enviada pelo usuário.
 */
export function salvarAvaliacaoOnibus(avaliacao: Omit<AvaliacaoOnibus, 'id' | 'dataHora'>): AvaliacaoOnibus {
  const novaAvaliacao: AvaliacaoOnibus = {
    ...avaliacao,
    id: `aval-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    dataHora: new Date().toISOString(),
  };

  try {
    const registros = obterAvaliacoesOnibus();
    registros.unshift(novaAvaliacao);
    localStorage.setItem(CHAVE_AVALIACOES, JSON.stringify(registros));
  } catch (e) {
    console.warn('Não foi possível persistir avaliação localmente:', e);
  }

  return novaAvaliacao;
}

/**
 * Recupera avaliações salvas no localStorage.
 */
export function obterAvaliacoesOnibus(): AvaliacaoOnibus[] {
  try {
    const json = localStorage.getItem(CHAVE_AVALIACOES);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}
