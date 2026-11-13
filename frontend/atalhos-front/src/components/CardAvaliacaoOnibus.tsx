import { useState } from 'react';
import { ChevronLeft, X, CheckCircle2 } from 'lucide-react';
import type { OnibusParada, ParadaComOnibus } from '../types/parada';
import { salvarAvaliacaoOnibus } from '../services/paradasService';

interface CardAvaliacaoOnibusProps {
  onibus: OnibusParada;
  parada: ParadaComOnibus;
  onVoltar: () => void;
  onFechar: () => void;
}

export function CardAvaliacaoOnibus({
  onibus,
  parada,
  onVoltar,
  onFechar,
}: CardAvaliacaoOnibusProps) {
  const [chegouNoHorario, setChegouNoHorario] = useState<'Sim' | 'Não' | 'Não sei'>('Sim');
  const [lotacao, setLotacao] = useState<'Cheio' | 'Moderado' | 'Vazio' | 'Não sei'>('Moderado');
  const [observacao, setObservacao] = useState('');
  const [enviado, setEnviado] = useState(false);

  const opcoesHorario: Array<'Sim' | 'Não' | 'Não sei'> = ['Sim', 'Não', 'Não sei'];
  const opcoesLotacao: Array<'Cheio' | 'Moderado' | 'Vazio' | 'Não sei'> = [
    'Cheio',
    'Moderado',
    'Vazio',
    'Não sei',
  ];

  const handleEnviar = (e: React.FormEvent) => {
    e.preventDefault();

    salvarAvaliacaoOnibus({
      paradaId: parada.id,
      paradaNome: parada.nome,
      linha: onibus.linha,
      nomeLinha: onibus.nomeLinha,
      chegouNoHorario,
      lotacao,
      observacao: observacao.trim() || undefined,
    });

    setEnviado(true);
  };

  return (
    <aside
      aria-label="Avaliação do Ônibus"
      className="w-full max-w-md mx-auto bg-[#f8fbff] text-[#05053a] rounded-t-[32px] sm:rounded-[32px] shadow-2xl border-t sm:border border-indigo-100 p-5 pb-7 flex flex-col gap-4 animate-slide-up pointer-events-auto select-none"
    >
      {/* Barra superior de arraste */}
      <div className="w-16 h-1 bg-[#151558] rounded-full mx-auto -mt-1 opacity-80" />

      {/* Navegação e Cabeçalho: Voltar, Nome da Linha e Badge da Linha */}
      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="flex items-start gap-2 min-w-0">
          <button
            type="button"
            onClick={onVoltar}
            title="Voltar para a parada"
            aria-label="Voltar para a parada"
            className="p-1 -ml-1 rounded-full text-[#0c0c4f] hover:bg-slate-100 active:scale-90 transition-all cursor-pointer shrink-0 mt-0.5"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div>
            <h2 className="text-lg font-bold text-[#0c0c4f] leading-snug tracking-tight">
              {onibus.nomeLinha}
            </h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Parada: {parada.nome}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="bg-[#05053a] text-lime-300 font-extrabold text-sm px-4 py-1 rounded-full shadow-sm">
            {onibus.linha}
          </span>

          <button
            type="button"
            onClick={onFechar}
            title="Fechar avaliação"
            aria-label="Fechar avaliação"
            className="p-1 rounded-full hover:bg-slate-100 active:scale-90 transition-all cursor-pointer text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Estado pós-envio com confirmação */}
      {enviado ? (
        <div className="py-8 px-4 flex flex-col items-center text-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 animate-bounce" />
          <h3 className="text-base font-bold text-[#0c0c4f]">
            Avaliação enviada com sucesso!
          </h3>
          <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
            Seu relato em tempo real ajuda centenas de outros passageiros que utilizam a linha {onibus.linha}.
          </p>
          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              onClick={onVoltar}
              className="px-5 py-2 rounded-full bg-[#05053a] text-lime-300 text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              Voltar para parada
            </button>
            <button
              type="button"
              onClick={onFechar}
              className="px-5 py-2 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300 active:scale-95 transition-all cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      ) : (
        /* Formulário de Avaliação correspondente à Imagem 2 */
        <form onSubmit={handleEnviar} className="flex flex-col gap-4 text-left">
          {/* Pergunta 1: Chegou no horário previsto? */}
          <fieldset className="flex flex-col gap-2 border-none p-0 m-0">
            <legend className="text-xs font-bold text-[#0c0c4f]">
              Chegou no horário previsto?
            </legend>
            <div className="flex items-center gap-2">
              {opcoesHorario.map((opcao) => {
                const selecionado = chegouNoHorario === opcao;
                return (
                  <button
                    key={opcao}
                    type="button"
                    onClick={() => setChegouNoHorario(opcao)}
                    className={`flex-1 py-2 px-3 rounded-full text-xs font-bold transition-all cursor-pointer text-center ${
                      selecionado
                        ? 'bg-[#05053a] text-white shadow-md'
                        : 'bg-[#b8d7ea] text-[#0c0c4f] hover:bg-[#a6cae0]'
                    }`}
                  >
                    {opcao}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Pergunta 2: Lotação do ônibus */}
          <fieldset className="flex flex-col gap-2 border-none p-0 m-0">
            <legend className="text-xs font-bold text-[#0c0c4f]">
              Lotação do ônibus
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {opcoesLotacao.map((opcao) => {
                const selecionado = lotacao === opcao;
                return (
                  <button
                    key={opcao}
                    type="button"
                    onClick={() => setLotacao(opcao)}
                    className={`py-2 px-4 rounded-full text-xs font-bold transition-all cursor-pointer text-center ${
                      selecionado
                        ? 'bg-[#05053a] text-white shadow-md'
                        : 'bg-[#b8d7ea] text-[#0c0c4f] hover:bg-[#a6cae0]'
                    }`}
                  >
                    {opcao}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Pergunta 3: Outra observação */}
          <fieldset className="flex flex-col gap-1.5 border-none p-0 m-0">
            <label
              htmlFor="observacao-experiencia"
              className="text-[11px] font-bold text-[#0c0c4f] leading-snug"
            >
              Alguma outra observação sobre a experiência? (Qualidade do ônibus,
              comportamento do motorista, trajeto ruim, etc).
            </label>
            <textarea
              id="observacao-experiencia"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Digite aqui"
              rows={3}
              className="w-full rounded-2xl bg-[#b8d7ea] p-3 text-xs text-[#05053a] placeholder-[#4d7088] font-medium outline-none resize-none focus:ring-2 focus:ring-[#05053a]/30"
            />
          </fieldset>

          {/* Botão de Enviar */}
          <div className="pt-1">
            <button
              type="submit"
              className="px-8 py-2.5 rounded-full bg-[#05053a] text-lime-300 text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              Enviar
            </button>
          </div>
        </form>
      )}
    </aside>
  );
}
