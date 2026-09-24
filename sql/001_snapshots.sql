-- Run once in the Supabase SQL editor. All reads/writes remain user-scoped.
create table if not exists public.cave_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.cave_snapshots enable row level security;
drop policy if exists own_snapshot on public.cave_snapshots;
create policy own_snapshot on public.cave_snapshots for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.cave_snapshots from anon, authenticated;
grant select, insert, update on public.cave_snapshots to authenticated;

create or replace function public.save_cave_snapshot(p_snapshot jsonb, p_expected_revision bigint)
returns setof public.cave_snapshots
language plpgsql security invoker set search_path = '' as $$
declare v_user uuid := auth.uid(); v_row public.cave_snapshots;
begin
  if v_user is null then raise exception 'Unauthorized' using errcode = '42501'; end if;
  if p_expected_revision is null or p_expected_revision < 0 or p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' or octet_length(p_snapshot::text) > 2097152 then
    raise exception 'Invalid snapshot' using errcode = '22023';
  end if;
  -- Serializes first inserts as well as updates for one account, without locking other users.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  select * into v_row from public.cave_snapshots where user_id = v_user for update;
  if coalesce(v_row.revision,0) <> p_expected_revision then
    raise exception 'Revision conflict' using errcode = '40001';
  end if;
  insert into public.cave_snapshots(user_id,snapshot,revision,updated_at)
    values(v_user,p_snapshot,1,now())
    on conflict(user_id) do update set snapshot = excluded.snapshot,
      revision = cave_snapshots.revision + 1, updated_at = now()
    returning * into v_row;
  return next v_row;
end;
$$;
revoke all on function public.save_cave_snapshot(jsonb,bigint) from public, anon;
grant execute on function public.save_cave_snapshot(jsonb,bigint) to authenticated;
