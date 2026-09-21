import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function FloatingInstallBanner() {
  const { isInstalled, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

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
    try {
      await install();
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
      className="fixed z-[999] bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:bottom-6 max-w-sm w-auto animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto"
    >
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
