"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PostRow = {
  id: string;
  body: string;
  created_at: string;
  authorName: string;
};

export function ForumThreadRealtime({
  threadId,
  initialPosts,
  canReply,
  loginNextPath,
}: {
  threadId: string;
  initialPosts: PostRow[];
  canReply: boolean;
  loginNextPath: string;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`forum_thread_${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "forum_posts",
          filter: `thread_id=eq.${threadId}`,
        },
        async (payload) => {
          const row = payload.new as {
            id: string;
            body: string;
            created_at: string;
            author_id: string;
          };
          const { data: prof } = await supabase
            .from("profiles")
            .select("display_name, handle")
            .eq("id", row.author_id)
            .single();
          const authorName = prof?.display_name ?? prof?.handle ?? "Member";
          setPosts((prev) => {
            if (prev.some((p) => p.id === row.id)) return prev;
            return [
              ...prev,
              {
                id: row.id,
                body: row.body,
                created_at: row.created_at,
                authorName,
              },
            ];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  async function reply(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSending(false);
      return;
    }
    const { error } = await supabase.from("forum_posts").insert({
      thread_id: threadId,
      author_id: user.id,
      body,
    });
    setSending(false);
    if (error) {
      alert(error.message);
      return;
    }
    setBody("");
  }

  const loginHref = `/auth/login?next=${encodeURIComponent(loginNextPath)}`;

  return (
    <>
      <ul className="mt-8 space-y-6">
        {posts.map((p) => (
          <li key={p.id} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-zinc-900">{p.authorName}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{p.body}</p>
            <time className="mt-2 block text-xs text-zinc-500" dateTime={p.created_at}>
              {new Date(p.created_at).toLocaleString()}
            </time>
          </li>
        ))}
      </ul>

      {canReply ? (
        <form onSubmit={reply} className="mt-10 space-y-2">
          <label className="block text-sm font-medium text-zinc-800">Reply</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
            required
          />
          <button
            type="submit"
            disabled={sending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {sending ? "Posting…" : "Post reply"}
          </button>
        </form>
      ) : (
        <div className="mt-10 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-800">
          <p className="font-medium text-zinc-900">Want to join the conversation?</p>
          <p className="mt-1 text-zinc-700">
            Anyone can read this thread.{" "}
            <Link href={loginHref} className="font-medium text-amber-800 underline">
              Sign in
            </Link>{" "}
            to post a reply (or{" "}
            <Link href={`/auth/sign-up`} className="font-medium text-amber-800 underline">
              create a free account
            </Link>
            ).
          </p>
        </div>
      )}
    </>
  );
}
