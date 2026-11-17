"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewPostForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [visibility, setVisibility] = useState<"public" | "subscribers" | "ppv">("public");
  const [priceDollars, setPriceDollars] = useState("5");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const priceCents =
      visibility === "ppv" ? Math.round(parseFloat(priceDollars) * 100) : undefined;

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        body,
        previewText: previewText || null,
        visibility,
        priceCents,
        published: true,
      }),
    });
    const data = (await res.json()) as { post?: { id: string }; error?: string };
    if (!res.ok || !data.post) {
      setLoading(false);
      alert(data.error ?? "Failed to create post");
      return;
    }

    if (videoFile) {
      const up = await fetch("/api/mux/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: data.post.id }),
      });
      const muxData = (await up.json()) as { url?: string; error?: string };
      if (!muxData.url) {
        setLoading(false);
        alert(muxData.error ?? "Mux upload URL failed");
        router.push("/dashboard");
        return;
      }
      await fetch(muxData.url, {
        method: "PUT",
        body: videoFile,
        headers: { "Content-Type": videoFile.type },
      });
    }

    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
        Body
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
        />
      </label>
      <label className="block text-sm">
        Teaser / preview (shown when locked)
        <textarea
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
        />
      </label>
      <label className="block text-sm">
        Visibility
        <select
          value={visibility}
          onChange={(e) =>
            setVisibility(e.target.value as "public" | "subscribers" | "ppv")
          }
          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
        >
          <option value="public">Public</option>
          <option value="subscribers">Subscribers only</option>
          <option value="ppv">Pay-per-view</option>
        </select>
      </label>
      {visibility === "ppv" && (
        <label className="block text-sm">
          Price (USD)
          <input
            type="number"
            min={0.5}
            step={0.5}
            value={priceDollars}
            onChange={(e) => setPriceDollars(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
            required
          />
        </label>
      )}
      <label className="block text-sm">
        Video (optional)
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
          className="mt-1 w-full text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {loading ? "Publishing…" : "Publish"}
      </button>
    </form>
  );
}
