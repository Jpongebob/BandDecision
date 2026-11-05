# 최신 011 검사: 회차 없는 계획

현재 실행은 **모바일 전체 100개 PASS, 예외 0 / 단위·컴포넌트·액션 182개 PASS / 새 DB 계약·업그레이드 66개 PASS**입니다. 아래 이전 010의 157개 체크 기록은 과거 흐름이며, 회차·미리보기 관련 항목은 최신 계약으로 대체합니다.
011까지의 마이그레이션을 적용하고 로컬 Chrome에서 현재 명단, 별도 저장 날짜 목록과 개별 편집/삭제, 날짜만 즉시 확정, 기존 계획 날짜·곡 편집/제거, 5개 제한 중 편집, 새 멤버 즉시 참여를 실제 화면·서버 액션·SQL에 연결해 검사했습니다. Supabase 설정이 있는 프로덕션 빌드도 통과했고 로컬 QA 서버는 종료했습니다.
운영 Supabase/실기기/Safari/OS 키보드/Realtime/다중 실제 연결/운영 지연시간은 여전히 미검증입니다. Auth/REST는 루프백 대역이라는 범위는 유지합니다. CONTINUOUS_PLANNING.md에 적용 순서와 사용자 흐름을 정리했습니다.

## 최신 단일 실행 체크 목록
- touch creates five-member fixture via real Next server action
- band code displayed
- reusable code invite generated
- leader settings fits 390px []
- /dashboard fits 320px []
- /schedule fits 320px []
- /schedule/recommendations fits 320px []
- /songs fits 320px []
- /songs/recommendations fits 320px []
- /plans fits 320px []
- /settings/band fits 320px []
- /settings fits 320px []
- /settings/profile fits 320px []
- /bands/test fits 320px []
- /dashboard fits 390px []
- /schedule fits 390px []
- /schedule/recommendations fits 390px []
- /songs fits 390px []
- /songs/recommendations fits 390px []
- /plans fits 390px []
- /settings/band fits 390px []
- /settings fits 390px []
- /settings/profile fits 390px []
- /bands/test fits 390px []
- /dashboard fits 430px []
- /schedule fits 430px []
- /schedule/recommendations fits 430px []
- /songs fits 430px []
- /songs/recommendations fits 430px []
- /plans fits 430px []
- /settings/band fits 430px []
- /settings fits 430px []
- /settings/profile fits 430px []
- /bands/test fits 430px []
- /dashboard fits 768px []
- /schedule fits 768px []
- /schedule/recommendations fits 768px []
- /songs fits 768px []
- /songs/recommendations fits 768px []
- /plans fits 768px []
- /settings/band fits 768px []
- /settings fits 768px []
- /settings/profile fits 768px []
- /bands/test fits 768px []
- /dashboard fits 844px []
- /schedule fits 844px []
- /schedule/recommendations fits 844px []
- /songs fits 844px []
- /songs/recommendations fits 844px []
- /plans fits 844px []
- /settings/band fits 844px []
- /settings fits 844px []
- /settings/profile fits 844px []
- /bands/test fits 844px []
- all original saved dates listed once
- new-date field starts blank
- no duplicate selected-date list or round terminology
- successful add clears only new input
- saved date and reason editable without duplicates
- deleting one date preserves other saved dates
- quick add appends without replacing saved dates
- editable saved dates fits 320px []
- editable saved dates fits 390px []
- editable saved dates fits 430px []
- editable saved dates fits 768px []
- editable saved dates fits 844px []
- no preview step
- date-only plan created with no vote or song requirement
- adding a song edits the same plan without consuming a slot
- plan date changed and songs removed in place
- no preview step
- no preview step
- no preview step
- no preview step
- five-plan capacity enforced in screen
- existing plans remain editable at capacity
- five editable date-only plans fits 390px []
- explicit deletion frees one plan slot
- long title live songs fits 320px []
- long title live songs fits 390px []
- long title live songs fits 430px []
- long title live songs fits 844px []
- difficulty and persistent vote save without a round
- code invite prefilled
- profile available: 테스트 베이스
- invalid PIN retry preserves selection and signs in
- ordinary member cannot edit/delete/confirm plans
- ordinary member can add own date immediately
- code invite prefilled
- new member votes and saves dates immediately without starting a round
- new member persistent vote accepted
- code invite prefilled
- profile available: Mobile QA Leader
- invalid PIN retry preserves selection and signs in
- roster automatically changes to six current members
- no preview step
- date-only plan uses new current roster despite pending song votes
- member management has no manual round controls
- recommendations return directly home
- no uncaught JavaScript exceptions: []

---

# 이전 010 검사 기록

# 모바일 전체 흐름 및 다중 계획 검사

## 검증 환경
Windows Chrome의 실제 모바일 뷰포트·터치 입력과 로컬 Next 앱을 연결했습니다. 320×844, 390×844, 430×844, 768×844, 844×390 크기를 사용합니다. 화면·React 상태·Next 서버 액션·인증 쿠키·SQL/RLS/RPC는 실제 코드를 실행합니다. 인증/REST는 루프백 전용 테스트 대역이며 DB는 매번 버리는 PGlite입니다.

**실제 Supabase Auth/PostgREST/CAPTCHA·공급자 접속 제한·Realtime, 물리적 휴대폰·Safari·OS 키보드, 운영 지연 시간과 동시 연결 경쟁은 검증하지 않았습니다.** 모바일 브라우저 모의 검사 통과를 실기기 또는 배포 사이트 통과로 해석하면 안 됩니다.

## 수행 시나리오
- 테스트 밴드 5인 생성, 코드 초대 생성·자동 입력, 잘못된 비밀번호/PIN 거절 및 재입력.
- 홈·일정·날짜 추천·후보곡·곡 추천·계획·관리·더보기·내 정보·테스트 진입의 화면 크기별 넘침 검사.
- 달력·빠른 입력·없음·사유 저장과 재조회, 추천 날짜 펼치기.
- 최대 120자 제목 후보곡 생성, 난이도 버전 저장, 찬반·반대 사유와 재조회, 곡 상세 복귀.
- 부분 참석 확인, 5개 계획 누적, 6번째 폼 차단, 동의 후 삭제, 홈 전체 표시.
- 하단 메뉴와 홈 복귀, 일반 멤버의 일정·투표 및 관리/확정/삭제 버튼 차단.
- 밴드장 양도·이전 리더 권한 해제·새 리더 즉시 관리, 실력·파트 변경, 내 PIN·다른 멤버 PIN 및 접속 설정.
- 닉네임/PIN 저장 후 재접속, 멤버 제거·새 회차 이후 계획 스냅샷 보존.
- 새 프로필 가입 및 이전 회차 편집 차단, 탈퇴, 일반 밴드 생성과 실제 밴드의 테스트 덮어쓰기 거절, 로컬 계정 삭제 요청.

## 재현하고 수정한 문제
1. 인증 SDK의 시간 읽기가 Next 사전 렌더링에 걸리는 오류: 실제 요청 경계 뒤에서 초기화합니다. Auth 검증 후 identity RPC 순서는 그대로입니다.
2. 난이도·투표 저장 성공 안내가 서버 재조회로 사라짐: 폼 상태를 유지하고 저장 버전/선택 필드만 갱신합니다. 오래된 초안을 새 버전과 함께 보내지 않는 기존 회귀 검사도 유지합니다.
3. 최대 길이 영문 제목이 390px 화면을 1274px까지 늘림: 좁은 카드 안에서 긴 텍스트를 줄바꿈합니다. 실제 뷰포트 폭과 문서 폭을 비교해 재검사합니다.
4. 비밀번호/PIN 오류 후 React가 프로필 선택과 입력을 초기화함: 오류 시 입력을 유지하고 성공 시에만 초기화합니다.
5. 일부 설정·회차 없는 곡 화면에서 조회 오류를 빈 데이터로 바꿈: 오류 경계로 전달합니다.

## 최대 5개 계획
010 마이그레이션이 기존 밴드당 1건 제약과 자동 삭제를 없앱니다. 밴드 행 잠금과 용량 트리거로 제한을 검사하고, 확정/삭제 시 회차 버전을 올립니다. 일반 멤버는 읽기만 가능하며 밴드장만 동의 후 개별 삭제합니다. 기존 계획·자식 스냅샷은 새 확정과 회차/멤버 변경으로 덮어쓰지 않습니다.

## 재실행
banddecision-web/scripts/mobile-qa/README.md를 따르세요. test:mobile:gateway와 로컬 Next를 먼저 실행한 뒤 npm.cmd run test:mobile을 실행합니다. 공급자 연결 대역의 한계를 숨기기 위한 제품 코드 우회/테스트 인증 경로는 없습니다. 테스트 코드와 게이트웨이는 scripts 아래에서만 실행합니다.


## 최종 실행 결과 (2026-11-05)
| 검사 | 결과 |
|---|---|
| Chrome 모바일 전체 실행 | PASS: 157개 체크, 미처리 JavaScript 예외 0 |
| 단위·컴포넌트·액션 | PASS: 26파일 / 163개 |
| 임시 PostgreSQL/PGlite | PASS: 11개 마이그레이션 / 300개 단언 |
| 린트·타입 | PASS |
| 프로덕션 빌드 | PASS: 19개 경로 |

브라우저 검사 도중 개발용 Next 배지가 홈 터치를 가린 문제, 닫힌 details의 숨은 컨트롤을 잡은 자동화 선택자, PGlite date가 REST 날짜 형식과 달랐던 대역 문제는 테스트 도구에서 고쳤습니다. 제품 결함으로 오인하지 않았습니다. 린트가 생성된 Chrome 확장 스크립트를 읽은 오류도 QA 산출물 디렉터리만 제외해 해결했으며 앱·테스트·도구 코드는 계속 검사합니다.
최종 전체 브라우저 실행의 체크 목록은 아래와 같습니다. 각 항목은 성공한 한 번의 실행에서 수집했습니다.
- touch creates five-member fixture via real Next server action
- band code displayed
- reusable code invite generated
- leader settings fits 390px []
- /dashboard fits 320px []
- /schedule fits 320px []
- /schedule/recommendations fits 320px []
- /songs fits 320px []
- /songs/recommendations fits 320px []
- /plans fits 320px []
- /settings/band fits 320px []
- /settings fits 320px []
- /settings/profile fits 320px []
- /bands/test fits 320px []
- /dashboard fits 390px []
- /schedule fits 390px []
- /schedule/recommendations fits 390px []
- /songs fits 390px []
- /songs/recommendations fits 390px []
- /plans fits 390px []
- /settings/band fits 390px []
- /settings fits 390px []
- /settings/profile fits 390px []
- /bands/test fits 390px []
- /dashboard fits 430px []
- /schedule fits 430px []
- /schedule/recommendations fits 430px []
- /songs fits 430px []
- /songs/recommendations fits 430px []
- /plans fits 430px []
- /settings/band fits 430px []
- /settings fits 430px []
- /settings/profile fits 430px []
- /bands/test fits 430px []
- /dashboard fits 768px []
- /schedule fits 768px []
- /schedule/recommendations fits 768px []
- /songs fits 768px []
- /songs/recommendations fits 768px []
- /plans fits 768px []
- /settings/band fits 768px []
- /settings fits 768px []
- /settings/profile fits 768px []
- /bands/test fits 768px []
- /dashboard fits 844px []
- /schedule fits 844px []
- /schedule/recommendations fits 844px []
- /songs fits 844px []
- /songs/recommendations fits 844px []
- /plans fits 844px []
- /settings/band fits 844px []
- /settings fits 844px []
- /settings/profile fits 844px []
- /bands/test fits 844px []
- quick none clears and saves availability via touch
- calendar save persists after reload
- quick date and reason save
- date recommendation expansion touch completes
- ordinary candidate registration persists
- 120-character song title fits 320px []
- 120-character song title fits 390px []
- 120-character song title fits 430px []
- 120-character song title fits 768px []
- 120-character song title fits 844px []
- difficulty edit updates expected version
- negative vote and reason persist
- yes vote clears previous reason
- song detail fits 390px []
- detail returns to candidates by touch
- partial confirmation blocked until acknowledged
- confirmed plan 1 retained
- confirmed plan 2 retained
- confirmed plan 3 retained
- confirmed plan 4 retained
- confirmed plan 5 retained
- fifth plan disables sixth-plan form
- five confirmed plans fits 390px []
- explicit plan deletion frees a slot
- home displays all four remaining plans
- bottom navigation changes page and returns home
- invite prefills band code
- band login fits 320px []
- band login fits 390px []
- band login fits 430px []
- band login fits 844px []
- invalid shared password refused
- member selection exists: 테스트 베이스
- incorrect member PIN refused
- member login fits 320px []
- member login fits 390px []
- member login fits 430px []
- member login fits 844px []
- ordinary /dashboard fits 390px []
- ordinary /schedule fits 390px []
- ordinary /songs fits 390px []
- ordinary /plans fits 390px []
- ordinary /settings/band fits 390px []
- ordinary /settings/profile fits 390px []
- ordinary member has no plan deletion or confirmation controls
- ordinary member has no leader controls
- ordinary member submits own schedule
- ordinary member submits own vote
- invite prefills band code
- band login fits 320px []
- band login fits 390px []
- band login fits 430px []
- band login fits 844px []
- invalid shared password refused
- member selection exists: Mobile QA Leader
- incorrect member PIN refused
- member login fits 320px []
- member login fits 390px []
- member login fits 430px []
- member login fits 844px []
- former leader immediately loses management UI
- invite prefills band code
- band login fits 320px []
- band login fits 390px []
- band login fits 430px []
- band login fits 844px []
- invalid shared password refused
- member selection exists: 테스트 기타
- incorrect member PIN refused
- member login fits 320px []
- member login fits 390px []
- member login fits 430px []
- member login fits 844px []
- new leader manages without extra unlock
- handoff retains four plans and grants new leader controls
- new leader saves member skill
- leader rotates credentials and retains current session
- leader resets another member PIN
- profile nickname and personal PIN save
- invite prefills band code
- band login fits 320px []
- band login fits 390px []
- band login fits 430px []
- band login fits 844px []
- invalid shared password refused
- member selection exists: Mobile New Leader
- incorrect member PIN refused
- member login fits 320px []
- member login fits 390px []
- member login fits 430px []
- member login fits 844px []
- changed PIN authenticates after logout
- leader member removal persists
- leader changes part and invalidates current round
- new round starts with new participant roster
- new round and member edits preserve all confirmed snapshots
- new profile joins with next-round schedule guard
- late joiner cannot vote in frozen roster
- ordinary member leaves band and signs out
- normal band creation uses actual server action
- isolated QA account deletion request is recorded without deleting band data
- test fixture page cannot replace a real band
- no uncaught JavaScript exceptions: []
Additional build verification: both configured-local-Supabase and no-QA-environment builds passed (19 routes each). The final local build uses no QA URL. Final standalone typecheck and diff --check also passed.
