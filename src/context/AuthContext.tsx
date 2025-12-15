import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { User, AuthResponse } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingIn: boolean;
  isLoggingOut: boolean;
  login: (username: string, password: string) => Promise<void>;
  animatedLogin: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  animatedLogout: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  isAdmin: boolean;
  isOperator: boolean;
  isViewer: boolean;
  canEdit: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'vmc_auth_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Load stored token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      validateAndRestoreSession(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateAndRestoreSession = async (storedToken: string) => {
    try {
      const isValid = await invoke<boolean>('validate_token', { token: storedToken });
      if (isValid) {
        const userData = await invoke<User>('get_current_user', { token: storedToken });
        setUser(userData);
        setToken(storedToken);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (username: string, password: string) => {
    try {
      const response = await invoke<AuthResponse>('login', { username, password });
      setUser(response.user);
      setToken(response.token);
      localStorage.setItem(TOKEN_KEY, response.token);
    } catch (error) {
      throw new Error(typeof error === 'string' ? error : 'Login failed');
    }
  }, []);

  // Animated login - shows loading animation and delays before setting auth state
  const animatedLogin = useCallback(async (username: string, password: string) => {
    setIsLoggingIn(true);

    try {
      const response = await invoke<AuthResponse>('login', { username, password });

      // Keep showing the loading animation for a smooth experience
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Now set the auth state (this triggers the transition)
      setUser(response.user);
      setToken(response.token);
      localStorage.setItem(TOKEN_KEY, response.token);

      // Brief delay before hiding the loading popup to allow fade transition
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsLoggingIn(false);
    } catch (error) {
      setIsLoggingIn(false);
      throw new Error(typeof error === 'string' ? error : 'Login failed');
    }
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      try {
        await invoke('logout', { token });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  // Animated logout - shows loading animation before actually logging out
  const animatedLogout = useCallback(async () => {
    setIsLoggingOut(true);

    // Show the loading animation for a moment
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Perform actual logout
    if (token) {
      try {
        await invoke('logout', { token });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);

    // Keep isLoggingOut true briefly to allow fade transition
    await new Promise(resolve => setTimeout(resolve, 300));
    setIsLoggingOut(false);
  }, [token]);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    if (!token) throw new Error('Not authenticated');
    try {
      await invoke('cmd_change_password', {
        token,
        oldPassword,
        newPassword
      });
    } catch (error) {
      throw new Error(typeof error === 'string' ? error : 'Failed to change password');
    }
  }, [token]);

  const isAuthenticated = !!user && !!token;
  const isAdmin = user?.role === 'Admin';
  const isOperator = user?.role === 'Operator';
  const isViewer = user?.role === 'Viewer';
  const canEdit = isAdmin || isOperator;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        isLoggingIn,
        isLoggingOut,
        login,
        animatedLogin,
        logout,
        animatedLogout,
        changePassword,
        isAdmin,
        isOperator,
        isViewer,
        canEdit,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for protected routes
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredRole?: 'Admin' | 'Operator' | 'Viewer'
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, user, isLoading } = useAuth();

    if (isLoading) {
      return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!isAuthenticated) {
      return null; // or redirect to login
    }

    if (requiredRole) {
      const roleHierarchy = { Admin: 3, Operator: 2, Viewer: 1 };
      const userLevel = user ? roleHierarchy[user.role] : 0;
      const requiredLevel = roleHierarchy[requiredRole];

      if (userLevel < requiredLevel) {
        return <div className="p-4 text-red-500">Insufficient permissions</div>;
      }
    }

    return <WrappedComponent {...props} />;
  };
}
