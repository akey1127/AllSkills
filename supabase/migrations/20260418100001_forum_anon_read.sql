-- Allow anyone to read forums; posting still requires auth (existing INSERT policies)

drop policy if exists forum_threads_read on public.forum_threads;
create policy forum_threads_read on public.forum_threads
  for select using (true);

drop policy if exists forum_posts_read on public.forum_posts;
create policy forum_posts_read on public.forum_posts
  for select using (true);
