"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { User } from "@/lib/types";

/**
 * Session store.
 *
 * - Onboarding (name+email) sets `user` only (no token needed for own-data calls).
 * - Login (email+password) sets `user` + a signed `token` used as the Bearer
 *   credential for admin APIs. The backend independently verifies the token and
 *   role on every admin route, so this client state is convenience only.
 */
interface AuthState {
  user: User | null;
  token: string | null;
  setUser: (user: User) => void;
  setSession: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setSession: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    { name: "skillence-auth" },
  ),
);

/** Read the current token outside React (e.g. in the api client). */
export function getToken(): string | null {
  try {
    return useAuth.getState().token;
  } catch {
    return null;
  }
}
