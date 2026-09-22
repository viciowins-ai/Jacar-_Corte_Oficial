import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import {
  DollarSign,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  RefreshCw,
  Plus,
  Phone,
  User,
  Scissors,
  Clock,
  MessageCircle,
  X,
  Check,
  Bell,
  Zap,
  LayoutGrid,
  LogOut,
  Pencil,
  Trash2,
  RotateCcw,
  CheckCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  fetchServices,
  saveService,
  removeService,
  fetchTimeSlots,
  saveTimeSlots,
  DEFAULT_SERVICES,
  DEFAULT_TIME_SLOTS,
  type ServiceItem,
  fetchCachedServices,
  fetchCachedTimeSlots,
  sortTimeSlots
} from '../lib/servicesAndSchedule';

const DEFAULT_BARBER = { id: 1, name: 'Jacaré', avatar_url: '/logo_jacare_final.jpg' };

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'agenda' | 'clientes' | 'auto' | 'servicos'>('agenda');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [stats, setStats] = useState({
    todayCount: 0,
    todayRevenue: 0,
    totalCount: 0,
    totalRevenue: 0
  });

  // Serviços e Horários Dinâmicos
  const [services, setServices] = useState<ServiceItem[]>(fetchCachedServices);
  const [timeSlots, setTimeSlots] = useState<string[]>(fetchCachedTimeSlots);
  const [serviceSubTab, setServiceSubTab] = useState<'precos' | 'horarios'>('precos');

  // Modal Edição de Preço/Serviço
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDuration, setEditDuration] = useState(30);
  const [isSavingService, setIsSavingService] = useState(false);

  // Modal Novo Serviço
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState(30);
  const [isSavingNewService, setIsSavingNewService] = useState(false);

  // Gerenciamento de Horários
  const [newSlotTime, setNewSlotTime] = useState('');
  const [isSavingSlots, setIsSavingSlots] = useState(false);

  // Notificação Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Modal de Agendamento Manual para Cliente
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
        const saved = localStorage.getItem('demo_appointments');
        list = saved ? JSON.parse(saved) : [
          {
            id: 'demo-appt-1',
            user_name: 'Humberto Miranda',
            user_phone: '+5541999904961',
            services: { name: 'Cabelo', price: 30 },
            barbers: { name: 'Jacaré' },
            start_time: new Date().toISOString(),
            status: 'confirmed',
            created_by: 'app'
          }
        ];
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
      let totalRev = 0;

      list.forEach(a => {
        const val = Number(a.total_price || a.services?.price || 0);
        totalRev += val;
        const aDate = a.start_time
          ? format(new Date(a.start_time), 'yyyy-MM-dd')
          : a.date;
        if (aDate === todayStr) {
          todayCount++;
          todayRev += val;
        }
      });

      setAppointments(list);
      setStats({
        todayCount,
        todayRevenue: todayRev,
        totalCount: list.length,
        totalRevenue: totalRev
      });

      // Extrair clientes únicos ou cadastrados
      const uniqueClientsMap = new Map<string, any>();
      list.forEach(item => {
        const phone = item.user_phone || item.phone || '';
        const name = item.user_name || item.name || 'Cliente';
        const email = item.user_email || item.email || '';
        const key = phone || email || name;
        if (key && !uniqueClientsMap.has(key)) {
          uniqueClientsMap.set(key, {
            name,
            phone,
            email,
            avatar_url: item.user_avatar || item.avatar_url || ''
          });
        }
      });

      // Se não houver clientes ainda, exibir dados padrão da barbearia
      if (uniqueClientsMap.size === 0) {
        uniqueClientsMap.set('humberto', {
          name: 'Humberto Miranda',
          email: 'ativalog1981@gmail.com',
          phone: '+5541999904961',
          avatar_url: ''
        });
        uniqueClientsMap.set('wagner', {
          name: 'WAGNER ROBERTO OLIVEIRA M...',
          email: 'wagner.oliveira.mendes@escola.pr.gov.br',
          phone: '+5541987243884',
          avatar_url: ''
        });
        uniqueClientsMap.set('humberto2', {
          name: 'Humberto',
          email: 'viciowins@gmail.com',
          phone: '+5541999904961',
          avatar_url: ''
        });
      }

      setClientsList(Array.from(uniqueClientsMap.values()));

      // Carregar Serviços e Horários do Firestore
      try {
        const [dbServices, dbSlots] = await Promise.all([
          fetchServices(),
          fetchTimeSlots()
        ]);
        if (dbServices && dbServices.length > 0) setServices(dbServices);
        if (dbSlots && dbSlots.length > 0) setTimeSlots(dbSlots);
      } catch (errServ) {
        console.warn('Erro ao carregar serviços/horários no painel:', errServ);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do admin:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Funções de Gestão de Preços e Serviços
  const handleStartEditService = (service: ServiceItem) => {
    setEditingService(service);
    setEditName(service.name);
    setEditPrice(String(service.price));
    setEditDuration(service.duration_minutes || 30);
  };

  const handleSaveEditService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    const numPrice = parseFloat(editPrice.replace(',', '.'));
    if (isNaN(numPrice) || numPrice < 0) {
      alert('Informe um valor de preço válido.');
      return;
    }

    setIsSavingService(true);
    try {
      await saveService({
        id: editingService.id,
        name: editName.trim() || editingService.name,
        price: numPrice,
        duration_minutes: Number(editDuration) || 30
      });
      const updated = await fetchServices();
      setServices(updated);
      setEditingService(null);
      showToast(`Preço do serviço "${editName}" atualizado com sucesso!`);
    } catch (err) {
      console.error('Erro ao salvar serviço:', err);
      alert('Não foi possível salvar o preço. Tente novamente.');
    } finally {
      setIsSavingService(false);
    }
  };

  const handleDeleteService = async (serviceId: string | number) => {
    if (!confirm('Tem certeza que deseja excluir este serviço da tabela?')) return;
    setIsSavingService(true);
    try {
      await removeService(serviceId);
      const updated = await fetchServices();
      setServices(updated);
      setEditingService(null);
      showToast('Serviço removido com sucesso.');
    } catch (err) {
      console.error('Erro ao remover serviço:', err);
      alert('Erro ao excluir serviço.');
    } finally {
      setIsSavingService(false);
    }
  };

  const handleCreateNewService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) {
      alert('Informe o nome do serviço.');
      return;
    }
    const numPrice = parseFloat(newServicePrice.replace(',', '.'));
    if (isNaN(numPrice) || numPrice < 0) {
      alert('Informe um preço válido.');
      return;
    }

    setIsSavingNewService(true);
    try {
      await saveService({
        name: newServiceName.trim(),
        price: numPrice,
        duration_minutes: Number(newServiceDuration) || 30
      });
      const updated = await fetchServices();
      setServices(updated);
      setShowAddServiceModal(false);
      setNewServiceName('');
      setNewServicePrice('');
      setNewServiceDuration(30);
      showToast(`Novo serviço "${newServiceName}" cadastrado!`);
    } catch (err) {
      console.error('Erro ao cadastrar serviço:', err);
      alert('Erro ao criar serviço.');
    } finally {
      setIsSavingNewService(false);
    }
  };

  const handleResetDefaultPrices = async () => {
    if (!confirm('Deseja restaurar a tabela de preços para os valores originais da barbearia?')) return;
    try {
      for (const s of DEFAULT_SERVICES) {
        await saveService({
          id: s.id,
          name: s.name,
          price: s.price,
          duration_minutes: s.duration_minutes
        });
      }
      const updated = await fetchServices();
      setServices(updated);
      showToast('Tabela de preços restaurada para o padrão!');
    } catch (err) {
      console.error('Erro ao restaurar:', err);
    }
  };

  // Funções de Gestão de Horários Disponíveis
  const handleRemoveSlot = async (slotToRemove: string) => {
    const updated = timeSlots.filter(s => s !== slotToRemove);
    if (updated.length === 0) {
      alert('Você precisa manter pelo menos um horário disponível.');
      return;
    }
    setTimeSlots(updated);
    try {
      await saveTimeSlots(updated);
      showToast(`Horário ${slotToRemove} removido da agenda.`);
    } catch (err) {
      console.error('Erro ao salvar horários:', err);
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTime = newSlotTime.trim();
    if (!cleanTime || !cleanTime.includes(':')) {
      alert('Informe um horário no formato HH:MM (Exemplo: 08:30 ou 19:30).');
      return;
    }
    if (timeSlots.includes(cleanTime)) {
      alert('Este horário já está na lista de disponíveis.');
      return;
    }

    const updated = sortTimeSlots([...timeSlots, cleanTime]);
    setTimeSlots(updated);
    setNewSlotTime('');
    try {
      setIsSavingSlots(true);
      await saveTimeSlots(updated);
      showToast(`Horário ${cleanTime} adicionado com sucesso!`);
    } catch (err) {
      console.error('Erro ao salvar horário:', err);
    } finally {
      setIsSavingSlots(false);
    }
  };

  const handleResetDefaultSlots = async () => {
    if (!confirm('Deseja restaurar a lista para os horários padrão de atendimento?')) return;
    try {
      setIsSavingSlots(true);
      await saveTimeSlots(DEFAULT_TIME_SLOTS);
      setTimeSlots(DEFAULT_TIME_SLOTS);
      showToast('Horários de atendimento restaurados para o padrão!');
    } catch (err) {
      console.error('Erro ao restaurar horários:', err);
    } finally {
      setIsSavingSlots(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const isDemo = localStorage.getItem('demo_mode') === 'true';
      if (isDemo) {
        const updated = appointments.map(a =>
          a.id === id ? { ...a, status: newStatus } : a
        );
        setAppointments(updated);
        localStorage.setItem('demo_appointments', JSON.stringify(updated));
      } else {
        await updateDoc(doc(db, 'appointments', id), { status: newStatus });
      }
      await loadAdminData();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Formatar Telefone automaticamente com máscara (DDD)
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

  const chosenServices = services.filter(
    s => selectedServices.includes(s.id) ||
         selectedServices.includes(String(s.id)) ||
         selectedServices.includes(Number(s.id))
  );
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
    <div className="flex flex-col min-h-screen bg-[#F0F2F5] text-gray-800 font-sans pb-24 items-center">
      <div className="w-full max-w-md bg-[#F0F2F5] min-h-screen flex flex-col shadow-2xl relative">
        
        {/* Top Header Card (Identical to Official App Print 4) */}
        <div className="bg-[#1E2732] pt-10 pb-6 px-5 rounded-b-[36px] shadow-lg relative z-10 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-extrabold text-[#C5A859] tracking-wide">
                Painel do Dono
              </h1>
              <p className="text-xs text-gray-300 font-medium mt-0.5">
                Bem-vindo, Chefe
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-gray-300 relative transition-colors"
                title="Notificações"
              >
                <Bell size={16} />
                <span className="w-2 h-2 rounded-full bg-red-500 absolute top-1.5 right-1.5" />
              </button>
              <button
                onClick={() => setTab('clientes')}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-gray-300 transition-colors"
                title="Equipe / Clientes"
              >
                <Users size={16} />
              </button>
            </div>
          </div>

          {/* Stat Cards (Total & Faturamento) */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            {/* Total Agendamentos */}
            <div className="bg-[#242F3E] p-3.5 rounded-2xl border border-white/5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-gray-400 text-[11px] mb-1">
                <Calendar size={13} />
                <span>Total</span>
              </div>
              <p className="text-2xl font-black text-white">{stats.totalCount}</p>
              <span className="text-[10px] text-gray-400 mt-1">Agendamentos</span>
            </div>

            {/* Faturamento */}
            <div className="bg-[#C5A859] p-3.5 rounded-2xl text-[#1E2732] flex flex-col justify-between shadow-md">
              <div className="flex items-center gap-1.5 text-[#1E2732]/70 text-[11px] mb-1 font-bold">
                <DollarSign size={13} />
                <span>Faturamento</span>
              </div>
              <p className="text-xl font-black text-[#1E2732]">{formatBRL(stats.totalRevenue)}</p>
              <span className="text-[10px] text-[#1E2732]/80 mt-1 font-semibold">Estimado total</span>
            </div>
          </div>
        </div>

        {/* 4 Navigation Tabs */}
        <div className="flex px-4 pt-3 pb-2 gap-2 bg-[#F0F2F5] sticky top-0 z-20">
          <button
            onClick={() => setTab('agenda')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              tab === 'agenda'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Agenda
          </button>
          <button
            onClick={() => setTab('clientes')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              tab === 'clientes'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Clientes
          </button>
          <button
            onClick={() => setTab('auto')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
              tab === 'auto'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Zap size={13} className="text-amber-500" />
            <span>Auto</span>
          </button>
          <button
            onClick={() => setTab('servicos')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              tab === 'servicos'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Serviços
          </button>
        </div>

        {/* Content Section */}
        <div className="flex-1 px-4 py-2 space-y-3">
          {tab === 'agenda' && (
            <div className="space-y-3">
              {/* Header with date and refresh */}
              <div className="flex items-center justify-between pt-1">
                <h2 className="text-sm font-extrabold text-gray-800">
                  Agendamentos
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-gray-600 bg-gray-200/80 px-2.5 py-1 rounded-full">
                    {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                  <button
                    onClick={loadAdminData}
                    className="p-1 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-200 transition-colors"
                    title="Atualizar lista"
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {/* Botão de Agendamento Manual (Dono) */}
              <button
                onClick={() => {
                  setLastCreatedAppt(null);
                  setShowNewModal(true);
                }}
                className="w-full bg-[#1E2732] hover:bg-[#283546] text-[#C5A859] font-black py-3 px-4 rounded-2xl shadow flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] border border-[#C5A859]/30"
              >
                <Plus size={18} strokeWidth={3} />
                <span className="text-xs uppercase tracking-wider">
                  + Agendar para Cliente (Balcão / WhatsApp)
                </span>
              </button>

              {/* Appointments List or Empty State */}
              {loading ? (
                <div className="py-12 text-center text-xs text-gray-500 font-medium">
                  Carregando agenda...
                </div>
              ) : appointments.length === 0 ? (
                /* Empty state identical to Print 4 */
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-12 px-6 flex flex-col items-center justify-center text-center shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                    <Calendar size={22} />
                  </div>
                  <p className="text-xs font-bold text-gray-400">
                    Agenda livre por enquanto!
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1 max-w-[200px]">
                    Nenhum cliente agendou ainda ou clique no botão acima para agendar manualmente.
                  </p>
                </div>
              ) : (
                /* Cards com os agendamentos */
                appointments.map(appt => (
                  <div
                    key={appt.id}
                    className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm text-gray-900">
                            {appt.user_name || 'Cliente Jacaré'}
                          </span>
                          {appt.created_by === 'admin' && (
                            <span className="bg-[#C5A859]/20 text-[#8c7433] text-[9px] font-black px-1.5 py-0.5 rounded">
                              Balcão
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                          {appt.user_phone || 'WhatsApp não informado'}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          appt.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : appt.status === 'confirmed'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {appt.status === 'completed'
                          ? 'Concluído'
                          : appt.status === 'confirmed'
                          ? 'Confirmado'
                          : 'Agendado'}
                      </span>
                    </div>

                    <div className="bg-gray-50 p-2.5 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="text-gray-400">Serviço: </span>
                        <span className="font-bold text-gray-800">{appt.services?.name || 'Corte'}</span>
                      </div>
                      <span className="font-extrabold text-[#3B5A3C]">
                        {formatBRL(appt.total_price || appt.services?.price || 35)}
                      </span>
                    </div>

                    {appt.notes && (
                      <p className="text-[11px] text-gray-500 italic bg-gray-50 px-2.5 py-1 rounded-lg">
                        Obs: {appt.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
                      <span className="text-gray-500 flex items-center gap-1 font-medium">
                        <Clock size={12} className="text-gray-400" />
                        {appt.start_time
                          ? format(new Date(appt.start_time), "dd/MM 'às' HH:mm", { locale: ptBR })
                          : `${appt.date || ''} ${appt.time || ''}`}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {appt.user_phone && (
                          <a
                            href={getWhatsAppConfirmationUrl(appt)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#1EBE5D] rounded-lg transition-colors"
                            title="Chamar no WhatsApp"
                          >
                            <MessageCircle size={15} />
                          </a>
                        )}
                        <button
                          onClick={() => updateStatus(appt.id, 'completed')}
                          className="px-2.5 py-1 bg-[#3B5A3C] hover:bg-[#2e472f] text-white font-bold rounded-lg text-xs flex items-center gap-1 transition-colors"
                          title="Concluir Atendimento"
                        >
                          <CheckCircle size={13} />
                          <span>Concluir</span>
                        </button>
                        <button
                          onClick={() => updateStatus(appt.id, 'cancelled')}
                          className="p-1 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"
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
          )}

          {/* Tab: Clientes (Exatamente como o print da lista de clientes) */}
          {tab === 'clientes' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pt-1">
                <h2 className="text-sm font-extrabold text-gray-800">
                  Clientes Cadastrados
                </h2>
                <span className="text-[11px] font-bold text-gray-200 bg-gray-800 px-2 py-0.5 rounded-full">
                  {clientsList.length} total
                </span>
              </div>

              <div className="space-y-2">
                {clientsList.map((c, i) => (
                  <div
                    key={i}
                    className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#E5E9F0] border-2 border-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                        {c.avatar_url ? (
                          <img src={c.avatar_url} alt={c.name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={18} className="text-gray-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-gray-900 truncate">
                          {c.name}
                        </h3>
                        {c.email && (
                          <p className="text-[11px] text-gray-400 truncate">
                            {c.email}
                          </p>
                        )}
                        <p className="text-[11px] text-[#3B5A3C] font-semibold mt-0.5">
                          {c.phone || 'Sem telefone'}
                        </p>
                      </div>
                    </div>

                    {c.phone && (
                      <a
                        href={`https://wa.me/55${c.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center hover:bg-[#1EBE5D] transition-colors shrink-0 shadow-sm"
                        title="Enviar mensagem no WhatsApp"
                      >
                        <MessageCircle size={16} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: Auto (Automações) */}
          {tab === 'auto' && (
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-amber-500" />
                <h3 className="text-xs font-bold text-gray-900 uppercase">
                  Lembretes e Automações de WhatsApp
                </h3>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Mensagens automáticas prontas para envio com 1 toque para seus clientes:
              </p>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60">
                  <span className="font-bold text-gray-800 block mb-1">
                    1. Confirmação Imediata
                  </span>
                  <p className="text-gray-600 text-[11px]">
                    Enviada assim que o cliente ou você cadastra um novo horário com valor e data.
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60">
                  <span className="font-bold text-gray-800 block mb-1">
                    2. Lembrete 2 Horas Antes
                  </span>
                  <p className="text-gray-600 text-[11px]">
                    Evita faltas e atrasos lembrando o cliente do horário marcado.
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60">
                  <span className="font-bold text-gray-800 block mb-1">
                    3. Retorno em 20 Dias
                  </span>
                  <p className="text-gray-600 text-[11px]">
                    Convida o cliente a renovar o corte para manter o visual em dia.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Serviços & Horários */}
          {tab === 'servicos' && (
            <div className="space-y-3">
              {/* Segmented Sub-tab Switch */}
              <div className="flex bg-gray-200/90 p-1 rounded-2xl gap-1 shadow-inner">
                <button
                  id="btn-subtab-precos"
                  onClick={() => setServiceSubTab('precos')}
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    serviceSubTab === 'precos'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Scissors size={14} className="text-[#3B5A3C]" />
                  <span>Preços & Serviços</span>
                </button>
                <button
                  id="btn-subtab-horarios"
                  onClick={() => setServiceSubTab('horarios')}
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    serviceSubTab === 'horarios'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Clock size={14} className="text-[#C5A859]" />
                  <span>Horários Disponíveis</span>
                </button>
              </div>

              {/* Subtab 1: Tabela de Preços */}
              {serviceSubTab === 'precos' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <h2 className="text-sm font-extrabold text-gray-900">
                        Tabela de Preços & Serviços
                      </h2>
                      <p className="text-gray-500 text-[11px]">
                        Atualize os preços diretamente aqui para sincronizar com todos os clientes
                      </p>
                    </div>
                    <button
                      id="btn-novo-servico"
                      onClick={() => setShowAddServiceModal(true)}
                      className="px-3 py-1.5 bg-[#3B5A3C] hover:bg-[#2e4730] text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                    >
                      <Plus size={14} strokeWidth={3} />
                      <span>Novo Serviço</span>
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
                    {services.map(s => (
                      <div
                        key={s.id}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/70 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-xs truncate">{s.name}</span>
                          </div>
                          <span className="text-gray-400 text-[11px] block mt-0.5">
                            {s.duration_minutes || 30} minutos de atendimento
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-black text-[#3B5A3C] text-sm">
                            {formatBRL(s.price)}
                          </span>
                          <button
                            id={`btn-editar-servico-${s.id}`}
                            onClick={() => handleStartEditService(s)}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-[#C5A859]/20 text-gray-800 hover:text-[#8c7433] rounded-xl text-xs font-bold flex items-center gap-1 border border-gray-200 transition-all cursor-pointer"
                          >
                            <Pencil size={12} />
                            <span>Editar Preço</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                    <button
                      id="btn-restaurar-precos"
                      onClick={handleResetDefaultPrices}
                      className="text-gray-400 hover:text-red-500 text-[11px] font-medium flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw size={12} />
                      <span>Restaurar preços originais de fábrica</span>
                    </button>
                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCheck size={13} />
                      <span>Sincronizado instantaneamente no app dos clientes</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Subtab 2: Horários Disponíveis */}
              {serviceSubTab === 'horarios' && (
                <div className="space-y-3">
                  <div className="pt-1">
                    <h2 className="text-sm font-extrabold text-gray-900">
                      Horários de Atendimento & Agendamento
                    </h2>
                    <p className="text-gray-500 text-[11px] mt-0.5">
                      Adicione novos horários ou remova os que não deseja atender. Esses horários aparecem para os clientes.
                    </p>
                  </div>

                  {/* Form Adicionar Horário */}
                  <form
                    onSubmit={handleAddSlot}
                    className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2"
                  >
                    <div className="relative flex-1">
                      <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="time"
                        id="input-novo-horario"
                        required
                        value={newSlotTime}
                        onChange={e => setNewSlotTime(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-xs font-semibold focus:outline-none focus:border-[#C5A859]"
                      />
                    </div>
                    <button
                      type="submit"
                      id="btn-adicionar-horario"
                      disabled={isSavingSlots || !newSlotTime}
                      className="px-4 py-2 bg-[#C5A859] hover:bg-[#b09448] text-[#1E2732] font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                    >
                      <Plus size={14} strokeWidth={3} />
                      <span>Adicionar Horário</span>
                    </button>
                  </form>

                  {/* Grade de Horários Ativos */}
                  <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                        Horários Ativos ({timeSlots.length})
                      </span>
                      <span className="text-[11px] text-gray-400">
                        Clique no <strong className="text-red-500">X</strong> para remover
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-1">
                      {timeSlots.map(slot => (
                        <div
                          key={slot}
                          className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200/80 rounded-xl flex items-center justify-between group transition-all"
                        >
                          <span className="text-xs font-black text-gray-800 tracking-wide">
                            {slot}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSlot(slot)}
                            className="w-5 h-5 rounded-full bg-gray-200 hover:bg-red-500 text-gray-500 hover:text-white flex items-center justify-center transition-colors"
                            title={`Remover horário ${slot}`}
                          >
                            <X size={11} strokeWidth={3} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ações e Informações */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-2xl flex items-start gap-2.5">
                    <Zap size={16} className="text-amber-700 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-amber-900 leading-relaxed">
                      <strong>Dica do Jacaré:</strong> Para bloquear um horário (como pausa para almoço ou compromisso), basta removê-lo. Ele deixará de aparecer para qualquer cliente que tentar agendar.
                    </div>
                  </div>

                  <div className="pt-1 flex justify-between items-center text-xs">
                    <button
                      id="btn-restaurar-horarios"
                      onClick={handleResetDefaultSlots}
                      className="text-gray-400 hover:text-red-500 text-[11px] font-medium flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw size={12} />
                      <span>Restaurar horários padrão da barbearia</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Floating Bottom Bar (Identical to Print 4: Pill with grid icon & Sair) */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
          <div className="bg-[#1E2732] text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-4 border border-white/10">
            <button
              onClick={() => navigate('/home')}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-gray-300 hover:text-white"
              title="Ir para o Aplicativo Principal"
            >
              <LayoutGrid size={18} />
            </button>
            <div className="w-[1px] h-4 bg-white/20" />
            <button
              onClick={() => navigate('/home')}
              className="text-xs font-bold text-gray-300 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <LogOut size={14} />
              <span>Sair</span>
            </button>
          </div>
        </div>

      </div>

      {/* MODAL: AGENDAR PARA CLIENTE (DONO) */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1E2732] border border-[#C5A859]/30 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl my-6 text-white">
            
            {/* Modal Header */}
            <div className="bg-[#2E5C38] px-5 py-4 flex items-center justify-between border-b border-[#C5A859]/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#C5A859] text-[#1E2732] flex items-center justify-center font-bold">
                  <Scissors size={18} />
                </div>
                <div>
                  <h2 className="text-white font-bold text-sm">Novo Agendamento Manual</h2>
                  <p className="text-emerald-100/70 text-[11px]">Agende para clientes que ligaram ou pediram no WhatsApp</p>
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
                <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/40">
                  <Check size={30} strokeWidth={3} />
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">Agendamento Realizado!</h3>
                  <p className="text-gray-300 text-xs mt-1">
                    O corte de <strong className="text-white">{lastCreatedAppt.user_name}</strong> foi registrado na sua agenda.
                  </p>
                </div>

                <div className="bg-black/30 p-3.5 rounded-2xl text-left text-xs space-y-2 border border-white/5">
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

                <div className="space-y-2 pt-1">
                  <a
                    href={getWhatsAppConfirmationUrl(lastCreatedAppt)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all text-xs"
                  >
                    <MessageCircle size={18} />
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
              <form onSubmit={handleCreateManualAppointment} className="p-4 space-y-3.5 max-h-[80vh] overflow-y-auto">
                {/* 1. Nome do Cliente */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Nome Completo do Cliente *
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Carlos Oliveira"
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-black/30 border border-white/15 rounded-xl text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#C5A859]"
                    />
                  </div>
                </div>

                {/* 2. WhatsApp do Cliente */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                    WhatsApp / Celular com DDD *
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      required
                      placeholder="(41) 99999-9999"
                      value={clientPhone}
                      onChange={e => handlePhoneChange(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-black/30 border border-white/15 rounded-xl text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#C5A859]"
                    />
                  </div>
                </div>

                {/* 3. Seleção dos Serviços */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Serviço(s) *</span>
                    <span className="text-[#C5A859] font-extrabold text-xs">
                      Total: {formatBRL(totalPrice)}
                    </span>
                  </label>
                  <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {services.map(serv => {
                      const isSelected = selectedServices.includes(serv.id) ||
                        selectedServices.includes(String(serv.id)) ||
                        selectedServices.includes(Number(serv.id));
                      return (
                        <div
                          key={serv.id}
                          onClick={() => toggleService(serv.id)}
                          className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#3B5A3C]/40 border-[#C5A859] text-white'
                              : 'bg-black/20 border-white/10 text-gray-300 hover:border-white/25'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                                isSelected ? 'bg-[#C5A859] text-[#1E2732] font-bold' : 'border border-gray-500'
                              }`}
                            >
                              {isSelected && <Check size={12} strokeWidth={3} />}
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
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                      Data *
                    </label>
                    <input
                      type="date"
                      required
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-black/30 border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-[#C5A859]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                      Horário *
                    </label>
                    <select
                      value={selectedTime}
                      onChange={e => setSelectedTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-black/30 border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-[#C5A859]"
                    >
                      {timeSlots.map(t => (
                        <option key={t} value={t} className="bg-[#1E2732] text-white">
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 5. Observações opcionais */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Observações (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Corte degradê navalhado..."
                    value={clientNotes}
                    onChange={e => setClientNotes(e.target.value)}
                    className="w-full px-3 py-1.5 bg-black/30 border border-white/15 rounded-xl text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#C5A859]"
                  />
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-2.5 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={handleResetModal}
                    className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl text-xs transition-colors"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="flex-1 py-2.5 bg-[#C5A859] hover:bg-[#b09448] text-[#1E2732] font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    {modalLoading ? (
                      <RefreshCw size={15} className="animate-spin" />
                    ) : (
                      <>
                        <Check size={15} strokeWidth={3} />
                        <span>Confirmar</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: EDITAR PREÇO / SERVIÇO */}
      {editingService && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1E2732] border border-[#C5A859]/30 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl text-white">
            <div className="bg-[#2E5C38] px-5 py-4 flex items-center justify-between border-b border-[#C5A859]/30">
              <div className="flex items-center gap-2">
                <Scissors size={18} className="text-[#C5A859]" />
                <h2 className="text-white font-bold text-sm">Editar Preço & Serviço</h2>
              </div>
              <button
                onClick={() => setEditingService(null)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditService} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Nome do Serviço
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-black/30 border border-white/15 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-[#C5A859]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Preço (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-[#C5A859] text-sm">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    required
                    value={editPrice}
                    onChange={e => setEditPrice(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-black/30 border border-white/15 rounded-xl text-white font-black text-sm focus:outline-none focus:border-[#C5A859]"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Este valor será exibido no cardápio de agendamento dos clientes.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Duração Estimada (minutos)
                </label>
                <input
                  type="number"
                  step="5"
                  min="5"
                  value={editDuration}
                  onChange={e => setEditDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-black/30 border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-[#C5A859]"
                />
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={isSavingService}
                  className="w-full py-2.5 bg-[#C5A859] hover:bg-[#b09448] text-[#1E2732] font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingService ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Check size={14} strokeWidth={3} />
                      <span>Salvar Preço</span>
                    </>
                  )}
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingService(null)}
                    className="flex-1 py-2 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl text-xs transition-colors"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteService(editingService.id)}
                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-colors"
                    title="Excluir serviço"
                  >
                    <Trash2 size={13} />
                    <span>Excluir</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CADASTRAR NOVO SERVIÇO */}
      {showAddServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1E2732] border border-[#C5A859]/30 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl text-white">
            <div className="bg-[#2E5C38] px-5 py-4 flex items-center justify-between border-b border-[#C5A859]/30">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-[#C5A859]" />
                <h2 className="text-white font-bold text-sm">Novo Serviço</h2>
              </div>
              <button
                onClick={() => setShowAddServiceModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNewService} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Corte Degradê Navalhado"
                  value={newServiceName}
                  onChange={e => setNewServiceName(e.target.value)}
                  className="w-full px-3 py-2 bg-black/30 border border-white/15 rounded-xl text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#C5A859]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Preço (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-[#C5A859] text-sm">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    required
                    placeholder="35.00"
                    value={newServicePrice}
                    onChange={e => setNewServicePrice(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-black/30 border border-white/15 rounded-xl text-white font-black text-sm focus:outline-none focus:border-[#C5A859]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Duração Estimada (minutos)
                </label>
                <input
                  type="number"
                  step="5"
                  min="5"
                  value={newServiceDuration}
                  onChange={e => setNewServiceDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-black/30 border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-[#C5A859]"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddServiceModal(false)}
                  className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingNewService}
                  className="flex-1 py-2.5 bg-[#C5A859] hover:bg-[#b09448] text-[#1E2732] font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingNewService ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Check size={14} strokeWidth={3} />
                      <span>Cadastrar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST FEEDBACK */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#1E2732] text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-[#C5A859]/50 flex items-center gap-2.5 animate-bounce">
          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <Check size={12} strokeWidth={3} />
          </div>
          <span className="text-xs font-bold text-white">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
