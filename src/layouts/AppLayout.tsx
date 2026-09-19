import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, User, WifiOff } from 'lucide-react';

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isActive = (path: string) => location.pathname.startsWith(path);
  const showBottomNav = location.pathname !== '/agendar';

  return (
    <div className="flex flex-col h-screen bg-[#202934] max-w-md mx-auto shadow-2xl overflow-hidden relative transition-colors duration-300">
      {!isOnline && (
        <div className="bg-amber-600 text-white text-xs font-semibold py-1.5 px-3 flex items-center justify-center gap-2 z-50 animate-in slide-in-from-top-2">
          <WifiOff size={14} />
          <span>Sem internet - Usando dados locais</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pb-24">
        <Outlet />
      </div>

      {showBottomNav && (
        <nav className="absolute bottom-0 w-full h-[70px] bg-[#385A3B] rounded-t-[20px] flex items-center justify-around px-2 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
          <button
            onClick={() => navigate('/home')}
            className={`flex flex-col items-center justify-center w-16 gap-1 transition-all duration-200 ${
              isActive('/home')
                ? 'text-[#C5A859] -translate-y-0.5'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <Home size={24} strokeWidth={isActive('/home') ? 2.5 : 2} />
            <span
              className={`text-[11px] font-medium tracking-wide ${
                isActive('/home') ? 'opacity-100 font-bold' : 'opacity-80'
              }`}
            >
              Início
            </span>
          </button>

          <button
            onClick={() => navigate('/agendar')}
            className={`flex flex-col items-center justify-center w-16 gap-1 transition-all duration-200 ${
              isActive('/agendar')
                ? 'text-[#C5A859] -translate-y-0.5'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <Calendar size={24} strokeWidth={isActive('/agendar') ? 2.5 : 2} />
            <span
              className={`text-[11px] font-medium tracking-wide ${
                isActive('/agendar') ? 'opacity-100 font-bold' : 'opacity-80'
              }`}
            >
              Agendar
            </span>
          </button>

          <button
            onClick={() => navigate('/perfil')}
            className={`flex flex-col items-center justify-center w-16 gap-1 transition-all duration-200 ${
              isActive('/perfil')
                ? 'text-[#C5A859] -translate-y-0.5'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <User size={24} strokeWidth={isActive('/perfil') ? 2.5 : 2} />
            <span
              className={`text-[11px] font-medium tracking-wide ${
                isActive('/perfil') ? 'opacity-100 font-bold' : 'opacity-80'
              }`}
            >
              Perfil
            </span>
          </button>
        </nav>
      )}
    </div>
  );
}
