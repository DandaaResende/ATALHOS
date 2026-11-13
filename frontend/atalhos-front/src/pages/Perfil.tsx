import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Sliders, Check, LogOut } from 'lucide-react';

export function Perfil() {
  const navigate = useNavigate();

  const [nome, setNome] = useState('Maria Lima');
  const [email, setEmail] = useState('limamaria@email.com');

  const [preferencias, setPreferencias] = useState({
    menosBald: true,
    menosCaminhada: false,
    acessibilidade: false,
  });

  const togglePreferencia = (chave: keyof typeof preferencias) => {
    setPreferencias((prev) => ({
      ...prev,
      [chave]: !prev[chave],
    }));
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-100 flex flex-col justify-between font-sans">
      
      {/* 1. CABEÇALHO COMPACTO E ALINHADO */}
      <div className="w-full bg-[#05053a] shadow-md z-10">
        <header className="w-full max-w-md mx-auto px-3 py-4 flex items-center gap-2 text-white">
          <button 
            onClick={() => navigate('/')} 
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold tracking-wide">Meu Perfil</span>
        </header>
      </div>

      {/* 2. CONTEÚDO PRINCIPAL */}
      <main className="flex-1 w-full max-w-md mx-auto p-4 overflow-y-auto flex flex-col gap-4">
        
        {/* Card de Identificação */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-[#05053a] text-lime-300 flex items-center justify-center mb-2.5 shadow-md border-2 border-indigo-900">
            <User className="w-8 h-8" />
          </div>
          <p className="text-base font-extrabold text-[#05053a] leading-tight">
            {nome}
          </p>
          <span className="text-xs font-medium text-slate-500 mt-0.5">
            Passageira Frequente
          </span>
        </div>

        {/* Campos de Dados Pessoais (Nome e E-mail) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <h3 className="text-xs font-bold text-[#05053a] uppercase tracking-wider">Dados Pessoais</h3>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#05053a]" /> Nome
            </label>
            <input 
              type="text" 
              value={nome} 
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-[#05053a] font-medium outline-none focus:border-[#05053a] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#05053a]" /> E-mail
            </label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-[#05053a] font-medium outline-none focus:border-[#05053a] transition-colors"
            />
          </div>
        </div>

        {/* Seção de Preferências de Trajeto */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-0.5">
            <Sliders className="w-4 h-4 text-[#05053a]" />
            <h3 className="text-xs font-bold text-[#05053a] uppercase tracking-wider">Preferências de Rota</h3>
          </div>
          <p className="text-xs text-slate-500 -mt-2">Personalize como o aplicativo sugere seus trajetos:</p>

          <button 
            onClick={() => togglePreferencia('menosBald')}
            className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
              preferencias.menosBald 
                ? 'bg-indigo-50/60 border-[#05053a] text-[#05053a]' 
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <span>Menos baldeações</span>
            <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
              preferencias.menosBald ? 'bg-[#05053a] border-[#05053a] text-white' : 'border-slate-300 bg-white'
            }`}>
              {preferencias.menosBald && <Check className="w-3.5 h-3.5" />}
            </div>
          </button>

          <button 
            onClick={() => togglePreferencia('menosCaminhada')}
            className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
              preferencias.menosCaminhada 
                ? 'bg-indigo-50/60 border-[#05053a] text-[#05053a]' 
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <span>Menos caminhadas</span>
            <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
              preferencias.menosCaminhada ? 'bg-[#05053a] border-[#05053a] text-white' : 'border-slate-300 bg-white'
            }`}>
              {preferencias.menosCaminhada && <Check className="w-3.5 h-3.5" />}
            </div>
          </button>

          <button 
            onClick={() => togglePreferencia('acessibilidade')}
            className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
              preferencias.acessibilidade 
                ? 'bg-indigo-50/60 border-[#05053a] text-[#05053a]' 
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <span>Acessibilidade</span>
            <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
              preferencias.acessibilidade ? 'bg-[#05053a] border-[#05053a] text-white' : 'border-slate-300 bg-white'
            }`}>
              {preferencias.acessibilidade && <Check className="w-3.5 h-3.5" />}
            </div>
          </button>
        </div>

        {/* Botão Sair */}
        <button 
          onClick={() => navigate('/')}
          className="w-full py-3 rounded-xl bg-red-50 text-red-600 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-colors mb-4 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sair da conta
        </button>

      </main>
    </div>
  );
}