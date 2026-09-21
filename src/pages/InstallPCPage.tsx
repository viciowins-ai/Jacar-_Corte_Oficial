import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Monitor,
  Download,
  CheckCircle2,
  Laptop,
  Sparkles,
  Smartphone,
  ChevronRight,
  Zap,
  Info
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function InstallPCPage() {
  const navigate = useNavigate();
  const { isInstalled, install } = usePWAInstall();
  const [installing, setInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  const handleInstallClick = async () => {
    setInstalling(true);
    const result = await install();
    setInstalling(false);
    if (result) {
      setInstalledSuccess(true);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F2] pb-24 font-sans text-gray-800">
      {/* Header */}
      <div className="bg-[#3B5A3C] pt-12 pb-6 px-5 text-white shadow-md relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-[#C5A859] overflow-hidden bg-black flex-shrink-0 shadow">
              <img
                src="/logo_jacare.jpg"
                alt="Logo Jacaré"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Instalar no PC</h1>
              <p className="text-xs text-[#C5A859] font-medium">Versão Desktop & Notebook</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/home')}
            className="text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full font-semibold transition-colors"
          >
            Início
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-black/25 p-1 rounded-xl">
          <button
            onClick={() => navigate('/instalar-pc')}
            className="flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 bg-[#C5A859] text-gray-900 shadow-sm"
          >
            <Monitor size={15} />
            <span>Versão PC</span>
          </button>
          <button
            onClick={() => navigate('/instalar-celular')}
            className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <Smartphone size={15} />
            <span>Versão Celular</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-2">
        {/* Main Hero Card with Logo */}
        <div className="bg-white rounded-[22px] p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#3B5A3C]/5 rounded-full blur-xl pointer-events-none" />
          
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-2xl border-4 border-[#C5A859] overflow-hidden shadow-xl bg-black">
              <img
                src="/logo_jacare.jpg"
                alt="Jacaré do Corte"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-[#3B5A3C] text-[#C5A859] p-1.5 rounded-lg border-2 border-white shadow">
              <Laptop size={18} />
            </div>
          </div>

          <h2 className="text-lg font-black text-gray-900 mb-1">
            Jacaré do Corte para Computador
          </h2>
          <p className="text-xs text-gray-500 max-w-xs mb-5">
            Instale o app nativo no seu Windows, Mac ou Linux para agendar cortes com rapidez e receber avisos em tela cheia.
          </p>

          {isInstalled || installedSuccess ? (
            <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-center gap-2 text-emerald-800 text-sm font-bold">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <span>Aplicativo já instalado no computador!</span>
            </div>
          ) : (
            <div className="w-full space-y-2">
              <button
                onClick={handleInstallClick}
                disabled={installing}
                className="w-full py-3.5 px-6 rounded-xl bg-[#3B5A3C] hover:bg-[#2f4930] active:scale-[0.98] text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-lg border-2 border-[#C5A859] transition-all"
              >
                <Download size={18} className="text-[#C5A859]" />
                <span>{installing ? 'Instalando...' : 'Instalar Agora no Meu PC'}</span>
              </button>
              <p className="text-[11px] text-gray-400">
                100% gratuito, leve e sem ocupar espaço em disco.
              </p>
            </div>
          )}
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-2.5">
            <div className="p-2 rounded-xl bg-[#3B5A3C]/10 text-[#3B5A3C] shrink-0">
              <Zap size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900">Acesso Rápido</h3>
              <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
                Ícone na área de trabalho e barra de tarefas.
              </p>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-2.5">
            <div className="p-2 rounded-xl bg-[#C5A859]/20 text-gray-900 shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900">Sem Distrações</h3>
              <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
                Abre em janela própria, como um programa nativo.
              </p>
            </div>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="bg-white rounded-[22px] p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <Info size={16} className="text-[#3B5A3C]" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Como Instalar no seu Navegador
            </h3>
          </div>

          {/* Chrome / Brave / Edge Steps */}
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-[#3B5A3C] text-white text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                1
              </div>
              <div className="text-xs text-gray-700 leading-relaxed">
                <span className="font-bold text-gray-900">Google Chrome / Brave:</span> Olhe na barra de endereço (onde digita o site). Clique no ícone de computador ou na opção <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono font-bold text-gray-900">Instalar</span> ao lado da barra de favoritos.
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-[#3B5A3C] text-white text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                2
              </div>
              <div className="text-xs text-gray-700 leading-relaxed">
                <span className="font-bold text-gray-900">Pelo Menu do Navegador:</span> Clique nos 3 pontinhos <span className="font-bold">⋮</span> no canto superior direito &gt; <span className="font-bold text-[#3B5A3C]">"Instalar Jacaré do Corte..."</span> ou <span className="font-bold">"Salvar e compartilhar &gt; Criar atalho"</span> (marque a caixa <span className="italic">"Abrir como janela"</span>).
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-[#3B5A3C] text-white text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                3
              </div>
              <div className="text-xs text-gray-700 leading-relaxed">
                <span className="font-bold text-gray-900">Microsoft Edge:</span> Clique no menu de três pontos <span className="font-bold">...</span> &gt; <span className="font-bold">Aplicativos</span> &gt; <span className="font-bold text-[#3B5A3C]">"Instalar este site como um aplicativo"</span>.
              </div>
            </div>
          </div>
        </div>

        {/* Action to Switch to Mobile */}
        <div
          onClick={() => navigate('/instalar-celular')}
          className="bg-gradient-to-r from-[#3B5A3C] to-[#2E472F] text-white p-4 rounded-2xl shadow-md cursor-pointer flex items-center justify-between border border-[#C5A859]/30 hover:opacity-95 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C5A859] text-gray-900 flex items-center justify-center font-bold">
              <Smartphone size={20} />
            </div>
            <div>
              <p className="text-xs text-[#C5A859] font-bold uppercase tracking-wider">Prefere no smartphone?</p>
              <p className="text-sm font-extrabold">Ver instalação para Celular</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-[#C5A859]" />
        </div>
      </div>
    </div>
  );
}
