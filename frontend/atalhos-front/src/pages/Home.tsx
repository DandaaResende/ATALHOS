import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, ChevronLeft } from 'lucide-react';
import { CardSeuTrajeto } from '../components/CardSeuTrajeto';
import { CardMaisRotas } from '../components/CardMaisRotas';
import type { OpcaoRota } from '../components/CardMaisRotas';
import { CardRotaSelecionada } from '../components/CardRotaSelecionada';

// Dados mockados das rotas sugeridas (iguais à imagem)
const ROTAS_SUGERIDAS: OpcaoRota[] = [
  { id: 1, tempo: 21, distancia: '5.5km', via: 'Via Rua São Miguel, Afogados' },
  { id: 2, tempo: 23, distancia: '8km', via: 'Via Rua Vinícius Ferreira, Afogados' },
];

export function Home() {
  const navigate = useNavigate();

  const [buscandoRota, setBuscandoRota] = useState(false);
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Guarda a rota que o usuário escolheu (null = ainda escolhendo na lista)
  const [rotaEscolhida, setRotaEscolhida] = useState<OpcaoRota | null>(null);

  const camposPreenchidos = origem.trim().length > 0 && destino.trim().length > 0;

  const handleOrigemChange = (valor: string) => {
    setOrigem(valor);
    setRotaEscolhida(null); // Volta para sugestões se alterar o endereço
  };

  const handleDestinoChange = (valor: string) => {
    setDestino(valor);
    setRotaEscolhida(null);
    if (origem.trim().length > 0 && valor.trim().length > 0) {
      setCarregando(true);
      setTimeout(() => setCarregando(false), 500);
    }
  };

  const inverterTrajeto = () => {
    setOrigem(destino);
    setDestino(origem);
    setRotaEscolhida(null);
  };

  const fecharBusca = () => {
    setBuscandoRota(false);
    setOrigem('');
    setDestino('');
    setRotaEscolhida(null);
    setCarregando(false);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-100 flex flex-col justify-between font-sans">
      
      {/* 1. HEADER INICIAL */}
      {!buscandoRota && (
        <header className="relative z-10 w-full p-4 flex items-center gap-3 max-w-md mx-auto">
          <button
            onClick={() => setBuscandoRota(true)}
            className="flex-1 flex items-center bg-[#05053a] text-white rounded-full px-4 py-3 shadow-lg text-left cursor-pointer active:scale-[0.99] transition-transform"
          >
            <Search className="w-5 h-5 text-gray-300 mr-3 shrink-0" />
            <span className="text-sm text-gray-300 truncate">
              Busque sua linha ou parada
            </span>
          </button>

          <button
            onClick={() => navigate('/perfil')}
            className="w-12 h-12 rounded-full bg-[#05053a] text-white flex items-center justify-center shadow-lg shrink-0 border-2 border-indigo-900 overflow-hidden active:scale-95 transition-transform cursor-pointer"
          >
            <User className="w-6 h-6 text-indigo-200" />
          </button>
        </header>
      )}

      {/* 2. TOPO QUANDO ESTÁ BUSCANDO ROTA */}
      {buscandoRota && !rotaEscolhida && (
        <CardSeuTrajeto
          origem={origem}
          destino={destino}
          onChangeOrigem={handleOrigemChange}
          onChangeDestino={handleDestinoChange}
          onInverter={inverterTrajeto}
          onFechar={fecharBusca}
        />
      )}

      {/* Botão flutuante de voltar quando já escolheu uma rota (igual ao ícone '<' azul escuro no canto superior esquerdo da imagem) */}
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

      {/* 3. PAINEL INFERIOR: LISTA DE SUGESTÕES OU ROTA SELECIONADA */}
      {buscandoRota && camposPreenchidos && !rotaEscolhida && (
        <CardMaisRotas
          rotas={ROTAS_SUGERIDAS}
          carregando={carregando}
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

    </div>
  );
}