import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import {
  ChevronLeft,
  DollarSign,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  TrendingUp,
  RefreshCw,
  Plus,
  Phone,
  User,
  Scissors,
  Clock,
  MessageCircle,
  X,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ServiceItem {
  id: string | number;
  name: string;
  price: number;
  duration_minutes?: number;
}

const DEFAULT_SERVICES: ServiceItem[] = [
  { id: 1, name: 'Cabelo', price: 30, duration_minutes: 30 },
  { id: 2, name: 'Barba', price: 20, duration_minutes: 20 },
  { id: 3, name: 'Barba + Cabelo + Sobrancelha', price: 50, duration_minutes: 50 },
  { id: 4, name: 'Sobrancelha', price: 10, duration_minutes: 15 },
  { id: 5, name: 'Luzes', price: 130, duration_minutes: 60 },
  { id: 6, name: 'Platinado', price: 130, duration_minutes: 60 },
  { id: 7, name: 'Reflexo Alinhado', price: 130, duration_minutes: 60 },
];

const DEFAULT_BARBER = { id: 1, name: 'Jacaré', avatar_url: '/logo_jacare_final.jpg' };

const TIME_SLOTS = [
  '09:00', '09:40', '10:20', '11:00', '11:40',
  '13:00', '13:40', '14:20', '15:00', '15:40',
  '16:20', '17:00', '17:40', '18:20', '19:00'
];

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

  // Modal de Agendamento Manual pelo Dono
  const [showNewModal, setShowNewModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedServices, setSelectedServices] = useState<(string | number)[]>([1]);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTime, setSelectedTime] = useState<string>('09:00');
  const [clientNotes, setClientNotes] = useState('');
  const [lastCreatedAppt, setLastCreatedAppt] = useState<any | null>(null);

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
              user_phone: '(41) 98765-4321',
              services: { name: 'Cabelo + Barba', price: 50 },
              barbers: { name: 'Jacaré' },
              start_time: new Date().toISOString(),
              status: 'confirmed'
            },
            {
              id: 'demo-appt-2',
              user_name: 'Lucas Ferreira',
              user_phone: '(41) 91234-5678',
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

      // Ordenar por horário (mais recentes/próximos primeiro)
      list.sort((a, b) => {
        const tA = a.start_time ? new Date(a.start_time).getTime() : 0;
        const tB = b.start_time ? new Date(b.start_time).getTime() : 0;
        return tB - tA;
      });

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

  // Formatar Telefone automaticamente
  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, '');
    if (raw.length <= 2) {
      setClientPhone(raw ? `(${raw}` : '');
    } else if (raw.length <= 6) {
      setClientPhone(`(${raw.slice(0, 2)}) ${raw.slice(2)}`);
    } else if (raw.length <= 10) {
      setClientPhone(`(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`);
    } else {
      setClientPhone(`(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`);
    }
  };

  const toggleService = (id: string | number) => {
    if (selectedServices.includes(id)) {
      if (selectedServices.length > 1) {
        setSelectedServices(selectedServices.filter(s => s !== id));
      }
    } else {
      setSelectedServices([...selectedServices, id]);
    }
  };

  const chosenServices = DEFAULT_SERVICES.filter(s => selectedServices.includes(s.id));
  const serviceNames = chosenServices.map(s => s.name).join(' + ');
  const totalPrice = chosenServices.reduce((acc, s) => acc + s.price, 0);

  // Criar agendamento manual pelo dono
  const handleCreateManualAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      alert('Por favor, informe o nome completo do cliente.');
      return;
    }
    if (!clientPhone.trim() || clientPhone.replace(/\D/g, '').length < 10) {
      alert('Por favor, informe um WhatsApp válido com DDD.');
      return;
    }

    setModalLoading(true);
    try {
      const fullIsoDate = `${selectedDate}T${selectedTime}:00`;
      const isDemo = localStorage.getItem('demo_mode') === 'true';

      const newApptData: any = {
        user_name: clientName.trim(),
        user_phone: clientPhone.trim(),
        user_id: `manual-${Date.now()}`,
        created_by: 'admin',
        service_ids: selectedServices,
        barber_id: 1,
        date: selectedDate,
        time: selectedTime,
        start_time: fullIsoDate,
        status: 'confirmed',
        total_price: totalPrice,
        services: { name: serviceNames, price: totalPrice },
        barbers: DEFAULT_BARBER,
        notes: clientNotes.trim(),
        created_at: new Date().toISOString()
      };

      if (isDemo) {
        newApptData.id = `demo-${Date.now()}`;
        const existing = JSON.parse(localStorage.getItem('demo_appointments') || '[]');
        const updated = [newApptData, ...existing];
        localStorage.setItem('demo_appointments', JSON.stringify(updated));
        setAppointments(updated);
      } else {
        const docRef = await addDoc(collection(db, 'appointments'), newApptData);
        newApptData.id = docRef.id;
      }

      setLastCreatedAppt(newApptData);
      await loadAdminData();
    } catch (err) {
      console.error('Erro ao cadastrar agendamento:', err);
      alert('Erro ao salvar agendamento manual.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleResetModal = () => {
    setClientName('');
    setClientPhone('');
    setSelectedServices([1]);
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    setSelectedTime('09:00');
    setClientNotes('');
    setLastCreatedAppt(null);
    setShowNewModal(false);
  };

  // Gerar link de WhatsApp para enviar confirmação ao cliente
  const getWhatsAppConfirmationUrl = (appt: any) => {
    const rawNumber = (appt.user_phone || '').replace(/\D/g, '');
    const phoneWithCountry = rawNumber.startsWith('55') ? rawNumber : `55${rawNumber}`;
    const dateFormatted = appt.start_time
      ? format(new Date(appt.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
      : `${appt.date} às ${appt.time}`;
    
    const message = `Fala ${appt.user_name || 'Amigo'}! ✂️\nSeu horário no *Jacaré do Corte* foi confirmado com sucesso!\n\n📅 *Data e Horário:* ${dateFormatted}\n💈 *Serviço:* ${appt.services?.name || 'Corte'}\n💰 *Valor:* ${formatBRL(appt.total_price || appt.services?.price || 35)}\n📍 *Barbeiro:* Jacaré\n\nTe esperamos! Qualquer dúvida é só mandar mensagem por aqui.`;
    
    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#1E2732] text-white font-sans pb-20">
      <div className="w-full max-w-2xl mx-auto flex flex-col flex-1">
        {/* Admin Header */}
        <div className="bg-[#2E5C38] pt-12 pb-6 px-5 shadow-lg relative z-10 border-b border-[#C5A859]/30 rounded-b-3xl">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigate('/home')}
              className="text-white hover:bg-white/10 p-2 rounded-full transition-colors"
              title="Voltar ao início"
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
              className="text-white hover:bg-white/10 p-2 rounded-full transition-colors"
              title="Atualizar dados"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Botão de Destaque: AGENDAR PARA CLIENTE */}
          <div className="mt-3">
            <button
              onClick={() => {
                setLastCreatedAppt(null);
                setShowNewModal(true);
              }}
              className="w-full bg-[#C5A859] hover:bg-[#b09448] text-[#1E2732] font-black py-3.5 px-4 rounded-2xl shadow-lg flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.98]"
            >
              <Plus size={20} strokeWidth={3} />
              <span className="text-sm tracking-wide uppercase">
                + Agendar para Cliente (Balcão / WhatsApp)
              </span>
            </button>
            <p className="text-[11px] text-emerald-100/70 text-center mt-1.5 font-medium">
              Agende diretamente para clientes que ligaram ou pediram pelo WhatsApp
            </p>
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
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              tab === 'agenda'
                ? 'bg-[#3B5A3C] text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Agenda
          </button>
          <button
            onClick={() => setTab('financeiro')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              tab === 'financeiro'
                ? 'bg-[#3B5A3C] text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Financeiro
          </button>
          <button
            onClick={() => setTab('clientes')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
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
                <div className="bg-[#273240] p-8 rounded-2xl text-center text-gray-400 space-y-3">
                  <p>Nenhum agendamento registrado ainda.</p>
                  <button
                    onClick={() => setShowNewModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#C5A859] text-[#1E2732] font-bold rounded-xl text-xs"
                  >
                    <Plus size={16} /> Fazer Primeiro Agendamento
                  </button>
                </div>
              ) : (
                appointments.map(appt => (
                  <div
                    key={appt.id}
                    className="bg-[#273240] p-4 rounded-2xl border border-white/5 space-y-3 shadow-sm hover:border-[#C5A859]/30 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-bold text-sm">
                            {appt.user_name || 'Cliente Jacaré'}
                          </p>
                          {appt.created_by === 'admin' && (
                            <span className="bg-[#C5A859]/20 text-[#C5A859] text-[10px] px-1.5 py-0.5 rounded font-bold">
                              Balcão
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-gray-300">
                            {appt.user_phone || 'WhatsApp não informado'}
                          </p>
                          {appt.user_phone && (
                            <a
                              href={getWhatsAppConfirmationUrl(appt)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full"
                              title="Enviar confirmação pelo WhatsApp"
                            >
                              <MessageCircle size={12} />
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </div>
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
                        {appt.status === 'completed'
                          ? 'Concluído'
                          : appt.status === 'confirmed'
                          ? 'Confirmado'
                          : 'Agendado'}
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

                    {appt.notes && (
                      <p className="text-[11px] text-gray-400 italic bg-black/10 px-2.5 py-1.5 rounded-lg">
                        Obs: {appt.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                      <span className="text-gray-300 flex items-center gap-1.5 font-medium">
                        <Clock size={13} className="text-[#C5A859]" />
                        {appt.start_time
                          ? format(new Date(appt.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                          : `${appt.date || ''} ${appt.time || ''}`}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateStatus(appt.id, 'completed')}
                          className="px-2.5 py-1 bg-emerald-600/80 hover:bg-emerald-600 rounded-lg text-white font-bold text-xs flex items-center gap-1 transition-colors"
                          title="Concluir Atendimento"
                        >
                          <CheckCircle size={14} />
                          <span>Concluir</span>
                        </button>
                        <button
                          onClick={() => updateStatus(appt.id, 'cancelled')}
                          className="p-1.5 bg-red-900/40 hover:bg-red-800 rounded-lg text-red-300 hover:text-white transition-colors"
                          title="Cancelar Horário"
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
                  Total de {stats.totalCount} agendamentos registrados no sistema.
                </p>
                <div className="space-y-2">
                  {appointments.map((a, i) => (
                    <div key={i} className="flex justify-between items-center py-2.5 border-b border-white/5 text-xs">
                      <div>
                        <span className="font-semibold text-white block">
                          {a.user_name || `Cliente #${i + 1}`}
                        </span>
                        <span className="text-gray-400 text-[11px]">
                          {a.user_phone || 'WhatsApp pendente'}
                        </span>
                      </div>
                      {a.user_phone && (
                        <a
                          href={`https://wa.me/55${a.user_phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg font-bold flex items-center gap-1 hover:bg-emerald-500/30"
                        >
                          <MessageCircle size={13} />
                          <span>Chamar</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: AGENDAR PARA CLIENTE (DONO) */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#242F3E] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-6">
            
            {/* Modal Header */}
            <div className="bg-[#2E5C38] px-5 py-4 flex items-center justify-between border-b border-[#C5A859]/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#C5A859] text-[#1E2732] flex items-center justify-center font-bold">
                  <Scissors size={18} />
                </div>
                <div>
                  <h2 className="text-white font-bold text-base">Novo Agendamento Manual</h2>
                  <p className="text-emerald-100/70 text-xs">Para cliente que pediu por telefone/WhatsApp</p>
                </div>
              </div>
              <button
                onClick={handleResetModal}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* If appointment was just created successfully: show confirmation + WhatsApp button */}
            {lastCreatedAppt ? (
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/40">
                  <Check size={32} strokeWidth={3} />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white">Agendamento Realizado com Sucesso!</h3>
                  <p className="text-gray-300 text-xs mt-1">
                    O corte de <strong className="text-white">{lastCreatedAppt.user_name}</strong> foi registrado na sua agenda.
                  </p>
                </div>

                <div className="bg-black/30 p-4 rounded-2xl text-left text-xs space-y-2 border border-white/5">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cliente:</span>
                    <span className="font-bold text-white">{lastCreatedAppt.user_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">WhatsApp:</span>
                    <span className="font-bold text-white">{lastCreatedAppt.user_phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Serviço:</span>
                    <span className="font-bold text-[#C5A859]">{lastCreatedAppt.services?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Data e Hora:</span>
                    <span className="font-bold text-white">
                      {format(new Date(lastCreatedAppt.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-white/5">
                    <span className="text-gray-400">Valor Total:</span>
                    <span className="font-black text-emerald-400 text-sm">
                      {formatBRL(lastCreatedAppt.total_price)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <a
                    href={getWhatsAppConfirmationUrl(lastCreatedAppt)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
                  >
                    <MessageCircle size={20} />
                    <span>Enviar Confirmação no WhatsApp do Cliente</span>
                  </a>

                  <button
                    onClick={handleResetModal}
                    className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all"
                  >
                    Fechar e Voltar à Agenda
                  </button>
                </div>
              </div>
            ) : (
              /* Appointment Form */
              <form onSubmit={handleCreateManualAppointment} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                {/* 1. Nome do Cliente */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Nome Completo do Cliente *
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Carlos Oliveira"
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-black/30 border border-white/15 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#C5A859]"
                    />
                  </div>
                </div>

                {/* 2. WhatsApp do Cliente */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    WhatsApp / Celular com DDD *
                  </label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      required
                      placeholder="(41) 99999-9999"
                      value={clientPhone}
                      onChange={e => handlePhoneChange(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-black/30 border border-white/15 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#C5A859]"
                    />
                  </div>
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Usado para enviar a confirmação e lembretes para o cliente.
                  </span>
                </div>

                {/* 3. Seleção dos Serviços */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Serviço(s) Selecionados *</span>
                    <span className="text-[#C5A859] font-extrabold text-sm">
                      Total: {formatBRL(totalPrice)}
                    </span>
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {DEFAULT_SERVICES.map(serv => {
                      const isSelected = selectedServices.includes(serv.id);
                      return (
                        <div
                          key={serv.id}
                          onClick={() => toggleService(serv.id)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#3B5A3C]/40 border-[#C5A859] text-white shadow-sm'
                              : 'bg-black/20 border-white/10 text-gray-300 hover:border-white/25'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-xs ${
                                isSelected ? 'bg-[#C5A859] text-[#1E2732] font-bold' : 'border border-gray-500'
                              }`}
                            >
                              {isSelected && <Check size={14} strokeWidth={3} />}
                            </div>
                            <span className="text-xs font-semibold">{serv.name}</span>
                          </div>
                          <span className="text-xs font-black text-[#C5A859]">
                            {formatBRL(serv.price)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Data e Horário */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                      Data *
                    </label>
                    <input
                      type="date"
                      required
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      className="w-full px-3 py-2 bg-black/30 border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-[#C5A859]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                      Horário *
                    </label>
                    <select
                      value={selectedTime}
                      onChange={e => setSelectedTime(e.target.value)}
                      className="w-full px-3 py-2 bg-black/30 border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-[#C5A859]"
                    >
                      {TIME_SLOTS.map(t => (
                        <option key={t} value={t} className="bg-[#242F3E] text-white">
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 5. Barbeiro (fixo/selecionável) */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Profissional / Barbeiro
                  </label>
                  <div className="bg-black/20 p-2.5 rounded-xl border border-white/10 flex items-center justify-between text-xs">
                    <span className="font-bold text-white">Jacaré</span>
                    <span className="text-emerald-400 font-semibold text-[11px]">Disponível</span>
                  </div>
                </div>

                {/* 6. Observações opcionais */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    Observações (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Prefere pagar em dinheiro, corte degradê navalhado..."
                    value={clientNotes}
                    onChange={e => setClientNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-black/30 border border-white/15 rounded-xl text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#C5A859]"
                  />
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={handleResetModal}
                    className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl text-xs transition-colors"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="flex-1 py-3 bg-[#C5A859] hover:bg-[#b09448] text-[#1E2732] font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {modalLoading ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <>
                        <Check size={16} strokeWidth={3} />
                        <span>Confirmar Agendamento</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
