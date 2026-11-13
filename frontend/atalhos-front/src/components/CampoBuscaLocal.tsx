import { useState, useEffect, useRef } from 'react';
import { MapPin, X, Loader2, CheckCircle2 } from 'lucide-react';
import { buscarSugestoesLocais, type SugestaoLocal } from '../services/api';

interface CampoBuscaLocalProps {
  label?: string;
  placeholder: string;
  valor: string;
  localSelecionado: SugestaoLocal | null;
  onChangeTexto: (texto: string) => void;
  onSelecionarLocal: (local: SugestaoLocal) => void;
  onLimpar: () => void;
  autoFocus?: boolean;
  onEnter?: () => void;
}

export function CampoBuscaLocal({
  placeholder,
  valor,
  localSelecionado,
  onChangeTexto,
  onSelecionarLocal,
  onLimpar,
  autoFocus,
  onEnter,
}: CampoBuscaLocalProps) {
  const [sugestoes, setSugestoes] = useState<SugestaoLocal[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [termoPesquisado, setTermoPesquisado] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fecha o menu de sugestões ao clicar fora do componente
  useEffect(() => {
    function handleClickFora(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setMenuAberto(false);
      }
    }

    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  // Busca sugestões com debounce conforme o usuário digita
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novoValor = e.target.value;
    onChangeTexto(novoValor);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (novoValor.trim().length >= 2) {
      setBuscando(true);
      setMenuAberto(true);
      setTermoPesquisado(novoValor.trim());

      debounceRef.current = setTimeout(async () => {
        try {
          const resultado = await buscarSugestoesLocais(novoValor.trim());
          setSugestoes(resultado);
        } catch (erro) {
          console.error('Erro ao buscar sugestões:', erro);
          setSugestoes([]);
        } finally {
          setBuscando(false);
        }
      }, 350);
    } else {
      setSugestoes([]);
      setBuscando(false);
      setMenuAberto(false);
    }
  };

  const handleSelecionar = (local: SugestaoLocal) => {
    onSelecionarLocal(local);
    setMenuAberto(false);
    setSugestoes([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (sugestoes.length > 0 && menuAberto) {
        e.preventDefault();
        handleSelecionar(sugestoes[0]);
      } else if (onEnter) {
        e.preventDefault();
        onEnter();
      }
    } else if (e.key === 'Escape') {
      setMenuAberto(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          autoFocus={autoFocus}
          value={valor}
          onChange={handleChange}
          onFocus={() => {
            if (sugestoes.length > 0) setMenuAberto(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-transparent border-none outline-none text-sm text-[#05053a] placeholder-[#05053a]/50 font-medium pr-7"
        />

        {/* Ícone de status (carregando, confirmado ou limpar) */}
        <div className="absolute right-0 flex items-center gap-1">
          {buscando ? (
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
          ) : localSelecionado ? (
            <span title="Local identificado com sucesso">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </span>
          ) : valor ? (
            <button
              type="button"
              onClick={onLimpar}
              className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Limpar campo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Menu suspenso de sugestões (Autocomplete) */}
      {menuAberto && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200/80 z-50 overflow-hidden max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          {buscando && sugestoes.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#05053a]" />
              <span>Buscando locais correspondentes...</span>
            </div>
          ) : sugestoes.length > 0 ? (
            <ul className="divide-y divide-slate-100 py-1">
              {sugestoes.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelecionar(item)}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 active:bg-slate-100 flex items-start gap-2.5 transition-colors cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#05053a]/5 flex items-center justify-center shrink-0 mt-0.5 text-[#05053a]">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#05053a] truncate">
                        {item.nome}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.descricao}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : termoPesquisado.length >= 2 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              <p className="font-semibold text-slate-700">Nenhum local encontrado</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Verifique a digitação ou tente um ponto de referência próximo.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
