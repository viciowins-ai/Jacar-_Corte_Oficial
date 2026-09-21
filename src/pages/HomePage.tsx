import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Settings, ChevronLeft, Calendar, Scissors } from 'lucide-react';
import { ImageWithFallback } from '../components/ImageWithFallback';

interface AppointmentItem {
  id: string;
  user_id?: string;
  service_id?: string | number;
  barber_id?: string | number;
  start_time?: string;
  status?: string;
  services?: {
    name?: string;
    price?: number;
    duration_minutes?: number;
  };
  barbers?: {
    name?: string;
    avatar_url?: string;
  };
}

export function HomePage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentItem | null>(null);
  const [cancelModalId, setCancelModalId] = useState<string | null>(null);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    const user = session?.user;
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const isDemo = localStorage.getItem('demo_mode') === 'true';
      if (isDemo) {
        // Load demo appointments from localStorage if present
        const saved = localStorage.getItem('demo_appointments');
        if (saved) {
          setAppointments(JSON.parse(saved));
        } else {
          setAppointments([
            {
              id: 'demo-1',
              start_time: new Date().toISOString(),
              services: { name: 'Cabelo + Barba', price: 50, duration_minutes: 45 },
              barbers: { name: 'Jacaré', avatar_url: '/logo_jacare_final.jpg' },
              status: 'scheduled'
            }
          ]);
        }
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, 'appointments'),
        where('user_id', '==', user.id)
      );
      const snapshot = await getDocs(q);
      const apptList: any[] = [];
      snapshot.forEach(docSnap => {
        apptList.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Fetch services for map
      const servicesSnap = await getDocs(collection(db, 'services'));
      const serviceMap = new Map();
      servicesSnap.forEach(s => serviceMap.set(s.id, s.data()));

      const defaultBarber = { name: 'Jacaré', avatar_url: '/logo_jacare_final.jpg' };
      const defaultServices: Record<number, any> = {
        1: { name: 'Cabelo', price: 30, duration_minutes: 30 },
        2: { name: 'Barba', price: 20, duration_minutes: 20 },
        3: { name: 'Barba + Cabelo + Sobrancelha', price: 50, duration_minutes: 50 },
        4: { name: 'Sobrancelha', price: 10, duration_minutes: 15 },
        5: { name: 'Luzes', price: 130, duration_minutes: 60 },
        6: { name: 'Platinado', price: 130, duration_minutes: 60 },
        7: { name: 'Reflexo Alinhado', price: 130, duration_minutes: 60 },
      };

      const enriched = apptList.map(a => {
        let serv = a.services;
        if ((!serv || !serv.name) && a.service_id) {
          serv = serviceMap.get(a.service_id?.toString()) ||
                 serviceMap.get(parseInt(a.service_id, 10)) ||
                 defaultServices[parseInt(a.service_id, 10)];
        }
        let barb = a.barbers;
        if (!barb || !barb.name) {
          barb = defaultBarber;
        }
        return {
          ...a,
          services: serv || { name: 'Corte Tradicional', price: 35, duration_minutes: 30 },
          barbers: barb
        };
      });

      setAppointments(enriched);
    } catch (err) {
      console.error('Error loading appointments:', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleCancel = (id: string) => {
    setCancelModalId(id);
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalId) return;
    const id = cancelModalId;
    try {
      setLoading(true);
      const isDemo = localStorage.getItem('demo_mode') === 'true';
      if (isDemo) {
        const updated = appointments.filter(a => a.id !== id);
        setAppointments(updated);
        localStorage.setItem('demo_appointments', JSON.stringify(updated));
      } else {
        await deleteDoc(doc(db, 'appointments', id));
        await loadAppointments();
      }
      setCancelSuccessMsg('Agendamento cancelado com sucesso!');
      setTimeout(() => setCancelSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Error canceling:', err);
      loadAppointments();
    } finally {
      setLoading(false);
      setCancelModalId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#3B5A3C] font-sans relative">
      {/* Top Header with Jacaré branding */}
      <div className="pt-14 pb-8 px-5 flex flex-col items-center relative z-10 w-full">
        <div className="w-full flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="text-white p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
          </button>
          <h1 className="text-[#C5A859] text-[17px] font-extrabold tracking-wider uppercase">
            JACARÉ DO CORTE
          </h1>
          <button
            onClick={() => navigate('/settings')}
            className="text-white p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <Settings className="w-6 h-6" strokeWidth={2} />
          </button>
        </div>

        {/* Circular Logo */}
        <div className="w-[140px] h-[140px] rounded-full overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.5)] mb-4 bg-black flex shrink-0 justify-center items-center mx-auto border-[3px] border-[#C5A859]">
          <img
            src="/logo_jacare_final.jpg"
            alt="Logo Jacaré do Corte"
            className="w-full h-full object-cover transform scale-[1.05]"
          />
        </div>
      </div>

      {/* Main Content Card */}
      <div className="flex-1 bg-[#202934] rounded-t-[32px] w-full flex flex-col px-5 pt-8 pb-[100px] relative z-20 shadow-[0_-10px_25px_rgba(0,0,0,0.15)]">
        <h2 className="font-extrabold text-[19px] text-white tracking-wide mb-6 text-center">
          Meus Agendamentos
        </h2>

        <div className="w-full flex-1 flex flex-col space-y-4 mb-8">
          {loading ? (
            <div className="text-center py-6 text-gray-400 font-medium">
              Carregando agendamentos...
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8 text-gray-400 font-medium space-y-2">
              <p>Nenhum agendamento encontrado.</p>
              <p className="text-sm text-gray-500">Que tal marcar um novo horário?</p>
            </div>
          ) : (
            appointments.map((appt, idx) => (
              <div
                key={appt.id}
                className="bg-[#2A343D] rounded-xl shadow-lg flex items-stretch border-l-[6px] border-[#385A3B] w-full overflow-hidden"
              >
                <div className="flex-1 py-[14px] pl-[16px] pr-2 flex flex-col justify-center">
                  <p className="text-white font-extrabold text-[11px] uppercase tracking-wider mb-[4px] opacity-90">
                    {appt.start_time
                      ? format(new Date(appt.start_time), "EEEE, HH:mm", { locale: ptBR })
                      : 'Data a definir'}
                  </p>
                  <p className="text-white font-extrabold text-[15px] leading-tight mb-1">
                    {appt.services?.name || 'Serviço'}
                  </p>
                  <p className="text-[#8B949E] text-[13px] font-medium">
                    Com {appt.barbers?.name || 'Jacaré'}
                  </p>
                </div>

                <div className="py-[14px] pr-[14px] flex flex-col items-end justify-between min-w-[85px]">
                  <div className="w-[28px] h-[28px] rounded-full bg-white flex items-center justify-center shrink-0 mb-3 shadow-md">
                    <span className="text-[#385A3B] text-[13px] transform -rotate-45 leading-none">
                      ✂️
                    </span>
                  </div>
                  {idx === 0 ? (
                    <button
                      onClick={() => handleCancel(appt.id)}
                      className="bg-[#3B5A3C] text-white font-bold rounded-lg h-[26px] px-3 text-[11px] shadow-sm tracking-wide hover:bg-[#2e472f] active:scale-95 transition-all"
                    >
                      Cancelar
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedAppointment(appt)}
                      className="border border-[#8B949E] text-[#8B949E] font-bold rounded-lg h-[26px] px-3 text-[11px] shadow-sm tracking-wide hover:bg-white/5 active:scale-95 transition-all"
                    >
                      Detalhes
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* CTA Button */}
        <button
          onClick={() => navigate('/agendar')}
          className="w-full bg-[#3B5A3C] border-[2px] border-[#C5A859] text-white font-extrabold h-[56px] rounded-full text-[16px] shadow-xl transition-transform active:scale-95 hover:brightness-110 flex items-center justify-center gap-2"
        >
          <span>+ Novo Agendamento</span>
        </button>
      </div>

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-[#212B36] border border-white/10 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setSelectedAppointment(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-full bg-black/20"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white">Detalhes do Agendamento</h3>
              <p className="text-sm text-gray-400 mt-1">
                Código: #{selectedAppointment.id.slice(0, 8)}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-[#2D3845] rounded-xl">
                <div className="w-12 h-12 bg-[#3B5A3C] rounded-full flex items-center justify-center text-white shrink-0">
                  <Calendar size={22} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold">Data e Hora</p>
                  <p className="text-white font-bold capitalize">
                    {selectedAppointment.start_time
                      ? format(new Date(selectedAppointment.start_time), "EEEE, d 'de' MMMM", { locale: ptBR })
                      : ''}
                  </p>
                  <p className="text-white font-bold">
                    {selectedAppointment.start_time
                      ? `às ${format(new Date(selectedAppointment.start_time), 'HH:mm')}`
                      : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 bg-[#2D3845] rounded-xl">
                <div className="w-12 h-12 bg-[#C5A859] rounded-full flex items-center justify-center text-white shrink-0">
                  <Scissors size={22} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold">Serviço</p>
                  <p className="text-white font-bold">
                    {selectedAppointment.services?.name || 'Serviço'}
                  </p>
                  <p className="text-sm text-gray-300">
                    R$ {selectedAppointment.services?.price || 0},00 • {selectedAppointment.services?.duration_minutes || 30} min
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 bg-[#2D3845] rounded-xl">
                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm">
                  <ImageWithFallback
                    src={selectedAppointment.barbers?.avatar_url || '/logo_jacare_final.jpg'}
                    type="barber"
                    className="w-full h-full object-cover"
                    alt={selectedAppointment.barbers?.name || 'Jacaré'}
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold">Profissional</p>
                  <p className="text-white font-bold">
                    {selectedAppointment.barbers?.name || 'Jacaré'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={() => setSelectedAppointment(null)}
                className="w-full bg-[#3B5A3C] text-white font-bold h-12 rounded-xl hover:bg-[#1E3021] transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Appointment Confirmation Modal */}
      {cancelModalId && (
        <div
          id="cancel-appt-modal-backdrop"
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            id="cancel-appt-modal-card"
            className="bg-[#202934] border border-white/15 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl text-white animate-in zoom-in-95 duration-200"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center mb-4 text-2xl">
              ✂️
            </div>

            <h3 className="text-lg font-bold text-white mb-2">
              Cancelar agendamento?
            </h3>
            <p className="text-xs text-gray-300 mb-6 leading-relaxed">
              Tem certeza que deseja cancelar este agendamento? O horário ficará liberado para outros clientes.
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                id="btn-confirm-cancel-appt"
                onClick={handleConfirmCancel}
                className="w-full py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer"
              >
                Sim, Cancelar Agendamento
              </button>

              <button
                id="btn-dismiss-cancel-appt"
                onClick={() => setCancelModalId(null)}
                className="w-full py-2.5 bg-white/10 hover:bg-white/15 active:scale-95 text-gray-200 hover:text-white font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {cancelSuccessMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[110] bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg border border-emerald-500/50 animate-in fade-in slide-in-from-top-3 duration-300">
          ✓ {cancelSuccessMsg}
        </div>
      )}
    </div>
  );
}
