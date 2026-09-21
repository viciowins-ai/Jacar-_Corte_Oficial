import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Phone, User, Loader2, ArrowRight, Check, ChevronLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ImageWithFallback } from '../components/ImageWithFallback';

export function CompleteRegisterPage() {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isEditing = location.state?.editing === true;

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);

    const formatPhoneMask = (val: string) => {
        const raw = val.replace(/\D/g, '').slice(0, 11);
        if (raw.length <= 2) return raw;
        if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
        if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
        return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
    };

    // Pre-fill existing user info
    useEffect(() => {
        if (user) {
            const currentName = user.user_metadata?.full_name || user.user_metadata?.name || '';
            if (currentName) {
                setName(currentName);
            }
            const existingPhone = user.user_metadata?.phone || user.phone;
            if (existingPhone) {
                setPhone(formatPhoneMask(existingPhone.replace('+55', '')));
            }
        }
    }, [user]);

    // Redirect if already has phone (unless explicitly editing)
    useEffect(() => {
        if (user && !isEditing) {
            const hasPhone = user.phone || user.user_metadata?.phone;
            if (hasPhone) {
                navigate('/home', { replace: true });
            }
        }
    }, [user, navigate, isEditing]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const trimmedName = name.trim();
            if (!trimmedName || trimmedName.length < 2) {
                throw new Error('Por favor, informe seu nome completo.');
            }

            let formattedPhone = phone.replace(/\D/g, '');
            if (formattedPhone.length < 10) {
                throw new Error('Número de telefone inválido. Use o formato com DDD, ex: (41) 99990-0000.');
            }
            if (formattedPhone.length === 10 || formattedPhone.length === 11) {
                formattedPhone = '55' + formattedPhone;
            }
            if (!formattedPhone.startsWith('+')) {
                formattedPhone = '+' + formattedPhone;
            }

            const isDemo = localStorage.getItem('demo_mode') === 'true';

            if (!isDemo) {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError || !session) {
                    const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
                    if (refreshError || !refreshedSession) {
                        throw new Error('Sessão expirada. Por favor, faça login novamente.');
                    }
                }

                const { error: updateError } = await supabase.auth.updateUser({
                    data: {
                        full_name: trimmedName,
                        name: trimmedName,
                        phone: formattedPhone
                    }
                });
                if (updateError) throw updateError;
                await refreshUser();
            } else {
                localStorage.setItem('demo_name', trimmedName);
                localStorage.setItem('demo_phone', formattedPhone);
                window.dispatchEvent(new Event('storage'));
                await refreshUser();
            }

            setSuccess(true);

            setTimeout(() => {
                navigate(isEditing ? '/perfil' : '/home', { replace: true });
            }, 900);

        } catch (err: any) {
            if (err.message?.includes('Sessão expirada') || err.message?.includes('session missing')) {
                setError('Sessão expirada. Redirecionando para login...');
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setError(err.message || 'Erro ao salvar alterações. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    const displayName = name || user?.user_metadata?.full_name || 'Seu Nome';
    const displayPhone = phone || (user?.user_metadata?.phone ? user.user_metadata.phone.replace('+55', '') : '');

    return (
        <div className="flex flex-col min-h-screen bg-[#1E2732] items-center justify-start sm:py-6">
            <div className="w-full max-w-md bg-[#F5F5F7] dark:bg-[#1E2732] min-h-screen sm:min-h-[640px] sm:rounded-3xl sm:shadow-2xl overflow-hidden flex flex-col">

                {/* Header */}
                <div className="bg-[#2E5C38] pt-12 pb-8 px-6 rounded-b-[35px] shadow-lg relative z-10 flex flex-col items-center">
                    {/* Top navigation row */}
                    <div className="flex items-center justify-between w-full mb-4">
                        {isEditing ? (
                            <button
                                onClick={() => navigate('/perfil')}
                                className="text-white hover:bg-white/10 p-1.5 rounded-full transition-colors cursor-pointer"
                                title="Voltar"
                            >
                                <ChevronLeft size={24} />
                            </button>
                        ) : (
                            <div className="w-8" />
                        )}

                        <h1 className="text-white text-lg font-bold">
                            {isEditing ? 'Editar Perfil' : 'Complete seu Cadastro'}
                        </h1>

                        <div className="w-8" />
                    </div>

                    {/* User Info Card Preview */}
                    <div className="flex items-center gap-4 w-full px-2">
                        {/* Avatar */}
                        <div className="w-20 h-20 rounded-full border-[3px] border-[#C5A859] p-1 shrink-0">
                            <div className="w-full h-full rounded-full bg-white dark:bg-[#2A343D] overflow-hidden">
                                <ImageWithFallback
                                    src={user?.user_metadata?.avatar_url}
                                    fallbackSrc={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`}
                                    type="user"
                                    className="w-full h-full object-cover object-center"
                                    alt={displayName}
                                />
                            </div>
                        </div>

                        {/* User details */}
                        <div className="flex flex-col text-white flex-1 min-w-0">
                            <h2 className="text-lg font-bold mb-0.5 truncate text-white">
                                {displayName}
                            </h2>

                            <p className="text-white/80 text-sm truncate">
                                {displayPhone || 'Adicionar celular'}
                            </p>

                            <p className="text-white/60 text-xs mt-1 truncate">{user?.email}</p>
                        </div>
                    </div>
                </div>

                {/* Form Content */}
                <div className="flex-1 flex flex-col items-center px-6 pt-8 pb-10">

                    {/* Success banner */}
                    {success && (
                        <div className="w-full max-w-md bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 p-4 rounded-2xl flex items-center gap-3 mb-6 shadow-sm animate-in fade-in duration-200">
                            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                                <Check size={18} className="text-green-600 dark:text-green-400" />
                            </div>
                            <p className="font-semibold text-sm">Dados salvos com sucesso! Redirecionando...</p>
                        </div>
                    )}

                    {/* Error banner */}
                    {error && (
                        <div className="w-full max-w-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 p-3.5 rounded-xl text-sm mb-6 text-center shadow-sm">
                            {error}
                        </div>
                    )}

                    {/* Edit Form */}
                    <div className="w-full max-w-md bg-white dark:bg-[#2A343D] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/5">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Nome Completo Field */}
                            <div>
                                <label className="text-xs font-bold text-gray-600 dark:text-gray-300 ml-1 uppercase mb-2 block tracking-wider">
                                    Nome Completo
                                </label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                        <User size={20} />
                                    </div>
                                    <input
                                        ref={nameInputRef}
                                        id="input-full-name"
                                        type="text"
                                        placeholder="Seu nome completo"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full h-14 pl-12 pr-4 bg-gray-50 dark:bg-[#212B36] border-2 border-gray-200 dark:border-white/10 focus:border-[#2E5C38] dark:focus:border-[#C5A859] rounded-xl text-base outline-none focus:ring-2 focus:ring-[#2E5C38]/20 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all font-medium"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Celular / WhatsApp Field */}
                            <div>
                                <label className="text-xs font-bold text-gray-600 dark:text-gray-300 ml-1 uppercase mb-2 block tracking-wider">
                                    Celular / WhatsApp
                                </label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                        <Phone size={20} />
                                    </div>
                                    <input
                                        id="input-phone-number"
                                        type="tel"
                                        placeholder="(00) 00000-0000"
                                        value={phone}
                                        onChange={e => setPhone(formatPhoneMask(e.target.value))}
                                        className="w-full h-14 pl-12 pr-4 bg-gray-50 dark:bg-[#212B36] border-2 border-gray-200 dark:border-white/10 focus:border-[#2E5C38] dark:focus:border-[#C5A859] rounded-xl text-base outline-none focus:ring-2 focus:ring-[#2E5C38]/20 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all font-medium"
                                        required
                                    />
                                </div>
                                <p className="text-[11px] text-gray-400 mt-1.5 ml-1">
                                    Usado para confirmações e lembretes dos seus cortes via WhatsApp.
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => navigate(isEditing ? '/perfil' : '/home')}
                                    className="flex-1 h-12 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 font-semibold rounded-xl active:scale-95 transition-all text-sm cursor-pointer"
                                >
                                    Cancelar
                                </button>

                                <button
                                    id="btn-save-profile"
                                    type="submit"
                                    disabled={loading || success}
                                    className="flex-1 h-12 bg-[#2E5C38] hover:bg-[#23472b] text-white font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                                >
                                    {loading ? (
                                        <Loader2 className="animate-spin" size={18} />
                                    ) : (
                                        <>
                                            <span>Salvar</span>
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
