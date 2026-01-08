import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  avatar?: string;
  googleGmailPhoto?: string;
  role: "student";
  skills?: string[];
  socialLinks?: Record<string, string>;
  description?: string;
  phone?: string;
  education?: "high" | "secondary" | "graduation";
  location?: string;
  fieldsOfInterest?: string[];
  followerCount?: number;
  followingCount?: number;
  isProfileComplete?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  pendingRole: "student" | null;
  setUser: (user: User | null) => void;
  setPendingRole: (role: "student" | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      pendingRole: null,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setPendingRole: (pendingRole) => set({ pendingRole }),
      logout: () => {
        localStorage.removeItem("auth_token");
        set({ user: null, isAuthenticated: false, pendingRole: null });
      },
    }),
    {
      name: "auth-storage",
    }
  )
);

