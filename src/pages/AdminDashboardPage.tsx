import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import {
  ChevronLeft,
  DollarSign,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'agenda' | 'financeiro' | 'clientes'>('agenda');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    todayCount: 0,
    todayRevenue: 0,
    totalCount: 0,
    totalRevenue: 0
  });

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const isDemo = localStorage.getItem('demo_mode') === 'true';
      let list: any[] = [];

      if (isDemo) {
        list = JSON.parse(localStorage.getItem('demo_appointments') || '[]');
        if (list.length === 0) {
          list = [
            {
              id: 'demo-appt-1',
              user_name: 'Carlos Alberto',
              user_phone: '(11) 98765-4321',
              services: { name: 'Cabelo + Barba', price: 50 },
              barbers: { name: 'Jacaré' },
              start_time: new Date().toISOString(),
              status: 'confirmed'
            },
            {
              id: 'demo-appt-2',
              user_name: 'Lucas Ferreira',
              user_phone: '(11) 91234-5678',
              services: { name: 'Platinado', price: 130 },
              barbers: { name: 'Jacaré' },
              start_time: new Date(Date.now() + 3600000 * 2).toISOString(),
              status: 'scheduled'
            }
          ];
        }
      } else {
        const snap = await getDocs(collection(db, 'appointments'));
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      }

      const todayStr = format(new Date(), 'yyyy-MM-dd');
      let todayCount = 0;
      let todayRev = 0;
      const totalCount = list.length;
      let totalRev = 0;

      list.forEach(a => {
        const price = a.services?.price || a.total_price || 35;
        totalRev += price;
        if (a.start_time && a.start_time.startsWith(todayStr)) {
          todayCount += 1;
          todayRev += price;
        }
      });

      setStats({
        todayCount,
        todayRevenue: todayRev,
        totalCount,
        totalRevenue: totalRev
      });
      setAppointments(list);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const isDemo = localStorage.getItem('demo_mode') === 'true';
      if (isDemo) {
        const updated = appointments.map(a => a.id === id ? { ...a, status: newStatus } : a);
        setAppointments(updated);
        localStorage.setItem('demo_appointments', JSON.stringify(updated));
      } else {
        await updateDoc(doc(db, 'appointments', id), { status: newStatus });
        await loadAdminData();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="flex flex-col min-h-screen bg-[#1E2732] text-white font-sans pb-20">
      {/* Admin Header */}
      <div className="bg-[#2E5C38] pt-12 pb-6 px-5 shadow-lg relative z-10 border-b border-[#C5A859]/30">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/home')}
            className="text-white hover:bg-white/10 p-1.5 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
            <span className="text-[#C5A859] text-xs font-bold tracking-widest uppercase">
              Área do Proprietário
            </span>
            <h1 className="text-white text-lg font-black tracking-wide">
              PAINEL DO DONO
            </h1>
          </div>
          <button
            onClick={loadAdminData}
            className="text-white hover:bg-white/10 p-1.5 rounded-full transition-colors"
            title="Atualizar"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Top metrics */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-black/30 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
              <Calendar size={14} className="text-[#C5A859]" />
              <span>Hoje ({stats.todayCount})</span>
            </div>
            <p className="text-xl font-black text-white">{formatBRL(stats.todayRevenue)}</p>
          </div>

          <div className="bg-black/30 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
              <TrendingUp size={14} className="text-emerald-400" />
              <span>Total Geral</span>
            </div>
            <p className="text-xl font-black text-[#C5A859]">{formatBRL(stats.totalRevenue)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#273240] px-4 py-2 border-b border-white/5 gap-2">
        <button
          onClick={() => setTab('agenda')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            tab === 'agenda'
              ? 'bg-[#3B5A3C] text-white shadow'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Agenda
        </button>
        <button
          onClick={() => setTab('financeiro')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            tab === 'financeiro'
              ? 'bg-[#3B5A3C] text-white shadow'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Financeiro
        </button>
        <button
          onClick={() => setTab('clientes')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            tab === 'clientes'
              ? 'bg-[#3B5A3C] text-white shadow'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Clientes
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400 font-medium">
            Carregando dados da barbearia...
          </div>
        ) : tab === 'agenda' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-400 font-semibold px-1">
              <span>Agendamentos Cadastrados</span>
              <span>{appointments.length} horários</span>
            </div>

            {appointments.length === 0 ? (
              <div className="bg-[#273240] p-8 rounded-2xl text-center text-gray-400">
                Nenhum agendamento registrado ainda.
              </div>
            ) : (
              appointments.map(appt => (
                <div
                  key={appt.id}
                  className="bg-[#273240] p-4 rounded-2xl border border-white/5 space-y-3 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-bold text-sm">
                        {appt.user_name || 'Cliente Jacaré'}
                      </p>
                      <p className="text-xs text-gray-400">{appt.user_phone || 'WhatsApp não informado'}</p>
                    </div>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        appt.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : appt.status === 'confirmed'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {appt.status || 'Pendente'}
                    </span>
                  </div>

                  <div className="bg-black/20 p-2.5 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="text-gray-400">Serviço: </span>
                      <span className="font-bold text-white">{appt.services?.name || 'Corte'}</span>
                    </div>
                    <span className="font-extrabold text-[#C5A859]">
                      {formatBRL(appt.services?.price || appt.total_price || 35)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-gray-400">
                      {appt.start_time
                        ? format(new Date(appt.start_time), "dd/MM 'às' HH:mm", { locale: ptBR })
                        : 'A definir'}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(appt.id, 'completed')}
                        className="p-1.5 bg-emerald-700/50 hover:bg-emerald-600 rounded-lg text-white"
                        title="Concluir Atendimento"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        onClick={() => updateStatus(appt.id, 'cancelled')}
                        className="p-1.5 bg-red-800/50 hover:bg-red-700 rounded-lg text-white"
                        title="Cancelar"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : tab === 'financeiro' ? (
          <div className="space-y-4">
            <div className="bg-[#273240] p-5 rounded-2xl border border-white/5 space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <DollarSign size={18} className="text-[#C5A859]" />
                Resumo de Faturamento
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-gray-400">Atendimentos Concluídos:</span>
                  <span className="font-bold text-white">
                    {appointments.filter(a => a.status === 'completed').length}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-gray-400">Receita Média por Corte:</span>
                  <span className="font-bold text-white">
                    {formatBRL(stats.totalCount > 0 ? stats.totalRevenue / stats.totalCount : 35)}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-400">Previsão Bruta Total:</span>
                  <span className="font-black text-[#C5A859]">{formatBRL(stats.totalRevenue)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-[#273240] p-4 rounded-2xl border border-white/5">
              <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
                <Users size={18} className="text-blue-400" />
                Base de Clientes Ativos
              </h3>
              <p className="text-xs text-gray-400 mb-4">
                Total de {stats.totalCount} atendimentos cadastrados no sistema.
              </p>
              <div className="space-y-2">
                {appointments.slice(0, 10).map((a, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 text-xs">
                    <span className="font-semibold">{a.user_name || `Cliente #${i + 1}`}</span>
                    <span className="text-gray-400">{a.user_phone || 'WhatsApp pendente'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
