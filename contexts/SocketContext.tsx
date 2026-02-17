"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { connectSocket, getSocket, disconnectSocket } from "@/services/socket";
import { groupKeys } from "@/hooks/useGroups";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  sendGroupMessage: (groupId: string, content: string) => void;
  groupTyping: (groupId: string) => void;
  groupStopTyping: (groupId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  // Connect (or reuse existing) socket
  const connect = useCallback(() => {
    const existing = getSocket();
    if (existing) {
      setSocket(existing);
      setIsConnected(existing.connected);
      return;
    }

    const token =
      typeof window !== "undefined" ? sessionStorage.getItem("token") : null;
    if (!token) return;

    const newSocket = connectSocket(token);
    setSocket(newSocket);
  }, []);

  // Disconnect socket and reset state
  const disconnect = useCallback(() => {
    disconnectSocket();
    setSocket(null);
    setIsConnected(false);
  }, []);

  // Try to connect on mount (works if token already exists)
  useEffect(() => {
    connect();
  }, [connect]);

  // Set up group-related socket listeners whenever socket changes
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit("join_groups");
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleReceiveGroupMessage = (message: any) => {
      queryClient.setQueryData(
        groupKeys.messages(message.groupId),
        (oldData: any) => {
          if (!oldData) return [message];
          const exists = oldData.some(
            (m: any) => m.id === message.id || m.optimistic,
          );
          if (exists) {
            return oldData.map((m: any) => (m.optimistic ? message : m));
          }
          // Prepend — cache is DESC order (newest first)
          return [message, ...oldData];
        },
      );
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
    };

    const handleGroupMemberAdded = ({ groupId }: { groupId: string }) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
    };

    const handleGroupMemberRemoved = ({ groupId }: { groupId: string }) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
    };

    const handleMemberLeftGroup = ({ groupId }: { groupId: string }) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
    };

    const handleAddedToGroup = () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
      socket.emit("join_groups");
    };

    const handleRemovedFromGroup = () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.lists() });
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("receive_group_message", handleReceiveGroupMessage);
    socket.on("group_member_added", handleGroupMemberAdded);
    socket.on("group_member_removed", handleGroupMemberRemoved);
    socket.on("member_left_group", handleMemberLeftGroup);
    socket.on("added_to_group", handleAddedToGroup);
    socket.on("removed_from_group", handleRemovedFromGroup);

    // If already connected when this effect runs, emit join_groups now
    // (the "connect" event already fired before we attached the listener)
    if (socket.connected) {
      setIsConnected(true);
      socket.emit("join_groups");
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("receive_group_message", handleReceiveGroupMessage);
      socket.off("group_member_added", handleGroupMemberAdded);
      socket.off("group_member_removed", handleGroupMemberRemoved);
      socket.off("member_left_group", handleMemberLeftGroup);
      socket.off("added_to_group", handleAddedToGroup);
      socket.off("removed_from_group", handleRemovedFromGroup);
    };
  }, [socket, queryClient]);

  const sendGroupMessage = useCallback(
    (groupId: string, content: string) => {
      socket?.emit("send_group_message", { groupId, content });
    },
    [socket],
  );

  const groupTyping = useCallback(
    (groupId: string) => {
      socket?.emit("group_typing", { groupId });
    },
    [socket],
  );

  const groupStopTyping = useCallback(
    (groupId: string) => {
      socket?.emit("group_stop_typing", { groupId });
    },
    [socket],
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        connect,
        disconnect,
        sendGroupMessage,
        groupTyping,
        groupStopTyping,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
};
