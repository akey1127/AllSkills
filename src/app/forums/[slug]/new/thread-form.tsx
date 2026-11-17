"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function NewThreadForm({ categoryId }: { categoryId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: thread, error: tErr } = await supabase
      .from("forum_threads")
      .insert({ category_id: categoryId, author_id: user.id, title })
      .select("id")
      .single();

    if (tErr || !thread) {
      setLoading(false);
      alert(tErr?.message ?? "Failed");
      return;
    }

    const { error: pErr } = await supabase.from("forum_posts").insert({
      thread_id: thread.id,
      author_id: user.id,
      body,
    });

    setLoading(false);
    if (pErr) {
      alert(pErr.message);
      return;
    }
    router.push(`/forums/thread/${thread.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="block text-sm">
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
          required
        />
      </label>
      <label className="block text-sm">
        Message
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
          required
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {loading ? "Posting…" : "Create thread"}
      </button>
    </form>
  );
}
