import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, getDocs, updateDoc, doc, addDoc, deleteDoc } from 'firebase/firestore';
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
  CheckCheck,
  Send,
  Bot,
  Sliders
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
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
import {
  fetchWhatsAppSettings,
  saveWhatsAppSettings,
  DEFAULT_TEMPLATES,
  type WhatsAppSettings,
  renderMessage,
  buildWhatsAppLink,
  sendViaWebhook,
  markReminderSent,
  isReminderSent,
  getCachedWhatsAppSettings
} from '../lib/whatsappAutomation';

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

  // Sub-abas e Estado das Automações de WhatsApp
  const [autoSubTab, setAutoSubTab] = useState<'lembretes' | 'confirmacoes' | 'retorno' | 'config'>('lembretes');
  const [waSettings, setWaSettings] = useState<WhatsAppSettings>(getCachedWhatsAppSettings);
  const [isSavingWaSettings, setIsSavingWaSettings] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [sentRemindersMap, setSentRemindersMap] = useState<Record<string, boolean>>({});
  const [showRobotGuideModal, setShowRobotGuideModal] = useState(false);

  // Exclusão de Clientes
  const [clientToDelete, setClientToDelete] = useState<any | null>(null);
  const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);
  const [isDeletingClient, setIsDeletingClient] = useState(false);

  const getDeletedClientKeys = (): string[] => {
    try {
      const saved = localStorage.getItem('deleted_client_keys');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const handleConfirmDeleteClient = async () => {
    if (!clientToDelete) return;
    setIsDeletingClient(true);
    const key = clientToDelete.id || clientToDelete.phone || clientToDelete.email || clientToDelete.name;
    try {
      // 1. Salvar lista de excluídos
      const currentDeleted = getDeletedClientKeys();
      if (!currentDeleted.includes(key)) {
        localStorage.setItem('deleted_client_keys', JSON.stringify([...currentDeleted, key]));
      }

      // 2. Remover do estado na tela
      setClientsList(prev => prev.filter(c => (c.id || c.phone || c.email || c.name) !== key));

      // 3. Se houver id do usuário no Firestore, tentar remover
      if (clientToDelete.userId) {
        try {
          await deleteDoc(doc(db, 'users', clientToDelete.userId));
        } catch (e) {
          console.warn('Erro ao remover documento de users:', e);
        }
      }

      showToast(`Cliente "${clientToDelete.name}" removido com sucesso! 🗑️`);
    } catch {
      showToast('Erro ao excluir cliente.');
    } finally {
      setIsDeletingClient(false);
      setShowDeleteClientModal(false);
      setClientToDelete(null);
    }
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
      const deletedKeys = getDeletedClientKeys();

      list.forEach(item => {
        const phone = item.user_phone || item.phone || '';
        const name = item.user_name || item.name || 'Cliente';
        const email = item.user_email || item.email || '';
        const key = item.user_id || phone || email || name;
        if (key && !deletedKeys.includes(key) && !uniqueClientsMap.has(key)) {
          uniqueClientsMap.set(key, {
            id: key,
            userId: item.user_id,
            name,
            phone,
            email,
            avatar_url: item.user_avatar || item.avatar_url || ''
          });
        }
      });

      // Se não houver clientes ainda, exibir dados padrão da barbearia (exceto se excluídos)
      if (uniqueClientsMap.size === 0 && deletedKeys.length === 0) {
        uniqueClientsMap.set('humberto', {
          id: 'humberto',
          name: 'Humberto Miranda',
          email: 'ativalog1981@gmail.com',
          phone: '+5541999904961',
          avatar_url: ''
        });
        uniqueClientsMap.set('wagner', {
          id: 'wagner',
          name: 'WAGNER ROBERTO OLIVEIRA M...',
          email: 'wagner.oliveira.mendes@escola.pr.gov.br',
          phone: '+5541987243884',
          avatar_url: ''
        });
        uniqueClientsMap.set('humberto2', {
          id: 'humberto2',
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

      // Carregar Configurações de WhatsApp
      try {
        const wa = await fetchWhatsAppSettings();
        if (wa) setWaSettings(wa);
      } catch (errWa) {
        console.warn('Erro ao carregar configurações de WhatsApp:', errWa);
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
    
    const message = renderMessage(waSettings.templates.confirmation || DEFAULT_TEMPLATES.confirmation, {
      nome: appt.user_name || 'Amigo',
      data: dateFormatted,
      horario: appt.start_time ? format(new Date(appt.start_time), 'HH:mm') : appt.time || '14:00',
      servico: appt.services?.name || 'Corte',
      valor: formatBRL(appt.total_price || appt.services?.price || 35)
    });
    
    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
  };

  // Lógica inteligente de Automações WhatsApp
  const todayAppointments = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return appointments.filter(appt => {
      if (!appt.start_time && !appt.date) return false;
      const apptDateStr = appt.start_time
        ? format(new Date(appt.start_time), 'yyyy-MM-dd')
        : appt.date;
      return apptDateStr === todayStr && appt.status !== 'cancelled';
    }).sort((a, b) => {
      const timeA = a.start_time ? format(new Date(a.start_time), 'HH:mm') : a.time || '00:00';
      const timeB = b.start_time ? format(new Date(b.start_time), 'HH:mm') : b.time || '00:00';
      return timeA.localeCompare(timeB);
    });
  }, [appointments]);

  const recentAppointments = useMemo(() => {
    return [...appointments]
      .filter(a => a.status !== 'cancelled')
      .slice(0, 15);
  }, [appointments]);

  const returnClients = useMemo(() => {
    const clientsMap = new Map<string, { name: string; phone: string; lastDate: Date; serviceName: string; daysAgo: number }>();
    
    appointments.forEach(appt => {
      const phone = appt.user_phone || '';
      const name = appt.user_name || 'Cliente';
      const rawDate = appt.start_time || appt.created_at || (appt.date ? `${appt.date}T${appt.time || '12:00'}` : null);
      if (!rawDate) return;
      
      const apptDate = new Date(rawDate);
      if (isNaN(apptDate.getTime())) return;
      
      const key = phone ? phone.replace(/\D/g, '') : name.toLowerCase();
      if (!key) return;

      const existing = clientsMap.get(key);
      if (!existing || apptDate > existing.lastDate) {
        const days = differenceInDays(new Date(), apptDate);
        clientsMap.set(key, {
          name,
          phone,
          lastDate: apptDate,
          serviceName: appt.services?.name || 'Corte',
          daysAgo: days
        });
      }
    });

    // Se não houver dados antigos suficientes no banco (ambiente inicial), adiciona exemplos práticos
    if (clientsMap.size === 0) {
      clientsMap.set('1', {
        name: 'Humberto Miranda',
        phone: '+5541999904961',
        lastDate: new Date(Date.now() - 24 * 86400000),
        serviceName: 'Cabelo + Barba',
        daysAgo: 24
      });
      clientsMap.set('2', {
        name: 'Wagner Roberto',
        phone: '+5541987243884',
        lastDate: new Date(Date.now() - 21 * 86400000),
        serviceName: 'Cabelo',
        daysAgo: 21
      });
    }

    return Array.from(clientsMap.values())
      .filter(c => c.daysAgo >= 20)
      .sort((a, b) => b.daysAgo - a.daysAgo);
  }, [appointments]);

  // Disparo de mensagem no WhatsApp (1-Toque ou Robô Automático)
  const handleSendWhatsApp = async (
    type: 'confirmation' | 'reminder2h' | 'return20d',
    item: { id?: string; name: string; phone: string; date?: string; time?: string; service?: string; price?: number }
  ) => {
    if (!item.phone) {
      alert('Este cliente não possui telefone cadastrado.');
      return;
    }

    const template = waSettings.templates[type] || DEFAULT_TEMPLATES[type];
    const message = renderMessage(template, {
      nome: item.name,
      data: item.date || 'Hoje',
      horario: item.time || '14:00',
      servico: item.service || 'Corte',
      valor: formatBRL(item.price || 35)
    });

    // Robô Automático via Webhook (se ativado)
    if (waSettings.autoSendViaWebhook && waSettings.webhookUrl) {
      showToast('Disparando via Robô de WhatsApp... 🚀');
      const res = await sendViaWebhook(waSettings, item.phone, message);
      if (res.success) {
        if (item.id) markReminderSent(item.id, type);
        setSentRemindersMap(prev => ({ ...prev, [`${type}_${item.id || item.phone}`]: true }));
        showToast('Enviado pelo Robô com sucesso! ✅');
        return;
      } else {
        showToast(`Robô falhou (${res.error}). Abrindo no WhatsApp...`);
      }
    }

    // Modo 1-Toque (Nativo)
    const link = buildWhatsAppLink(item.phone, message);
    if (item.id) markReminderSent(item.id, type);
    setSentRemindersMap(prev => ({ ...prev, [`${type}_${item.id || item.phone}`]: true }));
    window.open(link, '_blank');
    showToast('Mensagem aberta no WhatsApp! 💬');
  };

  const handleDispatchAllTodayReminders = () => {
    if (todayAppointments.length === 0) {
      alert('Não há agendamentos para hoje.');
      return;
    }
    todayAppointments.forEach((appt, idx) => {
      setTimeout(() => {
        handleSendWhatsApp('reminder2h', {
          id: appt.id,
          name: appt.user_name || 'Cliente',
          phone: appt.user_phone || '',
          date: 'Hoje',
          time: appt.start_time ? format(new Date(appt.start_time), 'HH:mm') : appt.time || '09:00',
          service: appt.services?.name || 'Corte',
          price: appt.total_price || appt.services?.price || 35
        });
      }, idx * 600);
    });
    showToast(`Disparando lembretes para ${todayAppointments.length} clientes... 🚀`);
  };

  const handleSaveWaSettings = async () => {
    setIsSavingWaSettings(true);
    try {
      await saveWhatsAppSettings(waSettings);
      showToast('Configurações e modelos salvos com sucesso! ✅');
    } catch {
      showToast('Erro ao salvar configurações.');
    } finally {
      setIsSavingWaSettings(false);
    }
  };

  const handleTestWaMessage = (type: 'confirmation' | 'reminder2h' | 'return20d') => {
    const targetPhone = testPhone.trim() || waSettings.barberPhone || '5579998887777';
    handleSendWhatsApp(type, {
      name: 'Cliente Teste',
      phone: targetPhone,
      date: format(new Date(), 'dd/MM/yyyy'),
      time: '15:00',
      service: 'Corte Degradê + Barba',
      price: 50
    });
  };

  const handleTestWebhookConnection = async () => {
    if (!waSettings.webhookUrl) {
      alert('Por favor, informe a URL do Webhook do Robô primeiro.');
      return;
    }
    setIsTestingWebhook(true);
    try {
      const targetPhone = testPhone.trim() || waSettings.barberPhone || '5579998887777';
      const testMsg = `🧪 *Teste de Conexão Jacaré do Corte*\nRobô de WhatsApp conectado e operando com sucesso! 🚀`;
      const res = await sendViaWebhook(waSettings, targetPhone, testMsg);
      if (res.success) {
        showToast('Webhook respondeu com SUCESSO! Robô ativo. ✅');
      } else {
        alert(`Falha ao conectar com o Webhook: ${res.error}\nVerifique a URL e Token.`);
      }
    } finally {
      setIsTestingWebhook(false);
    }
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
                {clientsList.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center">
                    <User size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-xs font-bold text-gray-700">Nenhum cliente cadastrado</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Os clientes aparecerão aqui assim que fizerem agendamentos.</p>
                  </div>
                ) : (
                  clientsList.map((c, i) => (
                    <div
                      key={c.id || i}
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

                      <div className="flex items-center gap-1.5 shrink-0">
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
                        <button
                          type="button"
                          onClick={() => {
                            setClientToDelete(c);
                            setShowDeleteClientModal(true);
                          }}
                          className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 flex items-center justify-center transition-colors shrink-0 shadow-xs"
                          title="Excluir cliente"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab: Auto (Automações) */}
          {tab === 'auto' && (
            <div className="space-y-3">
              {/* Header Status Bar */}
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <Zap size={18} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-gray-900 uppercase tracking-wide">
                        Lembretes e Automações
                      </h3>
                      <p className="text-[11px] text-gray-500 font-medium">
                        WhatsApp oficial Jacaré do Corte
                      </p>
                    </div>
                  </div>
                  
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                    waSettings.autoSendViaWebhook
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-green-100 text-[#2E5C38] border border-green-200'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{waSettings.autoSendViaWebhook ? 'Robô Ativo' : '1-Toque Ativo'}</span>
                  </span>
                </div>
              </div>

              {/* Sub-tabs Navigation */}
              <div className="grid grid-cols-4 bg-gray-200/90 p-1 rounded-2xl gap-1 shadow-inner text-[11px]">
                <button
                  onClick={() => setAutoSubTab('lembretes')}
                  className={`py-2 font-bold rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                    autoSubTab === 'lembretes'
                      ? 'bg-white text-gray-900 shadow-sm font-black'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Clock size={13} className="text-amber-500" />
                  <span>Hoje ({todayAppointments.length})</span>
                </button>

                <button
                  onClick={() => setAutoSubTab('confirmacoes')}
                  className={`py-2 font-bold rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                    autoSubTab === 'confirmacoes'
                      ? 'bg-white text-gray-900 shadow-sm font-black'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <CheckCheck size={13} className="text-[#3B5A3C]" />
                  <span>Confirmações</span>
                </button>

                <button
                  onClick={() => setAutoSubTab('retorno')}
                  className={`py-2 font-bold rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                    autoSubTab === 'retorno'
                      ? 'bg-white text-gray-900 shadow-sm font-black'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Scissors size={13} className="text-blue-500" />
                  <span>+20 Dias ({returnClients.length})</span>
                </button>

                <button
                  onClick={() => setAutoSubTab('config')}
                  className={`py-2 font-bold rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                    autoSubTab === 'config'
                      ? 'bg-white text-gray-900 shadow-sm font-black'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Sliders size={13} className="text-purple-500" />
                  <span>Config/Robô</span>
                </button>
              </div>

              {/* SUBTAB 1: LEMBRETES DE HOJE (2 HORAS ANTES) */}
              {autoSubTab === 'lembretes' && (
                <div className="space-y-3">
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 uppercase">
                          ⏰ Lembretes dos Horários de Hoje
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Evite faltas e atrasos avisando o cliente antes do horário.
                        </p>
                      </div>

                      {todayAppointments.length > 0 && (
                        <button
                          onClick={handleDispatchAllTodayReminders}
                          className="px-3 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-black text-[11px] rounded-xl shadow transition-all flex items-center gap-1 active:scale-95 shrink-0"
                          title="Dispara lembrete para todos os clientes agendados para hoje"
                        >
                          <Zap size={13} />
                          <span>Disparar Todos</span>
                        </button>
                      )}
                    </div>

                    {todayAppointments.length === 0 ? (
                      <div className="p-6 bg-gray-50 rounded-xl border border-gray-200/60 text-center">
                        <Calendar size={24} className="mx-auto text-gray-400 mb-2" />
                        <p className="text-xs font-bold text-gray-700">
                          Nenhum horário marcado para hoje ainda.
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1">
                          Assim que novos agendamentos forem marcados para o dia, os lembretes ficarão prontos aqui.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {todayAppointments.map((appt) => {
                          const timeStr = appt.start_time
                            ? format(new Date(appt.start_time), 'HH:mm')
                            : appt.time || '09:00';
                          const isSent = sentRemindersMap[`reminder2h_${appt.id}`] || isReminderSent(appt.id, 'reminder2h');

                          return (
                            <div
                              key={appt.id}
                              className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-xs text-[#3B5A3C] bg-white px-2 py-0.5 rounded border border-gray-200">
                                    {timeStr}
                                  </span>
                                  <span className="font-bold text-xs text-gray-900 truncate">
                                    {appt.user_name || 'Cliente'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                                  {appt.services?.name || 'Corte'} • {appt.user_phone || 'Sem WhatsApp'}
                                </p>
                              </div>

                              <button
                                onClick={() =>
                                  handleSendWhatsApp('reminder2h', {
                                    id: appt.id,
                                    name: appt.user_name || 'Cliente',
                                    phone: appt.user_phone || '',
                                    date: 'Hoje',
                                    time: timeStr,
                                    service: appt.services?.name || 'Corte',
                                    price: appt.total_price || appt.services?.price || 35
                                  })
                                }
                                className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
                                  isSent
                                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    : 'bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow active:scale-95'
                                }`}
                              >
                                <MessageCircle size={14} />
                                <span>{isSent ? 'Reenviar Lembrete' : 'Enviar Lembrete 2h'}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUBTAB 2: CONFIRMAÇÃO IMEDIATA */}
              {autoSubTab === 'confirmacoes' && (
                <div className="space-y-3">
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 uppercase">
                        📲 Confirmações de Agendamentos Recentes
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Envie o comprovante com valor, data e horário para o WhatsApp do cliente.
                      </p>
                    </div>

                    {recentAppointments.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-4">
                        Nenhum agendamento recente encontrado.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {recentAppointments.map((appt) => {
                          const dateDisplay = appt.start_time
                            ? format(new Date(appt.start_time), "dd/MM 'às' HH:mm", { locale: ptBR })
                            : `${appt.date} às ${appt.time}`;
                          const isSent = sentRemindersMap[`confirmation_${appt.id}`] || isReminderSent(appt.id, 'confirmation');

                          return (
                            <div
                              key={appt.id}
                              className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <span className="font-bold text-xs text-gray-900 block truncate">
                                  {appt.user_name || 'Cliente'}
                                </span>
                                <p className="text-[11px] text-[#3B5A3C] font-semibold">
                                  {dateDisplay} • {appt.services?.name || 'Corte'}
                                </p>
                                <p className="text-[10px] text-gray-400">
                                  {appt.user_phone || 'Telefone não cadastrado'}
                                </p>
                              </div>

                              <button
                                onClick={() =>
                                  handleSendWhatsApp('confirmation', {
                                    id: appt.id,
                                    name: appt.user_name || 'Cliente',
                                    phone: appt.user_phone || '',
                                    date: dateDisplay,
                                    time: appt.start_time ? format(new Date(appt.start_time), 'HH:mm') : appt.time || '09:00',
                                    service: appt.services?.name || 'Corte',
                                    price: appt.total_price || appt.services?.price || 35
                                  })
                                }
                                className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
                                  isSent
                                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    : 'bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow active:scale-95'
                                }`}
                              >
                                <MessageCircle size={14} />
                                <span>{isSent ? 'Reenviar' : 'Enviar Confirmação'}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUBTAB 3: RETORNO EM 20 DIAS */}
              {autoSubTab === 'retorno' && (
                <div className="space-y-3">
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 uppercase">
                          ✂️ Clientes para Retorno (+20 Dias)
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Convide clientes que cortaram há mais de 20 dias para renovar o visual.
                        </p>
                      </div>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded-lg text-[10px]">
                        {returnClients.length} clientes
                      </span>
                    </div>

                    <div className="space-y-2">
                      {returnClients.map((client, idx) => {
                        const isSent = sentRemindersMap[`return20d_${client.phone}`];
                        return (
                          <div
                            key={idx}
                            className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-gray-900 truncate">
                                  {client.name}
                                </span>
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                                  {client.daysAgo} dias atrás
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                Último: {client.serviceName} • {client.phone}
                              </p>
                            </div>

                            <button
                              onClick={() =>
                                handleSendWhatsApp('return20d', {
                                  name: client.name,
                                  phone: client.phone,
                                  service: client.serviceName
                                })
                              }
                              className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
                                isSent
                                  ? 'bg-gray-200 text-gray-700'
                                  : 'bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow active:scale-95'
                              }`}
                            >
                              <MessageCircle size={14} />
                              <span>{isSent ? 'Convidado ✅' : 'Convidar p/ Cortar'}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 4: CONFIGURAÇÕES, MODELOS & ROBÔ */}
              {autoSubTab === 'config' && (
                <div className="space-y-3">
                  {/* Modelos de Mensagem */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 uppercase">
                          ✍️ Modelos de Mensagens WhatsApp
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Personalize o texto exato que o seu cliente recebe.
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setWaSettings(prev => ({
                            ...prev,
                            templates: DEFAULT_TEMPLATES
                          }))
                        }
                        className="text-[10px] font-bold text-gray-500 hover:text-gray-800 underline"
                      >
                        Restaurar Padrão
                      </button>
                    </div>

                    <div className="p-2.5 bg-gray-100 rounded-xl text-[10px] text-gray-600 space-y-1">
                      <p className="font-bold text-gray-800">Variáveis disponíveis para o texto:</p>
                      <p className="text-gray-500">
                        <code className="text-[#3B5A3C] font-bold">{"{nome}"}</code> •{' '}
                        <code className="text-[#3B5A3C] font-bold">{"{data}"}</code> •{' '}
                        <code className="text-[#3B5A3C] font-bold">{"{horario}"}</code> •{' '}
                        <code className="text-[#3B5A3C] font-bold">{"{servico}"}</code> •{' '}
                        <code className="text-[#3B5A3C] font-bold">{"{valor}"}</code> •{' '}
                        <code className="text-[#3B5A3C] font-bold">{"{link_agendamento}"}</code>
                      </p>
                    </div>

                    {/* Modelo 1 */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                        1. Confirmação Imediata
                      </label>
                      <textarea
                        rows={4}
                        value={waSettings.templates.confirmation}
                        onChange={e =>
                          setWaSettings(prev => ({
                            ...prev,
                            templates: { ...prev.templates, confirmation: e.target.value }
                          }))
                        }
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#C5A859]"
                      />
                    </div>

                    {/* Modelo 2 */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                        2. Lembrete 2 Horas Antes
                      </label>
                      <textarea
                        rows={4}
                        value={waSettings.templates.reminder2h}
                        onChange={e =>
                          setWaSettings(prev => ({
                            ...prev,
                            templates: { ...prev.templates, reminder2h: e.target.value }
                          }))
                        }
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#C5A859]"
                      />
                    </div>

                    {/* Modelo 3 */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                        3. Retorno em 20 Dias
                      </label>
                      <textarea
                        rows={4}
                        value={waSettings.templates.return20d}
                        onChange={e =>
                          setWaSettings(prev => ({
                            ...prev,
                            templates: { ...prev.templates, return20d: e.target.value }
                          }))
                        }
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#C5A859]"
                      />
                    </div>

                    {/* Teste de Envio */}
                    <div className="pt-2 border-t border-gray-100">
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        Testar no seu próprio WhatsApp:
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="tel"
                          placeholder="DDD + Seu WhatsApp (ex: 79998887777)"
                          value={testPhone}
                          onChange={e => setTestPhone(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTestWaMessage('confirmation')}
                          className="py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg text-[10px] text-center"
                        >
                          Testar Confirmação
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTestWaMessage('reminder2h')}
                          className="py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg text-[10px] text-center"
                        >
                          Testar Lembrete 2h
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTestWaMessage('return20d')}
                          className="py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg text-[10px] text-center"
                        >
                          Testar Retorno 20d
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveWaSettings}
                      disabled={isSavingWaSettings}
                      className="w-full py-2.5 bg-[#3B5A3C] hover:bg-[#2e472f] text-white font-bold rounded-xl text-xs transition-all shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isSavingWaSettings ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <>
                          <Check size={14} />
                          <span>Salvar Modelos de Mensagem</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Robô Webhook / API Automático */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                          <Bot size={18} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-900 uppercase">
                            Robô de Envio Automático (Webhook / API)
                          </h4>
                          <p className="text-[11px] text-gray-500">
                            Dispare mensagens em segundo plano sem precisar clicar no WhatsApp.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowRobotGuideModal(true)}
                        className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-[10px] font-black shrink-0 transition-all flex items-center gap-1"
                      >
                        <span>📖 Guia & Custos</span>
                      </button>
                    </div>

                    {/* Toggle */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <div>
                        <span className="text-xs font-bold text-gray-800 block">
                          Ativar Disparo 100% Automático via Webhook
                        </span>
                        <p className="text-[11px] text-gray-500">
                          Integra com Evolution API, Z-API, Baileys, n8n ou Make.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={waSettings.autoSendViaWebhook}
                          onChange={e =>
                            setWaSettings(prev => ({
                              ...prev,
                              autoSendViaWebhook: e.target.checked
                            }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#25D366]"></div>
                      </label>
                    </div>

                    {waSettings.autoSendViaWebhook && (
                      <div className="space-y-2.5 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                            URL do Webhook / Endpoint da API *
                          </label>
                          <input
                            type="url"
                            placeholder="https://sua-api.com/message/sendText/instancia"
                            value={waSettings.webhookUrl}
                            onChange={e =>
                              setWaSettings(prev => ({
                                ...prev,
                                webhookUrl: e.target.value
                              }))
                            }
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                            Token de Autenticação / Bearer (Opcional)
                          </label>
                          <input
                            type="password"
                            placeholder="Seu token secreto da API"
                            value={waSettings.webhookToken}
                            onChange={e =>
                              setWaSettings(prev => ({
                                ...prev,
                                webhookToken: e.target.value
                              }))
                            }
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
                          />
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleTestWebhookConnection}
                            disabled={isTestingWebhook}
                            className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                          >
                            {isTestingWebhook ? (
                              <RefreshCw size={13} className="animate-spin" />
                            ) : (
                              <>
                                <Send size={13} />
                                <span>Testar Conexão</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveWaSettings}
                            className="flex-1 py-2 bg-[#3B5A3C] hover:bg-[#2e472f] text-white font-bold rounded-xl text-xs transition-all"
                          >
                            Salvar Robô
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-[11px] text-amber-900 leading-relaxed">
                      💡 <strong>Dica do Jacaré:</strong> Com o <em>Modo 1-Toque</em> (padrão), você não precisa gastar nada nem contratar servidores: o app abre seu WhatsApp com a mensagem personalizada pronta para cada cliente. Se quiser 100% automático em segundo plano, basta plugar sua URL de API acima!
                    </div>
                  </div>
                </div>
              )}
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

      {/* MODAL GUIA DE ROBÔ & CUSTOS */}
      {showRobotGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-[#1E2732] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#C5A859]">
                    Robô de WhatsApp: Como Ativar & Custos
                  </h3>
                  <p className="text-[11px] text-gray-300">
                    Tire suas dúvidas sobre limites gratuitos e conexões
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRobotGuideModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 space-y-4 overflow-y-auto text-xs text-gray-700">
              {/* Opções e Custos */}
              <div>
                <h4 className="font-extrabold text-gray-900 text-xs uppercase mb-2">
                  1. Comparativo de Custos e Limites
                </h4>

                <div className="space-y-2.5">
                  {/* Opção 1 */}
                  <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-emerald-900 text-xs">
                        Modo 1-Toque (Já Ativo no App)
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-full text-[9px] font-black uppercase">
                        100% Grátis & Ilimitado
                      </span>
                    </div>
                    <p className="text-emerald-800 text-[11px] leading-relaxed">
                      <strong>Custo: R$ 0,00 para sempre.</strong> O sistema gera a mensagem personalizada pronta e abre seu WhatsApp com 1 clique.
                    </p>
                    <p className="text-emerald-700 text-[10px] mt-1">
                      ✅ <strong>Zero risco de banimento</strong> de chip porque usa seu WhatsApp oficial. Recomendado para a maioria das barbearias!
                    </p>
                  </div>

                  {/* Opção 2 */}
                  <div className="p-3 bg-purple-50/70 rounded-2xl border border-purple-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-purple-900 text-xs">
                        Make.com (Nuvem Sem Código)
                      </span>
                      <span className="px-2 py-0.5 bg-purple-600 text-white rounded-full text-[9px] font-black uppercase">
                        Grátis até 1.000 msgs
                      </span>
                    </div>
                    <p className="text-purple-800 text-[11px] leading-relaxed">
                      <strong>Custo: Grátis até 1.000 operações/mês.</strong> Atende até ~300 clientes no mês sem gastar nada.
                    </p>
                    <p className="text-purple-700 text-[10px] mt-1">
                      ⚙️ Você cria uma conta grátis no Make.com, gera um Webhook e conecta com um provedor de WhatsApp.
                    </p>
                  </div>

                  {/* Opção 3 */}
                  <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-blue-900 text-xs">
                        Evolution API (Código Aberto)
                      </span>
                      <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[9px] font-black uppercase">
                        Grátis & Ilimitado
                      </span>
                    </div>
                    <p className="text-blue-800 text-[11px] leading-relaxed">
                      <strong>Custo do software: R$ 0,00.</strong> Projeto open-source que gera um QR Code na tela para escanear com a câmera do celular.
                    </p>
                    <p className="text-blue-700 text-[10px] mt-1">
                      💻 Roda de graça hospedado no <em>Render.com</em> ou no próprio computador da barbearia via Docker.
                    </p>
                  </div>

                  {/* Opção 4 */}
                  <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-amber-900 text-xs">
                        Z-API / Plataformas Prontas
                      </span>
                      <span className="px-2 py-0.5 bg-amber-600 text-white rounded-full text-[9px] font-black uppercase">
                        Plano Pago (~R$ 49/mês)
                      </span>
                    </div>
                    <p className="text-amber-800 text-[11px] leading-relaxed">
                      Serviço comercial pronto: você assina, lê o QR Code no painel deles e recebe a URL da API para colar aqui. Não precisa configurar servidor.
                    </p>
                  </div>
                </div>
              </div>

              {/* Passo a Passo de Ativação */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <h4 className="font-black text-gray-900 text-xs uppercase">
                  2. Como Conectar o Robô no Painel em 3 Passos:
                </h4>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-gray-600">
                  <li>
                    <strong>Obtenha o Webhook:</strong> Crie seu endpoint no Make.com, Evolution API ou Z-API.
                  </li>
                  <li>
                    <strong>Ative a Chave:</strong> Na aba <em>Config/Robô</em>, ative a opção <em>"Ativar Disparo 100% Automático"</em>.
                  </li>
                  <li>
                    <strong>Cole a URL e Teste:</strong> Digite a URL da API (e o Token se houver), clique em <em>"Testar Conexão"</em> e depois em <em>"Salvar Robô"</em>.
                  </li>
                </ol>
              </div>

              <div className="p-3 bg-gray-100 rounded-2xl text-[11px] text-gray-600">
                💬 <strong>Qual o Jacaré recomenda?</strong>
                <p className="mt-0.5">
                  Para começar imediatamente com custo zero e sem complicações técnicas, use o <strong>Modo 1-Toque</strong> já ativo. Conforme sua barbearia for crescendo, conecte a <strong>Evolution API</strong> ou o <strong>Make.com</strong> para automatizar 100% em segundo plano!
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => setShowRobotGuideModal(false)}
                className="w-full py-2.5 bg-[#3B5A3C] hover:bg-[#2e472f] text-white font-black rounded-xl text-xs transition-all shadow"
              >
                Entendi, Fechar Guia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO PARA EXCLUIR CLIENTE */}
      {showDeleteClientModal && clientToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-gray-900">
                Excluir Cliente?
              </h3>
              <p className="text-xs text-gray-500">
                Tem certeza que deseja remover este cliente do cadastro?
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
              <p className="text-xs font-bold text-gray-900 truncate">
                👤 {clientToDelete.name}
              </p>
              {clientToDelete.phone && (
                <p className="text-[11px] text-gray-600">
                  📱 {clientToDelete.phone}
                </p>
              )}
              {clientToDelete.email && (
                <p className="text-[11px] text-gray-400 truncate">
                  ✉️ {clientToDelete.email}
                </p>
              )}
            </div>

            <div className="text-[11px] text-red-600 bg-red-50 p-2.5 rounded-xl text-center">
              ⚠️ Esta ação removerá o contato da lista de clientes do painel.
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={isDeletingClient}
                onClick={() => {
                  setShowDeleteClientModal(false);
                  setClientToDelete(null);
                }}
                className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingClient}
                onClick={handleConfirmDeleteClient}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isDeletingClient ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
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
