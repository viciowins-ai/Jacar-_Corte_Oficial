import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function FloatingInstallBanner() {
  const { isInstalled, install, isIOS, isMobile } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    const isDismissed = sessionStorage.getItem('jacare_install_prompt_dismissed') === 'true';
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('jacare_install_prompt_dismissed', 'true');
  };

  const handleDownloadClick = async () => {
    setIsInstalling(true);
    setShowTip(false);
    try {
      const res = await install();
      if (!res.success && res.method === 'manual') {
        setShowTip(true);
      }
    } finally {
      setIsInstalling(false);
    }
  };

  // If already running inside installed standalone PWA or dismissed, don't show
  if (isInstalled || dismissed) {
    return null;
  }

  return (
    <div
      id="floating-install-banner"
      className="fixed z-[999] bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:bottom-6 max-w-sm w-auto animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto flex flex-col gap-2"
    >
      {/* Fallback Tip Card (only shown if browser suppresses native prompt) */}
      {showTip && (
        <div className="bg-[#2E5C38] text-white p-3 rounded-xl shadow-xl border border-white/20 text-xs animate-in fade-in duration-200">
          <div className="flex justify-between items-start mb-1">
            <span className="font-bold flex items-center gap-1.5 text-white">
              <span>💡</span>
              {isIOS ? 'Instalar no iPhone / iPad' : isMobile ? 'Instalar no Android' : 'Instalar no Computador'}
            </span>
            <button
              onClick={() => setShowTip(false)}
              className="text-white/70 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-white/90 leading-relaxed text-[11px]">
            {isIOS ? (
              'Toque no botão Compartilhar do Safari (quadrado com seta ⬆️) e selecione "Adicionar à Tela de Início".'
            ) : isMobile ? (
              'Toque no menu (três pontinhos ⋮) no topo do Chrome e selecione "Instalar aplicativo" ou "Adicionar à tela inicial".'
            ) : (
              'No canto direito da barra de endereços do Chrome (ao lado da estrela), clique no ícone de instalar ⊕ ou no menu (⋮) > "Instalar Jacaré do Corte".'
            )}
          </p>
        </div>
      )}

      <div className="bg-[#1C2430]/95 backdrop-blur-md text-white border border-white/10 rounded-2xl p-3.5 pl-4 pr-3 shadow-[0_10px_35px_rgba(0,0,0,0.5)] flex items-center justify-between gap-3">
        {/* Text block */}
        <div className="flex-1 pr-1 min-w-0">
          <h3 className="text-[13px] font-bold text-white leading-tight">
            Instale o App
          </h3>
          <p className="text-[11px] text-gray-300 leading-tight mt-0.5 font-normal">
            Adicione o Jacaré do Corte à tela inicial para acesso rápido e seguro.
          </p>
        </div>

        {/* Action button & Close */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-banner-install"
            onClick={handleDownloadClick}
            disabled={isInstalling}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-95 text-white text-xs font-semibold py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Baixar aplicativo"
          >
            <Download size={13} strokeWidth={2.5} />
            <span>{isInstalling ? 'Instalando...' : 'Baixar'}</span>
          </button>

          <button
            id="btn-banner-dismiss"
            onClick={handleDismiss}
            className="text-gray-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
            title="Fechar"
            aria-label="Fechar banner de instalação"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
