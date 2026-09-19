import { useNavigate } from 'react-router-dom';
import { LoginPage } from './LoginPage';

export function RegisterPage() {
  return <LoginPage />;
}

export function VerifyOtpPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col min-h-screen bg-white items-center justify-center p-6 text-center">
      <h1 className="text-xl font-bold mb-2">Verificação de Código</h1>
      <p className="text-sm text-gray-500 mb-6">Insira o código enviado por SMS/WhatsApp.</p>
      <button
        onClick={() => navigate('/home')}
        className="w-full max-w-xs h-12 bg-[#2E5C38] text-white font-bold rounded-xl"
      >
        Continuar
      </button>
    </div>
  );
}

export function ResetSuccessPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col min-h-screen bg-white items-center justify-center p-6 text-center">
      <h1 className="text-xl font-bold mb-2">Senha redefinida com sucesso!</h1>
      <button
        onClick={() => navigate('/login')}
        className="w-full max-w-xs h-12 bg-[#2E5C38] text-white font-bold rounded-xl mt-4"
      >
        Voltar para o Login
      </button>
    </div>
  );
}
