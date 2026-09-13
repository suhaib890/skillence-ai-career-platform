"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/store/useAuth";

const links = [
  { href: "/", label: "Home" },
  { href: "/explorer", label: "Explore" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transition", label: "Transition" },
  { href: "/resume", label: "Resume" },
  { href: "/interview", label: "Interview" },
  { href: "/profile", label: "Profile" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const signedIn = mounted && !!user;

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <nav className="glass-nav container-x flex h-16 items-center justify-between rounded-full !px-3 sm:!px-4">
        <Link
          href="/"
          className="flex items-center gap-2 pl-2 font-semibold text-ink-900"
        >
          <span className="relative h-9 w-9 overflow-hidden rounded-xl ring-1 ring-white/60 shadow-[0_8px_20px_-6px_rgba(99,102,241,0.5)]">
            <Image src="/logo.png" alt="Skillence" fill sizes="36px" className="object-cover" priority />
          </span>
          <span className="text-lg tracking-tight">Skillence</span>
        </Link>

        <div className="hidden items-center gap-0.5 lg:flex">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-all duration-300",
                  active
                    ? "bg-white/70 text-brand-700 shadow-glass-sm"
                    : "text-ink-600 hover:bg-white/50 hover:text-ink-900",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        {signedIn ? (
          <div className="flex items-center gap-2 pr-1">
            {user!.role === "admin" && (
              <Link
                href="/admin"
                className="hidden items-center gap-1.5 rounded-full bg-ink-900/90 px-3 py-1.5 text-xs font-semibold text-white shadow-glass-sm transition-colors hover:bg-ink-900 sm:inline-flex"
              >
                <LayoutDashboard className="h-3.5 w-3.5" /> Admin
              </Link>
            )}
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold leading-tight text-ink-900">
                {user!.full_name}
              </div>
              <div className="text-xs leading-tight text-ink-400">{user!.email}</div>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-sm font-bold text-white shadow-[0_6px_16px_-6px_rgba(99,102,241,0.7)]">
              {user!.full_name.slice(0, 2).toUpperCase()}
            </span>
            <Button size="sm" variant="ghost" onClick={handleLogout} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1 pr-1">
            <Link
              href="/login"
              className="rounded-full px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:text-ink-900"
            >
              Sign in
            </Link>
            <Link href="/onboarding">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
