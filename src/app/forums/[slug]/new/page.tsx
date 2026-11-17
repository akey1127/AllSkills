import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewThreadForm } from "./thread-form";

type Props = { params: Promise<{ slug: string }> };

export default async function NewThreadPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/forums/${slug}/new`);

  const { data: cat } = await supabase
    .from("forum_categories")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!cat) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link href={`/forums/${slug}`} className="text-sm text-amber-800 underline">
        ← {cat.name}
      </Link>
      <h1 className="mt-4 text-xl font-bold">New thread</h1>
      <NewThreadForm categoryId={cat.id} />
    </div>
  );
}
