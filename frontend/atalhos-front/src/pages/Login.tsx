import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, Bus, MapPin, Clock, Sparkles } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return alert('Por favor, digite seu e-mail');
    navigate('/home');
  };

  return (
    <div className="relative w-full min-h-screen bg-slate-100 flex flex-col font-sans overflow-x-hidden">
      
      {/* 1. HERO / TOPO IMERSIVO COM IDENTIDADE VISUAL */}
      <div className="relative w-full bg-[#05053a] text-white pt-10 pb-24 px-6 rounded-b-[40px] shadow-xl overflow-hidden">
        {/* Elementos decorativos de fundo (linhas de trajeto e círculos sutis) */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-indigo-900/40 blur-xl pointer-events-none"></div>
        <div className="absolute top-16 -left-10 w-36 h-36 rounded-full bg-lime-300/10 blur-lg pointer-events-none"></div>
        <svg
          className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
          viewBox="0 0 400 220"
          fill="none"
        >
          <path
            d="M-20 180 C 90 180, 120 50, 230 50 C 310 50, 340 130, 420 110"
            stroke="#bef264"
            strokeWidth="4"
            strokeDasharray="10 8"
          />
          <circle cx="230" cy="50" r="6" fill="#bef264" />
        </svg>

        {/* Logo e Slogan */}
        <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center mb-4 shadow-lg">
            <Bus className="w-8 h-8 text-lime-300" />
          </div>
          <span className="text-xl font-extrabold tracking-widest uppercase text-white">
            ATALHOS
          </span>
          <p className="text-xs text-indigo-200 mt-1.5 max-w-xs leading-relaxed">
            Seu guia inteligente de transporte público, paradas e melhores trajetos na cidade.
          </p>
        </div>
      </div>

      {/* 2. CARD PRINCIPAL DE LOGIN (Sobreposto ao topo) */}
      <main className="relative z-20 flex-1 w-full max-w-md mx-auto px-5 -mt-14 pb-8 flex flex-col justify-between gap-6">
        
        <div className="bg-white rounded-[28px] shadow-[0_10px_35px_rgba(5,5,58,0.08)] border border-slate-100 p-6 flex flex-col gap-5">
          <div className="text-center flex flex-col gap-1">
            <h1 className="text-xl font-extrabold text-[#05053a]">Bem-vindo(a) de volta!</h1>
            <p className="text-xs text-slate-500">
              Informe seu e-mail para continuar seus trajetos
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#05053a] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#05053a]" /> E-mail
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com" 
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#05053a] font-medium outline-none focus:bg-white focus:border-[#05053a] transition-all"
              />
            </div>

            <button 
              type="submit"
              className="w-full py-3.5 mt-1 rounded-xl bg-[#05053a] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#0a0a5c] transition-all cursor-pointer shadow-md active:scale-[0.98]"
            >
              Entrar no aplicativo
              <ArrowRight className="w-4 h-4 text-lime-300" />
            </button>
          </form>

          {/* Divisor */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink mx-3 text-[11px] font-medium text-slate-400 uppercase">
              Primeiro acesso?
            </span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          {/* Botão secundário para criar conta */}
          <button 
            type="button"
            onClick={() => navigate('/cadastro')}
            className="w-full py-3 rounded-xl bg-[#c5dff0]/60 text-[#05053a] font-bold text-xs hover:bg-[#c5dff0] transition-colors cursor-pointer active:scale-[0.98]"
          >
            Criar uma nova conta gratuitamente
          </button>
        </div>

        {/* 3. RODAPÉ INFORMATIVO (Preenche a parte inferior com recursos do app) */}
        <div className="grid grid-cols-3 gap-2.5 pt-2">
          <div className="bg-white/80 border border-slate-200/60 rounded-2xl p-3 flex flex-col items-center text-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-[#05053a]/10 text-[#05053a] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-[#05053a] leading-tight">
              Tempo real
            </span>
          </div>

          <div className="bg-white/80 border border-slate-200/60 rounded-2xl p-3 flex flex-col items-center text-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-[#05053a]/10 text-[#05053a] flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-[#05053a] leading-tight">
              Paradas próximas
            </span>
          </div>

          <div className="bg-white/80 border border-slate-200/60 rounded-2xl p-3 flex flex-col items-center text-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-[#05053a]/10 text-[#05053a] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-[#05053a] leading-tight">
              Rotas sob medida
            </span>
          </div>
        </div>

      </main>
    </div>
  );
}