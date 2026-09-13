"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Compass,
  FileText,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Menu,
  Mic,
  Settings,
  Target,
  Users,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/store/useAuth";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/crm", label: "CRM", icon: KanbanSquare },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/recommendations", label: "Career Recommendations", icon: Target },
  { href: "/admin/resumes", label: "Resume Intelligence", icon: FileText },
  { href: "/admin/interviews", label: "Interview Intelligence", icon: Mic },
  { href: "/admin/transition", label: "Transition Intelligence", icon: Compass },
  { href: "/admin/monitoring", label: "System Monitoring", icon: Activity },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, logout } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => setHydrated(true), []);

  // client-side gate (the backend independently enforces RBAC on every call)
  useEffect(() => {
    if (hydrated && (!user || user.role !== "admin" || !token)) {
      router.replace("/login");
    }
  }, [hydrated, user, token, router]);

  useEffect(() => setOpen(false), [pathname]);

  if (!hydrated || !user || user.role !== "admin" || !token) {
    return (
      <div className="grid min-h-screen place-items-center text-ink-400">Verifying access…</div>
    );
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div className="min-h-screen">
      {/* mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/40 bg-white/60 px-4 py-3 backdrop-blur-xl lg:hidden">
        <span className="font-semibold text-ink-900">Skillence Admin</span>
        <button onClick={() => setOpen((v) => !v)} className="rounded-lg p-2 text-ink-700">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* dark glass sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-ink-900/90 backdrop-blur-2xl transition-transform duration-300 lg:translate-x-0",
          "border-r border-white/10 shadow-[8px_0_40px_-12px_rgba(15,23,42,0.5)]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="relative h-9 w-9 overflow-hidden rounded-xl ring-1 ring-white/20">
            <Image src="/logo.png" alt="Skillence" fill sizes="36px" className="object-cover" />
          </span>
          <div>
            <div className="text-sm font-semibold text-white">Skillence</div>
            <div className="text-[11px] text-white/45">Admin Portal</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-gradient-to-r from-brand-500/30 to-violet-500/20 text-white ring-1 ring-white/15"
                    : "text-white/60 hover:bg-white/5 hover:text-white",
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-xs font-bold text-white">
              {user.full_name.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-white">{user.full_name}</div>
              <div className="truncate text-[11px] text-white/45">{user.email}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-center text-xs font-medium text-white/70 transition-colors hover:bg-white/10"
            >
              View site
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-danger-500/20 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* scrim on mobile */}
      {open && (
        <div className="fixed inset-0 z-30 bg-ink-900/40 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* light content area */}
      <div className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">{children}</div>
      </div>
    </div>
  );
}
