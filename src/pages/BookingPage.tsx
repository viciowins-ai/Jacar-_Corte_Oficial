import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Check,
  Clock,
  Scissors,
  User,
  Calendar as CalendarIcon
} from 'lucide-react';
import { ImageWithFallback } from '../components/ImageWithFallback';
import {
  fetchServices,
  fetchTimeSlots,
  type ServiceItem,
  fetchCachedServices,
  fetchCachedTimeSlots
} from '../lib/servicesAndSchedule';

interface BarberItem {
  id: string | number;
  name: string;
  avatar_url?: string;
}

const DEFAULT_BARBERS: BarberItem[] = [
  { id: 1, name: 'Jacaré', avatar_url: '/logo_jacare_final.jpg' }
];

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEK_DAYS_HEADER = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

export function BookingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>(fetchCachedServices);
  const [timeSlots, setTimeSlots] = useState<string[]>(fetchCachedTimeSlots);
  const barbers = DEFAULT_BARBERS;

  const [selectedServices, setSelectedServices] = useState<(string | number)[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string | number>(1);

  // Month Calendar State
  const now = new Date();
  const [viewYear, setViewYear] = useState<number>(now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const [calendarView, setCalendarView] = useState<'grid' | 'strip'>('grid');
  const [selectedTime, setSelectedTime] = useState<string>('');

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun, 1 = Mon...
  const blankDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);
  const daysList = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  const handlePrevMonth = () => {
    if (isCurrentMonth) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const isDatePast = (day: number) => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(viewYear, viewMonth, day);
    return target < today;
  };

  const isDateToday = (day: number) => {
    return (
      viewYear === now.getFullYear() &&
      viewMonth === now.getMonth() &&
      day === now.getDate()
    );
  };

  const isDateSelected = (day: number) => {
    return (
      selectedDate.getFullYear() === viewYear &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getDate() === day
    );
  };

  const formattedDateTitle = selectedDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const formattedSelectedDate =
    formattedDateTitle.charAt(0).toUpperCase() + formattedDateTitle.slice(1);

  useEffect(() => {
    async function loadData() {
      try {
        const [dbServices, dbSlots] = await Promise.all([
          fetchServices(),
          fetchTimeSlots()
        ]);
        if (dbServices && dbServices.length > 0) {
          setServices(dbServices);
        }
        if (dbSlots && dbSlots.length > 0) {
          setTimeSlots(dbSlots);
          setSelectedTime(prev => (prev && dbSlots.includes(prev) ? prev : ''));
        }
      } catch (err) {
        console.log('Using default services/slots due to offline mode:', err);
      }
    }
    loadData();

    const handleServicesUpdate = (e: any) => {
      if (e.detail) setServices(e.detail);
    };
    const handleScheduleUpdate = (e: any) => {
      if (e.detail && e.detail.length > 0) {
        setTimeSlots(e.detail);
        setSelectedTime(prev => (prev && e.detail.includes(prev) ? prev : ''));
      }
    };

    window.addEventListener('barbershop_services_updated', handleServicesUpdate);
    window.addEventListener('barbershop_schedule_updated', handleScheduleUpdate);
    return () => {
      window.removeEventListener('barbershop_services_updated', handleServicesUpdate);
      window.removeEventListener('barbershop_schedule_updated', handleScheduleUpdate);
    };
  }, []);

  const toggleService = (id: string | number) => {
    if (selectedServices.includes(id)) {
      if (selectedServices.length > 1) {
        setSelectedServices(selectedServices.filter(s => s !== id));
      }
    } else {
      setSelectedServices([...selectedServices, id]);
    }
  };

  const totalPrice = services
    .filter(
      s =>
        selectedServices.includes(s.id) ||
        selectedServices.includes(String(s.id)) ||
        selectedServices.includes(Number(s.id))
    )
    .reduce((sum, s) => sum + (s.price || 0), 0);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleBooking = async () => {
    if (!user) {
      alert('Você precisa estar logado para agendar.');
      return;
    }

    if (selectedServices.length === 0) {
      alert('Por favor, selecione pelo menos um serviço acima.');
      return;
    }

    if (!selectedTime) {
      alert('Por favor, escolha um dos horários disponíveis.');
      return;
    }

    if (!selectedBarber || !selectedDate) {
      alert('Por favor, selecione os serviços, barbeiro, data e horário.');
      return;
    }

    setLoading(true);
    try {
      const yearStr = selectedDate.getFullYear();
      const monthStr = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const dayStr = selectedDate.getDate().toString().padStart(2, '0');
      const fullIsoDate = `${yearStr}-${monthStr}-${dayStr}T${selectedTime}:00`;

      const chosenBarber = barbers.find(b => b.id === selectedBarber);
      const chosenServices = services.filter(
        s =>
          selectedServices.includes(s.id) ||
          selectedServices.includes(String(s.id)) ||
          selectedServices.includes(Number(s.id))
      );
      const serviceNames = chosenServices.map(s => s.name).join(' + ');

      const userPhone = user.user_metadata?.phone || user.phone || localStorage.getItem(`user_phone_${user.id}`) || '';
      const userName = user.user_metadata?.full_name || (user as any).displayName || user.email?.split('@')[0] || 'Cliente';
      const userEmail = user.email || '';

      const isDemo = localStorage.getItem('demo_mode') === 'true';
      if (isDemo) {
        const newAppt = {
          id: `demo-${Date.now()}`,
          user_id: user.id,
          user_name: userName,
          user_phone: userPhone,
          user_email: userEmail,
          service_id: selectedServices[0],
          barber_id: selectedBarber,
          start_time: fullIsoDate,
          status: 'scheduled',
          services: { name: serviceNames, price: totalPrice, duration_minutes: 40 },
          barbers: chosenBarber || DEFAULT_BARBERS[0]
        };
        const existing = JSON.parse(localStorage.getItem('demo_appointments') || '[]');
        localStorage.setItem('demo_appointments', JSON.stringify([newAppt, ...existing]));
      } else {
        const apptCol = collection(db, 'appointments');
        await addDoc(apptCol, {
          user_id: user.id,
          user_name: userName,
          user_phone: userPhone,
          user_email: userEmail,
          service_ids: selectedServices,
          barber_id: selectedBarber,
          start_time: fullIsoDate,
          status: 'scheduled',
          total_price: totalPrice,
          services: { name: serviceNames, price: totalPrice },
          barbers: chosenBarber
        });
      }

      navigate('/booking-success', {
        state: {
          serviceName: serviceNames,
          barberName: chosenBarber?.name || 'Jacaré',
          date: fullIsoDate,
          price: totalPrice
        }
      });
    } catch (err) {
      console.error('Error saving appointment:', err);
      alert('Erro ao realizar agendamento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F2] dark:bg-[#1E2732] pb-28 font-sans">
      {/* Green Header */}
      <div className="bg-[#3B5A3C] pt-12 p-6 pb-8 flex items-center justify-between shadow-none">
        <button
          onClick={() => navigate('/home')}
          className="text-white hover:bg-white/10 p-1.5 rounded-full transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-white text-lg font-bold">Novo Agendamento</h1>
        <button
          onClick={() => navigate('/settings')}
          className="p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <Settings className="text-[#C5A859]" size={22} />
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 px-4 -mt-4 z-10 space-y-4">
        {/* Services Selection Card */}
        <div className="bg-white dark:bg-[#2A343D] rounded-[20px] p-5 shadow-sm border border-transparent dark:border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#3B5A3C] text-white flex items-center justify-center shadow-xs">
                <Scissors size={15} />
              </div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Escolha os Serviços
              </h2>
            </div>
            <span className="text-xs text-gray-400 font-medium">Multi-seleção</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {services.map(serv => {
              const isSelected = selectedServices.includes(serv.id);
              return (
                <div
                  key={serv.id}
                  onClick={() => toggleService(serv.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#3B5A3C] dark:border-[#C5A859] bg-[#3B5A3C]/5 dark:bg-[#3B5A3C]/25 font-semibold text-gray-900 dark:text-white'
                      : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 text-gray-700 dark:text-gray-200 bg-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-[#3B5A3C] dark:bg-[#C5A859] border-[#3B5A3C] dark:border-[#C5A859] text-white dark:text-black'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-[#212B36]'
                      }`}
                    >
                      {isSelected && <Check size={14} strokeWidth={3} />}
                    </div>
                    <span className="text-sm">{serv.name}</span>
                  </div>
                  <span className="text-sm font-bold text-[#3B5A3C] dark:text-[#C5A859]">
                    {formatCurrency(serv.price)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Barber Selection */}
        <div className="bg-white dark:bg-[#2A343D] rounded-[20px] p-5 shadow-sm border border-transparent dark:border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-[#C5A859] text-black flex items-center justify-center shadow-xs shrink-0">
              <User size={15} fill="currentColor" />
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Profissional
            </h2>
          </div>
          <div className="flex gap-4">
            {barbers.map(barb => (
              <div
                key={barb.id}
                onClick={() => setSelectedBarber(barb.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer w-full transition-all ${
                  selectedBarber === barb.id
                    ? 'border-[#C5A859] bg-[#C5A859]/10 dark:bg-[#C5A859]/20'
                    : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                }`}
              >
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#C5A859] shrink-0">
                  <ImageWithFallback
                    src={barb.avatar_url}
                    type="barber"
                    className="w-full h-full object-cover"
                    alt={barb.name}
                  />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{barb.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Mestre Barbeiro</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Full Month Calendar Card */}
        <div className="bg-white dark:bg-[#2A343D] rounded-[20px] p-5 shadow-sm border border-gray-100 dark:border-white/5">
          {/* Header with Title and View Switcher */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#3B5A3C] text-white flex items-center justify-center shadow-xs shrink-0">
                <CalendarIcon size={15} fill="currentColor" />
              </div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Calendário do Mês
              </h2>
            </div>

            {/* Toggle view */}
            <div className="flex bg-gray-100 dark:bg-[#212B36] p-0.5 rounded-lg text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setCalendarView('grid')}
                className={`px-2 py-1 rounded-md transition-all ${
                  calendarView === 'grid'
                    ? 'bg-[#3B5A3C] text-white shadow-xs'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Grade Completa
              </button>
              <button
                type="button"
                onClick={() => setCalendarView('strip')}
                className={`px-2 py-1 rounded-md transition-all ${
                  calendarView === 'strip'
                    ? 'bg-[#3B5A3C] text-white shadow-xs'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Lista
              </button>
            </div>
          </div>

          {/* Month & Year Navigation */}
          <div className="flex items-center justify-between mb-4 px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={isCurrentMonth}
              className={`p-2 rounded-full border transition-all ${
                isCurrentMonth
                  ? 'opacity-25 cursor-not-allowed border-gray-200 dark:border-white/5 text-gray-300 dark:text-gray-600'
                  : 'border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 active:scale-95'
              }`}
              title="Mês anterior"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="text-center">
              <span className="text-base font-extrabold text-[#3B5A3C] dark:text-emerald-400 tracking-wide">
                {MONTH_NAMES[viewMonth]}
              </span>
              <span className="text-xs font-bold text-[#C5A859] ml-1.5 px-2 py-0.5 bg-[#C5A859]/15 rounded-md">
                {viewYear}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 rounded-full border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 active:scale-95 transition-all"
              title="Próximo mês"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {calendarView === 'grid' ? (
            <div>
              {/* Weekday labels */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {WEEK_DAYS_HEADER.map((w, idx) => (
                  <div
                    key={idx}
                    className="text-[11px] font-extrabold text-gray-400 py-1"
                  >
                    {w}
                  </div>
                ))}
              </div>

              {/* 7-column Calendar Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {/* Empty cells before day 1 */}
                {blankDays.map(b => (
                  <div key={`blank-${b}`} className="h-10 rounded-xl" />
                ))}

                {/* Days of current month */}
                {daysList.map(d => {
                  const past = isDatePast(d);
                  const selected = isDateSelected(d);
                  const today = isDateToday(d);

                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={past}
                      onClick={() => setSelectedDate(new Date(viewYear, viewMonth, d))}
                      className={`h-10 rounded-xl flex flex-col items-center justify-center relative text-xs font-bold transition-all ${
                        selected
                          ? 'bg-[#3B5A3C] text-white shadow-md border-2 border-[#C5A859] scale-105 z-10'
                          : past
                          ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed bg-transparent'
                          : today
                          ? 'border-2 border-[#3B5A3C] dark:border-emerald-400 text-[#3B5A3C] dark:text-emerald-400 bg-[#3B5A3C]/5 dark:bg-[#3B5A3C]/20 font-extrabold hover:bg-[#3B5A3C]/10'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 bg-gray-50 dark:bg-[#212B36]'
                      }`}
                    >
                      <span>{d}</span>
                      {today && !selected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C5A859] absolute bottom-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Horizontal Strip View */
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {daysList.map(d => {
                const past = isDatePast(d);
                const selected = isDateSelected(d);
                const dateObj = new Date(viewYear, viewMonth, d);
                const dayOfWeekShort = WEEK_DAYS_HEADER[dateObj.getDay()];

                return (
                  <button
                    key={d}
                    type="button"
                    disabled={past}
                    onClick={() => setSelectedDate(new Date(viewYear, viewMonth, d))}
                    className={`min-w-[50px] py-3 px-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                      selected
                        ? 'bg-[#3B5A3C] text-white shadow-md font-bold border-2 border-[#C5A859]'
                        : past
                        ? 'opacity-30 cursor-not-allowed bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500'
                        : 'bg-gray-50 dark:bg-[#212B36] hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <span className="text-[10px] opacity-70 mb-0.5">{dayOfWeekShort}</span>
                    <span className="text-base font-extrabold">{d}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected Date Summary Tag */}
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <span className="text-gray-500 dark:text-gray-400 font-medium">Data selecionada:</span>
            <span className="font-extrabold text-[#3B5A3C] dark:text-emerald-400 bg-[#3B5A3C]/10 dark:bg-[#3B5A3C]/25 px-3 py-1.5 rounded-lg">
              {formattedSelectedDate}
            </span>
          </div>
        </div>

        {/* Time Slots */}
        <div className="bg-white dark:bg-[#2A343D] rounded-[20px] p-5 shadow-sm border border-transparent dark:border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-[#C5A859] text-black flex items-center justify-center shadow-xs shrink-0">
              <Clock size={15} />
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Horários Disponíveis
            </h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {timeSlots.map(slot => {
              const isSelected = selectedTime === slot;
              return (
                <button
                  key={slot}
                  onClick={() => setSelectedTime(slot)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-[#C5A859] text-black shadow'
                      : 'bg-gray-50 dark:bg-[#212B36] hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-white/5'
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Booking Summary & CTA */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-white/95 dark:bg-[#202934]/95 backdrop-blur-md border-t border-gray-100 dark:border-white/10 shadow-2xl flex items-center justify-between z-50">
          <div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wide">
              {selectedServices.length === 0 ? 'Nenhum serviço' : 'Valor do Serviço'}
            </p>
            <p className="text-xl font-extrabold text-[#3B5A3C] dark:text-[#C5A859]">
              {selectedServices.length === 0 ? 'R$ 0,00' : formatCurrency(totalPrice)}
            </p>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 block">
              {selectedServices.length === 0
                ? 'Escolha o corte acima'
                : 'Pagar no local após o corte'}
            </span>
          </div>
          <button
            onClick={handleBooking}
            disabled={loading || selectedServices.length === 0 || !selectedTime}
            className="bg-[#3B5A3C] border-2 border-[#C5A859] text-white font-extrabold py-3.5 px-8 rounded-full shadow-lg hover:bg-[#2e472f] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Agendando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
