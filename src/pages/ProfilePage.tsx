import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
  ChevronLeft,
  Pencil,
  Settings,
  ShieldCheck,
  FileText,
  Info,
  LogOut,
  ChevronRight,
  User,
  History,
  Loader2
} from 'lucide-react';
import { ImageWithFallback } from '../components/ImageWithFallback';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    async function loadHistory() {
      if (!user?.id) return;
      try {
        const isDemo = localStorage.getItem('demo_mode') === 'true';
        if (isDemo) {
          const saved = localStorage.getItem('demo_appointments');
          if (saved) setHistory(JSON.parse(saved));
          return;
        }

        const q = query(
          collection(db, 'appointments'),
          where('user_id', '==', user.id)
        );
        const snap = await getDocs(q);
        const list: any[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setHistory(list);
      } catch (err) {
        console.log('Error loading history:', err);
      }
    }
    loadHistory();
  }, [user]);

  const handleConfirmSignOut = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Erro ao sair:', err);
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const phone = user?.user_metadata?.phone || user?.phone;
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Cliente Jacaré';

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F2] dark:bg-[#1E2732] pb-32">
      {/* Header */}
      <div className="bg-[#3B5A3C] pt-12 pb-8 px-5 rounded-b-[35px] shadow-sm relative z-10">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/home')}
            className="text-white hover:bg-white/10 p-1.5 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-white text-lg font-bold">Meu Perfil</h1>
          <button
            onClick={() => navigate('/settings')}
            className="text-white hover:bg-white/10 p-1.5 rounded-full transition-colors"
          >
            <Settings size={22} />
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-4 px-2">
          <div className="w-20 h-20 rounded-full border-[3px] border-[#C5A859] p-0.5 shrink-0 bg-white overflow-hidden shadow-md">
            <ImageWithFallback
              src={user?.user_metadata?.avatar_url}
              type="user"
              className="w-full h-full object-cover"
              alt={userName}
            />
          </div>

          <div className="flex flex-col text-white flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{userName}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-white/80 text-sm truncate">
                {phone ? phone.replace('+55', '') : 'Adicionar telefone'}
              </p>
              <button
                onClick={() => navigate('/complete-register', { state: { editing: true } })}
                className="bg-white/20 p-1 rounded-full hover:bg-white/30 transition-colors"
                title="Editar Telefone"
              >
                <Pencil size={12} className="text-white" />
              </button>
            </div>
            <p className="text-white/60 text-xs truncate mt-0.5">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Menu Options */}
      <div className="px-4 -mt-2 z-10 space-y-3">
        {/* Painel do Dono - Highlighted Card */}
        <div
          onClick={() => navigate('/admin')}
          className="bg-gradient-to-r from-[#202934] to-[#2d3a49] text-white p-4 rounded-2xl shadow-md cursor-pointer flex items-center justify-between border border-[#C5A859]/30 hover:border-[#C5A859] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C5A859] text-black flex items-center justify-center font-bold shadow">
              👑
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#C5A859]">Painel do Dono</h3>
              <p className="text-xs text-white/70">Gestão, faturamento e agenda completa</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-[#C5A859]" />
        </div>

        {/* Options list */}
        <div className="bg-white dark:bg-[#2A343D] rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-white/10 border border-transparent dark:border-white/5">
          <div
            onClick={() => navigate('/complete-register', { state: { editing: true } })}
            className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[#3B5A3C] dark:text-emerald-400 flex items-center justify-center">
                <User size={18} />
              </div>
              <span className="text-sm font-semibold text-gray-800 dark:text-white">Editar Dados Pessoais</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </div>

          <div
            onClick={() => navigate('/about')}
            className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Info size={18} />
              </div>
              <span className="text-sm font-semibold text-gray-800 dark:text-white">Sobre o Jacaré do Corte</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </div>

          <div
            onClick={() => navigate('/terms')}
            className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <FileText size={18} />
              </div>
              <span className="text-sm font-semibold text-gray-800 dark:text-white">Termos de Uso</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </div>

          <div
            onClick={() => navigate('/privacy')}
            className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <ShieldCheck size={18} />
              </div>
              <span className="text-sm font-semibold text-gray-800 dark:text-white">Política de Privacidade</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </div>
        </div>

        {/* History count badge */}
        {history.length > 0 && (
          <div className="bg-white dark:bg-[#2A343D] rounded-2xl p-4 shadow-sm flex items-center justify-between border border-transparent dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 flex items-center justify-center">
                <History size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-400 font-bold uppercase">Histórico Total</p>
                <p className="text-sm font-extrabold text-gray-800 dark:text-white">{history.length} cortes agendados</p>
              </div>
            </div>
          </div>
        )}

        {/* Sign out */}
        <button
          id="btn-profile-signout"
          onClick={() => setShowLogoutModal(true)}
          className="w-full h-12 bg-white dark:bg-[#2A343D] text-red-600 dark:text-red-400 font-bold rounded-2xl shadow-sm hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center gap-2 border border-red-100 dark:border-red-500/20 active:scale-95 transition-all text-sm mt-4 cursor-pointer"
        >
          <LogOut size={18} />
          <span>Sair da Conta</span>
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div
          id="logout-modal-backdrop"
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            id="logout-modal-card"
            className="bg-[#202934] border border-white/15 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl text-white animate-in zoom-in-95 duration-200"
          >
            <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 mx-auto flex items-center justify-center mb-4">
              <LogOut size={26} />
            </div>

            <h3 className="text-lg font-bold text-white mb-2">
              Deseja sair da sua conta?
            </h3>
            <p className="text-xs text-gray-300 mb-6 leading-relaxed">
              Você será desconectado e precisará entrar novamente para fazer novos agendamentos ou consultar seu histórico.
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                id="btn-confirm-signout"
                onClick={handleConfirmSignOut}
                disabled={isLoggingOut}
                className="w-full py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saindo...</span>
                  </>
                ) : (
                  <>
                    <LogOut size={16} />
                    <span>Sim, Sair da Conta</span>
                  </>
                )}
              </button>

              <button
                id="btn-cancel-signout"
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                className="w-full py-2.5 bg-white/10 hover:bg-white/15 active:scale-95 text-gray-200 hover:text-white font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
