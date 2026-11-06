-- 사용자 확인한 구간의 가능 등록 해제. 023 적용 후 운영자 SQL Editor에서 1회 실행.
-- 본인이 새로 저장한 날짜도 이 구간에 있으면 해제됨 (사용자 확인 완료).
-- 기존 불가능 기록, 다른 멤버/밴드, 확정 계획 스냅샷은 유지.
begin;
select id from public.bands
 where id='ff026dc1-327a-42a5-8d6f-5fd45b69429e'::uuid for update;

with cutoffs(member_id,last_legacy_date) as (values
 ('e4023462-9dc6-4546-b24c-2c115d63c1bb'::uuid, DATE '2026-12-11'), -- 감자
 ('32c939ef-d290-46eb-970f-89f825bdef57'::uuid, DATE '2026-12-02'), -- 다은
 ('8c509311-1ae6-41be-b8a3-bf35bf16217c'::uuid, DATE '2026-11-25'), -- 백종현
 ('49db74b7-c998-46ef-bc02-728e7ac65f34'::uuid, DATE '2026-12-20')  -- 이재원
), removed as (
 delete from public.available_dates a using cutoffs c
 where a.band_id='ff026dc1-327a-42a5-8d6f-5fd45b69429e'::uuid
 and a.member_id=c.member_id
 and a.available_date>c.last_legacy_date
 and a.available_date<=DATE '2026-12-31'
 and exists(select 1 from public.band_members m where m.id=a.member_id and m.band_id=a.band_id and m.status='active')
 returning a.member_id,a.available_date
)
select p.nickname as 이름,
 c.last_legacy_date+1 as 해제시작일,
 DATE '2026-12-31' as 해제종료일,
 count(r.available_date) as 해제한날짜수
from cutoffs c
join public.band_members m on m.id=c.member_id
 and m.band_id='ff026dc1-327a-42a5-8d6f-5fd45b69429e'::uuid and m.status='active'
join public.profiles p on p.id=m.user_id
left join removed r on r.member_id=c.member_id
group by c.member_id,c.last_legacy_date,p.nickname
order by p.nickname;
-- 기존 available_dates 트리거가 planning_version을 갱신.
commit;
