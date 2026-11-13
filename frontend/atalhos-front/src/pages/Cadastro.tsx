import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, UserPlus, Bus, ShieldCheck, Route, HeartHandshake } from 'lucide-react';

export function Cadastro() {
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');

  const handleCadastro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email) return alert('Preencha todos os campos!');
    alert('Conta criada com sucesso!');
    navigate('/home'); // Vai direto para a Home após cadastrar
  };

  return (
    <div className="relative w-full min-h-screen bg-slate-100 flex flex-col font-sans overflow-x-hidden">
      
      {/* 1. HERO / TOPO IMERSIVO COM BOTÃO DE VOLTAR */}
      <div className="relative w-full bg-[#05053a] text-white pt-6 pb-24 px-6 rounded-b-[40px] shadow-xl overflow-hidden">
        {/* Elementos decorativos de fundo */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-indigo-900/40 blur-xl pointer-events-none"></div>
        <div className="absolute top-16 -left-10 w-36 h-36 rounded-full bg-lime-300/10 blur-lg pointer-events-none"></div>
        <svg
          className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
          viewBox="0 0 400 220"
          fill="none"
        >
          <path
            d="M-20 160 C 100 160, 140 40, 260 40 C 330 40, 360 120, 420 100"
            stroke="#bef264"
            strokeWidth="4"
            strokeDasharray="10 8"
          />
          <circle cx="260" cy="40" r="6" fill="#bef264" />
        </svg>

        {/* Barra superior com seta de voltar */}
        <div className="relative z-10 w-full max-w-md mx-auto flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors active:scale-95 cursor-pointer"
            title="Voltar para o login"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold tracking-widest uppercase text-indigo-200">
            Novo Cadastro
          </span>
          <div className="w-9"></div> {/* Espaçador para centralizar o título */}
        </div>

        {/* Ícone e Título da Marca */}
        <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center mb-3 shadow-lg">
            <Bus className="w-7 h-7 text-lime-300" />
          </div>
          <span className="text-lg font-extrabold tracking-widest uppercase text-white">
            ATALHOS
          </span>
          <p className="text-xs text-indigo-200 mt-1 max-w-xs leading-relaxed">
            Crie sua conta em segundos e personalize seus trajetos pela cidade.
          </p>
        </div>
      </div>

      {/* 2. CARD PRINCIPAL DE CADASTRO (Sobreposto ao topo) */}
      <main className="relative z-20 flex-1 w-full max-w-md mx-auto px-5 -mt-14 pb-8 flex flex-col justify-between gap-6">
        
        <div className="bg-white rounded-[28px] shadow-[0_10px_35px_rgba(5,5,58,0.08)] border border-slate-100 p-6 flex flex-col gap-5">
          <div className="text-center flex flex-col gap-1">
            <h1 className="text-xl font-extrabold text-[#05053a]">Crie seu perfil</h1>
            <p className="text-xs text-slate-500">
              Informe seu nome e e-mail para começar
            </p>
          </div>

          <form onSubmit={handleCadastro} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#05053a] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#05053a]" /> Nome completo
              </label>
              <input 
                type="text" 
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Maria Lima" 
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#05053a] font-medium outline-none focus:bg-white focus:border-[#05053a] transition-all"
              />
            </div>

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
              <UserPlus className="w-4 h-4 text-lime-300" />
              Cadastrar e Entrar
            </button>
          </form>

          {/* Divisor */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink mx-3 text-[11px] font-medium text-slate-400 uppercase">
              Já possui cadastro?
            </span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          {/* Botão secundário para voltar ao login */}
          <button 
            type="button"
            onClick={() => navigate('/')}
            className="w-full py-3 rounded-xl bg-[#c5dff0]/60 text-[#05053a] font-bold text-xs hover:bg-[#c5dff0] transition-colors cursor-pointer active:scale-[0.98]"
          >
            Fazer login na minha conta
          </button>
        </div>

        {/* 3. RODAPÉ INFORMATIVO */}
        <div className="grid grid-cols-3 gap-2.5 pt-2">
          <div className="bg-white/80 border border-slate-200/60 rounded-2xl p-3 flex flex-col items-center text-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-[#05053a]/10 text-[#05053a] flex items-center justify-center">
              <Route className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-[#05053a] leading-tight">
              Menos baldeações
            </span>
          </div>

          <div className="bg-white/80 border border-slate-200/60 rounded-2xl p-3 flex flex-col items-center text-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-[#05053a]/10 text-[#05053a] flex items-center justify-center">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-[#05053a] leading-tight">
              Acessibilidade
            </span>
          </div>

          <div className="bg-white/80 border border-slate-200/60 rounded-2xl p-3 flex flex-col items-center text-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-[#05053a]/10 text-[#05053a] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-[#05053a] leading-tight">
              Acesso rápido
            </span>
          </div>
        </div>

      </main>
    </div>
  );
}