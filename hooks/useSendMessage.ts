import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getSocket } from "@/services/socket";

export const useSendMessage = (
  selectedUserId: string | undefined,
  currentUserId: string | null,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const socket = getSocket();
      if (!socket || !selectedUserId) return;

      socket.emit("send_message", {
        to: selectedUserId,
        content,
      });

      return content;
    },

    onMutate: async (content) => {
      if (!selectedUserId) return;

      await queryClient.cancelQueries({
        queryKey: ["chat", selectedUserId],
      });

      const previousMessages = queryClient.getQueryData<any[]>([
        "chat",
        selectedUserId,
      ]);

      const optimisticMessage = {
        id: `temp-${Date.now()}-${Math.random()}`, // Temporary ID
        senderId: currentUserId,
        receiverId: selectedUserId,
        content,
        createdAt: new Date().toISOString(),
        optimistic: true,
        delivered: false,
        seen: false,
      };

      queryClient.setQueryData(["chat", selectedUserId], (old: any[] = []) => [
        ...old,
        optimisticMessage,
      ]);

      return { previousMessages };
    },

    onError: (_, __, context) => {
      if (!selectedUserId) return;

      queryClient.setQueryData(
        ["chat", selectedUserId],
        context?.previousMessages,
      );
    },
  });
};
