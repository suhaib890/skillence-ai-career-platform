"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { useAuth } from "@/store/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuth((s) => s.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { token, user } = await api.login(email.trim(), password);
      setSession(user, token);
      router.push(user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-x py-16">
      <div className="mx-auto max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6 text-center">
            <span className="relative mx-auto mb-5 block h-14 w-14 overflow-hidden rounded-2xl ring-1 ring-white/60 shadow-[0_14px_32px_-10px_rgba(99,102,241,0.7)]">
              <Image src="/logo.png" alt="Skillence" fill sizes="56px" className="object-cover" priority />
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-ink-900">Welcome back</h1>
            <p className="mx-auto mt-3 max-w-sm text-ink-600">
              Sign in to your Skillence account.
            </p>
          </div>

          <Card>
            <CardBody className="p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <Field label="Email Address" htmlFor="email" icon={<Mail className="h-4 w-4" />}>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="glass-input w-full rounded-2xl py-3 pl-11 pr-4 text-ink-900"
                  />
                </Field>

                <Field label="Password" htmlFor="password" icon={<Lock className="h-4 w-4" />}>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="glass-input w-full rounded-2xl py-3 pl-11 pr-4 text-ink-900"
                  />
                </Field>

                {error && (
                  <p className="rounded-xl bg-danger-500/10 px-4 py-3 text-sm text-danger-700">
                    {error}
                  </p>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
                  ) : (
                    <>Sign in <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>
              </form>

              <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-ink-400">
                <ShieldCheck className="h-3.5 w-3.5" /> Role-based access — admins are routed to the portal.
              </div>
            </CardBody>
          </Card>

          <p className="mt-6 text-center text-sm text-ink-500">
            New to Skillence?{" "}
            <Link href="/onboarding" className="font-semibold text-brand-700 hover:underline">
              Get started
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  icon,
  children,
}: {
  label: string;
  htmlFor: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink-800">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400">
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}
