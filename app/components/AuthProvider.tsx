"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  clearAuth,
  getCurrentUser,
  getStoredUser,
  getToken,
  type AuthUser,
} from "../lib/auth";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

const PUBLIC_PATHS = ["/login", "/register"];

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    const token = getToken();

    if (!token) {
      setUser(null);
      return;
    }

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch {
      clearAuth();
      setUser(null);
    }
  }

  useEffect(() => {
    const storedUser = getStoredUser();

    if (storedUser) {
      setUser(storedUser);
    }

    refreshUser().finally(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    const isPublicPath = PUBLIC_PATHS.includes(pathname);

    if (!user && !isPublicPath) {
      router.replace("/login");
      return;
    }

    if (user && isPublicPath) {
      router.replace("/dashboard");
    }
  }, [user, loading, pathname, router]);

  function logout() {
    clearAuth();
    setUser(null);
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
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

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}