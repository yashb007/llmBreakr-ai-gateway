"use client";

import { Suspense, useState, type FormEvent } from "react";
import { Logo } from "@/components/ui/Logo";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setError(json?.message ?? "Couldn't reach the server. Please try again.");
      setLoading(false);
      return;
    }

    router.replace(searchParams.get("next") || "/overview");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <form onSubmit={submit} className="w-full max-w-[380px] rounded-panel border border-border bg-panel p-7">
        <div className="mb-1 flex items-center justify-center gap-2.5">
          <Logo width={134} className="flex-none" />
        </div>
        <p className="mb-6 mt-1 text-center text-[13px] text-txm">Sign in to the Smart gateway admin console.</p>

        <div className="mb-4">
          <Field label="EMAIL">
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </Field>
        </div>
        <div className="mb-5">
          <Field label="PASSWORD">
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
        </div>

        {error && <p className="mb-4 text-[12.5px] font-semibold text-red">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full justify-center">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
