import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ slug: string }> };

export default async function ForumCategoryPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: cat } = await supabase
    .from("forum_categories")
    .select("id, name, description")
    .eq("slug", slug)
    .single();

  if (!cat) notFound();

  const { data: threads } = await supabase
    .from("forum_threads")
    .select("id, title, created_at")
    .eq("category_id", cat.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/forums" className="text-sm text-amber-800 underline">
        ← All forums
      </Link>
      <h1 className="mt-4 text-2xl font-bold">{cat.name}</h1>
      {cat.description ? <p className="mt-2 text-zinc-700">{cat.description}</p> : null}

      <Link
        href={`/forums/${slug}/new`}
        className="mt-6 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white"
      >
        New thread
      </Link>

      <ul className="mt-8 space-y-2">
        {(threads ?? []).map((t) => (
          <li key={t.id}>
            <Link href={`/forums/thread/${t.id}`} className="text-amber-900 underline">
              {t.title}
            </Link>
            <span className="ml-2 text-xs text-zinc-500">
              {new Date(t.created_at).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
