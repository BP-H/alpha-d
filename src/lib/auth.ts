import { create } from "zustand";

interface AuthState {
  token: string | null;
  login: () => Promise<void>;
  logout: () => void;
}

/**
 * Minimal auth store simulating an OAuth login flow.
 * In a real application this would redirect to an external provider.
 */
export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  async login() {
    // Simulated OAuth: pretend we received a token from an auth provider
    const token = "demo-token";
    set({ token });
  },
  logout() {
    set({ token: null });
  },
}));

