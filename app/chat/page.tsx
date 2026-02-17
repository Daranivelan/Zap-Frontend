"use client";

import { useSendMessage } from "@/hooks/useSendMessage";
import { getChatHistory } from "@/services/chat.service";
import { getUsers } from "@/services/user.service";
import { getUserIdFromToken } from "@/services/auth.utils";
import { logout } from "@/services/auth.service";
import { useSocket } from "@/contexts/SocketContext";
import { useUserGroups } from "@/hooks/useGroups";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import GroupChat from "@/components/groups/GroupChat";
import CreateGroupModal from "@/components/groups/CreateGroupModal";

export default function ChatPage() {
  // DM state
  const [input, setInput] = useState("");
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Tab / group state
  const [chatMode, setChatMode] = useState<"dm" | "group">("dm");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const queryClient = useQueryClient();
  const currentUserRef = useRef<string | null>(null);
  const selectedUserRef = useRef<any>(null);

  // Socket from context (single connection)
  const { socket, connect, disconnect } = useSocket();

  // Ensure socket is created (handles post-login navigation)
  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    const userId = getUserIdFromToken();
    setCurrentUser(userId);
    currentUserRef.current = userId;
  }, []);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
    setIsTyping(false);
  }, [selectedUser]);

  // Clear cross-mode selections
  useEffect(() => {
    if (chatMode === "dm") {
      setSelectedGroupId(null);
    } else {
      setSelectedUser(null);
      setInput("");
    }
  }, [chatMode]);

  // Fetch users
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const data = await getUsers();
      return data.map((u: any) => ({
        ...u,
        isOnline: (u as any).isOnline ?? false,
      }));
    },
  });

  // Request online users list once socket is connected and users are loaded
  useEffect(() => {
    if (!socket || users.length === 0) return;
    socket.emit("get_online_users");
  }, [socket, users.length]);

  // Fetch chat messages (DM)
  const { data: messages = [] } = useQuery({
    queryKey: ["chat", selectedUser?.id],
    queryFn: () => getChatHistory(selectedUser!.id),
    enabled: !!selectedUser,
  });

  // Fetch user groups
  const { data: groups = [] } = useUserGroups();

  // DM mutation
  const sendMessageMutation = useSendMessage(selectedUser?.id, currentUser);

  // DM socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleUserOnline = (data: any) => {
      const id = typeof data === "string" ? data : data.userId;
      queryClient.setQueryData(["users"], (old: any[] = []) =>
        old.map((user) =>
          user.id === id ? { ...user, isOnline: true } : user,
        ),
      );
    };

    const handleOnlineUsersList = (onlineUserIds: string[]) => {
      queryClient.setQueryData(["users"], (old: any[] = []) =>
        old.map((user) => ({
          ...user,
          isOnline: onlineUserIds.includes(user.id),
        })),
      );
    };

    const handleUserTyping = ({ userId }: { userId: string }) => {
      if (selectedUserRef.current?.id === userId) {
        setIsTyping(true);
      }
    };

    const handleUserStopTyping = ({ userId }: { userId: string }) => {
      if (selectedUserRef.current?.id === userId) {
        setIsTyping(false);
      }
    };

    const handleUserOffline = (data: any) => {
      const id = typeof data === "string" ? data : data.userId;
      queryClient.setQueryData(["users"], (old: any[] = []) =>
        old.map((user) =>
          user.id === id ? { ...user, isOnline: false } : user,
        ),
      );
    };

    const handleMessagesSeen = ({ by }: { by: string }) => {
      queryClient.setQueryData(["chat", by], (old: any[] = []) =>
        old.map((msg) =>
          msg.senderId === currentUserRef.current
            ? { ...msg, seen: true, delivered: true }
            : msg,
        ),
      );
    };

    const handleMessageDelivered = ({ messageId }: { messageId: string }) => {
      queryClient.setQueriesData({ queryKey: ["chat"] }, (old: any[] = []) => {
        if (!old) return old;
        return old.map((msg) => {
          if (msg.id === messageId) {
            return { ...msg, delivered: true, optimistic: false };
          }
          if (msg.optimistic && msg.delivered === false) {
            return { ...msg, optimistic: false };
          }
          return msg;
        });
      });
    };

    const handleReceiveMessage = (msg: any) => {
      const isOurMessage = msg.senderId === currentUserRef.current;
      const otherUserId = isOurMessage ? msg.receiverId : msg.senderId;
      const key = ["chat", otherUserId];
      const isViewingThisChat = selectedUserRef.current?.id === msg.senderId;

      queryClient.setQueryData(key, (old: any[] = []) => {
        if (!old) return [msg];

        if (isOurMessage) {
          const withoutOptimistic = old.filter((m) => !m.optimistic);
          const exists = withoutOptimistic.some((m) => m.id === msg.id);
          if (exists) return withoutOptimistic;
          return [...withoutOptimistic, msg];
        } else {
          const exists = old.some((m) => m.id === msg.id);
          if (exists) return old;
          const messageToAdd = isViewingThisChat
            ? { ...msg, seen: true, delivered: true }
            : msg;
          return [...old, messageToAdd];
        }
      });

      if (!isOurMessage) {
        if (isViewingThisChat && !msg.seen) {
          socket.emit("mark_seen", { withUser: msg.senderId });
        } else if (!msg.seen) {
          socket.emit("message_delivered", {
            messageId: msg.id,
            from: msg.senderId,
          });
        }
      }
    };

    socket.on("user_online", handleUserOnline);
    socket.on("online_users_list", handleOnlineUsersList);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stop_typing", handleUserStopTyping);
    socket.on("user_offline", handleUserOffline);
    socket.on("messages_seen", handleMessagesSeen);
    socket.on("message_delivered", handleMessageDelivered);
    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("user_online", handleUserOnline);
      socket.off("online_users_list", handleOnlineUsersList);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stop_typing", handleUserStopTyping);
      socket.off("user_offline", handleUserOffline);
      socket.off("messages_seen", handleMessagesSeen);
      socket.off("message_delivered", handleMessageDelivered);
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [socket, queryClient]);

  // Keep selectedUser in sync with latest online status from users list
  useEffect(() => {
    if (!selectedUser) return;
    const updated = users.find((u: any) => u.id === selectedUser.id);
    if (updated && updated.isOnline !== selectedUser.isOnline) {
      setSelectedUser(updated);
    }
  }, [users, selectedUser]);

  // Active DM chat tracking
  useEffect(() => {
    if (!selectedUser || !socket) return;

    socket.emit("mark_seen", { withUser: selectedUser.id });
    socket.emit("active_chat", { chatWith: selectedUser.id });

    return () => {
      clearTimeout((window as any).typingTimer);
      socket.emit("stop_typing", { to: selectedUser.id });
      socket.emit("active_chat", { chatWith: null });
    };
  }, [selectedUser, socket]);

  // Auto-scroll DM messages
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !selectedUser) return;
    clearTimeout((window as any).typingTimer);
    socket?.emit("stop_typing", { to: selectedUser.id });
    sendMessageMutation.mutate(input);
    setInput("");
  };

  const handleLogout = () => {
    disconnect();
    logout();
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/6 glass">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-rose-500 rounded-md flex items-center justify-center">
            <svg
              className="w-3.5 h-3.5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="text-sm font-bold text-zinc-100 tracking-tight">
            Zap
          </span>
          <span className="text-[10px] text-zinc-600 font-mono ml-1">
            {users.filter((u: any) => u.isOnline).length} online
          </span>
        </div>

        {/* Right side: current chat info + logout */}
        <div className="flex items-center gap-3">
          {chatMode === "dm" && selectedUser && (
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${selectedUser.isOnline ? "bg-emerald-400" : "bg-zinc-600"}`}
              />
              <span className="text-sm font-medium text-zinc-300">
                {selectedUser.username}
              </span>
              <span className="text-xs text-zinc-600">
                {selectedUser.isOnline ? "active" : "offline"}
              </span>
            </div>
          )}
          {chatMode === "group" && selectedGroupId && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="text-sm font-medium text-zinc-300">
                {(groups as any[]).find((g: any) => g.id === selectedGroupId)
                  ?.name || "Group"}
              </span>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-rose-400 hover:bg-white/5 border border-white/6 transition-all"
            title="Logout"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center border-b border-white/6 px-5">
        <button
          onClick={() => setChatMode("dm")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            chatMode === "dm"
              ? "text-rose-400"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          DMs
          {chatMode === "dm" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setChatMode("group")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            chatMode === "group"
              ? "text-rose-400"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Groups
          {chatMode === "group" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Contacts / Groups Pills Bar */}
      <div className="border-b border-white/6 px-4 py-2.5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {chatMode === "dm" ? (
            /* DM Contacts */
            users.length === 0 ? (
              <span className="text-xs text-zinc-600 py-1">
                No contacts yet
              </span>
            ) : (
              users.map((user: any) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium shrink-0 transition-all ${
                    selectedUser?.id === user.id
                      ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                      : "bg-white/3 text-zinc-500 border border-white/6 hover:text-zinc-300 hover:border-white/10"
                  }`}
                >
                  <span className="relative flex">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        selectedUser?.id === user.id
                          ? "bg-rose-500 text-white"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                    {user.isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-zinc-950" />
                    )}
                  </span>
                  <span className="truncate max-w-20">{user.username}</span>
                </button>
              ))
            )
          ) : (
            /* Group Pills */
            <>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium shrink-0 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                New
              </button>
              {(groups as any[]).length === 0 ? (
                <span className="text-xs text-zinc-600 py-1.5">
                  No groups yet
                </span>
              ) : (
                (groups as any[]).map((group: any) => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium shrink-0 transition-all ${
                      selectedGroupId === group.id
                        ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                        : "bg-white/3 text-zinc-500 border border-white/6 hover:text-zinc-300 hover:border-white/10"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                        selectedGroupId === group.id
                          ? "bg-rose-500 text-white"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {group.name?.charAt(0).toUpperCase() || "G"}
                    </span>
                    <span className="truncate max-w-24">{group.name}</span>
                    {group.members && (
                      <span className="text-[10px] text-zinc-600">
                        {group.members.length}
                      </span>
                    )}
                  </button>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {chatMode === "dm" ? (
          /* ===== DM MODE ===== */
          !selectedUser ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-xl border border-white/6 bg-white/2 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-7 h-7 text-zinc-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-zinc-300 mb-1">
                  No conversation selected
                </h3>
                <p className="text-sm text-zinc-600">
                  Choose a contact above to start chatting
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-16 py-6 space-y-1">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-zinc-700 text-sm font-mono">
                        // no messages yet
                      </p>
                      <p className="text-zinc-600 text-sm mt-1">
                        Say something to start the thread
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg: any, index: number) => {
                    const isMe = msg.senderId === currentUser;
                    const showTime =
                      index === 0 ||
                      new Date(msg.createdAt).getTime() -
                        new Date(messages[index - 1]?.createdAt).getTime() >
                        300000;

                    return (
                      <div key={index}>
                        {showTime && (
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 border-t border-white/4" />
                            <span className="text-[10px] text-zinc-600 font-mono shrink-0">
                              {formatTime(msg.createdAt)}
                            </span>
                            <div className="flex-1 border-t border-white/4" />
                          </div>
                        )}
                        <div
                          className={`flex ${isMe ? "justify-end" : "justify-start"} ${msg.optimistic ? "opacity-50" : "opacity-100"} transition-opacity`}
                        >
                          <div className="max-w-[65%] group">
                            <div
                              className={`px-4 py-2.5 rounded-lg border-l-2 ${
                                isMe
                                  ? "bg-rose-500/8 border-l-rose-500 text-zinc-200"
                                  : "bg-white/3 border-l-zinc-700 text-zinc-300"
                              }`}
                            >
                              <div className="text-sm leading-relaxed">
                                {msg.content}
                              </div>
                            </div>
                            <div
                              className={`flex items-center gap-2 mt-1 px-1 ${isMe ? "justify-end" : "justify-start"}`}
                            >
                              <span className="text-[10px] text-zinc-700 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                                {formatTime(msg.createdAt)}
                              </span>
                              {isMe && (
                                <span className="flex items-center text-[10px]">
                                  {msg.seen ? (
                                    <span className="text-rose-400 flex">
                                      <svg
                                        className="w-3 h-3"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <svg
                                        className="w-3 h-3 -ml-1.5"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </span>
                                  ) : msg.delivered ? (
                                    <span className="text-zinc-500 flex">
                                      <svg
                                        className="w-3 h-3"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <svg
                                        className="w-3 h-3 -ml-1.5"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </span>
                                  ) : (
                                    <span className="text-zinc-700">
                                      <svg
                                        className="w-3 h-3"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messageEndRef} />
              </div>

              {/* Typing Indicator */}
              {isTyping && (
                <div className="px-4 sm:px-8 lg:px-16 py-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/3 border border-white/6">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce" />
                      <span
                        className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.15s" }}
                      />
                      <span
                        className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.3s" }}
                      />
                    </div>
                    <span className="text-xs text-zinc-500">
                      {selectedUser.username}
                    </span>
                  </div>
                </div>
              )}

              {/* DM Input */}
              <div className="px-4 sm:px-8 lg:px-16 py-4">
                <div className="flex gap-2 items-center rounded-xl border border-white/6 bg-white/2 p-1.5">
                  <input
                    className="flex-1 bg-transparent text-zinc-200 text-sm px-3 py-2 focus:outline-none placeholder-zinc-700"
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      socket?.emit("typing", { to: selectedUser.id });
                      clearTimeout((window as any).typingTimer);
                      (window as any).typingTimer = setTimeout(() => {
                        socket?.emit("stop_typing", {
                          to: selectedUser.id,
                        });
                      }, 800);
                    }}
                    placeholder={`Message ${selectedUser.username}...`}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="bg-rose-500 hover:bg-rose-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white p-2.5 rounded-lg transition-all hover:scale-[1.05] active:scale-[0.95]"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 12h14m-7-7l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )
        ) : /* ===== GROUP MODE ===== */
        !selectedGroupId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-xl border border-white/6 bg-white/2 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-7 h-7 text-zinc-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-300 mb-1">
                No group selected
              </h3>
              <p className="text-sm text-zinc-600">
                Choose a group above or create a new one
              </p>
            </div>
          </div>
        ) : (
          <GroupChat
            groupId={selectedGroupId}
            onGroupLeft={() => setSelectedGroupId(null)}
          />
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <CreateGroupModal onClose={() => setShowCreateGroup(false)} />
      )}
    </div>
  );
}
