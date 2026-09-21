import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Check,
  Clock,
  Calendar as CalendarIcon
} from 'lucide-react';
import { ImageWithFallback } from '../components/ImageWithFallback';

interface ServiceItem {
  id: string | number;
  name: string;
  price: number;
  duration_minutes?: number;
}

interface BarberItem {
  id: string | number;
  name: string;
  avatar_url?: string;
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

const DEFAULT_BARBERS: BarberItem[] = [
  { id: 1, name: 'Jacaré', avatar_url: '/logo_jacare_final.jpg' }
];

const TIME_SLOTS = [
  '09:00', '09:40', '10:20', '11:00', '11:40',
  '13:00', '13:40', '14:20', '15:00', '15:40',
  '16:20', '17:00', '17:40', '18:20', '19:00'
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
  const [services, setServices] = useState<ServiceItem[]>(DEFAULT_SERVICES);
  const barbers = DEFAULT_BARBERS;

  const [selectedServices, setSelectedServices] = useState<(string | number)[]>([1]);
  const [selectedBarber, setSelectedBarber] = useState<string | number>(1);

  // Month Calendar State
  const now = new Date();
  const [viewYear, setViewYear] = useState<number>(now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const [calendarView, setCalendarView] = useState<'grid' | 'strip'>('grid');
  const [selectedTime, setSelectedTime] = useState<string>('09:00');

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
        const snap = await getDocs(collection(db, 'services'));
        const dbServices: any[] = [];
        snap.forEach(d => dbServices.push({ id: d.id, ...d.data() }));
        if (dbServices.length > 0) {
          setServices(dbServices);
        }
      } catch (err) {
        console.log('Using default services due to offline/demo mode:', err);
      }
    }
    loadData();
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
    .filter(s => selectedServices.includes(s.id))
    .reduce((sum, s) => sum + (s.price || 0), 0);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleBooking = async () => {
    if (!user) {
      alert('Você precisa estar logado para agendar.');
      return;
    }

    if (selectedServices.length === 0 || !selectedBarber || !selectedDate || !selectedTime) {
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
      const chosenServices = services.filter(s => selectedServices.includes(s.id));
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
    <div className="flex flex-col min-h-screen bg-[#F2F2F2] pb-28 font-sans">
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
        <div className="bg-white rounded-[20px] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Escolha os Serviços
            </h2>
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
                      ? 'border-[#3B5A3C] bg-[#3B5A3C]/5 font-semibold text-gray-900'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-[#3B5A3C] border-[#3B5A3C] text-white'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check size={14} strokeWidth={3} />}
                    </div>
                    <span className="text-sm">{serv.name}</span>
                  </div>
                  <span className="text-sm font-bold text-[#3B5A3C]">
                    {formatCurrency(serv.price)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Barber Selection */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
            Profissional
          </h2>
          <div className="flex gap-4">
            {barbers.map(barb => (
              <div
                key={barb.id}
                onClick={() => setSelectedBarber(barb.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer w-full transition-all ${
                  selectedBarber === barb.id
                    ? 'border-[#C5A859] bg-[#C5A859]/10'
                    : 'border-gray-200 hover:border-gray-300'
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
                  <p className="text-sm font-bold text-gray-900">{barb.name}</p>
                  <p className="text-xs text-gray-500">Mestre Barbeiro</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Full Month Calendar Card */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100">
          {/* Header with Title and View Switcher */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <CalendarIcon size={18} className="text-[#3B5A3C]" />
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Calendário do Mês
              </h2>
            </div>

            {/* Toggle view */}
            <div className="flex bg-gray-100 p-0.5 rounded-lg text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setCalendarView('grid')}
                className={`px-2 py-1 rounded-md transition-all ${
                  calendarView === 'grid'
                    ? 'bg-[#3B5A3C] text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
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
                    : 'text-gray-500 hover:text-gray-900'
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
                  ? 'opacity-25 cursor-not-allowed border-gray-200 text-gray-300'
                  : 'border-gray-200 hover:bg-gray-100 text-gray-700 active:scale-95'
              }`}
              title="Mês anterior"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="text-center">
              <span className="text-base font-extrabold text-[#3B5A3C] tracking-wide">
                {MONTH_NAMES[viewMonth]}
              </span>
              <span className="text-xs font-bold text-[#C5A859] ml-1.5 px-2 py-0.5 bg-[#C5A859]/15 rounded-md">
                {viewYear}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-700 active:scale-95 transition-all"
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
                          ? 'text-gray-300 cursor-not-allowed bg-transparent'
                          : today
                          ? 'border-2 border-[#3B5A3C] text-[#3B5A3C] bg-[#3B5A3C]/5 font-extrabold hover:bg-[#3B5A3C]/10'
                          : 'text-gray-700 hover:bg-gray-100 bg-gray-50'
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
                        ? 'opacity-30 cursor-not-allowed bg-gray-50 text-gray-400'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
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
          <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <span className="text-gray-500 font-medium">Data selecionada:</span>
            <span className="font-extrabold text-[#3B5A3C] bg-[#3B5A3C]/10 px-3 py-1.5 rounded-lg">
              {formattedSelectedDate}
            </span>
          </div>
        </div>

        {/* Time Slots */}
        <div className="bg-white rounded-[20px] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-[#3B5A3C]" />
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Horários Disponíveis
            </h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {TIME_SLOTS.map(slot => {
              const isSelected = selectedTime === slot;
              return (
                <button
                  key={slot}
                  onClick={() => setSelectedTime(slot)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-[#C5A859] text-black shadow'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-100'
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Booking Summary & CTA */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-2xl flex items-center justify-between z-50">
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Total a pagar</p>
            <p className="text-xl font-extrabold text-[#3B5A3C]">
              {formatCurrency(totalPrice)}
            </p>
          </div>
          <button
            onClick={handleBooking}
            disabled={loading}
            className="bg-[#3B5A3C] border-2 border-[#C5A859] text-white font-extrabold py-3.5 px-8 rounded-full shadow-lg hover:bg-[#2e472f] active:scale-95 transition-all"
          >
            {loading ? 'Agendando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
