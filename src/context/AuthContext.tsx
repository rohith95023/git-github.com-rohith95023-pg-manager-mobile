import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { authClient } from "../services/apiClient";

interface UserProfile {
    id: string;
    email: string | null;
    full_name: string;
    role: string;
    phone?: string;
    gender?: string;
    dob?: string;
    avatar_url?: string;
    created_at?: string;
}

interface AuthContextType {
    user: UserProfile | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: any }>;
    signup: (email: string, password: string, metadata: any) => Promise<{ success: boolean; error?: string; user?: any }>;
    logout: () => Promise<void>;
    fetchProfile: () => Promise<void>;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isTenant: boolean;
    isManager: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Only attempt session restore if a token exists in storage
                const token = await AsyncStorage.getItem('auth_token');
                if (!token) {
                    // No token — user is not logged in, skip API call
                    return;
                }
                const userData: any = await authClient.getUser();
                if (userData) {
                    // The backend returns the profile directly (no wrapper)
                    setUser(userData);
                }
            } catch (error) {
                // Token exists but is invalid/expired — clear it
                await AsyncStorage.removeItem('auth_token');
                console.log("Session expired, please log in again.");
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    const fetchProfile = async () => {
        try {
            const profile: any = await authClient.getUser();
            if (profile?.id) {
                setUser(profile);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const response: any = await authClient.signIn(email, password);
            if (response.access_token) {
                // Fetch fresh profile after login — backend returns flat profile object
                const profile: any = await authClient.getUser();
                if (profile?.id) {
                    setUser(profile);
                    return { success: true, user: profile };
                }
                return { success: true };
            }
            return { success: false, error: "Invalid login response" };
        } catch (err: any) {
            return { success: false, error: err.message || 'Login failed' };
        }
    };

    const signup = async (email: string, password: string, metadata: any) => {
        try {
            const response: any = await authClient.signUp(email, password, {
                full_name: metadata.fullName,
                phone: metadata.phone,
                role: metadata.role || 'TENANT',
                gender: metadata.gender,
                dob: metadata.dob
            });
            // Handle both response.user and response.profile patterns
            const userData = response.user || response.profile || response;
            return { success: true, user: userData };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const logout = async () => {
        setLoading(true);
        await authClient.signOut();
        setUser(null);
        setLoading(false);
    };

    const value = {
        user,
        loading,
        login,
        signup,
        logout,
        fetchProfile,
        isAuthenticated: !!user,
        isAdmin: user?.role === "ADMIN",
        isTenant: user?.role === "TENANT",
        isManager: user?.role === "MANAGER",
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
