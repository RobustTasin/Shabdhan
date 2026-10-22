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
  login,
  type AuthUser,
} from "../lib/auth";
import { getSafeReturnPath } from "../lib/navigation";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  loginUser: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

const PUBLIC_PATHS = ["/", "/login", "/register", "/forgot-password", "/search", "/reports", "/categories", "/my-bangladesh", "/apply", "/membership/accept", "/account/create"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname) || /^\/reports\/[^/]+$/.test(pathname) || /^\/categories\/[^/]+$/.test(pathname) || /^\/users\/[^/]+$/.test(pathname);
}

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

  async function loginUser(
    email: string,
    password: string
  ): Promise<AuthUser> {
    const loggedInUser = await login(email, password);

    setUser(loggedInUser);

    return loggedInUser;
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

    const isPublicRoute = isPublicPath(pathname);

    if (!user && !isPublicRoute) {
      const next = `${pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    if (user && pathname === "/dashboard" && user.role !== "MODERATOR" && user.role !== "ADMIN") {
      router.replace("/me");
      return;
    }

    if (
      user &&
      (pathname === "/login" ||
        pathname === "/register" ||
        pathname === "/forgot-password")
    ) {
      const next = getSafeReturnPath(
        new URLSearchParams(window.location.search).get("next")
      );
      router.replace(next ?? "/");
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
        loginUser,
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
