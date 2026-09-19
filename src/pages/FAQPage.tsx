import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown } from 'lucide-react';

export function FAQPage() {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Como funciona o agendamento?',
      a: 'Basta entrar na aba Agendar, selecionar os serviços desejados, escolher o dia e horário de preferência e clicar em Confirmar.'
    },
    {
      q: 'Posso cancelar ou remarcar um horário?',
      a: 'Sim! Na tela inicial você verá seus agendamentos ativos. Basta clicar em "Cancelar" no atendimento desejado.'
    },
    {
      q: 'Quais formas de pagamento são aceitas?',
      a: 'Aceitamos dinheiro, PIX, cartões de débito e crédito diretamente na barbearia.'
    },
    {
      q: 'Como falar diretamente com o barbeiro Jacaré?',
      a: 'Você pode entrar em contato através do WhatsApp ou canal de suporte disponível no aplicativo.'
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F2] pb-20">
      <div className="bg-[#3B5A3C] pt-12 pb-6 px-5 flex items-center justify-between shadow-sm">
        <button onClick={() => navigate(-1)} className="text-white hover:bg-white/10 p-1 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-white text-lg font-bold">Dúvidas Frequentes</h1>
        <div className="w-8" />
      </div>

      <div className="p-4 space-y-3">
        {faqs.map((faq, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between text-left font-bold text-sm text-gray-800"
            >
              <span>{faq.q}</span>
              <ChevronDown
                size={18}
                className={`text-gray-400 transform transition-transform ${openIndex === i ? 'rotate-180' : ''}`}
              />
            </button>
            {openIndex === i && (
              <p className="mt-3 text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                {faq.a}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
