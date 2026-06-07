import { create } from "zustand";

interface UIState {
  theme: "light" | "dark";
  sidebarOpen: boolean;
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: "dark",
  sidebarOpen: true,
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));

interface UserState {
  user: { email: string; name: string; role: string } | null;
  login: (email: string, name: string) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: { email: "admin@bluradmin.com", name: "Blur Admin Admin", role: "ADMIN" },
  login: (email, name) => set({ user: { email, name, role: "USER" } }),
  logout: () => set({ user: null }),
}));