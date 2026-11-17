import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ForumThreadRealtime } from "./thread-realtime";

type Props = { params: Promise<{ id: string }> };

export default async function ForumThreadPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: thread } = await supabase
    .from("forum_threads")
    .select("id, title, category_id")
    .eq("id", id)
    .single();

  if (!thread) notFound();

  const { data: cat } = await supabase
    .from("forum_categories")
    .select("slug, name")
    .eq("id", thread.category_id)
    .single();

  const { data: posts } = await supabase
    .from("forum_posts")
    .select("id, body, created_at, author_id")
    .eq("thread_id", id)
    .order("created_at", { ascending: true });

  const authorIds = [...new Set((posts ?? []).map((p) => p.author_id))];
  const { data: authors } = await supabase
    .from("profiles")
    .select("id, display_name, handle")
    .in("id", authorIds);

  const nameById = Object.fromEntries(
    (authors ?? []).map((a) => [a.id, a.display_name ?? a.handle]),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {cat ? (
        <Link href={`/forums/${cat.slug}`} className="text-sm text-amber-800 underline">
          ← {cat.name}
        </Link>
      ) : null}
      <h1 className="mt-4 text-2xl font-bold">{thread.title}</h1>

      <ForumThreadRealtime
        threadId={id}
        canReply={!!user}
        loginNextPath={`/forums/thread/${id}`}
        initialPosts={(posts ?? []).map((p) => ({
          id: p.id,
          body: p.body,
          created_at: p.created_at,
          authorName: nameById[p.author_id] ?? "Member",
        }))}
      />
    </div>
  );
}
