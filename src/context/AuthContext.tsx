import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";

interface UserProfile {
    id: string;
    email: string | null;
    full_name: string;
    role: string;
    phone?: string;
    gender?: string;
    dob?: string;
    avatar_url?: string;
}

interface AuthContextType {
    user: UserProfile | null;
    session: Session | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: SupabaseUser }>;
    signup: (email: string, password: string, metadata: any) => Promise<{ success: boolean; error?: string; user?: SupabaseUser }>;
    logout: () => Promise<void>;
    fetchProfile: (userId: string) => Promise<void>;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isTenant: boolean;
    isManager: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        // 1. Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
            if (!mounted) return;
            console.log("Auth Event:", event);
            setSession(s);
            if (s) fetchProfile(s.user.id);
            else setUser(null);
            setLoading(false);
        });

        // 2. Initial session check
        supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (mounted) {
                setSession(s);
                if (s) fetchProfile(s.user.id);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.warn('Error fetching profile:', error.message);
            }

            if (data) {
                setUser(data);
            } else {
                // Auto-repair profile if missing
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (authUser) {
                    const repairData = {
                        id: authUser.id,
                        email: authUser.email || '',
                        full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || '',
                        role: (authUser.user_metadata?.role || 'TENANT').toUpperCase(),
                        phone: authUser.user_metadata?.phone || '',
                        gender: authUser.user_metadata?.gender || ''
                    };

                    const { error: repairError, data: newProfile } = await supabase
                        .from('profiles')
                        .upsert(repairData, { onConflict: 'id' })
                        .select()
                        .single();

                    if (!repairError && newProfile) {
                        setUser(newProfile as UserProfile);
                    } else {
                        setUser({
                            id: authUser.id,
                            email: authUser.email || '',
                            full_name: repairData.full_name,
                            role: repairData.role
                        } as UserProfile);
                    }
                }
            }
        } catch (error) {
            console.error('Unexpected error fetching profile:', error);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) return { success: false, error: error.message };

            setSession(data.session);
            if (data.session) await fetchProfile(data.session.user.id);

            return { success: true, user: data.user };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const signup = async (email: string, password: string, metadata: any) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: metadata.fullName,
                    phone: metadata.phone,
                    role: metadata.role || 'TENANT',
                    gender: metadata.gender,
                    dob: metadata.dob
                }
            }
        });

        if (error) return { success: false, error: error.message };

        if (data.user && data.session) {
            await supabase
                .from('profiles')
                .upsert({
                    id: data.user.id,
                    full_name: metadata.fullName,
                    role: metadata.role || 'TENANT',
                    phone: metadata.phone,
                    gender: metadata.gender,
                    dob: metadata.dob,
                    email: email
                }, { onConflict: 'id' });
        }

        return { success: true, user: data.user || undefined };
    };

    const logout = async () => {
        setLoading(true);
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setLoading(false);
    };

    const value = {
        user: user || (session?.user ? {
            id: session.user.id,
            email: session.user.email || null,
            full_name: session.user.user_metadata?.full_name || '',
            role: session.user.user_metadata?.role || 'TENANT'
        } : null),
        session,
        loading,
        login,
        signup,
        logout,
        fetchProfile,
        isAuthenticated: !!session,
        isAdmin: user?.role === "ADMIN" || session?.user?.user_metadata?.role === "ADMIN",
        isTenant: user?.role === "TENANT" || session?.user?.user_metadata?.role === "TENANT",
        isManager: user?.role === "MANAGER" || session?.user?.user_metadata?.role === "MANAGER",
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

export default AuthContext;
