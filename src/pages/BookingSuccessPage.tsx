import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Check, Calendar, User, Scissors } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function BookingSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { serviceName, barberName, date, price } = location.state || {};

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F2]">
      {/* Header */}
      <div className="bg-[#3B5A3C] pt-12 pb-24 px-6 flex items-start justify-between relative z-10 shadow-none">
        <button
          onClick={() => navigate('/home')}
          className="text-white hover:bg-white/10 p-1.5 rounded-full transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-white text-lg font-bold mt-1">Agendamento Confirmado</h1>
        <div className="w-8" />
      </div>

      {/* Main card */}
      <div className="flex items-start justify-center -mt-12 z-20 px-4">
        <div className="bg-white rounded-[30px] shadow-xl w-full p-6 pt-16 relative flex flex-col items-center text-center">
          {/* Badge */}
          <div className="absolute -top-14 left-0 right-0 flex justify-center items-center h-28 pointer-events-none">
            <div className="w-24 h-24 bg-[#3B5A3C] rounded-full border-[4px] border-[#C5A859] flex items-center justify-center relative z-30 shadow-xl">
              <Check size={48} strokeWidth={3.5} className="text-[#C5A859]" />
            </div>
          </div>

          <h2 className="text-2xl font-black text-gray-900 mt-4 mb-1">
            Agendamento
          </h2>
          <h3 className="text-2xl font-black text-[#3B5A3C] mb-8">
            Realizado com Sucesso!
          </h3>

          <div className="w-full text-left space-y-4 mb-8 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#3B5A3C]/10 flex items-center justify-center text-[#3B5A3C]">
                <Scissors size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase">Serviço</p>
                <p className="text-sm font-bold text-gray-800">{serviceName || 'Corte de Cabelo'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#C5A859]/20 flex items-center justify-center text-[#C5A859]">
                <User size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase">Profissional</p>
                <p className="text-sm font-bold text-gray-800">{barberName || 'Jacaré'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Calendar size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase">Data e Hora</p>
                <p className="text-sm font-bold text-gray-800">
                  {date
                    ? format(new Date(date), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })
                    : 'Horário selecionado'}
                </p>
              </div>
            </div>

            {price && (
              <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                <span className="text-xs text-gray-500 font-semibold">Valor total:</span>
                <span className="text-base font-extrabold text-[#3B5A3C]">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}
                </span>
              </div>
            )}
          </div>

          <div className="w-full space-y-3">
            <button
              onClick={() => navigate('/home')}
              className="w-full h-14 bg-[#3B5A3C] text-white font-bold rounded-2xl shadow-lg hover:bg-[#2e472f] active:scale-95 transition-all text-base"
            >
              Ver Meus Agendamentos
            </button>
            <button
              onClick={() => navigate('/agendar')}
              className="w-full h-12 bg-transparent text-[#3B5A3C] font-semibold rounded-2xl hover:bg-gray-100 transition-all text-sm"
            >
              Agendar Outro Serviço
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
