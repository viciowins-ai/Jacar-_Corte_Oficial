import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MessageCircle, PhoneCall, Mail } from 'lucide-react';

export function SupportPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F2] dark:bg-[#1E2732] pb-20">
      <div className="bg-[#3B5A3C] pt-12 pb-6 px-5 flex items-center justify-between shadow-sm">
        <button onClick={() => navigate(-1)} className="text-white hover:bg-white/10 p-1 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-white text-lg font-bold">Suporte & Contato</h1>
        <div className="w-8" />
      </div>

      <div className="p-4 space-y-3">
        <div className="bg-white dark:bg-[#2A343D] rounded-2xl p-5 shadow-sm space-y-4 border border-transparent dark:border-white/5">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Precisa de ajuda com seu agendamento ou tem alguma dúvida? Entre em contato por um dos nossos canais:
          </p>

          <a
            href="https://wa.me/5511999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
          >
            <MessageCircle size={22} className="text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-bold">WhatsApp Jacaré do Corte</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">Resposta rápida em horário comercial</p>
            </div>
          </a>

          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#212B36] text-gray-800 dark:text-white rounded-xl">
            <PhoneCall size={20} className="text-gray-500 dark:text-gray-400" />
            <div>
              <p className="text-sm font-bold">(11) 99999-9999</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Telefone da barbearia</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#212B36] text-gray-800 dark:text-white rounded-xl">
            <Mail size={20} className="text-gray-500 dark:text-gray-400" />
            <div>
              <p className="text-sm font-bold">contato@jacaredocorte.com.br</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">E-mail para parcerias</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChatPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F2] dark:bg-[#1E2732]">
      <div className="bg-[#3B5A3C] pt-12 pb-6 px-5 flex items-center justify-between shadow-sm">
        <button onClick={() => navigate(-1)} className="text-white hover:bg-white/10 p-1 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-white text-lg font-bold">Chat</h1>
        <div className="w-8" />
      </div>
      <div className="p-4 text-center text-gray-500 dark:text-gray-400 mt-10">
        Canal de chat em tempo real conectado com a barbearia.
      </div>
    </div>
  );
}

export function ReportPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F2] dark:bg-[#1E2732]">
      <div className="bg-[#3B5A3C] pt-12 pb-6 px-5 flex items-center justify-between shadow-sm">
        <button onClick={() => navigate(-1)} className="text-white hover:bg-white/10 p-1 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-white text-lg font-bold">Relatar Problema</h1>
        <div className="w-8" />
      </div>
      <div className="p-4 text-center text-gray-500 dark:text-gray-400 mt-10">
        Formulário de feedback e relatórios.
      </div>
    </div>
  );
}

export function RatingPage() {
  return <div className="p-4">Avaliações</div>;
}
