-- Phone identities live in Supabase Auth. Store only game data here.
create table public.journey_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 100),
  story_id text not null check (length(story_id) between 1 and 100),
  choice_ids varchar(100)[] not null default '{}'
    check (cardinality(choice_ids) <= 40 and array_position(choice_ids, null) is null),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index journey_records_user_updated on public.journey_records (user_id, updated_at desc);
alter table public.journey_records enable row level security;
revoke all on public.journey_records from anon, authenticated;
grant select, insert, update on public.journey_records to authenticated;
create policy journey_select on public.journey_records for select to authenticated
  using ((select auth.uid()) = user_id);
create policy journey_insert on public.journey_records for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy journey_update on public.journey_records for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Serialize syncs for one user, retain longer progress, and keep divergent paths.
-- SECURITY INVOKER keeps all reads and writes subject to the policies above.
create function public.sync_journeys(records jsonb)
returns setof public.journey_records
language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  item jsonb;
  incoming_id text;
  incoming_story text;
  incoming_choices varchar(100)[];
  previous public.journey_records;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if jsonb_typeof(records) <> 'array' or jsonb_array_length(records) > 100 then
    raise exception 'Invalid records';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 0));
  for item in select value from jsonb_array_elements(records) loop
    incoming_id := item->>'id';
    incoming_story := item->>'storyId';
    if jsonb_typeof(item->'choiceIds') <> 'array' or
       jsonb_array_length(item->'choiceIds') > 40 or
       exists(select 1 from jsonb_array_elements(item->'choiceIds') c where jsonb_typeof(c) <> 'string' or length(c #>> '{}') > 100) then
      raise exception 'Invalid choices';
    end if;
    incoming_choices := array(select jsonb_array_elements_text(item->'choiceIds'));
    select * into previous from public.journey_records where user_id = owner_id and id = incoming_id;
    if not found then
      insert into public.journey_records(user_id, id, story_id, choice_ids)
        values(owner_id, incoming_id, incoming_story, incoming_choices);
    elsif previous.story_id = incoming_story and
          previous.choice_ids = incoming_choices[1:cardinality(previous.choice_ids)] then
      if cardinality(incoming_choices) > cardinality(previous.choice_ids) then
        update public.journey_records set choice_ids = incoming_choices, updated_at = now()
          where user_id = owner_id and id = incoming_id;
      end if;
    elsif previous.story_id = incoming_story and
          incoming_choices = previous.choice_ids[1:cardinality(incoming_choices)] then
      null; -- An offline device must not roll back another device's progress.
    else
      incoming_id := left(incoming_id, 60) || '-' || md5(incoming_story || incoming_choices::text);
      insert into public.journey_records(user_id, id, story_id, choice_ids)
        values(owner_id, incoming_id, incoming_story, incoming_choices)
        on conflict (user_id, id) do nothing;
    end if;
  end loop;
  return query select * from public.journey_records where user_id = owner_id order by updated_at desc, id limit 100;
end;
$$;
revoke all on function public.sync_journeys(jsonb) from public, anon;
grant execute on function public.sync_journeys(jsonb) to authenticated;
