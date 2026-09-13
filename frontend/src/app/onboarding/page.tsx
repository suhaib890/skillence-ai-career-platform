"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Mail, UserRound } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { useAuth } from "@/store/useAuth";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function OnboardingPage() {
  const router = useRouter();
  const { user, setUser } = useAuth();

  const [hydrated, setHydrated] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setHydrated(true), []);

  // Auto-login returning users: if a session already exists, skip onboarding.
  useEffect(() => {
    if (hydrated && user) router.replace("/assessment");
  }, [hydrated, user, router]);

  const canSubmit = fullName.trim().length > 0 && EMAIL_RE.test(email.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      // get-or-create on the backend → returning users are matched by email
      const created = await api.createUser(fullName.trim(), email.trim());
      setUser(created);
      router.push("/assessment");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your details");
    } finally {
      setLoading(false);
    }
  }

  // While we decide whether to redirect a returning user, avoid a flash.
  if (!hydrated || user) {
    return (
      <div className="container-x py-24 text-center text-ink-400">Loading…</div>
    );
  }

  return (
    <div className="container-x py-16">
      <div className="mx-auto max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6 text-center">
            <span className="relative mx-auto mb-5 block h-14 w-14 overflow-hidden rounded-2xl ring-1 ring-white/60 shadow-[0_14px_32px_-10px_rgba(99,102,241,0.7)]">
              <Image src="/logo.png" alt="Skillence" fill sizes="56px" className="object-cover" priority />
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-ink-900">
              Let&apos;s Get Started
            </h1>
            <p className="mx-auto mt-3 max-w-md text-ink-600">
              Tell us a little about yourself before we build your personalized
              career roadmap.
            </p>
          </div>

          <Card>
            <CardBody className="p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <Field label="Full Name" htmlFor="fullName" icon={<UserRound className="h-4 w-4" />}>
                  <input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Auj Khan"
                    className="glass-input w-full rounded-2xl py-3 pl-11 pr-4 text-ink-900"
                  />
                </Field>

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

                {error && (
                  <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={!canSubmit || loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    <>
                      Continue <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-ink-400">
                  No password needed. We use your email to save and reload your
                  results.
                </p>
              </form>
            </CardBody>
          </Card>
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
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-semibold text-ink-800"
      >
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
