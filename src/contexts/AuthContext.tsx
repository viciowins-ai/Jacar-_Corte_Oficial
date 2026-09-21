import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    appStatus: 'active' | 'blocked' | 'loading';
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
    appStatus: 'loading',
    signOut: async () => { },
    refreshUser: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [appStatus, setAppStatus] = useState<'active' | 'blocked' | 'loading'>('loading');

    // ✅ Checks app_status from Supabase
    const checkAppStatus = async () => {
        try {
            const { data } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'app_status')
                .single();
            setAppStatus((data?.value as 'active' | 'blocked') || 'active');
        } catch {
            setAppStatus('active'); // Fail-open: if Supabase is down, allow access
        }
    };

    useEffect(() => {
        checkAppStatus();

        // Check active sessions
        supabase.auth.getSession().then(({ data: { session } }) => {
            const isDemo = localStorage.getItem('demo_mode') === 'true';
            if (isDemo) {
                // If demo mode is active, do not overwrite with null session
                return;
            }
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            if (session?.user?.email) {
                console.log(`[Auth] Usuário logado: ${session.user.email}`);
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            const isDemo = localStorage.getItem('demo_mode') === 'true';
            if (isDemo) return;

            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);

            // ✅ Novo usuário Google sem telefone → redireciona para completar perfil
            if (event === 'SIGNED_IN' && session?.user) {
                const u = session.user;
                const isGoogle = u.app_metadata?.provider === 'google' || u.identities?.some(i => i.provider === 'google');
                const hasPhone = u.phone || u.user_metadata?.phone;

                if (isGoogle && !hasPhone) {
                    setTimeout(() => {
                        if (!window.location.hash.includes('complete-register')) {
                            window.location.hash = '#/complete-register';
                        }
                    }, 300);
                }
            }
        });

        // Demo Mode Handler
        const checkDemo = () => {
            const isDemo = localStorage.getItem('demo_mode') === 'true';
            if (isDemo) {
                const demoName = localStorage.getItem('demo_name') || 'Visitante';
                const demoPhone = localStorage.getItem('demo_phone') || '+5511999999999';
                const demoUser: any = {
                    id: 'visitante-novo-v5',
                    email: 'visitante_v5@jacare.com',
                    phone: demoPhone,
                    user_metadata: { full_name: demoName, name: demoName, avatar_url: null, phone: demoPhone }
                };
                setUser(demoUser);
                setSession({ user: demoUser } as any);
                setLoading(false);
            }
        };
        checkDemo();
        window.addEventListener('storage', checkDemo);

        // ✅ Re-check app status every 60 seconds (in case admin blocks mid-session)
        const statusInterval = setInterval(checkAppStatus, 60000);

        return () => {
            subscription.unsubscribe();
            window.removeEventListener('storage', checkDemo);
            clearInterval(statusInterval);
        };
    }, []);

    const refreshUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
    };

    const signOut = async () => {
        localStorage.removeItem('demo_mode');
        localStorage.removeItem('demo_phone');
        localStorage.removeItem('demo_user');
        localStorage.removeItem('demo_appointments');
        sessionStorage.clear();
        setSession(null);
        setUser(null);
        window.dispatchEvent(new Event('storage'));
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.warn('Erro ao deslogar supabase:', err);
        }
    };

    return (
        <AuthContext.Provider value={{ session, user, loading, appStatus, signOut, refreshUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
