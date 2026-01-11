import { create } from "zustand";

interface Thread {
  id: string;
  author: {
    id: string;
    username: string;
    name: string;
    avatar?: string;
    googleGmailPhoto?: string;
  };
  content: string;
  images?: string[];
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
  shared?: boolean;
  createdAt: string;
}

interface Profile {
  id: string;
  username: string;
  name: string;
  avatar?: string;
  googleGmailPhoto?: string;
  coverImage?: string;
  followers: number;
  following: number;
  courses: number;
  certificates: number;
  threads: Thread[];
  skills?: string[];
  socialLinks?: Record<string, string>;
}

interface ProfileState {
  currentProfile: Profile | null;
  threads: Thread[];
  followers: string[];
  following: string[];
  setCurrentProfile: (profile: Profile | null) => void;
  setThreads: (threads: Thread[]) => void;
  addThread: (thread: Thread) => void;
  updateThread: (threadId: string, updates: Partial<Thread>) => void;
  followUser: (userId: string) => void;
  unfollowUser: (userId: string) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  currentProfile: null,
  threads: [],
  followers: [],
  following: [],
  setCurrentProfile: (currentProfile) => set({ currentProfile }),
  setThreads: (threads) => set({ threads }),
  addThread: (thread) => set((state) => ({ threads: [thread, ...state.threads] })),
  updateThread: (threadId, updates) =>
    set((state) => ({
      threads: state.threads.map((thread) =>
        thread.id === threadId ? { ...thread, ...updates } : thread
      ),
    })),
  followUser: (userId) =>
    set((state) => ({
      following: [...state.following, userId],
    })),
  unfollowUser: (userId) =>
    set((state) => ({
      following: state.following.filter((id) => id !== userId),
    })),
}));

