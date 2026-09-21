import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F2] dark:bg-[#1E2732] pb-24">
      <div className="bg-[#3B5A3C] pt-12 pb-6 px-4 flex items-center justify-between shadow-sm relative z-10">
        <button onClick={() => navigate(-1)} className="text-white p-1">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-white text-lg font-bold">Termos de Uso</h1>
        <div className="w-6" />
      </div>

      <div className="p-4 flex-1">
        <div className="bg-white dark:bg-[#2A343D] rounded-2xl shadow-sm p-6 space-y-6 text-sm text-gray-600 dark:text-gray-300 border border-transparent dark:border-white/5">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1 text-base">Aceitação dos Termos</h3>
            <p className="text-xs leading-relaxed text-justify">
              Ao utilizar o aplicativo Jacaré do Corte, você concorda com estes Termos de Uso e com todas as regras aplicáveis.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1 text-base">Agendamentos & Cancelamentos</h3>
            <p className="text-xs leading-relaxed text-justify">
              Os horários reservados são garantidos. Caso não possa comparecer, pedimos o cancelamento prévio pelo próprio aplicativo com pelo menos 1 hora de antecedência.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1 text-base">Conta do Usuário</h3>
            <p className="text-xs leading-relaxed text-justify">
              Você é responsável por fornecer dados verdadeiros para contato e confirmação de agendamentos via WhatsApp.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
