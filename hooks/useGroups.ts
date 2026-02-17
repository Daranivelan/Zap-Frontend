import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import * as groupService from "../services/group.service";

export const groupKeys = {
  all: ["groups"] as const,
  lists: () => [...groupKeys.all, "list"] as const,
  list: (filters: string) => [...groupKeys.lists(), { filters }] as const,
  details: () => [...groupKeys.all, "detail"] as const,
  detail: (id: string) => [...groupKeys.details(), id] as const,
  messages: (id: string) => [...groupKeys.detail(id), "messages"] as const,
};

export const useUserGroups = () => {
  return useQuery({
    queryKey: groupKeys.lists(),
    queryFn: groupService.getUserGroups,
  });
};

export const useGroup = (groupId: string) => {
  return useQuery({
    queryKey: groupKeys.detail(groupId),
    queryFn: () => groupService.getGroupById(groupId),
    enabled: !!groupId,
  });
};

export const useGroupMessages = (groupId: string, cursor?: string) => {
  return useQuery({
    queryKey: cursor
      ? [...groupKeys.messages(groupId), cursor]
      : groupKeys.messages(groupId),
    queryFn: () => groupService.getGroupMessages(groupId, cursor),
    enabled: !!groupId,
    placeholderData: keepPreviousData,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      memberIds?: string[];
    }) => groupService.createGroup(data.name, data.description, data.memberIds),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
    },
  });
};

export const useAddGroupMembers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { groupId: string; memberIds: string[] }) =>
      groupService.addGroupMembers(data.groupId, data.memberIds),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: groupKeys.detail(variables.groupId),
      });
    },
  });
};

export const useRemoveGroupMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { groupId: string; memberId: string }) =>
      groupService.removeGroupMember(data.groupId, data.memberId),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: groupKeys.detail(variables.groupId),
      });
    },
  });
};

export const useLeaveGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => groupService.leaveGroup(groupId),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
    },
  });
};
