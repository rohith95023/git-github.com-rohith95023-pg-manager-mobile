import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 1. Subscribe to auth changes immediately
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return;
      console.log("Auth Event:", event);
      setSession(s);
      if (s) fetchProfile(s.user.id);
      else setUser(null);
      setLoading(false);
    });

    // 2. Initial rehydration check
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

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If profile doesn't exist (new user?), we might want to use metadata
        // For now, log it.
        console.warn('Error fetching profile:', error.message);
      }
      
      if (data) {
        setUser(data);
      } else {
        // AUTO-REPAIR: If profile row is missing but user is authenticated, attempt to create it
        // using metadata from the current session/auth state.
        console.info('[AuthContext] Profile record missing for authenticated user. Attempting auto-repair...');
        
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
            const repairData = {
                id: authUser.id,
                email: authUser.email,
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
                console.info('[AuthContext] Profile auto-repair successful.');
                setUser(newProfile);
            } else {
                console.error('[AuthContext] Profile auto-repair failed:', repairError?.message);
                // Last resort fallback so app doesn't break
                setUser({
                    id: authUser.id,
                    email: authUser.email,
                    full_name: repairData.full_name,
                    role: repairData.role
                });
            }
        }
      }
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
    }
  };

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { success: false, error: error.message };

      // Force state update before returning to avoid race condition with navigation
      setSession(data.session);
      if (data.session) await fetchProfile(data.session.user.id);
      
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const googleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const signup = async (email, password, metadata) => {
    // 1. Pre-check: Verify if email or phone already exists in profiles or tenants
    try {
        // Check profiles table
        const { data: existingProfiles } = await supabase
            .from('profiles')
            .select('email, phone')
            .or(`email.eq.${email},phone.eq.${metadata.phone}`);

        if (existingProfiles && existingProfiles.length > 0) {
            const existing = existingProfiles[0];
            if (existing.email === email) {
                return { success: false, error: "This email is already registered. Please Sign In." };
            }
            if (existing.phone === metadata.phone) {
                return { success: false, error: "This phone number is already registered." };
            }
        }

        // Check tenants table (important if managers have already added them)
        const { data: existingTenants } = await supabase
            .from('tenants')
            .select('email, phone')
            .or(`email.eq.${email},phone.eq.${metadata.phone}`);

        if (existingTenants && existingTenants.length > 0) {
            const existing = existingTenants[0];
            if (existing.email === email) {
                return { success: false, error: "This email is already associated with a resident record. Please contact your manager." };
            }
            if (existing.phone === metadata.phone) {
                return { success: false, error: "This phone number is already associated with a resident record." };
            }
        }
    } catch (err) {
        console.error("Pre-signup check failed:", err);
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata.fullName,
          phone: metadata.phone,
          role: metadata.role || 'TENANT', // Ensure role fallback
          gender: metadata.gender
        }
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Manual profile creation (robustness for missing triggers)
    // Only attempt if we have a session (i.e. user is confirmed/logged in)
    if (data.user && data.session) {
        // Wait a bit to let trigger run first to avoid race condition if possible, 
        // or just try upsert which handles conflict.
        
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: data.user.id,
                full_name: metadata.fullName,
                role: metadata.role || 'TENANT',
                phone: metadata.phone, // Corrected from phone_number
                gender: metadata.gender,
                email: email
            }, { onConflict: 'id' });
            
        if (profileError) {
             console.error("Profile creation error details:", profileError);
             // If manual insertion fails, it might be RLS or already exists. 
             // We return success for auth, but log this.
             // 23505 = unique_violation, 42501 = insufficient_privilege (RLS)
             if (profileError.code !== '23505' && profileError.code !== '42501') { 
                 return { success: false, error: "Database error saving new user. " + profileError.message };
             }
        }
    }

    return { success: true, user: data.user };
  };

  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setLoading(false);
  };

  const value = {
    user: user || (session?.user ? { ...session.user, role: session.user.user_metadata?.role || "TENANT", full_name: session.user.user_metadata?.full_name } : null), // Fallback to session metadata
    session,
    loading,
    login,
    googleSignIn,
    signup,
    logout,
    fetchProfile,
    isAuthenticated: !!session, // Changed to depend on SESSION, not just profile user
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
