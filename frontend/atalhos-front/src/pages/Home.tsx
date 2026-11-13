import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, ChevronLeft, Sparkles, X, AlertCircle } from 'lucide-react';
import { CardSeuTrajeto } from '../components/CardSeuTrajeto';
import { CardMaisRotas } from '../components/CardMaisRotas';
import type { OpcaoRota } from '../components/CardMaisRotas';
import { CardRotaSelecionada } from '../components/CardRotaSelecionada';
import { CardAcompanhamento } from '../components/CardAcompanhamento';
import { MapaInterativo } from '../components/MapaInterativo';
import { useGeolocalizacao } from '../hooks/useGeolocalizacao';
import { consultarAgente } from '../services/iaService';
import {
  buscarRotas,
  buscarSugestoesLocais,
  type SugestaoLocal,
  type ParametrosBuscaRota,
  type OpcaoRotaBackend,
} from '../services/api';
import type {
  LocalConsulta,
  MensagemHistorico,
  ResultadoConsulta,
  ResultadoLinhaSucesso,
  ResultadoViagensSucesso,
  Viagem,
} from '../types/ia';

const LIMITE_HISTORICO_IA = 10;

function ehResultadoViagensSucesso(
  resultado: ResultadoConsulta,
): resultado is ResultadoViagensSucesso {
  return Boolean(
    resultado
    && resultado.sucesso
    && 'viagens' in resultado,
  );
}

function ehResultadoLinhaSucesso(
  resultado: ResultadoConsulta,
): resultado is ResultadoLinhaSucesso {
  return Boolean(
    resultado
    && resultado.sucesso
    && 'itinerario' in resultado
    && 'linha' in resultado,
  );
}

function converterViagemParaOpcao(
  viagem: Viagem,
  index: number,
): OpcaoRota {
  const linhas = viagem.trechos.map((trecho) => trecho.linha).filter(Boolean);
  const descricoes = viagem.trechos
    .map((trecho) => trecho.nome_linha || trecho.sentido)
    .filter(Boolean);
  const via = descricoes.length > 0
    ? descricoes.join(' ➔ ')
    : viagem.tipo === 'direta'
      ? 'Linha direta'
      : 'Com integração';
  const distancia = viagem.distancia_caminhada_total > 0
    ? `${(viagem.distancia_caminhada_total / 1000).toFixed(1)}km caminhada`
    : 'Próximo à parada';

  const detalhes: OpcaoRotaBackend = {
    tipo: viagem.tipo === 'com_integracao' ? 'integracao' : 'direta',
    quantidade_integracoes: viagem.quantidade_integracoes,
    horario_saida: viagem.horario_saida,
    horario_chegada: viagem.horario_chegada,
    tempo_total_minutos: viagem.tempo_total_minutos,
    distancia_caminhada_total: viagem.distancia_caminhada_total,
    trechos: viagem.trechos.map((trecho) => ({
      ...trecho,
      paradas: trecho.paradas.map((parada, paradaIndex) => ({
        ...parada,
        ordem: parada.ordem ?? paradaIndex + 1,
      })),
    })),
    integracoes: viagem.integracoes,
  };

  return {
    id: index + 1,
    tempo: Math.round(viagem.tempo_total_minutos),
    distancia,
    via,
    linhas,
    horarioSaida: viagem.horario_saida,
    horarioChegada: viagem.horario_chegada,
    detalhes,
  };
}

function converterLocalIA(
  local: LocalConsulta,
  prefixo: string,
): SugestaoLocal | null {
  if (
    !Number.isFinite(local.latitude)
    || !Number.isFinite(local.longitude)
  ) {
    return null;
  }

  const nome = local.nome_completo || local.endereco;
  if (!nome) {
    return null;
  }

  return {
    id: `${prefixo}-${local.latitude}-${local.longitude}`,
    nome,
    descricao: local.endereco,
    latitude: local.latitude,
    longitude: local.longitude,
  };
}

function formatarResultadoLinha(
  resultado: ResultadoLinhaSucesso,
  mensagem: string,
): string {
  const nomeLinha = resultado.linha.route_short_name || resultado.linha.route_id;
  const partes = [`Linha ${nomeLinha}`];

  if (resultado.linha.route_long_name) {
    partes.push(resultado.linha.route_long_name);
  }

  if (resultado.itinerario) {
    partes.push(
      `Sentido: ${resultado.itinerario.sentido}`,
      `Destino: ${resultado.itinerario.destino}`,
      `${resultado.itinerario.paradas.length} paradas`,
    );
  } else if (resultado.aviso) {
    partes.push(resultado.aviso);
  }

  return [mensagem, partes.join(' · ')].filter(Boolean).join('\n');
}

export function Home() {
  const navigate = useNavigate();

  // Hook de captura e rastreamento da localização do usuário via GPS
  const {
    localizacao: posicaoUsuario,
    carregando: carregandoLocalizacao,
    erro: erroLocalizacao,
    statusRastreamento,
    obterLocalizacao,
    iniciarAcompanhamento,
    pausarAcompanhamento,
    retomarAcompanhamento,
    encerrarAcompanhamento,
    limparErro: limparErroLocalizacao,
  } = useGeolocalizacao();

  // Estados dos locais de origem e destino
  const [origemTexto, setOrigemTexto] = useState('');
  const [destinoTexto, setDestinoTexto] = useState('');
  const [origemLocal, setOrigemLocal] = useState<SugestaoLocal | null>(null);
  const [destinoLocal, setDestinoLocal] = useState<SugestaoLocal | null>(null);

  // Estados de controle da busca e exibição
  const [buscandoRota, setBuscandoRota] = useState(false);
  const [carregandoRotas, setCarregandoRotas] = useState(false);
  const [mensagemValidacao, setMensagemValidacao] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [rotas, setRotas] = useState<OpcaoRota[]>([]);
  const [rotaEscolhida, setRotaEscolhida] = useState<OpcaoRota | null>(null);

  // Estados do acompanhamento em tempo real
  const [modoAcompanhamento, setModoAcompanhamento] = useState(false);
  const [seguindoUsuario, setSeguindoUsuario] = useState(true);

  // Estado para busca com o assistente inteligente (IA)
  const [mensagemIA, setMensagemIA] = useState('');
  const [consultandoIA, setConsultandoIA] = useState(false);
  const [respostaIAMensagem, setRespostaIAMensagem] = useState<string | null>(null);
  const [historicoIA, setHistoricoIA] = useState<MensagemHistorico[]>([]);

  // Executa a busca real de rotas no backend utilizando nomes e coordenadas
  const executarBuscaRotas = async (
    origem: { nome: string; local: SugestaoLocal | null },
    destino: { nome: string; local: SugestaoLocal | null }
  ) => {
    setCarregandoRotas(true);
    setMensagemErro(null);
    setMensagemValidacao(null);
    setRotaEscolhida(null);

    try {
      const params: ParametrosBuscaRota = {
        origem: origem.nome,
        destino: destino.nome,
        limite: 5,
      };

      if (origem.local) {
        params.origem_latitude = origem.local.latitude;
        params.origem_longitude = origem.local.longitude;
      }

      if (destino.local) {
        params.destino_latitude = destino.local.latitude;
        params.destino_longitude = destino.local.longitude;
      }

      const resposta = await buscarRotas(params);

      const opcoesFormatadas: OpcaoRota[] = (resposta.opcoes_de_rotas || []).map((opcao, index) => {
        const linhas = opcao.trechos.map((t) => t.linha).filter(Boolean);
        const descricoes = opcao.trechos.map((t) => t.nome_linha || t.sentido).filter(Boolean);
        const viaDescricao =
          descricoes.length > 0
            ? descricoes.join(' ➔ ')
            : opcao.tipo === 'direta'
            ? 'Linha direta'
            : 'Com integração';

        const distanciaKm =
          opcao.distancia_caminhada_total > 0
            ? `${(opcao.distancia_caminhada_total / 1000).toFixed(1)}km caminhada`
            : 'Próximo à parada';

        return {
          id: index + 1,
          tempo: Math.round(opcao.tempo_total_minutos),
          distancia: distanciaKm,
          via: viaDescricao,
          linhas,
          horarioSaida: opcao.horario_saida,
          horarioChegada: opcao.horario_chegada,
          detalhes: opcao,
        };
      });

      setRotas(opcoesFormatadas);

      // Se houver rotas, seleciona a primeira por padrão para já exibir no mapa
      if (opcoesFormatadas.length > 0) {
        setRotaEscolhida(opcoesFormatadas[0]);
      }
    } catch (erro: any) {
      console.error('Erro ao buscar rotas no backend:', erro);
      setMensagemErro(
        erro.message || 'Não foi possível consultar as rotas. Verifique a conexão com o servidor.'
      );
      setRotas([]);
    } finally {
      setCarregandoRotas(false);
    }
  };

  // Trata o clique no botão "Pesquisar rotas"
  const handlePesquisarRotas = async () => {
    const oTexto = origemTexto.trim();
    const dTexto = destinoTexto.trim();

    if (!oTexto && !dTexto) {
      setMensagemValidacao('Informe o local de partida e o local de destino.');
      return;
    }
    if (!oTexto) {
      setMensagemValidacao('Informe o local de onde você vai sair.');
      return;
    }
    if (!dTexto) {
      setMensagemValidacao('Informe para onde você deseja ir.');
      return;
    }

    setMensagemValidacao(null);

    let localOrigemFinal = origemLocal;
    let localDestinoFinal = destinoLocal;

    if (!localOrigemFinal && oTexto.length >= 2) {
      const sugestoesOrigem = await buscarSugestoesLocais(oTexto);
      if (sugestoesOrigem.length > 0) {
        localOrigemFinal = sugestoesOrigem[0];
        setOrigemLocal(localOrigemFinal);
        setOrigemTexto(localOrigemFinal.nome);
      } else {
        setMensagemValidacao(`Não encontramos o local "${oTexto}". Selecione uma opção sugerida.`);
        return;
      }
    }

    if (!localDestinoFinal && dTexto.length >= 2) {
      const sugestoesDestino = await buscarSugestoesLocais(dTexto);
      if (sugestoesDestino.length > 0) {
        localDestinoFinal = sugestoesDestino[0];
        setDestinoLocal(localDestinoFinal);
        setDestinoTexto(localDestinoFinal.nome);
      } else {
        setMensagemValidacao(`Não encontramos o local "${dTexto}". Selecione uma opção sugerida.`);
        return;
      }
    }

    await executarBuscaRotas(
      { nome: localOrigemFinal?.nome || oTexto, local: localOrigemFinal },
      { nome: localDestinoFinal?.nome || dTexto, local: localDestinoFinal }
    );
  };

  // Preenche a origem automaticamente com a localização atual do GPS
  const handleUsarLocalizacaoComoOrigem = () => {
    obterLocalizacao((coords) => {
      const localGps: SugestaoLocal = {
        id: 'gps-origem',
        nome: 'Minha localização atual',
        descricao: 'Posição identificada via GPS do dispositivo',
        latitude: coords.latitude,
        longitude: coords.longitude,
      };
      setOrigemLocal(localGps);
      setOrigemTexto('Minha localização atual');
      setMensagemValidacao(null);

      if (destinoLocal) {
        executarBuscaRotas(
          { nome: 'Minha localização atual', local: localGps },
          { nome: destinoLocal.nome, local: destinoLocal }
        );
      }
    });
  };

  // Inicia o acompanhamento em tempo real da rota selecionada
  const handleIniciarAcompanhamento = (rota: OpcaoRota) => {
    setRotaEscolhida(rota);
    setModoAcompanhamento(true);
    setSeguindoUsuario(true);
    iniciarAcompanhamento();
  };

  // Pausa o acompanhamento
  const handlePausarAcompanhamento = () => {
    pausarAcompanhamento();
  };

  // Retoma o acompanhamento
  const handleRetomarAcompanhamento = () => {
    retomarAcompanhamento();
    setSeguindoUsuario(true);
  };

  // Encerra o acompanhamento e retorna à visualização da rota
  const handleEncerrarAcompanhamento = () => {
    encerrarAcompanhamento();
    setModoAcompanhamento(false);
    setSeguindoUsuario(false);
  };

  // Centraliza o mapa na posição do usuário
  const handleCentralizarUsuario = () => {
    setSeguindoUsuario(true);
    if (!posicaoUsuario) {
      obterLocalizacao();
    }
  };

  // Seleção de local na lista de sugestões de Origem
  const handleSelecionarOrigem = (local: SugestaoLocal) => {
    setOrigemLocal(local);
    setOrigemTexto(local.nome);
    setMensagemValidacao(null);
    setRotaEscolhida(null);

    if (destinoLocal) {
      executarBuscaRotas(
        { nome: local.nome, local },
        { nome: destinoLocal.nome, local: destinoLocal }
      );
    }
  };

  // Seleção de local na lista de sugestões de Destino
  const handleSelecionarDestino = (local: SugestaoLocal) => {
    setDestinoLocal(local);
    setDestinoTexto(local.nome);
    setMensagemValidacao(null);
    setRotaEscolhida(null);

    if (origemLocal) {
      executarBuscaRotas(
        { nome: origemLocal.nome, local: origemLocal },
        { nome: local.nome, local }
      );
    }
  };

  const handleChangeOrigemTexto = (texto: string) => {
    setOrigemTexto(texto);
    setOrigemLocal(null);
    setRotaEscolhida(null);
    setMensagemValidacao(null);
  };

  const handleChangeDestinoTexto = (texto: string) => {
    setDestinoTexto(texto);
    setDestinoLocal(null);
    setRotaEscolhida(null);
    setMensagemValidacao(null);
  };

  const inverterTrajeto = () => {
    const novoOrigemTexto = destinoTexto;
    const novoDestinoTexto = origemTexto;
    const novoOrigemLocal = destinoLocal;
    const novoDestinoLocal = origemLocal;

    setOrigemTexto(novoOrigemTexto);
    setDestinoTexto(novoDestinoTexto);
    setOrigemLocal(novoOrigemLocal);
    setDestinoLocal(novoDestinoLocal);
    setRotaEscolhida(null);
    setMensagemValidacao(null);

    if (novoOrigemTexto && novoDestinoTexto) {
      executarBuscaRotas(
        { nome: novoOrigemLocal?.nome || novoOrigemTexto, local: novoOrigemLocal },
        { nome: novoDestinoLocal?.nome || novoDestinoTexto, local: novoDestinoLocal }
      );
    }
  };

  const fecharBusca = () => {
    encerrarAcompanhamento();
    setModoAcompanhamento(false);
    setBuscandoRota(false);
    setOrigemTexto('');
    setDestinoTexto('');
    setOrigemLocal(null);
    setDestinoLocal(null);
    setRotaEscolhida(null);
    setCarregandoRotas(false);
    setMensagemValidacao(null);
    setMensagemErro(null);
    setRotas([]);
    setRespostaIAMensagem(null);
    setHistoricoIA([]);
  };

  const selecionarAtalho = async (origemNome: string, destinoNome: string) => {
    setOrigemTexto(origemNome);
    setDestinoTexto(destinoNome);
    setBuscandoRota(true);
    setCarregandoRotas(true);
    setMensagemValidacao(null);

    try {
      const [sugOrigem, sugDestino] = await Promise.all([
        buscarSugestoesLocais(origemNome),
        buscarSugestoesLocais(destinoNome),
      ]);

      const localO = sugOrigem[0] || null;
      const localD = sugDestino[0] || null;

      setOrigemLocal(localO);
      setDestinoLocal(localD);

      await executarBuscaRotas(
        { nome: localO?.nome || origemNome, local: localO },
        { nome: localD?.nome || destinoNome, local: localD }
      );
    } catch {
      await executarBuscaRotas(
        { nome: origemNome, local: null },
        { nome: destinoNome, local: null }
      );
    }
  };

  const handleConsultarIA = async (e: React.FormEvent) => {
    e.preventDefault();
    const texto = mensagemIA.trim();
    if (!texto) {
      return;
    }

    setConsultandoIA(true);
    setRespostaIAMensagem(null);
    setMensagemErro(null);
    setMensagemValidacao(null);
    setRotas([]);
    setRotaEscolhida(null);
    setOrigemLocal(null);
    setDestinoLocal(null);
    setCarregandoRotas(false);
    setBuscandoRota(false);

    try {
      const resposta = await consultarAgente(texto, historicoIA);
      const mensagemResposta = resposta.mensagem || 'Resposta recebida do assistente.';
      const mensagensNovas: MensagemHistorico[] = [
        { papel: 'usuario', texto },
        { papel: 'assistente', texto: mensagemResposta },
      ];

      setHistoricoIA((historicoAtual) => [
        ...historicoAtual,
        ...mensagensNovas,
      ].slice(-LIMITE_HISTORICO_IA));

      setRespostaIAMensagem(mensagemResposta);

      if (resposta.intencao === 'buscar_rota') {
        const resultado = resposta.resultado;
        const resultadoViagens = ehResultadoViagensSucesso(resultado)
          ? resultado
          : null;
        const novaOrigemNome = resposta.origem
          || resultadoViagens?.origem.endereco
          || '';
        const novoDestinoNome = resposta.destino
          || resultadoViagens?.destino.endereco
          || '';

        setOrigemTexto(novaOrigemNome);
        setDestinoTexto(novoDestinoNome);
        setBuscandoRota(true);

        if (resposta.informacoes_faltantes.length > 0) {
          setMensagemValidacao(mensagemResposta);
        } else if (resultadoViagens) {
          const localOrigem = converterLocalIA(resultadoViagens.origem, 'ia-origem');
          const localDestino = converterLocalIA(resultadoViagens.destino, 'ia-destino');

          setOrigemLocal(localOrigem);
          setDestinoLocal(localDestino);
          const opcoesFormatadas = resultadoViagens.viagens.map(
            converterViagemParaOpcao,
          );
          setRotas(opcoesFormatadas);

          if (opcoesFormatadas.length > 0) {
            setRotaEscolhida(opcoesFormatadas[0]);
          } else {
            setMensagemErro(
              resultadoViagens.mensagem
              || mensagemResposta
              || 'Nenhuma opção de viagem encontrada.',
            );
          }
        } else if (resultado && !resultado.sucesso) {
          setMensagemErro(resultado.erro);
        } else {
          setMensagemValidacao(mensagemResposta);
        }
      } else if (resposta.intencao === 'consultar_linha') {
        setRespostaIAMensagem(
          ehResultadoLinhaSucesso(resposta.resultado)
            ? formatarResultadoLinha(resposta.resultado, mensagemResposta)
            : resposta.resultado && !resposta.resultado.sucesso
              ? resposta.resultado.erro
              : mensagemResposta,
        );
      } else {
        setRespostaIAMensagem(mensagemResposta);
      }
    } catch (erro: unknown) {
      console.warn('Erro ao consultar o assistente de IA:', erro);
      setRespostaIAMensagem(
        erro instanceof Error
          ? erro.message
          : 'Não foi possível consultar o assistente de IA.',
      );
    } finally {
      setConsultandoIA(false);
    }
  };

  const temCamposPreenchidos = origemTexto.trim().length > 0 && destinoTexto.trim().length > 0;

  // Pontos para exibição no mapa
  const pontoOrigemMapa = origemLocal
    ? { latitude: origemLocal.latitude, longitude: origemLocal.longitude, nome: origemLocal.nome }
    : null;

  const pontoDestinoMapa = destinoLocal
    ? { latitude: destinoLocal.latitude, longitude: destinoLocal.longitude, nome: destinoLocal.nome }
    : null;

  return (
    <div className="relative w-full h-screen overflow-hidden font-sans">
      
      {/* 1. MAPA INTERATIVO NO FUNDO */}
      <div className="absolute inset-0 w-full h-full z-0">
        <MapaInterativo
          posicaoUsuario={posicaoUsuario}
          pontoOrigem={pontoOrigemMapa}
          pontoDestino={pontoDestinoMapa}
          rotaSelecionada={rotaEscolhida}
          onLocalizarUsuario={handleCentralizarUsuario}
          carregandoLocalizacao={carregandoLocalizacao}
          seguindoUsuario={seguindoUsuario}
          onUsuarioArrastouMapa={() => setSeguindoUsuario(false)}
          modoAcompanhamento={modoAcompanhamento}
        />
      </div>

      {/* Camada flutuante de conteúdo (com pointer-events transparentes nas áreas livres do mapa) */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between pointer-events-none">
        
        {/* TOPO: HEADER INICIAL OU CARD DE TRAJETO OU BARRA DE NAVEGAÇÃO ATIVA */}
        <div className="w-full pointer-events-auto">
          {/* Header inicial quando não estiver na busca expandida nem em navegação */}
          {!buscandoRota && !modoAcompanhamento && (
            <header className="w-full p-4 flex flex-col gap-3 max-w-md mx-auto">
              <div className="flex items-center gap-3">
                <form
                  onSubmit={handleConsultarIA}
                  className="flex-1 flex items-center bg-[#05053a] text-white rounded-full px-4 py-2.5 shadow-xl active:scale-[0.99] transition-transform"
                >
                  <Search className="w-5 h-5 text-gray-300 mr-2.5 shrink-0" />
                  <input
                    type="text"
                    value={mensagemIA}
                    onChange={(e) => setMensagemIA(e.target.value)}
                    placeholder="Busque local, linha ou pergunte à IA..."
                    className="w-full bg-transparent border-none outline-none text-sm text-white placeholder-gray-300 font-medium"
                  />
                  <button
                    type="submit"
                    disabled={consultandoIA}
                    title="Consultar com IA"
                    className="p-1 rounded-full text-lime-300 hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {consultandoIA ? (
                      <div className="w-5 h-5 border-2 border-lime-300 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                  </button>
                </form>

                <button
                  onClick={() => navigate('/perfil')}
                  className="w-12 h-12 rounded-full bg-[#05053a] text-white flex items-center justify-center shadow-xl shrink-0 border-2 border-indigo-900 overflow-hidden active:scale-95 transition-transform cursor-pointer"
                  title="Meu perfil"
                >
                  <User className="w-6 h-6 text-indigo-200" />
                </button>
              </div>

              {/* Resposta do assistente de IA se houver */}
              {respostaIAMensagem && (
                <div className="relative bg-white/95 backdrop-blur border border-indigo-100 shadow-md rounded-2xl p-3.5 text-xs text-[#05053a] flex items-start justify-between gap-2 animate-fade-in">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-lime-600 shrink-0 mt-0.5" />
                    <p className="font-medium leading-relaxed">{respostaIAMensagem}</p>
                  </div>
                  <button
                    onClick={() => setRespostaIAMensagem(null)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Botão rápido para abrir busca ou sugestões conhecidas */}
              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none text-xs">
                <button
                  onClick={() => setBuscandoRota(true)}
                  className="px-3.5 py-1.5 rounded-full bg-[#05053a] text-lime-300 font-bold shadow-md hover:brightness-110 active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  Planejar Trajeto
                </button>
                <button
                  onClick={() => selecionarAtalho('Shopping Recife', 'Marco Zero')}
                  className="px-3 py-1.5 rounded-full bg-white/95 text-[#05053a] font-medium shadow-md hover:shadow-lg active:scale-95 transition-all shrink-0 cursor-pointer border border-slate-200"
                >
                  Shopping Recife ➔ Marco Zero
                </button>
                <button
                  onClick={() => selecionarAtalho('Universidade Federal de Pernambuco', 'Derby, Recife')}
                  className="px-3 py-1.5 rounded-full bg-white/95 text-[#05053a] font-medium shadow-md hover:shadow-lg active:scale-95 transition-all shrink-0 cursor-pointer border border-slate-200"
                >
                  UFPE ➔ Derby
                </button>
              </div>
            </header>
          )}

          {/* Topo quando está buscando rota (CardSeuTrajeto) e NÃO em acompanhamento */}
          {buscandoRota && !rotaEscolhida && !modoAcompanhamento && (
            <div className="flex flex-col">
              <CardSeuTrajeto
                origemTexto={origemTexto}
                destinoTexto={destinoTexto}
                origemLocal={origemLocal}
                destinoLocal={destinoLocal}
                onChangeOrigemTexto={handleChangeOrigemTexto}
                onChangeDestinoTexto={handleChangeDestinoTexto}
                onSelecionarOrigem={handleSelecionarOrigem}
                onSelecionarDestino={handleSelecionarDestino}
                onLimparOrigem={() => {
                  setOrigemTexto('');
                  setOrigemLocal(null);
                }}
                onLimparDestino={() => {
                  setDestinoTexto('');
                  setDestinoLocal(null);
                }}
                onInverter={inverterTrajeto}
                onFechar={fecharBusca}
                onPesquisar={handlePesquisarRotas}
                onUsarLocalizacaoAtual={handleUsarLocalizacaoComoOrigem}
                carregandoLocalizacao={carregandoLocalizacao}
                carregandoRotas={carregandoRotas}
                mensagemValidacao={mensagemValidacao}
              />
            </div>
          )}

          {/* Botão de voltar quando uma rota específica foi escolhida e NÃO em acompanhamento */}
          {buscandoRota && rotaEscolhida && !modoAcompanhamento && (
            <div className="p-4 max-w-md mx-auto w-full flex items-center justify-between">
              <button
                onClick={() => setRotaEscolhida(null)}
                className="w-11 h-11 rounded-2xl bg-[#05053a] text-lime-300 flex items-center justify-center shadow-xl cursor-pointer active:scale-95 transition-transform"
                title="Voltar para opções de rotas"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={fecharBusca}
                className="px-4 py-2 rounded-full bg-white/90 text-[#05053a] text-xs font-bold shadow-md hover:bg-white active:scale-95 transition-all cursor-pointer border border-slate-200"
              >
                Nova busca
              </button>
            </div>
          )}

          {/* Alerta de erro de localização se houver */}
          {erroLocalizacao && (
            <div className="w-full max-w-md mx-auto px-4 mt-2">
              <div className="bg-amber-600 text-white shadow-lg rounded-2xl p-3 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{erroLocalizacao}</span>
                </div>
                <button
                  onClick={limparErroLocalizacao}
                  className="p-1 hover:opacity-80 cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* BASE: LISTA DE SUGESTÕES OU DETALHES OU ACOMPANHAMENTO ATIVO */}
        <div className="w-full pointer-events-auto">
          {/* 1. MODO ACOMPANHAMENTO ATIVO */}
          {modoAcompanhamento && rotaEscolhida && (
            <CardAcompanhamento
              rota={rotaEscolhida}
              posicaoUsuario={posicaoUsuario}
              statusRastreamento={statusRastreamento}
              destinoNome={destinoTexto || 'Destino'}
              destinoCoordenadas={pontoDestinoMapa}
              onPausar={handlePausarAcompanhamento}
              onRetomar={handleRetomarAcompanhamento}
              onEncerrar={handleEncerrarAcompanhamento}
              onCentralizar={handleCentralizarUsuario}
              seguindoUsuario={seguindoUsuario}
            />
          )}

          {/* 2. LISTA DE SUGESTÕES DE ROTAS */}
          {!modoAcompanhamento && buscandoRota && temCamposPreenchidos && !rotaEscolhida && (
            <CardMaisRotas
              rotas={rotas}
              carregando={carregandoRotas}
              mensagemErro={mensagemErro}
              onSelecionarRota={(rota) => setRotaEscolhida(rota)}
            />
          )}

          {/* 3. CARD DE ROTA SELECIONADA (com botão de Iniciar Acompanhamento) */}
          {!modoAcompanhamento && buscandoRota && rotaEscolhida && (
            <CardRotaSelecionada
              rota={rotaEscolhida}
              onVerMaisRotas={() => setRotaEscolhida(null)}
              onCancelar={fecharBusca}
              onIniciarAcompanhamento={handleIniciarAcompanhamento}
            />
          )}
        </div>

      </div>

    </div>
  );
}
