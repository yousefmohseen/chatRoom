import { io, Socket } from "socket.io-client";

const SERVER = import.meta.env.VITE_SERVER_URL || "https://chatroom-backend-production-6898.up.railway.app";

export const socket: Socket = io(SERVER, {
  autoConnect: false
});