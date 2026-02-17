import api from "./api";

interface User {
  id: string;
  username: string;
  createdAt: string;
}

export const getUsers = async (): Promise<User[]> => {
  const response = await api.get("/users");
  return response.data;
};

export const getUserById = async (userId: string): Promise<User> => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

export const searchUsers = async (query: string): Promise<User[]> => {
  const response = await api.get(`users/search?q=${query}`);
  return response.data;
};
