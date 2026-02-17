import { jwtDecode } from "jwt-decode";

interface TokenPayload {
  userId: string;
  username: string;
  iat: string;
  exp: string;
}

export const getUserIdFromToken = (): string | null => {
  if (typeof window === "undefined") return null;

  const token = sessionStorage.getItem("token");
  if (!token) return null;

  try {
    const decode = jwtDecode<TokenPayload>(token);
    return decode.userId;
  } catch {
    return null;
  }
};

export const getUsernameFromToken = (): string | null => {
  if (typeof window === "undefined") return null;

  const token = sessionStorage.getItem("token");
  if (!token) return null;

  try {
    const decoded = jwtDecode<TokenPayload>(token);
    return decoded.username;
  } catch {
    return null;
  }
};

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("token");
};

export const setToken = (token: string): void => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("token", token);
};

/**
 * Remove token (logout)
 */
export const removeToken = (): void => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
};
