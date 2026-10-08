import { apiFetch } from "./api";

export type UserRole =
  | "USER"
  | "MODERATOR"
  | "ADMIN"
  | "ENTITY_OWNER";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  is_verified: boolean;
};

type AuthResponse = {
  status: string;
  user: AuthUser;
  token: string;
};

const TOKEN_KEY = "shabdhan-token";
const USER_KEY = "shabdhan-user";

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = localStorage.getItem(USER_KEY);

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function login(
  email: string,
  password: string
): Promise<AuthUser> {
  const response = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
    }),
  });

  setAuth(response.token, response.user);

  return response.user;
}

export async function sendVerification(
  email: string,
  destination: "user" | "admin" = "user"
): Promise<void> {
  await apiFetch<{ status: string; message: string }>(
    "/auth/send-verification",
    {
      method: "POST",
      body: { email, destination },
    }
  );
}

export async function verifyEmail(
  email: string,
  code: string
): Promise<void> {
  await apiFetch<{ status: string; message: string }>("/auth/verify-email", {
    method: "POST",
    body: { email, code },
  });
}

export async function register(
  username: string,
  email: string,
  password: string
): Promise<AuthUser> {
  const response = await apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      username,
      email,
      password,
    }),
  });

  setAuth(response.token, response.user);

  return response.user;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const token = getToken();

  if (!token) {
    throw new Error("Authentication required");
  }

  const response = await apiFetch<{
    status: string;
    user: AuthUser;
  }>("/auth/me", {
    token,
  });

  localStorage.setItem(
    USER_KEY,
    JSON.stringify(response.user)
  );

  return response.user;
}

export function logout() {
  clearAuth();
}


export async function sendPasswordReset(
  email: string,
  destination: "user" | "admin" = "user"
): Promise<void> {
  await apiFetch<{ status: string; message: string }>(
    "/auth/forgot-password",
    {
      method: "POST",
      body: { email, destination },
    }
  );
}

export async function verifyPasswordReset(
  email: string,
  code: string
): Promise<void> {
  await apiFetch<{ status: string; message: string }>(
    "/auth/verify-reset-code",
    {
      method: "POST",
      body: { email, code },
    }
  );
}

export async function resetPassword(
  email: string,
  password: string
): Promise<void> {
  await apiFetch<{ status: string; message: string }>(
    "/auth/reset-password",
    {
      method: "POST",
      body: { email, password },
    }
  );
}
