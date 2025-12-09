/**
 * Auth Context - Global authentication state management
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { authApi, usersApi, tokenManager } from "@/lib/api";
import type { User, LoginRequest, RegisterRequest } from "@/lib/api";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Load user on mount if tokens exist
  const loadUser = useCallback(async () => {
    if (!tokenManager.hasTokens()) {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return;
    }

    try {
      const user = await usersApi.getMe();
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      // Token invalid or expired
      tokenManager.clearTokens();
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (data: LoginRequest) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    
    try {
      const response = await authApi.login(data);
      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    
    try {
      // Register creates the user but doesn't log them in automatically
      await authApi.register(data);
      setState((prev) => ({ ...prev, isLoading: false }));
      
      // Auto-login after registration
      await login({ email: data.email, password: data.password });
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    
    try {
      await authApi.logout();
    } finally {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  };

  const refreshUser = async () => {
    if (!tokenManager.hasTokens()) return;
    
    try {
      const user = await usersApi.getMe();
      setState((prev) => ({
        ...prev,
        user,
      }));
    } catch (error) {
      // Silently fail - user will be logged out if token refresh fails
      console.error("Failed to refresh user:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
}

export default AuthContext;

