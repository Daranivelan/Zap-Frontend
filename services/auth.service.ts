import { api } from "./api";
import { removeToken, setToken } from "./auth.utils";

interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
  };
}

interface RegisterData {
  username: string;
  password: string;
}

export const login = async (
  username: string,
  password: string,
): Promise<LoginResponse> => {
  const response = await api.post("/auth/login", {
    username,
    password,
  });

  if (response.data.token) {
    setToken(response.data.token);
    sessionStorage.setItem("user", JSON.stringify(response.data.user));
  }

  return response.data;
};

export const signup = async (
  username: string,
  password: string,
): Promise<{ message: string; userId: string }> => {
  const response = await api.post("/auth/register", {
    username,
    password,
  });
  return response.data;
};

export const register = async (data: RegisterData): Promise<LoginResponse> => {
  const response = await api.post("/auth/register", data);

  if (response.data.token) {
    setToken(response.data.token);
    sessionStorage.setItem("user", JSON.stringify(response.data.user));
  }

  return response.data;
};

export const logout = (): void => {
  removeToken();
  // Redirect to login page
  window.location.href = "/login";
};

export const getCurrentUser = () => {
  if (typeof window === "undefined") return null;

  const userStr = sessionStorage.getItem("user");
  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};
