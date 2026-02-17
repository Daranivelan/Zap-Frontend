"use client";

import React, { useEffect, useRef, useState } from "react";
import { useGroupMessages, useGroup, groupKeys } from "@/hooks/useGroups";
import { useSocket } from "@/contexts/SocketContext";
import { getUserIdFromToken } from "@/services/auth.utils";
import { useQueryClient } from "@tanstack/react-query";
import GroupDetails from "./GroupDetails";

interface GroupChatProps {
  groupId: string;
  onGroupLeft?: () => void;
}

const GroupChat: React.FC<GroupChatProps> = ({ groupId, onGroupLeft }) => {
  const [input, setInput] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(
    new Map(),
  );
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const currentUser = getUserIdFromToken();
  const queryClient = useQueryClient();

  const { socket, sendGroupMessage, groupTyping, groupStopTyping } =
    useSocket();
  const { data: messages = [], isLoading: messagesLoading } =
    useGroupMessages(groupId);
  const { data: group } = useGroup(groupId);

  // Direct socket listener for group messages (mirrors how DMs work)
  useEffect(() => {
    if (!socket) return;

    const handleReceiveGroupMessage = (message: any) => {
      if (message.groupId !== groupId) return;

      queryClient.setQueryData(groupKeys.messages(groupId), (oldData: any) => {
        if (!oldData) return [message];
        // Check for optimistic message to replace
        const hasOptimistic = oldData.some((m: any) => m.optimistic);
        if (hasOptimistic) {
          return oldData.map((m: any) => (m.optimistic ? message : m));
        }
        // Check for duplicate
        const exists = oldData.some((m: any) => m.id === message.id);
        if (exists) return oldData;
        // Prepend — cache is DESC order (newest first)
        return [message, ...oldData];
      });
    };

    socket.on("receive_group_message", handleReceiveGroupMessage);

    return () => {
      socket.off("receive_group_message", handleReceiveGroupMessage);
    };
  }, [socket, groupId, queryClient]);

  // Listen for typing events
  useEffect(() => {
    if (!socket) return;

    const handleTyping = ({
      groupId: gId,
      userId,
      username,
    }: {
      groupId: string;
      userId: string;
      username: string;
    }) => {
      if (gId !== groupId || userId === currentUser) return;
      setTypingUsers((prev) => new Map(prev).set(userId, username));
    };

    const handleStopTyping = ({
      groupId: gId,
      userId,
    }: {
      groupId: string;
      userId: string;
    }) => {
      if (gId !== groupId) return;
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    };

    socket.on("group_user_typing", handleTyping);
    socket.on("group_user_stop_typing", handleStopTyping);

    return () => {
      socket.off("group_user_typing", handleTyping);
      socket.off("group_user_stop_typing", handleStopTyping);
    };
  }, [socket, groupId, currentUser]);

  // Clear state when group changes
  useEffect(() => {
    setTypingUsers(new Map());
    setInput("");
    setShowDetails(false);
  }, [groupId]);

  // Auto-scroll on new messages
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    clearTimeout((window as any).groupTypingTimer);
    groupStopTyping(groupId);

    const content = input.trim();

    // Optimistic update — add message to cache immediately
    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      groupId,
      senderId: currentUser,
      senderUsername: "You",
      content,
      createdAt: new Date().toISOString(),
      optimistic: true,
      sender: { id: currentUser, username: "You" },
    };
    // Prepend — cache is DESC order (newest first)
    queryClient.setQueryData(groupKeys.messages(groupId), (old: any) =>
      old ? [optimisticMsg, ...old] : [optimisticMsg],
    );

    sendGroupMessage(groupId, content);
    setInput("");
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Messages come from API in desc order (newest first), reverse for display
  const sortedMessages = [...messages].reverse();
  const typingNames = Array.from(typingUsers.values());

  return (
    <div className="flex-1 flex min-h-0">
      {/* Chat area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Group header */}
        <div
          className="px-4 sm:px-8 lg:px-16 py-3 border-b border-white/6 cursor-pointer hover:bg-white/2 transition-colors"
          onClick={() => setShowDetails(!showDetails)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-rose-500/20 rounded-lg flex items-center justify-center">
                <span className="text-rose-400 text-sm font-bold">
                  {group?.name?.charAt(0).toUpperCase() || "G"}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">
                  {group?.name || "Loading..."}
                </h3>
                <p className="text-[11px] text-zinc-500">
                  {group?.members?.length || 0} members
                </p>
              </div>
            </div>
            <svg
              className={`w-4 h-4 text-zinc-500 transition-transform ${showDetails ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-16 py-6 space-y-1">
          {messagesLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-zinc-600 text-sm">Loading messages...</div>
            </div>
          ) : sortedMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-14 h-14 rounded-xl border border-white/6 bg-white/2 flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-zinc-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <p className="text-zinc-700 text-sm font-mono">
                  // no messages yet
                </p>
                <p className="text-zinc-600 text-sm mt-1">
                  Send the first message to this group
                </p>
              </div>
            </div>
          ) : (
            sortedMessages.map((msg: any, index: number) => {
              const isMe = msg.senderId === currentUser;
              const showTime =
                index === 0 ||
                new Date(msg.createdAt).getTime() -
                  new Date(sortedMessages[index - 1]?.createdAt).getTime() >
                  300000;
              const showSender =
                !isMe &&
                (index === 0 ||
                  sortedMessages[index - 1]?.senderId !== msg.senderId);

              return (
                <div key={msg.id || index}>
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
                      {showSender && (
                        <p className="text-[11px] text-rose-400/70 font-medium mb-1 px-1">
                          {msg.sender?.username ||
                            msg.senderUsername ||
                            "Unknown"}
                        </p>
                      )}
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
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messageEndRef} />
        </div>

        {/* Typing indicator */}
        {typingNames.length > 0 && (
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
                {typingNames.length === 1
                  ? typingNames[0]
                  : `${typingNames.length} people`}{" "}
                typing
              </span>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-4 sm:px-8 lg:px-16 py-4">
          <div className="flex gap-2 items-center rounded-xl border border-white/6 bg-white/2 p-1.5">
            <input
              className="flex-1 bg-transparent text-zinc-200 text-sm px-3 py-2 focus:outline-none placeholder-zinc-700"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                groupTyping(groupId);
                clearTimeout((window as any).groupTypingTimer);
                (window as any).groupTypingTimer = setTimeout(() => {
                  groupStopTyping(groupId);
                }, 800);
              }}
              placeholder={`Message ${group?.name || "group"}...`}
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
      </div>

      {/* Details panel */}
      {showDetails && (
        <GroupDetails
          groupId={groupId}
          onClose={() => setShowDetails(false)}
          onGroupLeft={onGroupLeft}
        />
      )}
    </div>
  );
};

export default GroupChat;
