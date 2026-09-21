import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F2] dark:bg-[#1E2732] pb-24">
      <div className="bg-[#3B5A3C] pt-12 pb-6 px-4 flex items-center justify-between shadow-sm relative z-10">
        <button onClick={() => navigate(-1)} className="text-white p-1">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-white text-lg font-bold">Privacidade & LGPD</h1>
        <div className="w-6" />
      </div>

      <div className="p-4 flex-1">
        <div className="bg-white dark:bg-[#2A343D] rounded-2xl shadow-sm p-6 space-y-6 text-sm text-gray-600 dark:text-gray-300 border border-transparent dark:border-white/5">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1 text-base">Tratamento de Dados</h3>
            <p className="text-xs leading-relaxed text-justify">
              Coletamos apenas as informações estritamente necessárias (como nome, e-mail e telefone) para viabilizar os agendamentos e lembretes de horários.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1 text-base">Segurança</h3>
            <p className="text-xs leading-relaxed text-justify">
              Suas informações são armazenadas em servidores seguros com controle de acesso rigoroso e nunca são vendidas ou compartilhadas com terceiros.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1 text-base">Seus Direitos</h3>
            <p className="text-xs leading-relaxed text-justify">
              Você pode solicitar a qualquer momento a exclusão ou alteração dos seus dados pessoais diretamente no seu perfil.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
