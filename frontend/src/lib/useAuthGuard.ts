"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/store/useAuth";

/**
 * Gate a page behind onboarding. Returns `ready` once the persisted store has
 * hydrated AND a user exists; otherwise it redirects to /onboarding.
 *
 * Usage:
 *   const ready = useAuthGuard();
 *   if (!ready) return <AuthGate />; // or any loading placeholder
 */
export function useAuthGuard(): boolean {
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  // localStorage is only available after mount; wait for it before deciding.
  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (hydrated && !user) router.replace("/onboarding");
  }, [hydrated, user, router]);

  return hydrated && !!user;
}
