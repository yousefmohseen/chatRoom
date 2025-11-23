import {create} from "zustand";
import type { Message } from "../types";

type State = {
  username: string;
  setUsername: (u: string) => void;
  messages: Message[];
  setMessages: (ms: Message[]) => void;
  addMessage: (m: Message) => void;
  online: string[];
  setOnline: (list: string[]) => void;
  clear: () => void;
};

const STORAGE_KEY = "chat_username";

const getInitialUsername = (): string => {
  try {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
};

export const useStore = create<State>((set) => ({
  username: getInitialUsername(),
  setUsername: (u) => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, u);
      }
    } catch {
      /* ignore localStorage write errors */
    }
    set({ username: u });
  },
  messages: [],
  setMessages: (ms) => set({ messages: ms }),
  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  online: [],
  setOnline: (list) => set({ online: list }),
  clear: () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore localStorage remove errors */
    }
    set({ username: "", messages: [], online: [] });
  }
}));