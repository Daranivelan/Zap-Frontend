import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const connectSocket = (token: string) => {
  socket = io("http://localhost:5001", {
    auth: { token },
  });

  return socket;
};

export const getSocket = () => socket;
