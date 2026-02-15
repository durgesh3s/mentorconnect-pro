import { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/authStore";
import { useSocket } from "@/hooks/useSocket";

/**
 * SocketProvider component to initialize Socket.io connection
 */
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  
  // Initialize Socket.io connection when user is authenticated
  useSocket();

  return <>{children}</>;
}
