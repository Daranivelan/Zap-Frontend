import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5001";

export const connectSocket = (token: string): Socket => {
  // Reuse existing socket (connected or still connecting)
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
