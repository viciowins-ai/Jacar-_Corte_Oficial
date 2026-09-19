import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Phone, Loader2, ArrowRight, Pencil, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ImageWithFallback } from '../components/ImageWithFallback';

export function CompleteRegisterPage() {
    const { user, signOut, refreshUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isEditing = location.state?.editing === true;

    const [phone, setPhone] = useState('');
    const [editingPhone, setEditingPhone] = useState(isEditing); // open input right away if editing from profile
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Redirect if already has phone (unless editing from profile)
    useEffect(() => {
        if (user && !isEditing) {
            const hasPhone = user.phone || user.user_metadata?.phone;
            if (hasPhone) {
                navigate('/home', { replace: true });
            }
        }
    }, [user, navigate, isEditing]);

    // Focus input when editing opens
    useEffect(() => {
        if (editingPhone) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [editingPhone]);

    const formatPhoneMask = (val: string) => {
        const raw = val.replace(/\D/g, '').slice(0, 11);
        if (raw.length <= 2) return raw;
        if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
        if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
        return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
    };

    // Pre-fill phone if editing
    useEffect(() => {
        if (user?.user_metadata?.phone) {
            setPhone(formatPhoneMask(user.user_metadata.phone.replace('+55', '')));
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const isDemo = localStorage.getItem('demo_mode') === 'true';
            
            if (!isDemo) {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError || !session) {
                    const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
                    if (refreshError || !refreshedSession) {
                        throw new Error('Sessão expirada. Por favor, faça login novamente.');
                    }
                }
            }

            let formattedPhone = phone.replace(/\D/g, '');
            if (formattedPhone.length < 10) {
                throw new Error('Número de telefone inválido. Use o formato (00) 00000-0000.');
            }
            if (formattedPhone.length === 10 || formattedPhone.length === 11) {
                formattedPhone = '55' + formattedPhone;
            }
            if (!formattedPhone.startsWith('+')) {
                formattedPhone = '+' + formattedPhone;
            }

            if (!isDemo) {
                const { error: updateError } = await supabase.auth.updateUser({
                    data: { phone: formattedPhone }
                });
                if (updateError) throw updateError;
                await refreshUser();
            } else {
                localStorage.setItem('demo_phone', formattedPhone);
                window.dispatchEvent(new Event('storage'));
                await refreshUser();
            }

            setSuccess(true);
            setEditingPhone(false);

            setTimeout(() => {
                navigate(isEditing ? '/perfil' : '/home', { replace: true });
            }, 800);

        } catch (err: any) {
            if (err.message?.includes('Sessão expirada') || err.message?.includes('session missing')) {
                setError('Sessão expirada. Redirecionando para login...');
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setError(err.message || 'Erro ao salvar. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    const displayPhone = user?.user_metadata?.phone || user?.phone;

    return (
        <div className="flex flex-col min-h-screen bg-[#1E2732] items-center justify-start sm:py-6">
            <div className="w-full max-w-md bg-[#F5F5F7] min-h-screen sm:min-h-[640px] sm:rounded-3xl sm:shadow-2xl overflow-hidden flex flex-col">

            {/* Header - identical to ProfilePage */}
            <div className="bg-[#2E5C38] pt-12 pb-8 px-6 rounded-b-[35px] shadow-lg relative z-10 flex flex-col items-center">

                {/* Title */}
                <h1 className="text-white text-lg font-bold mb-5 self-center">
                    {isEditing ? 'Editar Perfil' : 'Complete seu Cadastro'}
                </h1>

                {/* User Info Row - same layout as ProfilePage */}
                <div className="flex items-center gap-4 w-full px-2">
                    {/* Avatar */}
                    <div className="w-20 h-20 rounded-full border-[3px] border-[#D4AF37] p-1 shrink-0">
                        <div className="w-full h-full rounded-full bg-white overflow-hidden">
                            <ImageWithFallback
                                src={user?.user_metadata?.avatar_url}
                                fallbackSrc={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.user_metadata?.full_name || 'User'}`}
                                type="user"
                                className="w-full h-full object-cover object-center"
                                alt="User"
                            />
                        </div>
                    </div>

                    {/* User details */}
                    <div className="flex flex-col text-white flex-1 min-w-0">
                        <h2 className="text-lg font-bold mb-0.5 truncate">
                            {user?.user_metadata?.full_name || 'Usuário'}
                        </h2>

                        {/* Phone row with pencil */}
                        <div className="flex items-center gap-2">
                            <p className="text-white/80 text-sm">
                                {displayPhone
                                    ? displayPhone.replace('+55', '')
                                    : 'Adicionar celular'}
                            </p>
                            <button
                                onClick={() => setEditingPhone(true)}
                                className="bg-white/20 p-1.5 rounded-full hover:bg-white/30 transition-colors flex-shrink-0"
                                title="Editar Telefone"
                            >
                                <Pencil size={12} className="text-white" />
                            </button>
                        </div>

                        <p className="text-white/60 text-xs mt-1 truncate">{user?.email}</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center px-6 pt-8">

                {/* Success banner */}
                {success && (
                    <div className="w-full max-w-md bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl flex items-center gap-3 mb-6 shadow-sm">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Check size={18} className="text-green-600" />
                        </div>
                        <p className="font-semibold text-sm">Celular salvo com sucesso! Redirecionando...</p>
                    </div>
                )}

                {/* Error banner */}
                {error && (
                    <div className="w-full max-w-md bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm mb-6 text-center">
                        {error}
                    </div>
                )}

                {/* Instruction card (only when NOT editing) */}
                {!editingPhone && !displayPhone && !success && (
                    <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-sm text-center mb-6">
                        <div className="w-16 h-16 bg-green-50 rounded-full mx-auto flex items-center justify-center mb-4">
                            <Phone size={28} className="text-[#2E5C38]" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800 mb-2">Adicione seu celular</h2>
                        <p className="text-gray-500 text-sm leading-relaxed mb-6">
                            Para enviar confirmações e lembretes dos seus agendamentos via WhatsApp.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => setEditingPhone(true)}
                                className="w-full h-13 bg-[#2E5C38] text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 shadow-md hover:bg-[#1E3F24] active:scale-95 transition-all"
                            >
                                <Pencil size={18} />
                                Adicionar celular
                            </button>
                            <button
                                onClick={signOut}
                                className="w-full h-12 bg-transparent text-gray-500 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 active:scale-95 transition-all"
                            >
                                Sair da Conta
                            </button>
                        </div>
                    </div>
                )}

                {/* Phone Edit Form */}
                {editingPhone && !success && (
                    <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-sm">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="text-xs font-bold text-gray-500 ml-1 uppercase mb-2 block tracking-wider">
                                    Celular / WhatsApp
                                </label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                        <Phone size={20} />
                                    </div>
                                    <input
                                        ref={inputRef}
                                        type="tel"
                                        placeholder="(00) 00000-0000"
                                        value={phone}
                                        onChange={e => setPhone(formatPhoneMask(e.target.value))}
                                        className="w-full h-14 pl-12 pr-4 bg-gray-50 border-2 border-[#2E5C38] rounded-xl text-lg outline-none focus:ring-2 focus:ring-[#2E5C38]/30 text-gray-800 placeholder-gray-400 transition-all font-medium"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                {isEditing && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingPhone(false);
                                            navigate('/perfil');
                                        }}
                                        className="flex-1 h-12 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 active:scale-95 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 h-12 bg-[#2E5C38] text-white font-bold rounded-xl shadow-md hover:bg-[#1E3F24] active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <Loader2 className="animate-spin" size={20} />
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
                )}

                {/* If has phone and not editing - show skip option */}
                {displayPhone && !editingPhone && !success && (
                    <div className="w-full max-w-md">
                        <button
                            onClick={() => navigate(isEditing ? '/perfil' : '/home', { replace: true })}
                            className="w-full h-12 bg-[#2E5C38] text-white font-bold rounded-xl shadow-md hover:bg-[#1E3F24] active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <span>Continuar</span>
                            <ArrowRight size={18} />
                        </button>
                    </div>
                )}
            </div>
          </div>
        </div>
    );
}
