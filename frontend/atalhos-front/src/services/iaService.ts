import type {
  MensagemHistorico,
  RequisicaoAgente,
  RespostaAgente,
} from '../types/ia';

const ENDPOINT_AGENTE = '/api/ia/consultar/';

function ehRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function ehIntencaoAgente(valor: unknown): boolean {
  return (
    valor === 'buscar_rota'
    || valor === 'consultar_linha'
    || valor === 'saudacao'
    || valor === 'outro'
  );
}

function ehNumero(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor);
}

function ehTextoOpcional(valor: unknown): boolean {
  return valor === undefined || typeof valor === 'string';
}

function ehTexto(valor: unknown): valor is string {
  return typeof valor === 'string';
}

function ehCoordenadas(valor: unknown): boolean {
  if (!ehRegistro(valor)) {
    return false;
  }

  return ehNumero(valor.latitude) && ehNumero(valor.longitude);
}

function ehParada(valor: unknown): boolean {
  if (!ehRegistro(valor)) {
    return false;
  }

  return (
    typeof valor.id === 'string'
    && typeof valor.nome === 'string'
    && ehNumero(valor.latitude)
    && ehNumero(valor.longitude)
    && (valor.ordem === undefined || ehNumero(valor.ordem))
    && (valor.horario_chegada === undefined || ehTexto(valor.horario_chegada))
    && (valor.horario_saida === undefined || ehTexto(valor.horario_saida))
  );
}

function ehParadaTrecho(valor: unknown): boolean {
  if (!ehRegistro(valor)) {
    return false;
  }

  return (
    ehParada(valor)
    && ehNumeroOpcional(valor.distancia_origem)
    && ehNumeroOpcional(valor.distancia_destino)
  );
}

function ehNumeroOpcional(valor: unknown): boolean {
  return valor === undefined || ehNumero(valor);
}

function ehTrecho(valor: unknown): boolean {
  if (!ehRegistro(valor)) {
    return false;
  }

  return (
    typeof valor.linha === 'string'
    && typeof valor.nome_linha === 'string'
    && typeof valor.sentido === 'string'
    && typeof valor.trip_id === 'string'
    && ehTexto(valor.horario_saida)
    && ehTexto(valor.horario_chegada)
    && ehParadaTrecho(valor.embarque)
    && ehParadaTrecho(valor.desembarque)
    && Array.isArray(valor.paradas)
    && valor.paradas.every(ehParada)
    && Array.isArray(valor.coordenadas)
    && valor.coordenadas.every(ehCoordenadas)
  );
}

function ehIntegracao(valor: unknown): boolean {
  if (!ehRegistro(valor)) {
    return false;
  }

  return (
    ehParada(valor.parada)
    && ehTexto(valor.horario_chegada)
    && ehTexto(valor.horario_proxima_saida)
    && ehNumero(valor.tempo_espera_minutos)
  );
}

function ehViagem(valor: unknown): boolean {
  if (!ehRegistro(valor)) {
    return false;
  }

  return (
    (valor.tipo === 'direta' || valor.tipo === 'com_integracao')
    && ehNumero(valor.quantidade_integracoes)
    && ehTexto(valor.horario_saida)
    && ehTexto(valor.horario_chegada)
    && ehNumero(valor.tempo_total_minutos)
    && ehNumero(valor.distancia_caminhada_total)
    && Array.isArray(valor.trechos)
    && valor.trechos.every(ehTrecho)
    && Array.isArray(valor.integracoes)
    && valor.integracoes.every(ehIntegracao)
  );
}

function ehLocalConsulta(valor: unknown): boolean {
  if (!ehRegistro(valor)) {
    return false;
  }

  return (
    typeof valor.endereco === 'string'
    && ehNumero(valor.latitude)
    && ehNumero(valor.longitude)
    && (typeof valor.nome_completo === 'string' || valor.nome_completo === null)
  );
}

function ehResultadoViagens(valor: Record<string, unknown>): boolean {
  return (
    valor.sucesso === true
    && ehLocalConsulta(valor.origem)
    && ehLocalConsulta(valor.destino)
    && ehTexto(valor.data)
    && ehTexto(valor.horario)
    && typeof valor.permitir_integracao === 'boolean'
    && Array.isArray(valor.viagens)
    && valor.viagens.every(ehViagem)
    && ehNumero(valor.total_opcoes)
    && Array.isArray(valor.preferencias_nao_atendidas)
    && valor.preferencias_nao_atendidas.every(
      (item) => typeof item === 'string',
    )
    && ehTextoOpcional(valor.mensagem)
  );
}

function ehLinha(valor: unknown): boolean {
  if (!ehRegistro(valor)) {
    return false;
  }

  return (
    typeof valor.route_id === 'string'
    && typeof valor.route_short_name === 'string'
    && Object.values(valor).every((item) => typeof item === 'string')
  );
}

function ehItinerario(valor: unknown): boolean {
  if (!ehRegistro(valor)) {
    return false;
  }

  return (
    typeof valor.linha === 'string'
    && typeof valor.nome === 'string'
    && typeof valor.sentido === 'string'
    && typeof valor.destino === 'string'
    && Array.isArray(valor.coordenadas)
    && valor.coordenadas.every(ehCoordenadas)
    && Array.isArray(valor.paradas)
    && valor.paradas.every(ehParada)
  );
}

function ehResultadoLinha(valor: Record<string, unknown>): boolean {
  return (
    valor.sucesso === true
    && ehLinha(valor.linha)
    && (valor.itinerario === null || ehItinerario(valor.itinerario))
    && ehTextoOpcional(valor.aviso)
  );
}

function ehResultadoErro(valor: Record<string, unknown>): boolean {
  return (
    valor.sucesso === false
    && typeof valor.erro === 'string'
    && typeof valor.tipo_erro === 'string'
    && ehTextoOpcional(valor.campo)
    && ehTextoOpcional(valor.mensagem)
    && (
      valor.linha === undefined
      || valor.linha === null
      || ehLinha(valor.linha)
    )
    && (
      valor.itinerario === undefined
      || valor.itinerario === null
      || ehItinerario(valor.itinerario)
    )
  );
}

function ehResultadoConsulta(valor: unknown): boolean {
  if (valor === null || !ehRegistro(valor)) {
    return valor === null;
  }

  if (valor.sucesso === true) {
    return ehResultadoViagens(valor) || ehResultadoLinha(valor);
  }

  return ehResultadoErro(valor);
}

function ehResultadoCompativelComIntencao(
  intencao: unknown,
  resultado: unknown,
): boolean {
  if (resultado === null) {
    return (
      intencao === 'buscar_rota'
      || intencao === 'consultar_linha'
      || intencao === 'saudacao'
      || intencao === 'outro'
    );
  }

  if (!ehRegistro(resultado)) {
    return false;
  }

  if (intencao === 'buscar_rota') {
    return (
      ehResultadoViagens(resultado)
      || ehResultadoErro(resultado)
    );
  }

  if (intencao === 'consultar_linha') {
    return (
      ehResultadoLinha(resultado)
      || ehResultadoErro(resultado)
    );
  }

  return false;
}

function ehRespostaAgente(valor: unknown): valor is RespostaAgente {
  if (!ehRegistro(valor)) {
    return false;
  }

  return (
    ehIntencaoAgente(valor.intencao)
    && (typeof valor.origem === 'string' || valor.origem === null)
    && (typeof valor.destino === 'string' || valor.destino === null)
    && (typeof valor.data === 'string' || valor.data === null)
    && (typeof valor.horario === 'string' || valor.horario === null)
    && ehRegistro(valor.preferencias)
    && Array.isArray(valor.informacoes_faltantes)
    && valor.informacoes_faltantes.every(
      (item) => typeof item === 'string',
    )
    && typeof valor.mensagem === 'string'
    && ehResultadoConsulta(valor.resultado)
    && ehResultadoCompativelComIntencao(
      valor.intencao,
      valor.resultado,
    )
  );
}

async function lerJson(resposta: Response): Promise<unknown> {
  try {
    return await resposta.json();
  } catch {
    return null;
  }
}

export async function consultarAgente(
  mensagem: string,
  historico?: MensagemHistorico[] | null,
): Promise<RespostaAgente> {
  const corpo: RequisicaoAgente = { mensagem };

  if (historico !== undefined) {
    corpo.historico = historico;
  }

  let resposta: Response;

  try {
    resposta = await fetch(ENDPOINT_AGENTE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(corpo),
    });
  } catch {
    throw new Error('Não foi possível conectar ao serviço do agente.');
  }

  const dados = await lerJson(resposta);

  if (!resposta.ok) {
    const mensagemErro = (
      ehRegistro(dados) && typeof dados.erro === 'string'
        ? dados.erro
        : `O serviço do agente respondeu com HTTP ${resposta.status}.`
    );
    throw new Error(mensagemErro);
  }

  if (!ehRespostaAgente(dados)) {
    throw new Error('O serviço do agente retornou uma resposta inválida.');
  }

  return dados;
}
