import { createContext, useContext, useEffect, useState } from "react";
import { authClient } from "../services/apiClient";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await authClient.getUser();
        if (userData) {
          setUser(userData);
        }
      } catch (error) {
        console.log("No valid session found");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const fetchProfile = async () => {
    try {
      const userData = await authClient.getUser();
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authClient.signIn(email, password);
      // authClient.signIn already sets the token in localStorage
      if (response.access_token) {
        await fetchProfile();
        return { success: true, user: response.user };
      }
      return { success: false, error: "Invalid login response" };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const signup = async (email, password, metadata) => {
    try {
      const response = await authClient.signUp(email, password, {
        full_name: metadata.fullName,
        phone: metadata.phone,
        role: metadata.role || 'TENANT',
        gender: metadata.gender
      });
      return { success: true, user: response.user };
    } catch (err) {
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
