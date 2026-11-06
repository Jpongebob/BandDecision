-- 운영자 일회성 SQL: 023 적용 후 Supabase SQL Editor에서 실행.
-- 대상: 아래 밴드와 첨부 데이터에 포함된 활성 멤버 4명만.
-- 실행일(한국 시간)부터 2026-12-31까지 기존 불가능 날짜를 제외하고 등록.
-- 가능한 날짜를 하나라도 새로 저장한 멤버는 전체 제외하여 본인 입력 보존.
-- 기존 불가능 날짜, 다른 밴드, 확정 계획은 변경하지 않음.
begin;
-- 앱의 날짜 저장/삭제와 같은 밴드 잠금으로 동시 수정 방지.
select id from public.bands
 where id='ff026dc1-327a-42a5-8d6f-5fd45b69429e'::uuid for update;

with legacy(member_id,unavailable_date) as (values
 ('32c939ef-d290-46eb-970f-89f825bdef57'::uuid, DATE '2026-11-10'),
 ('32c939ef-d290-46eb-970f-89f825bdef57'::uuid, DATE '2026-11-14'),
 ('32c939ef-d290-46eb-970f-89f825bdef57'::uuid, DATE '2026-11-15'),
 ('32c939ef-d290-46eb-970f-89f825bdef57'::uuid, DATE '2026-11-16'),
 ('32c939ef-d290-46eb-970f-89f825bdef57'::uuid, DATE '2026-11-17'),
 ('32c939ef-d290-46eb-970f-89f825bdef57'::uuid, DATE '2026-11-18'),
 ('32c939ef-d290-46eb-970f-89f825bdef57'::uuid, DATE '2026-11-21'),
 ('32c939ef-d290-46eb-970f-89f825bdef57'::uuid, DATE '2026-11-22'),
 ('32c939ef-d290-46eb-970f-89f825bdef57'::uuid, DATE '2026-11-24'),
 ('32c939ef-d290-46eb-970f-89f825bdef57'::uuid, DATE '2026-11-26'),
 ('32c939ef-d290-46eb-970f-89f825bdef57'::uuid, DATE '2026-12-02'),
 ('49db74b7-c998-46ef-bc02-728e7ac65f34'::uuid, DATE '2026-11-05'),
 ('49db74b7-c998-46ef-bc02-728e7ac65f34'::uuid, DATE '2026-11-29'),
 ('49db74b7-c998-46ef-bc02-728e7ac65f34'::uuid, DATE '2026-11-30'),
 ('49db74b7-c998-46ef-bc02-728e7ac65f34'::uuid, DATE '2026-12-01'),
 ('49db74b7-c998-46ef-bc02-728e7ac65f34'::uuid, DATE '2026-12-02'),
 ('49db74b7-c998-46ef-bc02-728e7ac65f34'::uuid, DATE '2026-12-03'),
 ('49db74b7-c998-46ef-bc02-728e7ac65f34'::uuid, DATE '2026-12-04'),
 ('49db74b7-c998-46ef-bc02-728e7ac65f34'::uuid, DATE '2026-12-05'),
 ('49db74b7-c998-46ef-bc02-728e7ac65f34'::uuid, DATE '2026-12-06'),
 ('49db74b7-c998-46ef-bc02-728e7ac65f34'::uuid, DATE '2026-12-07'),
 ('49db74b7-c998-46ef-bc02-728e7ac65f34'::uuid, DATE '2026-12-08'),
 ('49db74b7-c998-46ef-bc02-728e7ac65f34'::uuid, DATE '2026-12-09'),
 ('49db74b7-c998-46ef-bc02-728e7ac65f34'::uuid, DATE '2026-12-10'),
 ('49db74b7-c998-46ef-bc02-728e7ac65f34'::uuid, DATE '2026-12-18'),
 ('49db74b7-c998-46ef-bc02-728e7ac65f34'::uuid, DATE '2026-12-19'),
 ('49db74b7-c998-46ef-bc02-728e7ac65f34'::uuid, DATE '2026-12-20'),
 ('8c509311-1ae6-41be-b8a3-bf35bf16217c'::uuid, DATE '2026-11-05'),
 ('8c509311-1ae6-41be-b8a3-bf35bf16217c'::uuid, DATE '2026-11-06'),
 ('8c509311-1ae6-41be-b8a3-bf35bf16217c'::uuid, DATE '2026-11-11'),
 ('8c509311-1ae6-41be-b8a3-bf35bf16217c'::uuid, DATE '2026-11-12'),
 ('8c509311-1ae6-41be-b8a3-bf35bf16217c'::uuid, DATE '2026-11-13'),
 ('8c509311-1ae6-41be-b8a3-bf35bf16217c'::uuid, DATE '2026-11-18'),
 ('8c509311-1ae6-41be-b8a3-bf35bf16217c'::uuid, DATE '2026-11-25'),
 ('e4023462-9dc6-4546-b24c-2c115d63c1bb'::uuid, DATE '2026-11-12'),
 ('e4023462-9dc6-4546-b24c-2c115d63c1bb'::uuid, DATE '2026-11-13'),
 ('e4023462-9dc6-4546-b24c-2c115d63c1bb'::uuid, DATE '2026-11-19'),
 ('e4023462-9dc6-4546-b24c-2c115d63c1bb'::uuid, DATE '2026-11-20'),
 ('e4023462-9dc6-4546-b24c-2c115d63c1bb'::uuid, DATE '2026-11-26'),
 ('e4023462-9dc6-4546-b24c-2c115d63c1bb'::uuid, DATE '2026-11-27'),
 ('e4023462-9dc6-4546-b24c-2c115d63c1bb'::uuid, DATE '2026-12-03'),
 ('e4023462-9dc6-4546-b24c-2c115d63c1bb'::uuid, DATE '2026-12-04'),
 ('e4023462-9dc6-4546-b24c-2c115d63c1bb'::uuid, DATE '2026-12-10'),
 ('e4023462-9dc6-4546-b24c-2c115d63c1bb'::uuid, DATE '2026-12-11')
), targets as materialized (
 select m.id,m.band_id,p.nickname,
  exists(select 1 from public.available_dates a where a.band_id=m.band_id and a.member_id=m.id) as already_registered
 from public.band_members m join public.profiles p on p.id=m.user_id
 where m.band_id='ff026dc1-327a-42a5-8d6f-5fd45b69429e'::uuid and m.status='active'
 and m.id in (select member_id from legacy)
), added as (
 insert into public.available_dates(band_id,member_id,available_date)
 select t.band_id,t.id,g.day::date
 from targets t
 cross join generate_series(
  ((now() at time zone 'Asia/Seoul')::date)::timestamp,
  DATE '2026-12-31'::timestamp,interval '1 day') g(day)
 where not t.already_registered
 and not exists(select 1 from legacy l where l.member_id=t.id and l.unavailable_date=g.day::date)
 -- 첨부 이후 추가된 기존 불가능 날짜도 제외.
 and not exists(select 1 from public.unavailable_dates u
  where u.band_id=t.band_id and u.member_id=t.id and u.unavailable_date=g.day::date)
 on conflict(member_id,available_date) do nothing
 returning member_id
)
select t.nickname,t.id as member_id,
 case when t.already_registered then '기존 가능 날짜 유지' else '가능 날짜 등록' end as result,
 (select count(*) from added a where a.member_id=t.id) as inserted_days
from targets t order by t.nickname;
-- available_dates의 기존 트리거가 planning_version을 갱신함.
commit;
