import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Moon,
  Sun,
  Bell,
  Shield,
  FileText,
  Info,
  HelpCircle,
  ChevronRight
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export function SettingsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(true);
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F2] dark:bg-[#1E2732] pb-20">
      {/* Header */}
      <div className="bg-[#3B5A3C] pt-12 pb-6 px-5 flex items-center justify-between shadow-sm relative z-10">
        <button
          onClick={() => navigate(-1)}
          className="text-white hover:bg-white/10 p-1.5 rounded-full transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-white text-lg font-bold">Configurações</h1>
        <div className="w-8" />
      </div>

      <div className="p-4 space-y-4">
        {/* Painel do Dono Shortcut */}
        <div
          onClick={() => navigate('/admin')}
          className="bg-gradient-to-r from-[#202934] to-[#2D3A49] text-white p-4 rounded-2xl shadow-md cursor-pointer flex items-center justify-between border border-[#C5A859]/40"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#C5A859] text-black flex items-center justify-center font-bold">
              👑
            </div>
            <div>
              <p className="text-sm font-bold text-[#C5A859]">Painel do Dono</p>
              <p className="text-xs text-white/70">Acesso administrativo e métricas</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-[#C5A859]" />
        </div>

        {/* Preferences */}
        <div className="bg-white dark:bg-[#2A343D] rounded-2xl p-4 shadow-sm space-y-3 border border-transparent dark:border-white/5">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Preferências
          </h2>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-xs shrink-0">
                {darkMode ? (
                  <Moon size={18} fill="currentColor" strokeWidth={2} />
                ) : (
                  <Sun size={18} fill="currentColor" strokeWidth={2} />
                )}
              </div>
              <span className="text-sm font-medium text-gray-800 dark:text-white">Modo Escuro</span>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                darkMode ? 'bg-[#3B5A3C]' : 'bg-gray-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  darkMode ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <Bell size={18} fill="currentColor" strokeWidth={2} />
              </div>
              <span className="text-sm font-medium text-gray-800 dark:text-white">Notificações</span>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                notifications ? 'bg-[#3B5A3C]' : 'bg-gray-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  notifications ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Links */}
        <div className="bg-white dark:bg-[#2A343D] rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-white/10 border border-transparent dark:border-white/5">
          <div
            onClick={() => navigate('/about')}
            className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <Info size={18} strokeWidth={2.5} />
              </div>
              <span className="text-sm font-medium text-gray-800 dark:text-white">Sobre o Aplicativo</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </div>

          <div
            onClick={() => navigate('/faq')}
            className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <HelpCircle size={18} strokeWidth={2.5} />
              </div>
              <span className="text-sm font-medium text-gray-800 dark:text-white">Dúvidas Frequentes (FAQ)</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </div>

          <div
            onClick={() => navigate('/terms')}
            className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <FileText size={18} strokeWidth={2.5} />
              </div>
              <span className="text-sm font-medium text-gray-800 dark:text-white">Termos de Uso</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </div>

          <div
            onClick={() => navigate('/privacy')}
            className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <Shield size={18} fill="currentColor" strokeWidth={2} />
              </div>
              <span className="text-sm font-medium text-gray-800 dark:text-white">Privacidade & LGPD</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
