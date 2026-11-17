import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <main className="mx-auto max-w-3xl flex-1 px-4 py-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-800">
          Trades-first creator platform
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-900">
          All-Skills
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-zinc-700">
          A centralized home for blue-collar personalities: subscriptions, pay-per-view posts,
          tips, forums, and live sessions — built for direct support from fans, not ad
          algorithms.
        </p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-700">
          Browse creator pages and forums without an account. Sign in when you want to
          subscribe, tip, post, or go live.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/auth/sign-up"
            className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-500"
          >
            Create account
          </Link>
          <Link
            href="/forums"
            className="rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            Browse forums
          </Link>
        </div>
      </main>
      <footer className="border-t border-zinc-200 py-8 text-center text-xs text-zinc-600">
        DMCA / support: <a href="mailto:support@example.com">support@example.com</a>
      </footer>
    </>
  );
}
