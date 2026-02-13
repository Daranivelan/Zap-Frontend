"use client";

import { fetchChatHistory } from "@/lib/api";
import { getUserIdFromToken } from "@/lib/auth";
import { connectSocket, getSocket } from "@/lib/socket";
import { useEffect, useRef, useState } from "react";

interface Message {
  from: string;
  content: string;
  timestamp: string | number;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  const otherUserId = "user-2";
  const currentUser = getUserIdFromToken();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = connectSocket(token);

    fetchChatHistory(otherUserId).then((history) => {
      const formatted = history.map((msg: any) => ({
        from: msg.senderId,
        content: msg.content,
        timestamp: msg.createdAt,
      }));

      setMessages(formatted);
    });

    socket.on("receive_message", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const socket = getSocket();
    if (!socket) return;

    socket.emit("send_message", {
      to: otherUserId,
      content: input,
    });

    setMessages((prev) => [
      ...prev,
      {
        from: currentUser,
        content: input,
        timestamp: Date.now(),
      },
    ]);

    setInput("");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow p-4 text-lg font-semibold">
        Chat with {otherUserId}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, index) => {
          const isMe = currentUser && msg.from === currentUser;

          return (
            <div
              key={index}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-2xl text-sm shadow ${
                  isMe
                    ? "bg-blue-500 text-white rounded-br-none"
                    : "bg-white text-gray-800 rounded-bl-none"
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={messageEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white p-4 border-t flex gap-2">
        <input
          className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button
          onClick={handleSend}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}
