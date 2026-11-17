"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AccountKind = "viewer" | "creator";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [accountKind, setAccountKind] = useState<AccountKind>("viewer");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");

    if (accountKind === "creator") {
      if (cleanHandle.length < 3 || cleanHandle.length > 32) {
        setLoading(false);
        setError("Creators need a public handle (3–32 letters, numbers, or underscore).");
        return;
      }
    }

    const supabase = createClient();

    const meta: Record<string, string> = {
      display_name: displayName.trim() || email.split("@")[0],
      account_type: accountKind === "creator" ? "creator" : "viewer",
    };
    if (cleanHandle.length >= 3) {
      meta.handle = cleanHandle;
    }

    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: meta,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Join All-Skills</h1>
      <p className="mt-1 text-sm text-zinc-700">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-medium text-amber-700 underline">
          Sign in
        </Link>
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-zinc-800">Account type</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <label
              className={`cursor-pointer rounded-lg border px-3 py-3 text-sm ${
                accountKind === "viewer"
                  ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <input
                type="radio"
                name="kind"
                className="sr-only"
                checked={accountKind === "viewer"}
                onChange={() => setAccountKind("viewer")}
              />
              <span className="font-semibold text-zinc-900">Viewer</span>
              <span className="mt-1 block text-zinc-700">
                Watch free content, subscribe, and join forums when you sign in.
              </span>
            </label>
            <label
              className={`cursor-pointer rounded-lg border px-3 py-3 text-sm ${
                accountKind === "creator"
                  ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <input
                type="radio"
                name="kind"
                className="sr-only"
                checked={accountKind === "creator"}
                onChange={() => setAccountKind("creator")}
              />
              <span className="font-semibold text-zinc-900">Creator</span>
              <span className="mt-1 block text-zinc-700">
                Publish a public page, videos, and paid tiers after setup.
              </span>
            </label>
          </div>
        </fieldset>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700">Display name</span>
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700">
            {accountKind === "creator" ? "Public handle (your page URL)" : "Handle (optional)"}
          </span>
          <input
            required={accountKind === "creator"}
            pattern={accountKind === "creator" ? "[a-zA-Z0-9_]{3,32}" : undefined}
            title={accountKind === "creator" ? "3–32 letters, numbers, or underscore" : undefined}
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder={
              accountKind === "creator" ? "e.g. sparky_welds" : "Skip — we’ll assign one"
            }
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
          />
          {accountKind === "viewer" ? (
            <span className="text-xs text-zinc-600">
              Add a custom @handle now, or leave blank and we’ll generate one.
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700">Password</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-amber-600 py-2.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
