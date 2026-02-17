import api from "./api";

interface Group {
  id: string;
  name: string;
  description?: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  members?: GroupMember[];
  messages?: GroupMessage[];
  creator?: User;
}

interface GroupMember {
  userId: string;
  groupId: string;
  role: "admin" | "member";
  joinedAt: string;
  user: User;
}

interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  content: string;
  isSystem?: boolean;
  createdAt: string;
  sender: User;
}

interface User {
  id: string;
  username: string;
}

export const createGroup = async (
  name: string,
  description?: string,
  memberIds?: string[],
): Promise<Group> => {
  const response = await api.post("/groups", { name, description, memberIds });
  return response.data;
};

export const getUserGroups = async (): Promise<Group[]> => {
  const response = await api.get("/groups");
  return response.data;
};

export const getGroupById = async (groupId: string): Promise<Group> => {
  const response = await api.get(`/groups/${groupId}`);
  return response.data;
};

export const getGroupMessages = async (
  groupId: string,
  cursor?: string,
  limit: number = 50,
): Promise<GroupMessage[]> => {
  const params = new URLSearchParams();
  if (cursor) params.append("cursor", cursor);
  params.append("limit", limit.toString());

  const response = await api.get(
    `/groups/${groupId}/messages?${params.toString()}`,
  );
  return response.data;
};

export const addGroupMembers = async (
  groupId: string,
  memberIds: string[],
): Promise<{ message: string }> => {
  const response = await api.post(`/groups/${groupId}/members`, { memberIds });
  return response.data;
};

export const removeGroupMember = async (
  groupId: string,
  memberId: string,
): Promise<{ message: string }> => {
  const response = await api.delete(`/groups/${groupId}/members/${memberId}`);
  return response.data;
};

export const leaveGroup = async (
  groupId: string,
): Promise<{ message: string }> => {
  const response = await api.post(`/groups/${groupId}/leave`);
  return response.data;
};
