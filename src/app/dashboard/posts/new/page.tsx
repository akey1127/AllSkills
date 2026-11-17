import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewPostForm } from "./new-post-form";

export default async function NewPostPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "creator") {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-zinc-700">Become a creator first.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-amber-800 underline">
          Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link href="/dashboard" className="text-sm text-amber-800 underline">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold">New post</h1>
      <NewPostForm />
    </div>
  );
}
