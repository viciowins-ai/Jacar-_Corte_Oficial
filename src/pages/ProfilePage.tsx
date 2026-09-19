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
  History
} from 'lucide-react';
import { ImageWithFallback } from '../components/ImageWithFallback';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [history, setHistory] = useState<any[]>([]);

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

  const handleSignOut = async () => {
    if (confirm('Deseja realmente sair da conta?')) {
      await signOut();
      navigate('/login');
    }
  };

  const phone = user?.user_metadata?.phone || user?.phone;
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Cliente Jacaré';

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F2] pb-32">
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
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
          <div
            onClick={() => navigate('/complete-register', { state: { editing: true } })}
            className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#3B5A3C] flex items-center justify-center">
                <User size={18} />
              </div>
              <span className="text-sm font-semibold text-gray-800">Editar Dados Pessoais</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </div>

          <div
            onClick={() => navigate('/about')}
            className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Info size={18} />
              </div>
              <span className="text-sm font-semibold text-gray-800">Sobre o Jacaré do Corte</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </div>

          <div
            onClick={() => navigate('/terms')}
            className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <FileText size={18} />
              </div>
              <span className="text-sm font-semibold text-gray-800">Termos de Uso</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </div>

          <div
            onClick={() => navigate('/privacy')}
            className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShieldCheck size={18} />
              </div>
              <span className="text-sm font-semibold text-gray-800">Política de Privacidade</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </div>
        </div>

        {/* History count badge */}
        {history.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
                <History size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase">Histórico Total</p>
                <p className="text-sm font-extrabold text-gray-800">{history.length} cortes agendados</p>
              </div>
            </div>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full h-12 bg-white text-red-600 font-bold rounded-2xl shadow-sm hover:bg-red-50 flex items-center justify-center gap-2 border border-red-100 active:scale-95 transition-all text-sm mt-4"
        >
          <LogOut size={18} />
          <span>Sair da Conta</span>
        </button>
      </div>
    </div>
  );
}
