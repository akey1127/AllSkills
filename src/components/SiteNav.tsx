import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";

export async function SiteNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let handle: string | null = null;
  if (user) {
    const { data: p } = await supabase
      .from("profiles")
      .select("handle")
      .eq("id", user.id)
      .single();
    handle = p?.handle ?? null;
  }

  return (
    <header className="border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-zinc-900">
          All-Skills
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <Link href="/forums" className="text-zinc-700 hover:text-zinc-900">
            Forums
          </Link>
          {!user && (
            <span className="hidden text-xs text-zinc-600 sm:inline">
              Browse free content without signing in
            </span>
          )}
          {user ? (
            <>
              <Link href="/dashboard" className="text-zinc-700 hover:text-zinc-900">
                Dashboard
              </Link>
              {handle && (
                <Link
                  href={`/c/${handle}`}
                  className="font-medium text-amber-800 hover:text-amber-900"
                >
                  My page
                </Link>
              )}
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/auth/login" className="text-zinc-700 hover:text-zinc-900">
                Sign in
              </Link>
              <Link
                href="/auth/sign-up"
                className="rounded-full bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-800"
              >
                Join
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
