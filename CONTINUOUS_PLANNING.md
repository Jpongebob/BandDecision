# 회차 없는 합주 계획 (011)

## 사용자 흐름
- 회차를 만들거나 다시 시작할 필요가 없습니다. 현재 활성 멤버가 일정·투표·추천 기준에 바로 반영됩니다.
- 저장하지 않은 날짜는 참석 가능한 것으로 계산합니다. 날짜 추천은 오늘부터 60일을 보여 주며, 계획에는 그 이후의 날짜도 직접 선택할 수 있습니다.
- 내 일정 위쪽은 새 날짜 추가 전용입니다. 기존 날짜는 아래 '저장된 날짜'에 한 번만 표시합니다. 과거 날짜를 포함해 저장한 모든 날짜를 볼 수 있고, 각 행에서 날짜/사유 수정과 개별 삭제를 합니다.
- 여러 날짜 입력은 선택사항으로 접어 두었습니다. 새 날짜만 추가하며 기존 저장 목록을 덮어쓰지 않습니다. 빠른 입력의 '없음'도 새 초안만 비우며 저장된 날짜는 지우지 않습니다.
- 날짜를 선택하면 참석 인원이 즉시 표시되고 바로 확정할 수 있습니다. 별도 미리보기 버튼과 필수 곡 선택은 없습니다. 불참자가 있으면 부분 참석 확인은 유지합니다.
- 계획은 최대 5개입니다. 곡 없이 날짜만 정하고 '계획 수정'에서 날짜와 곡을 바꾸거나 곡을 빼도 됩니다. 5개가 차도 기존 계획은 수정할 수 있습니다. 삭제는 밴드장만 동의 후 합니다.
- 멤버가 추가/탈퇴해도 기존 확정 계획은 그대로 보존합니다. 그 계획을 명시적으로 수정하면 현재 멤버와 일정으로 참석자를 다시 저장합니다. 기존 선택곡은 유지할 수 있고, 새 곡은 현재 추천 조건을 갖춘 곡에서 선택합니다.
- 투표는 회차가 바뀌어 지워지는 방식이 아닙니다. 본인이 바꿀 때까지 유지하고 현재 멤버의 투표만 추천에 사용합니다.

## 적용 순서와 009 중복 오류
기존 성공한 SQL은 다시 실행하거나 테이블을 삭제하지 마세요. 'test_band_fixtures already exists'는 009가 이미 적용되어 있을 가능성이 큽니다. 읽기 전용 supabase/checks/migration_status.sql로 확인하세요.

1. 009 관련 여섯 결과가 모두 true면 009를 건너뜁니다. 일부만 false이면 테이블을 삭제하거나 009 전체를 재실행하지 말고 조회 결과를 확인해야 합니다.
2. 010_applied가 true면 010도 건너뜁니다. false이고 009가 완료됐다면 010을 한 번 적용합니다.
3. 010까지 완료된 DB에 202611050011_continuous_planning.sql을 한 번 적용하고 앱을 재배포합니다.
4. 011_applied가 true면 011을 반복하지 않습니다. 서버/웹 코드는 011과 함께 배포해야 합니다. 구버전의 회차 기반 쓰기 API 권한은 제거됩니다.

011은 기존 날짜와 가장 최근 투표, 확정 계획과 곡 스냅샷을 보존합니다. 과거 기록의 참조와 기존 테스트 데이터 생성 호환을 위해 이전 테이블은 보관하지만, 앱과 외부 쓰기 API에는 회차 절차가 없습니다. 기존 SQL 파일은 수정하지 않습니다.

## 검증 범위
새 계약 SQL 66개 단언, 이전 010까지의 역사적 계약 300개 단언을 분리해 실행합니다. 010 데이터를 실제로 넣은 뒤 011로 업그레이드하는 보존 검사도 포함합니다. 현재 단위·페이지·폼·액션 테스트 182개가 통과했습니다. 모바일 전체 실행 100개가 로컬 Chrome에서 통과했습니다.
모바일은 실제 Next 화면·서버 액션·쿠키와 PGlite SQL/RLS/RPC를 연결하되, Auth/REST는 루프백 대역입니다. 운영 Supabase, 실기기·Safari·OS 키보드·Realtime·실제 동시 연결·운영 지연시간은 미검증입니다. 이번 작업에서 운영 SQL 실행이나 배포를 하지는 않았습니다.


## 계획 화면의 추천 날짜 자동 표시
날짜 입력 바로 아래에 참석 가능 인원순 상위 5개를 자동으로 표시합니다. 별도 펼치기나 추천 페이지 이동 없이 선택하면 입력 날짜와 참석 인원이 반영되고 바로 확정할 수 있습니다. 모바일은 작은 2줄, 넓은 화면은 1줄입니다. 이 화면 수정은 SQL 변경 없이 프런트엔드 재배포만 하면 됩니다.


## 2026-11-06 policy extension (015/016)
- Only today/future Seoul dates count toward the five-plan cap. Past plans are preserved in the archive. New skills are NULL until assigned; existing values are preserved. Missing skills prevent new recommendation-based song choices (but not date-only plans or retained snapshots).
- A leader may explicitly confirm a candidate as repertoire. Confirmed repertoire is separately listed and may be selected in any rehearsal irrespective of recommendation prerequisites. Unconfirmed candidates retain existing vote/difficulty/skill requirements. Unconfirm returns the song to candidate status, preserving votes and saved plan snapshots; deleting a plan never unconfirms repertoire. Leader-only RPC authorization and band-version checks remain enforced. See migrations015 then016.


## 2026-11-06 calendar, optional skill and location update
- UI pickers/recommendations cover today through the end of next calendar month, with only current/next months visible. Existing out-of-window saved dates and plans are preserved.
- Member skill defaultoff; when off UI hides skill entries/tasks and recommendation burden/skill-missing gate are disabled. Vote quorum remains required; migration020 below also disables the song difficulty prerequisite while off. Leader can toggle on without losing stored skill values. Confirmed repertoire remains directly selectable.
- Rehearsals have optional editable/clearable location(max200 chars). Nearest rehearsal card is first on home and shows date/time/location/songs. Migration019 keeps old7-argument save API and adds8-argument version with location, preserving role/version/cap locks and saved snapshots.


## 2026-11-06 곡 난이도도 실력 설정과 함께 전환 (020)
- 기존 **밴드 관리 → 멤버 실력 기능** 스위치를 함께 사용합니다. 기본값은 꺼짐이며, 꺼지면 후보곡·확정곡 목록의 난이도 요약과 곡 상세의 파트별 난이도 입력·수정 이력을 숨깁니다. 투표 수정·취소는 계속 사용할 수 있습니다.
- 꺼진 동안 후보곡 추천 및 새 계획의 곡 선택에는 실력/난이도 등록을 요구하지 않습니다. 현재 멤버 전원 응답·찬성 정족수는 유지합니다. 켜면 기존 실력·난이도 값과 추천 계산이 복구되며, 데이터는 삭제하지 않습니다.
- **019 다음에 `202611050020_optional_song_difficulty.sql`을 한 번 실행한 뒤 앱을 재배포하세요.** 화면만 배포하면 추천된 곡의 계획 저장이 구버전 DB 조건에 막힐 수 있습니다. 기존 마이그레이션은 다시 실행하지 않습니다.
- 확정곡의 추가 투표 생략, 저장된 계획의 곡 기록·장소, 기존 7개 인자 저장 API, 밴드장 권한·버전 검사·다가오는 계획 5개 제한은 유지합니다.


## 2026-11-06 합주 메모 (021)
- 합주 계획 생성·수정에 선택 메모(최대 2,000자)를 추가했습니다. 예: 지난 합주의 부족한 점, 이번 연습 목표, 준비할 내용. 밴드장만 저장·수정하며 멤버 모두 읽을 수 있습니다. 메모를 비우고 저장하면 삭제됩니다.
- 계획 목록/지난 계획에서는 줄바꿈을 유지해 전체 메모를 보여주고, 홈의 다가오는 합주에서는 최대 3줄로 미리 보여줍니다. 전체 내용은 합주 계획 전체 보기에서 확인합니다. 입력 내용은 일반 텍스트로 렌더링합니다.
- **020 다음에 `202611050021_rehearsal_plan_memo.sql`을 한 번 실행한 뒤 앱을 재배포하세요.** 기존 메모는 빈 상태로 시작합니다. 7/8개 인자를 받는 구버전 저장 API는 새 9개 인자 API로 연결되어, 구버전 화면의 수정이 메모를 지우지 않도록 했습니다.
- 계획 저장은 기존 요청 한 번에 메모를 함께 저장합니다. 별도 메모 조회/저장 요청은 없습니다. 합주 계획 화면의 인증 확인 뒤 추천 자료 조회를 사용자/기존 계획 조회와 병렬화하여 순차 대기를 줄였습니다. 운영 지연시간은 측정하지 않았으므로 속도 개선 수치는 제시하지 않습니다.
