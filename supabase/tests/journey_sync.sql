-- Disposable fixtures; no SMS/email or persisted user data. Always roll back.
begin;
insert into auth.users(id) values
  ('dd65b341-72a1-4731-a11a-16ea9b2ae5f1'),
  ('dd65b341-72a1-4731-a11a-16ea9b2ae5f2');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"dd65b341-72a1-4731-a11a-16ea9b2ae5f1","role":"authenticated"}', true);
do $$
begin
  perform public.sync_journeys('[{"id":"test","storyId":"story","choiceIds":[]}]');
  perform public.sync_journeys('[{"id":"test","storyId":"story","choiceIds":["a","b"]}]');
  perform public.sync_journeys('[{"id":"test","storyId":"story","choiceIds":["a"]}]');
  if (select choice_ids from public.journey_records where id = 'test') <> array['a','b']::varchar(100)[] then
    raise exception 'Older/empty snapshot rolled back progress';
  end if;
  perform public.sync_journeys('[{"id":"test","storyId":"story","choiceIds":["c"]}]');
  perform public.sync_journeys('[{"id":"test","storyId":"story","choiceIds":["c"]}]');
  if (select count(*) from public.journey_records) <> 2 then
    raise exception 'Diverging path lost or duplicated';
  end if;
  begin
    update public.journey_records set user_id = 'dd65b341-72a1-4731-a11a-16ea9b2ae5f2' where id = 'test';
    raise exception 'Ownership transfer incorrectly allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
select set_config('request.jwt.claims', '{"sub":"dd65b341-72a1-4731-a11a-16ea9b2ae5f2","role":"authenticated"}', true);
do $$
begin
  if exists(select 1 from public.journey_records) then raise exception 'Cross-account read allowed'; end if;
  begin
    insert into public.journey_records(user_id,id,story_id) values ('dd65b341-72a1-4731-a11a-16ea9b2ae5f1','forged','story');
    raise exception 'Cross-account insert allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
select 'progress, branching, deduplication and account isolation passed' as result;
rollback;
