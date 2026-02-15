import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:3000";

let socket: Socket | null = null;

/**
 * Initialize Socket.io connection
 */
export function initSocket(userId: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on("connect", () => {
    console.log("[Socket.IO] Connected to server");
    // Join user room for personalized updates
    socket?.emit("join:user", userId);
  });

  socket.on("disconnect", () => {
    console.log("[Socket.IO] Disconnected from server");
  });

  socket.on("connect_error", (error) => {
    console.error("[Socket.IO] Connection error:", error);
  });

  return socket;
}

/**
 * Get the current socket instance
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Disconnect Socket.io
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.emit("leave:user");
    socket.disconnect();
    socket = null;
  }
}
