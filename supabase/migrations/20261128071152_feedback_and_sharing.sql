create table public.user_feedback (
  request_id uuid primary key,
  user_id uuid references auth.users(id) on delete set null,
  category text not null check (category in ('issue', 'experience', 'story', 'other')),
  message text not null check (char_length(btrim(message)) between 1 and 500),
  contact text check (char_length(contact) <= 200),
  client_key text not null,
  created_at timestamptz not null default now()
);

create table public.story_feedback (
  story_id text not null check (char_length(story_id) between 1 and 100),
  story_version text not null check (char_length(story_version) between 1 and 100),
  experience_id text not null check (experience_id ~ '^[a-zA-Z0-9_-]{1,100}$'),
  experience_key text not null,
  user_id uuid references auth.users(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  impact text[] not null check (
    cardinality(impact) between 1 and 5 and array_position(impact, null) is null
    and impact <@ array['resonance', 'insight', 'possibility', 'self', 'enjoyment', 'none']
    and (not ('none' = any(impact)) or cardinality(impact) = 1)
  ),
  replay text not null check (replay in ('yes', 'unsure', 'no')),
  suggestion text check (char_length(suggestion) <= 500),
  client_key text not null,
  created_at timestamptz not null default now(),
  primary key (story_id, experience_key)
);

create index user_feedback_rate on public.user_feedback (client_key, created_at);
create index story_feedback_rate on public.story_feedback (client_key, created_at);
create index user_feedback_account on public.user_feedback (user_id);
create index story_feedback_account on public.story_feedback (user_id);

alter table public.user_feedback enable row level security;
alter table public.story_feedback enable row level security;
revoke all on public.user_feedback, public.story_feedback from public, anon, authenticated;
grant select, insert on public.user_feedback, public.story_feedback to service_role;

create function public.submit_feedback(
  p_kind text,
  p_payload jsonb,
  p_user_id uuid,
  p_client_key text,
  p_experience_key text
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  cutoff timestamptz := now() - interval '10 minutes';
  recent_count bigint;
begin
  if p_client_key is null or p_client_key !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid feedback client' using errcode = '22023';
  end if;

  -- Serialize quota checks from this source, even across app instances.
  perform pg_advisory_xact_lock(hashtextextended('feedback:' || p_client_key, 0));

  if p_kind = 'general' then
    if exists (select from public.user_feedback where request_id = (p_payload->>'requestId')::uuid) then
      return 'duplicate';
    end if;
  elsif p_kind = 'story' then
    if p_experience_key is null or p_experience_key !~ '^[0-9a-f]{64}$' then
      raise exception 'Invalid story feedback key' using errcode = '22023';
    end if;
    if exists (select from public.story_feedback
      where story_id = p_payload->>'storyId' and experience_key = p_experience_key) then
      return 'duplicate';
    end if;
  else
    raise exception 'Invalid feedback kind' using errcode = '22023';
  end if;

  select
    (select count(*) from public.user_feedback where client_key = p_client_key and created_at >= cutoff)
    + (select count(*) from public.story_feedback where client_key = p_client_key and created_at >= cutoff)
  into recent_count;

  if recent_count >= 8 then return 'limited'; end if;

  if p_kind = 'general' then
    insert into public.user_feedback (request_id, user_id, category, message, contact, client_key)
    values ((p_payload->>'requestId')::uuid, p_user_id, p_payload->>'type',
      p_payload->>'message', nullif(p_payload->>'contact', ''), p_client_key)
    on conflict (request_id) do nothing;
  else
    insert into public.story_feedback (
      story_id, story_version, experience_id, experience_key, user_id,
      rating, impact, replay, suggestion, client_key
    ) values (
      p_payload->>'storyId', p_payload->>'storyVersion', p_payload->>'experienceId',
      p_experience_key, p_user_id, (p_payload->>'rating')::integer,
      array(select jsonb_array_elements_text(p_payload->'impact')),
      p_payload->>'replay', nullif(p_payload->>'suggestion', ''), p_client_key
    ) on conflict (story_id, experience_key) do nothing;
  end if;

  return case when found then 'saved' else 'duplicate' end;
end;
$$;

revoke all on function public.submit_feedback(text, jsonb, uuid, text, text) from public, anon, authenticated;
grant execute on function public.submit_feedback(text, jsonb, uuid, text, text) to service_role;
