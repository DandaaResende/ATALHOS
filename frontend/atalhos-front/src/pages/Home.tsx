import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, ChevronLeft, Sparkles, X } from 'lucide-react';
import { CardSeuTrajeto } from '../components/CardSeuTrajeto';
import { CardMaisRotas } from '../components/CardMaisRotas';
import type { OpcaoRota } from '../components/CardMaisRotas';
import { CardRotaSelecionada } from '../components/CardRotaSelecionada';
import {
  buscarRotas,
  consultarIA,
  buscarSugestoesLocais,
  type SugestaoLocal,
  type ParametrosBuscaRota,
} from '../services/api';

export function Home() {
  const navigate = useNavigate();

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

  // Estado para busca com o assistente inteligente (IA)
  const [mensagemIA, setMensagemIA] = useState('');
  const [consultandoIA, setConsultandoIA] = useState(false);
  const [respostaIAMensagem, setRespostaIAMensagem] = useState<string | null>(null);

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

    // Se o usuário digitou sem selecionar a sugestão, tenta resolver automaticamente o local mais próximo
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

  // Seleção de local na lista de sugestões de Origem
  const handleSelecionarOrigem = (local: SugestaoLocal) => {
    setOrigemLocal(local);
    setOrigemTexto(local.nome);
    setMensagemValidacao(null);
    setRotaEscolhida(null);

    // Se o destino já estiver selecionado, pesquisa automaticamente
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

    // Se a origem já estiver selecionada, pesquisa automaticamente
    if (origemLocal) {
      executarBuscaRotas(
        { nome: origemLocal.nome, local: origemLocal },
        { nome: local.nome, local }
      );
    }
  };

  // Limpa o local de origem se o usuário alterar o texto manualmente
  const handleChangeOrigemTexto = (texto: string) => {
    setOrigemTexto(texto);
    setOrigemLocal(null);
    setRotaEscolhida(null);
    setMensagemValidacao(null);
  };

  // Limpa o local de destino se o usuário alterar o texto manualmente
  const handleChangeDestinoTexto = (texto: string) => {
    setDestinoTexto(texto);
    setDestinoLocal(null);
    setRotaEscolhida(null);
    setMensagemValidacao(null);
  };

  // Inverte os locais de partida e destino (incluindo texto e coordenadas)
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
  };

  // Seleciona um atalho sugerido pré-definido
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

  // Consulta por linguagem natural com o assistente de IA
  const handleConsultarIA = async (e: React.FormEvent) => {
    e.preventDefault();
    const texto = mensagemIA.trim();
    if (!texto) {
      setBuscandoRota(true);
      return;
    }

    setConsultandoIA(true);
    setRespostaIAMensagem(null);

    try {
      const resposta = await consultarIA(texto);

      if (resposta.mensagem) {
        setRespostaIAMensagem(resposta.mensagem);
      }

      if (resposta.intencao === 'buscar_rota') {
        const novaOrigemNome = resposta.origem || origemTexto || '';
        const novoDestinoNome = resposta.destino || destinoTexto || '';

        setOrigemTexto(novaOrigemNome);
        setDestinoTexto(novoDestinoNome);
        setBuscandoRota(true);

        if (novaOrigemNome && novoDestinoNome) {
          await selecionarAtalho(novaOrigemNome, novoDestinoNome);
        }
      } else {
        setRespostaIAMensagem(resposta.mensagem || 'Como posso te ajudar com seu trajeto hoje?');
      }
    } catch (erro: any) {
      console.warn('Assistente de IA indisponível, abrindo busca padrão:', erro);
      setBuscandoRota(true);
      setDestinoTexto(texto);
    } finally {
      setConsultandoIA(false);
    }
  };

  const temCamposPreenchidos = origemTexto.trim().length > 0 && destinoTexto.trim().length > 0;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-100 flex flex-col justify-between font-sans">
      
      {/* 1. HEADER INICIAL COM BUSCA INTELIGENTE */}
      {!buscandoRota && (
        <header className="relative z-10 w-full p-4 flex flex-col gap-3 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <form
              onSubmit={handleConsultarIA}
              className="flex-1 flex items-center bg-[#05053a] text-white rounded-full px-4 py-2.5 shadow-lg active:scale-[0.99] transition-transform"
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
              className="w-12 h-12 rounded-full bg-[#05053a] text-white flex items-center justify-center shadow-lg shrink-0 border-2 border-indigo-900 overflow-hidden active:scale-95 transition-transform cursor-pointer"
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

          {/* Sugestões rápidas de locais conhecidos */}
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none text-xs">
            <span className="text-slate-500 font-semibold shrink-0">Atalhos:</span>
            <button
              onClick={() => selecionarAtalho('Shopping Recife', 'Marco Zero')}
              className="px-3 py-1.5 rounded-full bg-white text-[#05053a] font-medium shadow-sm hover:shadow active:scale-95 transition-all shrink-0 cursor-pointer border border-slate-200"
            >
              Shopping Recife ➔ Marco Zero
            </button>
            <button
              onClick={() => selecionarAtalho('Universidade Federal de Pernambuco', 'Derby, Recife')}
              className="px-3 py-1.5 rounded-full bg-white text-[#05053a] font-medium shadow-sm hover:shadow active:scale-95 transition-all shrink-0 cursor-pointer border border-slate-200"
            >
              UFPE ➔ Derby
            </button>
            <button
              onClick={() => selecionarAtalho('Afogados, Recife', 'Boa Viagem, Recife')}
              className="px-3 py-1.5 rounded-full bg-white text-[#05053a] font-medium shadow-sm hover:shadow active:scale-95 transition-all shrink-0 cursor-pointer border border-slate-200"
            >
              Afogados ➔ Boa Viagem
            </button>
          </div>
        </header>
      )}

      {/* 2. TOPO QUANDO ESTÁ BUSCANDO ROTA */}
      {buscandoRota && !rotaEscolhida && (
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
            carregandoRotas={carregandoRotas}
            mensagemValidacao={mensagemValidacao}
          />

          {/* Feedback ou aviso da IA se houver */}
          {respostaIAMensagem && (
            <div className="w-full max-w-md mx-auto px-4 -mt-2 mb-2">
              <div className="bg-white/95 backdrop-blur border border-indigo-100 shadow rounded-2xl p-3 text-xs text-[#05053a] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-lime-600 shrink-0" />
                  <p className="font-medium">{respostaIAMensagem}</p>
                </div>
                <button
                  onClick={() => setRespostaIAMensagem(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botão flutuante de voltar quando já escolheu uma rota */}
      {buscandoRota && rotaEscolhida && (
        <div className="relative z-20 w-full max-w-md mx-auto p-4">
          <button
            onClick={() => setRotaEscolhida(null)}
            className="w-11 h-11 rounded-2xl bg-[#05053a] text-lime-300 flex items-center justify-center shadow-lg cursor-pointer active:scale-95 transition-transform"
            title="Voltar para opções de rotas"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* 3. PAINEL INFERIOR: LISTA DE ROTAS OU ROTA SELECIONADA */}
      {buscandoRota && temCamposPreenchidos && !rotaEscolhida && (
        <CardMaisRotas
          rotas={rotas}
          carregando={carregandoRotas}
          mensagemErro={mensagemErro}
          onSelecionarRota={(rota) => setRotaEscolhida(rota)}
        />
      )}

      {buscandoRota && rotaEscolhida && (
        <CardRotaSelecionada
          rota={rotaEscolhida}
          onVerMaisRotas={() => setRotaEscolhida(null)}
          onCancelar={fecharBusca}
        />
      )}

      {/* Estado neutro inicial */}
      {!buscandoRota && (
        <div className="relative z-0 flex-1 flex flex-col items-center justify-center px-6 text-center text-slate-400">
          <div className="w-20 h-20 rounded-3xl bg-[#05053a]/5 flex items-center justify-center mb-3">
            <Search className="w-9 h-9 text-[#05053a]/40" />
          </div>
          <p className="text-sm font-semibold text-[#05053a]/60">
            Digite o nome dos locais para encontrar sua rota
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Ex: Shopping Recife, UFPE, Marco Zero, Afogados ou Boa Viagem.
          </p>
        </div>
      )}

    </div>
  );
}
