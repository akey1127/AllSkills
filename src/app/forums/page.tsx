import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ForumsIndexPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("forum_categories")
    .select("id, slug, name, description")
    .order("sort_order", { ascending: true });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-zinc-900">Forums</h1>
      <p className="mt-2 text-zinc-700">
        Trade-focused discussion — tools, apprenticeships, and shop talk. Reading is public;
        sign in to start threads or reply.
      </p>
      <ul className="mt-8 space-y-4">
        {(categories ?? []).map((c) => (
          <li key={c.id}>
            <Link
              href={`/forums/${c.slug}`}
              className="block rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-amber-300"
            >
              <h2 className="font-semibold text-zinc-900">{c.name}</h2>
              {c.description ? (
                <p className="mt-1 text-sm text-zinc-700">{c.description}</p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
