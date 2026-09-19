import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F2] pb-20">
      <div className="bg-[#3B5A3C] pt-12 pb-6 px-5 flex items-center justify-between shadow-sm">
        <button onClick={() => navigate(-1)} className="text-white hover:bg-white/10 p-1 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-white text-lg font-bold">Sobre Nós</h1>
        <div className="w-8" />
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full overflow-hidden border-[3px] border-[#C5A859] mb-4 shadow-lg">
            <img src="/logo_jacare_final.jpg" alt="Jacaré do Corte" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Jacaré do Corte</h2>
          <p className="text-xs font-semibold text-[#3B5A3C] mt-0.5">Seu estilo, no seu tempo.</p>
          <p className="text-sm text-gray-600 mt-4 leading-relaxed text-justify">
            A Barbearia Jacaré do Corte oferece a melhor experiência em cortes masculinos, barboterapia, químicas e acabamentos finos. Nosso compromisso é com a qualidade, pontualidade e o respeito ao estilo exclusivo de cada cliente.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-2 text-sm text-gray-700">
          <h3 className="font-bold text-gray-900 text-base">Atendimento</h3>
          <p className="text-gray-600">Segunda a Sábado: 08:00 às 20:00</p>
          <p className="text-gray-600">Agendamento rápido e sem fila pelo aplicativo.</p>
        </div>
      </div>
    </div>
  );
}
