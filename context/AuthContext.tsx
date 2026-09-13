import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";

const TOKEN_KEY = "auth_token";

type AuthContextType = {
  token: string | null;
  setToken: (token: string | null) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return false;
    }

    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const decoded = atob(payload);
    const parsed = JSON.parse(decoded);

    if (!parsed.exp) {
      return false;
    }

    return Date.now() >= parsed.exp * 1000;
  } catch {
    return false;
  }
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);

        if (!storedToken) {
          setTokenState(null);
          return;
        }

        if (isTokenExpired(storedToken)) {
          await AsyncStorage.removeItem(TOKEN_KEY);
          setTokenState(null);
          return;
        }

        setTokenState(storedToken);
      } catch {
        setTokenState(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      "auth:unauthorized",
      () => {
        setTokenState(null);
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const setToken = async (newToken: string | null) => {
    if (!newToken) {
      setTokenState(null);
      await AsyncStorage.removeItem(TOKEN_KEY);
      return;
    }

    setTokenState(newToken);
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
  };

  const signOut = async () => {
    setTokenState(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
  };

  const value = useMemo(
    () => ({
      token,
      setToken,
      signOut,
      isAuthenticated: !!token && !isTokenExpired(token),
      isLoading,
    }),
    [token, isLoading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
