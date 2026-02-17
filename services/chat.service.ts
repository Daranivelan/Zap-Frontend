import api from "./api";

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  read: boolean;
  sender: User;
  receiver: User;
}

interface User {
  id: string;
  username: string;
}

// If you have REST endpoints for 1-on-1 chat history
export const getChatHistory = async (
  userId: string,
  cursor?: string,
  limit: number = 50,
): Promise<Message[]> => {
  const params = new URLSearchParams();
  if (cursor) params.append("cursor", cursor);
  params.append("limit", limit.toString());

  const response = await api.get(`/messages/${userId}?${params.toString()}`);
  return response.data;
};

export const markMessagesAsRead = async (
  userId: string,
): Promise<{ message: string }> => {
  const response = await api.post(`/messages/${userId}/read`);
  return response.data;
};
