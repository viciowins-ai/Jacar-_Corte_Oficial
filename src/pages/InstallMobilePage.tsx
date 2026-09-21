import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Smartphone,
  Download,
  CheckCircle2,
  Share2,
  PlusSquare,
  QrCode,
  Laptop,
  ChevronRight,
  Bell,
  Wifi
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function InstallMobilePage() {
  const navigate = useNavigate();
  const { isInstalled, install } = usePWAInstall();
  const [installing, setInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const currentUrl = window.location.origin;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(currentUrl)}`;

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
              <h1 className="text-lg font-bold leading-tight">Instalar no Celular</h1>
              <p className="text-xs text-[#C5A859] font-medium">Android & iPhone (iOS)</p>
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
            className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <Laptop size={15} />
            <span>Versão PC</span>
          </button>
          <button
            onClick={() => navigate('/instalar-celular')}
            className="flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 bg-[#C5A859] text-gray-900 shadow-sm"
          >
            <Smartphone size={15} />
            <span>Versão Celular</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-2">
        {/* Main Hero Card */}
        <div className="bg-white rounded-[22px] p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full border-4 border-[#C5A859] overflow-hidden shadow-xl bg-black p-0.5">
              <img
                src="/icon-192-circle.png"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo_jacare.jpg';
                }}
                alt="App Jacaré"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-[#3B5A3C] text-white p-1.5 rounded-full border-2 border-white shadow">
              <Smartphone size={16} className="text-[#C5A859]" />
            </div>
          </div>

          <h2 className="text-lg font-black text-gray-900 mb-1">
            Jacaré do Corte no seu Bolso
          </h2>
          <p className="text-xs text-gray-500 max-w-xs mb-4">
            Tenha o ícone do Jacaré direto na sua tela inicial para agendar cortes em menos de 1 minuto.
          </p>

          {isInstalled || installedSuccess ? (
            <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-center gap-2 text-emerald-800 text-sm font-bold">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <span>Aplicativo já instalado no celular!</span>
            </div>
          ) : (
            <div className="w-full space-y-2">
              <button
                onClick={handleInstallClick}
                disabled={installing}
                className="w-full py-3.5 px-6 rounded-xl bg-[#3B5A3C] hover:bg-[#2f4930] active:scale-[0.98] text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-lg border-2 border-[#C5A859] transition-all"
              >
                <Download size={18} className="text-[#C5A859]" />
                <span>{installing ? 'Instalando...' : 'Instalar no Meu Celular'}</span>
              </button>

              <button
                onClick={() => setShowQR(!showQR)}
                className="w-full py-2 text-xs font-bold text-[#3B5A3C] hover:underline flex items-center justify-center gap-1.5"
              >
                <QrCode size={14} />
                <span>{showQR ? 'Ocultar QR Code' : 'Escanear QR Code com a câmera do celular'}</span>
              </button>
            </div>
          )}

          {/* QR Code Section */}
          {showQR && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col items-center animate-in fade-in">
              <div className="p-3 bg-white border-2 border-[#C5A859] rounded-2xl shadow-md">
                <img
                  src={qrCodeUrl}
                  alt="QR Code para Celular"
                  className="w-44 h-44 object-contain"
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-2 font-medium">
                Abra a câmera do seu smartphone e aponte para abrir o link
              </p>
            </div>
          )}
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-2.5">
            <div className="p-2 rounded-xl bg-[#3B5A3C]/10 text-[#3B5A3C] shrink-0">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900">Lembretes</h3>
              <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
                Avisos do seu horário direto no celular.
              </p>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-2.5">
            <div className="p-2 rounded-xl bg-[#C5A859]/20 text-gray-900 shrink-0">
              <Wifi size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900">Modo Offline</h3>
              <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
                Consulte horários mesmo sem internet.
              </p>
            </div>
          </div>
        </div>

        {/* Instructions Android & iOS */}
        <div className="space-y-3">
          {/* Android Card */}
          <div className="bg-white rounded-[22px] p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🤖</span>
              <h3 className="text-sm font-bold text-gray-900">No Android (Google Chrome)</h3>
            </div>
            <div className="space-y-2 text-xs text-gray-700">
              <div className="flex gap-2.5 items-start">
                <span className="w-5 h-5 rounded-full bg-[#3B5A3C] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>Toque no botão <strong className="text-[#3B5A3C]">"Instalar no Meu Celular"</strong> acima.</span>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="w-5 h-5 rounded-full bg-[#3B5A3C] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>Ou toque nos <strong>3 pontinhos (⋮)</strong> no canto superior do navegador e escolha <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</span>
              </div>
            </div>
          </div>

          {/* iPhone / iOS Card */}
          <div className="bg-white rounded-[22px] p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🍎</span>
              <h3 className="text-sm font-bold text-gray-900">No iPhone ou iPad (Safari)</h3>
            </div>
            <div className="space-y-2 text-xs text-gray-700">
              <div className="flex gap-2.5 items-start">
                <span className="w-5 h-5 rounded-full bg-[#C5A859] text-gray-900 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>Abra este site pelo navegador <strong>Safari</strong> do iPhone.</span>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="w-5 h-5 rounded-full bg-[#C5A859] text-gray-900 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>Toque no botão de <strong>Compartilhar</strong> (o quadrado com uma seta apontando para cima <Share2 size={12} className="inline mx-1" /> no rodapé do Safari).</span>
              </div>
              <div className="flex gap-2.5 items-start">
                <span className="w-5 h-5 rounded-full bg-[#C5A859] text-gray-900 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>Role para baixo e selecione <strong className="text-[#3B5A3C]">"Adicionar à Tela de Início"</strong> (<PlusSquare size={12} className="inline mx-1" />) e confirme em <strong>Adicionar</strong>.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action to Switch to PC */}
        <div
          onClick={() => navigate('/instalar-pc')}
          className="bg-gradient-to-r from-[#202934] to-[#2D3A49] text-white p-4 rounded-2xl shadow-md cursor-pointer flex items-center justify-between border border-[#C5A859]/30 hover:opacity-95 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C5A859] text-gray-900 flex items-center justify-center font-bold">
              <Laptop size={20} />
            </div>
            <div>
              <p className="text-xs text-[#C5A859] font-bold uppercase tracking-wider">Usando o Computador?</p>
              <p className="text-sm font-extrabold">Ver instalação para PC</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-[#C5A859]" />
        </div>
      </div>
    </div>
  );
}
