import { useEffect } from "react";
import { initSocket, disconnectSocket, getSocket } from "@/lib/utils/socket";
import { useAuthStore } from "@/lib/stores/authStore";

/**
 * Hook to manage Socket.io connection
 */
export function useSocket() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user?.id) {
      disconnectSocket();
      return;
    }

    // Initialize socket connection
    initSocket(user.id);

    return () => {
      // Don't disconnect on unmount - keep connection alive
      // disconnectSocket();
    };
  }, [user?.id]);
}

/**
 * Hook to listen for follow update events
 */
export function useFollowUpdates(callback: (data: any) => void) {
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on("follow:updated", callback);

    return () => {
      socket.off("follow:updated", callback);
    };
  }, [callback]);
}

/**
 * Hook to listen for follower update events
 */
export function useFollowerUpdates(callback: (data: any) => void) {
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on("follower:updated", callback);

    return () => {
      socket.off("follower:updated", callback);
    };
  }, [callback]);
}
