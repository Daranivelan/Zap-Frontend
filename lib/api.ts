import { api } from "./axios";

export const login = async (username: string, password: string) => {
  const res = await api.post("/api/auth/login", {
    username,
    password,
  });

  return res.data;
};

export const fetchChatHistory = async (otherUserId: string) => {
  const res = await api.get(`/api/chats/${otherUserId}`);
  return res.data;
};

export const fetchUsers = async () => {
  const res = await api.get("/api/users");
  return res.data;
};
