import { jwtDecode } from "jwt-decode";

interface TokenPayload {
  userId: string;
  iat: string;
  exp: string;
}

export const getUserIdFromToken = (): string | null => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const decode = jwtDecode<TokenPayload>(token);
    return decode.userId;
  } catch {
    return null;
  }
};
