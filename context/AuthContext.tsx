import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "auth_token";

type AuthContextType = {
  token: string | null;
  setToken: (token: string | null) => void;
  signOut: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, restore token from storage
  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY)
      .then((stored) => {
        if (stored) setTokenState(stored);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // Persist token changes to storage
  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      AsyncStorage.setItem(TOKEN_KEY, newToken).catch(() => {});
    } else {
      AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
    }
  };

  const value = useMemo(
    () => ({
      token,
      setToken,
      signOut: () => setToken(null),
      isAuthenticated: !!token,
      isLoading,
    }),
    [token, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}