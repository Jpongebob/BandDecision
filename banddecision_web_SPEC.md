# BandDecision 웹서비스 — 최종 개발 명세서 v3.2 (Codex 구현 기준)

- 문서 상태: 구현 기준선 (Single Source of Truth)
- 작성 기준: 2026-11-04
- 제품: 밴드 합주 날짜·합주곡을 함께 결정하는 모바일 우선 반응형 웹
- 대상: 밴드장 + 유동 인원의 밴드 멤버
- 기술: Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, Supabase Auth/PostgreSQL/RLS/Realtime, Vercel
- **개발 범위:** Phase 0~7 전체. `CODEX_TASK.md`의 일괄 구현 요청과 함께 사용.
- **중요:** 기존 Java 콘솔 과제(6인조 고정)와 **별도 프로젝트**이다. React Native/Expo는 사용하지 않는다.

## 0. 구현 우선순위와 설계 원칙

1. 밴드마다 멤버 수 **N명은 유동적**이다. 같은 파트에 여러 명이 속해도 된다. `N=6` 등 하드코딩 금지. N=1도 허용한다.
2. 각 사용자가 본인 일정과 투표를 직접 입력한다. 다른 사람의 기록은 볼 수 있으나 수정할 수 없다.
3. 밴드장은 밴드·멤버·곡을 관리하고 **최종 합주 계획을 수동 확정**한다. 자동 확정 금지.
4. 합주 기획 회차(`planning_round`)의 참여자 명단은 생성 시 고정한다. 회차별 N명을 사용한다.
5. 날짜 추천은 참가자 전원 일정 제출 후 실행한다. 각자 **불가능한 날짜만** 등록한다.
6. 곡 추천은 참가자 전원 투표, 찬성 `ceil(2*N/3)` 이상, 필요한 파트 난이도 전부 등록 조건을 따른다.
7. 확정은 서버 트랜잭션에서 권한·최신 버전·현재 조건을 검사하고 스냅샷을 보존한다.
8. **보안은 UI 숨김으로 끝내지 않는다.** RLS, 서버 권한 검증, 원자적 쓰기로 뒷받침한다.
9. **반응형 웹**: 스마트폰 브라우저 최우선, PC 대응. 첫 출시 범위에서 네이티브 앱·PWA 푸시 제외.
10. 배포에 필요한 비밀값/계정/도메인이 없다면 예시 환경 변수, 마이그레이션, 검증 절차를 제공하고 가능한 범위까지 실제 코드와 테스트를 구현한다. 배포·실기기 검증을 수행하지 못했다면 완료라고 보고하지 않는다.

### 0.1 이번 문서가 이전 모바일 v2.0을 대체하는 항목

| 구분 | 최종 정책 |
|---|---|
| 플랫폼 | **Next.js 웹** (Expo 사용 안 함) |
| 인원 | 고정 6명 ❌ → **유동 N명** |
| 파트 | 사용자별 주 담당 파트 1개, **중복 파트 허용** |
| 날짜 입력 | 개인별 불가능 날짜만 등록 |
| 회차 | 시작일 포함 60일, 참여자 스냅샷 |
| 투표 | 회차 참여자 N명 전원 응답; 찬성 `ceil(2*N/3)` |
| 실력 | 밴드장이 개인별 별점 1~5 직접 수정 |
| 곡 난이도 | 회차 참여자들이 맡는 파트별 1~5, 동일 파트는 하나의 난이도 |
| 총 부담 | 각 참여 멤버마다 `max(0, 난이도 - 실력)` 합산 |
| 곡 점수 | `(찬성 인원 × 3) - (총 부담 × 2)` |
| 확정 | 밴드장만 가능, 서버 재검증, 최신 1건 스냅샷 |
| 저장 | Supabase 영구 저장; 밴드 간 데이터 완전 격리 |

## 1. 역할, 가입 및 밴드 정책

### 1.1 계정

- 기본 인증은 **밴드 코드(10자리) + 공용 비밀번호 → 내 프로필 선택 + 개인 PIN(숫자 6자리)**이다. 이메일 가입·인증 없이 밴드를 만들고 참여한다.
- 밴드 생성자는 밴드명·공용 비밀번호·닉네임·파트·개인 PIN·별도 관리자 PIN을 설정한다. 밴드 코드는 서버에서 생성한다.
- 공용 비밀번호 확인 전에는 멤버 목록을 공개하지 않는다. 확인 후 10분 동안 프로필 선택 또는 새 프로필 등록만 허용한다. 등록된 프로필로 진입하려면 그 멤버의 개인 PIN이 필요하다.
- Supabase Anonymous Sign-Ins는 기기 세션만 제공한다. 서버의 PIN 검증이 만든 기기→멤버 매핑을 RLS/RPC에서 확인하며, 검증되지 않은 익명 세션은 밴드 데이터 접근·기존 RPC를 통한 가입을 할 수 없다.
- 개인 세션은 최대 30일 유지한다. 로그아웃은 서버 매핑을 즉시 제거한다. 개인 PIN 변경은 해당 멤버의 다른 기기 매핑을 제거한다.
- 코드로 접속한 밴드장은 별도 관리자 PIN 검증 후 30분 동안 멤버 관리·초대·회차 생성·밴드 삭제·최종 확정을 할 수 있다. 개인 PIN과 관리자 PIN은 달라야 한다.
- 비밀번호·PIN은 private 스키마에 bcrypt 해시로만 저장한다. 비밀번호는 4~64자/UTF-8 72바이트 이하, PIN은 선행 0을 보존하는 문자열이다. PIN 실패는 대상 멤버별 15분간 10회, 관리자 PIN은 밴드별 10회, 공용 비밀번호는 기기별 30회/코드별 100회로 제한한다.
- 기존 이메일 계정과 데이터는 유지한다. /login/email로 기존 계정에 로그인하여 개인 PIN을 설정하고, 밴드장은 밴드 관리에서 코드 접속을 활성화한다. 기존 이메일 인증 경로는 이관/복구를 위해 유지한다.
- 기존 프로필의 ID와 회차 참여자/투표/일정/확정 스냅샷을 바꾸지 않는다. 다른 기기에서 PIN으로 로그인해도 같은 프로필에 연결한다. 관리자 PIN 분실 복구는 Supabase 프로젝트 관리자가 수행하며 공개 복구 우회 경로를 제공하지 않는다.
- Google/Apple/카카오 소셜 로그인은 첫 출시에서 제외.
- 비로그인 사용자는 랜딩, 인증, **공개 토큰의 유효성만 제한적으로 확인하는 초대 안내** 외에 어떤 밴드 데이터도 볼 수 없다.
- 서버의 `auth.uid()` 또는 검증된 로그인 세션을 기준으로 권한 판단. 클라이언트의 userId/role 값을 신뢰하지 않는다.
- 첫 버전 UI는 **사용자당 활성 밴드 1개**만 지원한다. DB는 밴드별 관계형 구조로 구성하여 향후 복수 밴드로 확장할 수 있다. 활성 밴드 가입 시 다른 활성 밴드 가입 요청은 거부하고 안내한다.

### 1.2 밴드 생성과 권한

- 회원이 `밴드명`, `닉네임`, `담당 파트`를 입력하여 밴드를 생성. 생성자는 자동으로 **밴드장(leader)**.
- 밴드 생성은 혼자서도 가능하며 멤버 최대 정원은 초기 버전에서 제품 정책상 제한 없음(서비스 보호용 적정 rate limit은 허용).
- 파트: 보컬·기타·베이스·드럼·건반·신디사이저 등 기본 옵션 + 직접 입력. Unicode 공백 트림, 길이 제한, 비교용 `part_key` 정규화. 서로 다른 사용자에게 같은 `part_key` 허용.
- 각 멤버는 활성 밴드 내 **주 담당 파트 하나**; 실력 `1..5`. 밴드장은 개인별 실력을 수정하고, 변경은 현재 회차 추천 계산에 즉시 반영되며 회차 version을 증가시킨다.
- 담당 파트를 변경하면 진행 중인 회차의 참여 스냅샷과 불일치할 수 있으므로 **현재 회차를 invalidated로 바꾸고 새 회차를 안내**한다. 기존 확정 계획은 유지.
- The band leader retains invite, member management, skill/part, round setup, and final confirmation rights. Every active band member may add candidate songs and create or edit per-part difficulty. Each member may change only their own availability and votes.
- 일반 멤버는 자신의 일정/투표/프로필만 수정. 다른 멤버의 일정·투표는 소속 밴드에서 조회 가능.
- 밴드장의 탈퇴/계정 삭제는 **다른 활성 멤버로 밴드장 이양 후**에만 허용(유일 멤버이면 밴드 삭제 절차). 서버에서 처리하고 무주공산 밴드를 만들지 않는다.

### 1.3 기존 이메일 계정용 초대

- 밴드장이 1회용 **공유 URL** `/join/[token]` 생성. 기본 만료 7일.
- 토큰은 암호학적으로 충분한 무작위 문자열; DB에는 해시만 저장. URL 원문 토큰을 로그에 남기지 않는다.
- 링크 접속 → 로그인/가입 → 밴드명 확인 → 파트 선택 → 가입 승인.
- 초대 유효성 검증과 가입은 서버 트랜잭션으로 처리한다. 동시 요청에도 같은 토큰으로 두 명 가입하면 안 된다.
- 만료·이미 사용됨·이미 가입됨·다른 활성 밴드 소속·정상 권한 없음을 각각 구분하여 안내. 안내 화면에서는 다른 멤버 목록 등 비공개 정보를 표시하지 않는다.
- 초대 URL 리디렉션은 로그인 이후에도 토큰이 보존되어 정상 가입이 이어져야 한다.

## 2. 합주 기획 회차(Planning Round)

### 2.1 생성 및 범위

- 밴드장이 새로운 회차를 생성하며, 그 시점 활성 멤버의 `member_id`, `user_id`, 닉네임, `part_key`, 파트 표시명을 참여자 목록으로 **스냅샷**한다.
- 회차 시작 날짜: 밴드의 현재 날짜(기본 `Asia/Seoul`). 종료 날짜: 시작일 **+59일**. 시작일 포함 정확히 60일.
- 회차 생성 시 기존 진행 중 회차는 `closed` 처리; **현재 유효 회차는 밴드당 하나**만 허용. 새 회차 시작 시 기존 제출/투표 기록은 과거 회차에 남고 새 회차 상태는 미제출/미응답에서 시작.
- 상태: `collecting`, `ready`(정보 표시용), `invalidated`, `closed`. UI 상태만으로 자격 판단하지 않고 조회/확정 시 실시간 검증.
- 멤버 가입은 현재 회차 참여자 명단을 자동 갱신하지 않는다. 신규 멤버는 다음 회차부터 참여.
- 현재 회차 참여자의 탈퇴/제외/파트 변경은 회차 `invalidated` 처리. 새 회차를 만들기 전 신규 추천/확정 불가. 기존 계획은 조회 가능.
- 시작일을 지난다고 60일 창이 앞으로 자동 이동하지 않는다. 이미 지난 날짜는 추천에서 제외. 전체 새 60일이 필요하면 새 회차를 만든다.
- 회차 정보가 수정되거나 추천에 영향을 주는 데이터 변경 시 `version` 정수를 증가시킨다. 모든 해당 쓰기는 **회차 행 잠금 → 수정 → 버전 증가** 절차를 따른다.

### 2.2 추천 가능 자격

- N = 현재 회차 참여자 수, 1 이상.
- 각 참여자가 이번 회차에 명시적으로 제출해야 한다. `pending`, `submitted`, `none` 상태를 구분한다.
- `none`은 **회차 범위 내 불가능 날짜 없음**을 명시적으로 제출한 상태다. 미래 다른 범위에 저장된 불가능 날짜와 모순되지 않는다.
- 모든 N명이 `submitted` 또는 `none`이면 날짜 추천을 활성화한다.
- 회차가 invalidated/closed이거나 시작일~종료일의 남은 날짜가 없다면 신규 추천/확정 불가.

## 3. 불가능 날짜 등록 및 추천

### 3.1 날짜 데이터와 입력 UI

- 기본 입력은 모바일 월간 달력에서 단일/다중/기간 선택. 선택된 각각의 날짜에는 **불참 사유(빈 문자열 불허)**.
- 빠른 입력(추가): `11.3`, `11.3, 11.7`, `11.29~12.2`, `12.29~1.2`, `2026-12-29~2027-01-02`. 공백 허용.
- 연도 생략 월일은 **입력 시점의 밴드 현지 날짜 이후 가장 먼저 오는 해당 월일**로 해석. 연도를 포함한 날짜는 입력한 연도 그대로 사용.
- 연도 생략 범위는 시작 월일을 먼저 다음 발생일로 해석한 뒤 종료일을 시작일 이상이 되는 가장 가까운 해당 월일로 계산한다. `11.29~12.2`는 월 경계, `12.29~1.2`는 연도 경계 처리. 같은 달 시작일보다 종료일이 작은 예(`11.29~11.3`)는 잘못된 역순으로 거절.
- 실존하지 않는 날짜·유효하지 않은 윤일(해당 해 기준)·형식 오류·지나친 범위 등은 상세 오류 안내와 함께 **전체 일괄 입력 저장 거부**.
- 중복 날짜는 제거. 일괄 입력은 최대 366일까지만 허용(부하 방지). 저장 전 실제 ISO 날짜 목록과 사유, 60일 추천 범위 밖 여부를 보여주고 확인 받는다.
- **오늘 이전 명시 날짜**는 신규 입력 거절. 연도를 생략한 과거 월일은 규칙에 따라 다음 해로 해석될 수 있음을 표시.
- 미래 날짜가 현재 회차 60일 밖이면 경고 후 **밴드/멤버별 미래 불가능 날짜**로 저장 가능. 현재 추천에는 반영하지 않고 이후 새 회차에서 날짜에 해당하면 읽는다.
- 현재 회차에서 `none`을 제출한 뒤 회차 범위 내 불가능 날짜를 추가하면 `submitted`로 전환; 반대로 모든 날짜를 제거하더라도 명시적으로 `none` 또는 제출 완료 확인을 받아야 한다.
- 같은 멤버가 같은 날짜를 재등록하면 무단 중복 대신 수정/덮어쓰기 여부를 확인한다.
- 본인만 등록·수정·삭제/일괄 교체 가능. 부분 오류나 취소 시 기존 데이터가 그대로 유지된다.

### 3.2 날짜 추천

1. 현재 회차의 `max(today, start_date)`부터 `end_date`까지 날짜 각각을 평가.
2. `round_participants` 목록과 `unavailable_dates`를 비교해 해당 날짜 불참자를 식별.
3. `attendance_count = N - absent_count`.
4. `attendance_count = 0`이면 제외.
5. **참석 가능 인원 내림차순**, 동률이면 **날짜 오름차순** 정렬.
6. TOP 5 우선 노출, 전체 결과는 10개씩 페이지 처리.
7. 각 날짜 상세: 참석 인원, 참석 멤버(닉네임/파트), 불참 멤버(닉네임/파트/사유).
8. 1명 이상만 참석하는 날짜도 추천 가능하지만, **N명 전원이 아닌 날짜**를 선택하면 불참자 및 누락되는 파트와 사유를 보여주고 밴드장 확인을 거친다.

날짜 추천은 조회 계산이며 저장된 원본 일정을 수정하지 않는다. 실시간 데이터 변경 시 결과를 새로 조회한다.

## 4. 후보곡·투표·곡 추천

### 4.1 후보곡

- Any active band member can register a candidate song title and artist. Song identifiers are generated by the database; song deletion and title/artist edits are out of scope for launch.
- Any active band member can create or edit a 1..5 difficulty for any band candidate song and part. The RPC requires the current difficulty version; stale concurrent edits are rejected. Store the actor, timestamp, and incremented version with each change.
- 같은 기타 파트 2명은 하나의 파트 난이도를 공유하지만, **연주 부담은 두 사람 별도로 계산**한다.
- 기존 밴드 곡은 새 회차에서도 다시 투표할 수 있다. **투표 데이터는 회차별로 분리**한다.
- Difficulty changes increment the active round version and recalculate later recommendations. They must not update a confirmed plan or its saved snapshots.
- Song and difficulty writes remain unavailable through direct table DML. Membership-scoped RLS and authenticated `SECURITY DEFINER` RPCs enforce the same-band rule. The difficulty RPC serializes writes and compares `expected_version` before updating.
- A confirmed rehearsal plan is immutable with respect to later difficulty changes; recommendation calculations use the latest difficulty values for the current round.

### 4.2 투표

- 회차 참여자가 자기 이름으로 각 후보곡에 `yes` 또는 `no` 투표. `no`에는 공백이 아닌 사유 필수.
- `pending`은 투표 행이 없는 상태. `no` → `yes` 변경 시 기존 반대 사유 삭제. 다른 사람의 표를 변경 불가.
- 같은 회차·곡·참여자에 최종 1표만 존재 (`unique`). 재투표는 갱신.
- 곡마다 N명 전원의 투표가 완료되었는지 판단. `yes`, `no`, `pending` 숫자와 반대 사유 조회 가능.
- 내 투표 변경은 회차 version을 증가시키고 추천 갱신. 후보곡 등록 시 기존 곡까지 전부 응답해야 하는 **전체 투표 완료** 조건은 없으며, **곡마다** 자격을 독립 판단한다.

### 4.3 곡 추천 자격과 점수

- **해당 곡에** 회차 참여자 N명 전원 투표 완료.
- 최소 찬성 `ceil(2*N/3)`. 예: N=1→1, 2→2, 3→2, 4→3, 5→4, 6→4, 7→5, 8→6, 10→7.
- 현재 참여자들의 `part_key`에 해당하는 난이도가 전부 1..5 등록되어야 한다.
- 각 참여자 `burden_i = max(0, difficulty(part_i) - current_skill(member_i))`.
- `total_burden = Σ burden_i`.
- **`score = (yes_count * 3) - (total_burden * 2)`**.
- 점수가 음수여도 자격 충족이면 추천됨.
- 정렬: `score DESC` → `yes_count DESC` → `total_burden ASC` → `song.id ASC`.
- 결과: 추천 순위·찬성 수·총 부담·점수 및 미추천/미응답 사유. 선택은 추천 자격이 있는 곡 1개 이상, 중복 없음.
- 멤버 실력은 **현재 밴드 멤버 레코드**를 읽어 계산한다. 파트는 회차 참여자의 `part_key` 스냅샷 기준이며 파트가 바뀌면 회차 invalidated.

## 5. 합주 계획 확정

### 5.1 UX

- **밴드장만** 확정 메뉴/실행 가능. 일반 멤버에게 확정된 계획 조회만 제공.
- 날짜 추천에서 날짜 1개 선택 → 일부 불참 경고 확인 → 자격 있는 추천곡 1개 이상 선택 → 확인 화면 → 최종 확정.
- 합주 시간은 MVP에서 **20:00~22:00 고정**(밴드 기본 시간대 기준). 자유 시간 설정은 제외.
- 확인 화면은 날짜/요일, 시간, 회차 참여 N명, 참석자, 불참자/사유, 선택한 곡, `round.version`을 포함.
- 최종 확인 단계에서 현재 상태가 바뀌었으면 **자동 확정 금지**, 최신 정보 재조회 후 재확인.
- 성공 시 밴드별 최신 확정 계획 **1건** 유지. 새 확정 실패·취소 시 이전 확정 계획 불변.

### 5.2 서버 트랜잭션(필수)

- `confirm_rehearsal_plan`과 같이 **권한·데이터·버전 검사 및 쓰기가 원자적으로 실행되는 서버 DB 함수/RPC**를 구현한다.
- 인증된 호출자가 해당 밴드의 현재 leader인지 검사한다. 클라이언트가 보낸 band_id, round_id, date, song_ids는 검증 없이 신뢰하지 않는다.
- 현재 회차에 행 잠금을 획득하고 `expected_version`과 일치하는지 검사한다.
- 같은 회차에 영향을 주는 **모든 쓰기**도 동일 회차 행 잠금을 얻고 version을 증가시켜 TOCTOU 경쟁 상태를 방지한다. 클라이언트가 DB 테이블 직접 UPDATE로 이 버전 규칙을 우회하지 못하도록 DB 함수 또는 동등한 제약/트리거를 적용한다.
- 회차 상태/참여자 N·현재 자격/전원 일정 제출/날짜 60일 범위 및 지난 날짜 제외/참석자 1명 이상/곡별 전원 투표·찬성 2/3·난이도 완비/선택 ID 중복 없음을 최신 데이터로 재검증한다.
- 유효한 경우 참석·불참·사유·닉네임·파트와 곡 ID·제목·아티스트를 **독립 스냅샷**으로 저장한다. 실력·난이도·표가 바뀌어도 저장 정보는 변하지 않는다.
- 기존 계획과 자식 스냅샷을 새 계획으로 교체하는 작업은 **한 트랜잭션**에서 수행. 실패 시 기존 계획 보존.
- 스냅샷은 조회용이며 원본 테이블 객체/참조에 의존하지 않는다. 계정 삭제에 따른 개인정보 삭제/가림 정책은 별도 적용.

## 6. 화면·라우트·반응형 UI

| 경로 | 페이지 | 모바일 주요 동작 |
|---|---|---|
| `/` | 랜딩 | 서비스 소개, 시작 버튼 |
| `/login`, `/signup`, `/reset-password` | 인증 | 이메일 인증/재설정 |
| `/bands/create` | 밴드 생성 | 밴드명·파트 선택 |
| `/join/[token]` | 초대 | 유효한 토큰 안내·로그인·파트 선택 |
| `/dashboard` | 홈 | 내 밴드, 현재 N명, 제출 현황, 확정 계획 |
| `/schedule` | 일정 | 달력, 불가능 날짜/사유 등록·수정·제출 |
| `/schedule/recommendations` | 날짜 추천 | TOP 5, 전체 페이지, 상세 |
| `/songs` | Candidate songs | Register by any band member, list, vote status, part difficulty create/edit |
| `/songs/[id]` | 곡 상세 | 난이도·내 투표·반대 사유 |
| `/songs/recommendations` | 곡 추천 | 자격·부담·점수·랭킹 |
| `/plans` | 합주 확정·조회 | 밴드장 확정, 멤버 조회 |
| `/settings/band` | 밴드 관리 | 멤버/초대/실력/회차 |
| `/settings/profile` | 내 정보 | 닉네임, 로그아웃, 계정 삭제 |

- 모바일 우선(대략 360px부터), 터치 영역 충분히, 하단 내비게이션 `홈|일정|합주곡|합주 계획|더보기`. PC에서는 좌측 사이드바와 2열 레이아웃.
- 달력에는 `내가 불가능`, `다른 멤버 불가능`, `전원 가능`, `선택`, `확정` 상태를 아이콘/문구+색상으로 구분(색상만 의존 금지).
- 모든 주요 화면은 로딩/빈 상태/권한 없음/네트워크 실패/저장 중 중복 클릭 방지/성공 피드백을 포함한다.
- 접근성: 입력 레이블, 키보드 조작, 오류 메시지 연결, 명확한 버튼 명칭, 명도 대비.
- 밴드별 상태·추천 데이터는 새로고침과 기기 간 로그인 후에도 동일. Supabase Realtime 이벤트 후 관련 쿼리를 무효화/재조회하고, 탭 복귀에도 재검증.
- 사용자별 데이터의 Next.js 서버 캐시 공유 금지. SSR 인증/세션은 공식 Supabase SSR 패턴을 사용한다.

## 7. PostgreSQL 상세 데이터 설계 기준

SQL 마이그레이션은 `supabase/migrations/`에 작성한다. 아래는 최소 필드 계약이고, 구현 필요에 따른 PK/FK/index/timestamp/check/constraint는 명확하게 추가한다.

| 테이블 | 핵심 필드 및 의미 |
|---|---|
| `profiles` | `id uuid PK references auth.users`, `nickname text not null`, timestamps |
| `bands` | `id uuid PK`, `name`, `leader_user_id uuid`, `timezone text default 'Asia/Seoul'`, timestamps |
| `band_members` | `id uuid PK`, `band_id uuid FK`, `user_id uuid FK`, `part_key`, `part_label`, `skill smallint check 1..5`, `role leader/member`, `status active/left`, timestamps |
| `band_invites` | `id uuid PK`, `band_id`, `token_hash unique`, `created_by`, `expires_at`, `used_at nullable`, `used_by nullable` |
| `planning_rounds` | `id uuid PK`, `band_id`, `start_date date`, `end_date date`, `status`, `version bigint default 0`, `created_by`, timestamps |
| `round_participants` | `round_id`, `member_id`, `user_id_snapshot`, `nickname_snapshot`, `part_key_snapshot`, `part_label_snapshot`; unique(round_id,member_id) |
| `round_submissions` | `round_id`, `member_id`, `status pending/submitted/none`, `submitted_at`; unique(round_id,member_id) |
| `unavailable_dates` | `band_id`, `member_id`, `unavailable_date date`, `reason text not null`; unique(band_id,member_id,unavailable_date) |
| `songs` | `id bigint generated identity PK`, `band_id`, `title`, `artist`, `created_by`, timestamps |
| `song_difficulties` | `song_id`, `part_key`, `difficulty smallint check 1..5`, `version integer`, `updated_by uuid`, `updated_at timestamptz`; unique(song_id,part_key) |
| `song_votes` | `round_id`, `song_id`, `member_id`, `choice yes/no`, `reason nullable`, timestamps; unique(round_id,song_id,member_id) |
| `confirmed_plans` | `id uuid PK`, `band_id unique`, `round_id`, `rehearsal_date`, `start_time default '20:00'`, `end_time default '22:00'`, `confirmed_by`, `confirmed_at` |
| `confirmed_plan_members` | `plan_id`, `member_id nullable`, `nickname_snapshot`, `part_snapshot`, `attending bool`, `reason_snapshot nullable`; unique(plan_id, member ordinal or stable snapshot key) |
| `confirmed_plan_songs` | `plan_id`, `song_id nullable`, `title_snapshot`, `artist_snapshot`, `display_order`; unique(plan_id,display_order) |

### 7.1 구조 규칙

- 중복 파트 **허용**, 동일 활성 밴드의 중복 사용자 **금지**. `band_members`는 상태를 고려한 partial unique 인덱스 등의 정책을 선택해 재가입을 처리.
- 첫 버전 사용자당 활성 밴드 한 개 정책도 서버에서 강제(활성 멤버십 unique on user_id 등).
- 한 밴드에 리더는 항상 정확히 한 명(이양/삭제 포함)이며, 서버에서 검사. 같은 밴드의 `bands.leader_user_id`와 `band_members.role`이 불일치하지 않도록 트랜잭션.
- 밴드당 동시 유효 회차 하나. `closed`/`invalidated`는 이력 조회할 수 있으나 추천 불가.
- 반드시 **교차 밴드 참조 방지**: song/vote/round/member 데이터의 band_id가 함께 일치하는지 서버 함수 또는 composite FK로 검사.
- 투표 choice `no`면 trim(reason) 길이≥1, `yes`면 reason null. 불참 사유도 공백 금지. SQL CHECK와 서버 검증 병행.
- 초대 토큰 원문/비밀번호/관리자 키는 데이터베이스와 로그에 저장하지 않는다(해시만 저장).
- 회차 확정 후에도 투표·날짜 변경 가능하지만 확정 계획 자체는 스냅샷으로 유지. 신규 확정은 해당 회차의 최신 버전으로 재확인.
- 인덱스: 소속 밴드 조회, 회차 참여자/제출/투표 조회, 날짜 범위, 곡별 집계에 필요한 복합 인덱스 구성.
- 시드/테스트 계정 데이터는 실제 사용자 데이터와 명확히 분리.

### 7.2 권한/RLS 계약

**모든 public 테이블에 RLS 활성화.** 최소 권한:

| 데이터/행위 | 비로그인 | 일반 멤버 | 밴드장 |
|---|---|---|---|
| 랜딩·인증 | 허용 | 허용 | 허용 |
| 다른 밴드 데이터 | 거부 | 거부 | 거부 |
| 자기 프로필 조회·수정 | 거부 | 허용 | 허용 |
| 소속 밴드 멤버/일정/투표/곡 조회 | 거부 | 허용 | 허용 |
| 자기 일정 및 투표 수정 | 거부 | 허용 | 허용 |
| Band settings, member/skill management, invitations, and round setup | Deny | Deny | Allow |
| Candidate song create and part difficulty create/edit | Deny | Allow for own band | Allow for own band |
| 계획 확정 | 거부 | 거부 | 서버 함수로 허용 |

- 단순 RLS SELECT/UPDATE로 보장하기 어려운 행위(초대 수락, 현재 회차 수정, 투표/일정 원자적 교체, 밴드장 이양, 계획 확정)는 **인증된 RPC 또는 검증된 서버 액션**에서 처리한다.
- `SECURITY DEFINER` SQL 함수를 쓸 경우 `search_path` 명시, `auth.uid()` 검사, 함수 실행 권한 제한, public 노출·우회 방지.
- UI가 감춘 버튼을 API/HTTP로 직접 호출해도 권한 없는 작업은 실패해야 한다.
- Supabase `service_role`(또는 secret key)는 **절대** `NEXT_PUBLIC_`에 넣지 않고, 엄격히 제한된 서버 전용 계정 삭제/관리 용도로만 사용. 일반 요청은 사용자 세션 및 RLS 기반.

## 8. 원자적 서버 작업 계약

아래 이름은 권장안이며, 최종 구현은 명확히 문서화한다.

| 작업 | 입력 | 서버 확인/동작 | 반환 |
|---|---|---|---|
| `create_band` | name, part, nickname | 인증, 한 활성 밴드 정책, leader 멤버 동시 생성 | band_id |
| `create_invite` | band_id | leader, 안전한 토큰 생성/해시, 7일 만료 | 단 한 번 반환되는 URL |
| `redeem_invite` | token, part | 유효성, 활성 밴드 정책, 원자적 1회 소비 | membership |
| `start_round` | band_id | leader, 이전 회차 close, 활성 명단 스냅샷, 60일 | round_id/version |
| `save_unavailability` | round_id, dates/reasons, submission state | 본인 확인, 입력 전체 검증, 원자적 upsert/delete, 회차 잠금+version | 저장 결과/version |
| `cast_vote` | round_id, song_id, choice, reason | 본인 회차 참여, 곡 소속 확인, 투표 upsert, version 증가 | 집계/version |
| `update_member_skill` | member_id, skill | leader, 밴드 일치, 관련 회차 version 증가 | 갱신 결과 |
| `update_song_difficulty` | song_id, part, difficulty | leader, 밴드/파트 확인, 관련 회차 version 증가 | 갱신 결과 |
| `confirm_rehearsal_plan` | round_id, date, unique song_ids, expected_version | leader, 회차 잠금, 최신 자격/추천 재검증, 스냅샷 교체 | 확정 계획/충돌 오류 |

- 직접 SQL 쓰기와 서비스 함수가 혼재해 최신 버전 정책을 우회하는 설계는 금지.
- 외부 동작이 없거나 실패하면 성공으로 표시하지 않는다.
- 클라이언트가 네트워크 재시도할 때 이중 요청·중복 저장 방지(유니크 제약, idempotency 또는 안전한 upsert).

## 9. 프론트엔드 코드 구조

```text
banddecision-web/
├── app/
│   ├── (public)/page.tsx
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── (auth)/reset-password/page.tsx
│   ├── (protected)/dashboard/page.tsx
│   ├── (protected)/schedule/page.tsx
│   ├── (protected)/schedule/recommendations/page.tsx
│   ├── (protected)/songs/page.tsx
│   ├── (protected)/songs/[id]/page.tsx
│   ├── (protected)/songs/recommendations/page.tsx
│   ├── (protected)/plans/page.tsx
│   ├── (protected)/settings/band/page.tsx
│   ├── (protected)/settings/profile/page.tsx
│   ├── bands/create/page.tsx
│   ├── join/[token]/page.tsx
│   └── auth/callback/route.ts
├── components/{ui,layout,calendar,members,songs,plans}/
├── features/{auth,bands,members,rounds,availability,songs,votes,plans}/
├── lib/supabase/{client,server}.ts
├── lib/dates/
├── services/{date-parser,date-recommender,song-recommender}.ts
├── supabase/migrations/
├── tests/
├── .env.example
├── SPEC.md
├── AGENTS.md
├── CODEX_TASK.md
├── PROGRESS.md
└── package.json
```

- 이 트리는 목표 예시다. 최신 Next.js/라이브러리 설치 규칙과 실제 구현 편의를 위해 정당한 범위에서 구조 조정 가능; 변경 내용은 `PROGRESS.md`에 기록.
- 데이터 조회는 서버 컴포넌트·서버 액션·클라이언트 상태의 책임을 분리. 순수 추천 계산 함수를 별도 테스트 가능 모듈로 작성.
- 사용 라이브러리는 필요 최소한으로 하고 실제 설치 가능한 호환 버전을 선택. 임의 가짜 import/미구현 함수/컴파일만 통과하기 위한 stub을 완료로 인정하지 않는다.

## 10. 입력·예외·보안·운영

- 표준 오류 코드/메시지: `UNAUTHENTICATED`, `FORBIDDEN`, `INVALID_INPUT`, `INVITE_EXPIRED`, `INVITE_USED`, `ALREADY_MEMBER`, `ROUND_INVALID`, `ROUND_STALE`, `SUBMISSIONS_PENDING`, `DATE_OUT_OF_RANGE`, `SONG_NOT_ELIGIBLE`, `NETWORK_ERROR`.
- 로딩 상태·빈 상태·서버 오류·제출 실패·중복 클릭/동시성 충돌 처리.
- 타입 안전한 폼 검증(예: Zod) 및 SQL constraint를 함께 적용. 입력 길이 제한, rate limiting(최소 로그인/초대 발급·수락), 비밀값 및 PII 로그 마스킹.
- 계정 삭제는 본인 인증 세션에서 시작할 수 있도록 UI 제공. 밴드장 우선 이양/밴드 정리 후 개인정보 삭제. 저장된 확정 계획의 닉네임 스냅샷 등 개인정보는 삭제 또는 익명 처리 정책을 명시하고 실행.
- Supabase 인증용 URL/도메인 allowlist 및 재설정 이메일 링크 동작 검증.
- Vercel Preview/Production 환경변수 분리. `.env.local` 및 비밀키는 `.gitignore`로 커밋 금지.
- 필수 문서: 설치/실행 README, `.env.example`, DB migration 적용 방법, 테스트 명령, Vercel 배포 안내, Supabase 설정 안내, 현재 제한사항.

## 11. 단계별 전체 구현 범위 (한 번에 진행할 작업)

> Codex에게 **Phase 0~7 전체를 동일 작업 요청으로 지시**하되, 구현 내부에서는 각 Phase를 순서대로 완료/검증한다. `CODEX_TASK.md`에 전체 지시가 있다.

| Phase | 구현 | 해당 단계 완료 조건 |
|---|---|---|
| 0 | DB 모델·SQL migrations·RLS·서버 함수 설계 | SQL 문법/관계/권한 검토, 마이그레이션 파일 존재 |
| 1 | Next.js 초기화·UI·Supabase SSR 인증·프로필 | 빌드, 로그인 흐름 및 인증 리다이렉트 작동 |
| 2 | 밴드 생성·초대·가입·멤버·실력 | 같은 파트 중복 가입, 다른 밴드 접근 차단 |
| 3 | 회차 생성·일정 제출·불가능 날짜 관리 | 미제출/none 구분, 입력 예외/원자성 검증 |
| 4 | 날짜 추천 TOP 5·전체 보기 | N명 기준 정렬·경계 날짜 테스트 |
| 5 | 후보곡·난이도·투표·곡 추천 | N명 전원투표·2/3·점수·동률 테스트 |
| 6 | 확정·조회·스냅샷·서버 재검증·Realtime | stale version 차단, 기존 계획 유지 |
| 7 | 통합 테스트·반응형·접근성·보안·배포 문서 | `lint`, `typecheck`, `test`, `build` 결과 기록 |

외부 계정·비밀키가 없어 실서비스 연결이 불가능한 단계는 **구현 코드와 환경설정 안내를 완료하되 통합/배포 검증은 BLOCKED라고 기록**한다. 확인하지 않은 사실을 테스트 통과라고 말하지 않는다.

## 12. 인수 테스트(최소 기준 50개)

| ID | 시나리오 | 기대 결과 |
|---|---|---|
| AC01 | 새 계정 가입/로그인 | 인증 가능 |
| AC02 | 미로그인으로 보호 경로 접근 | 로그인으로 리다이렉트 |
| AC03 | 비밀번호 재설정 | 허용된 리디렉션과 정상 재설정 |
| AC04 | 혼자 밴드 생성 | N=1, 생성자 leader |
| AC05 | 동일 사용자 다른 활성 밴드 추가 가입 | 정책에 따라 차단 |
| AC06 | 정상 초대 URL로 가입 | 활성 밴드 멤버 추가 |
| AC07 | 만료된 초대 URL | 거절 |
| AC08 | 이미 사용한 초대 URL | 거절 |
| AC09 | 초대 토큰 동시 사용 | 최대 한 번만 성공 |
| AC10 | 기타 파트 2명 가입 | 허용 |
| AC11 | 일반 멤버가 리더 기능 호출 | 서버에서 거절 |
| AC12 | 타 밴드 데이터 직접 쿼리 | RLS로 차단 |
| AC13 | 타인 일정 등록 시도 | 거절 |
| AC14 | 타인 투표 수정 시도 | 거절 |
| AC15 | 회차 생성 | N명 스냅샷, 정확히 60일 |
| AC16 | 회차 중 신규 가입 | N 유지, 다음 회차부터 참가 |
| AC17 | 회차 중 참여자 탈퇴 | 회차 invalidated·확정 차단 |
| AC18 | `11.29~12.2` | 날짜 4개 변환 |
| AC19 | `12.29~1.2` | 연도 경계 5개 날짜 |
| AC20 | `11.3, 11.7` | 날짜 2개 |
| AC21 | `11.31` | 오류, 기존 데이터 유지 |
| AC22 | 역순 범위 | 거절 |
| AC23 | 중복 입력 | 중복 제거 |
| AC24 | 날짜 범위 밖 미래 입력 | 변환 결과/경고, 현 회차 추천 제외 |
| AC25 | 불참 사유 공백 | 거절 |
| AC26 | 정상 다중 날짜 입력 후 조회 | 날짜·사유 일치 |
| AC27 | 입력 취소 또는 일부 오류 | 기존 저장 유지 |
| AC28 | `none` 제출 | 명시적 제출로 처리 |
| AC29 | N명 중 한 명 미제출 | 날짜 추천 불가 |
| AC30 | N명 전원 제출 | 날짜 추천 가능 |
| AC31 | N=5, 불참 2명 | 참석 3명 |
| AC32 | 참석 0명 날짜 | 추천 제외 |
| AC33 | 같은 참석 인원 | 빠른 날짜 우선 |
| AC34 | 날짜 추천 6개 이상 | TOP 5와 전체 페이지 |
| AC35 | 전원 미참석 아니지만 부분 참석 | 불참자/사유 경고 |
| AC36 | 후보곡 등록 | 정상 저장·조회 |
| AC37 | 파트 난이도 누락 | 해당 곡 추천 불가 |
| AC38 | 다른 실력의 기타 2명 | 부담 각자 계산 |
| AC39 | 반대 사유 없이 반대 | 거절 |
| AC40 | 반대→찬성 변경 | 반대 사유 삭제 |
| AC41 | N=5, 4명 찬성·전원 투표 | 추천 가능 |
| AC42 | N=5, 3명 찬성·전원 투표 | 추천 불가 |
| AC43 | N=5, 4명 찬성·1명 미응답 | 추천 보류 |
| AC44 | 찬성 5명·총 부담 3 | 점수 9 |
| AC45 | 추천 동률 | 찬성/부담/곡ID 순 |
| AC46 | 일반 멤버 확정 요청 | 거절 |
| AC47 | 확정 시 expected_version 불일치 | 확정 거절·최신 정보 요구 |
| AC48 | 확정 시 곡 자격 변경 | 확정 거절·기존 계획 유지 |
| AC49 | 정상 확정 후 원본 일정/투표 수정 | 스냅샷 불변 |
| AC50 | 정상 재확정 | 최신 계획 1건으로 교체 |
| AC51 | 실패한 재확정 | 기존 계획 보존 |
| AC52 | 모바일 폭과 데스크톱 폭 | 주요 페이지 레이아웃 정상 |
| AC53 | 새로고침/재로그인 | Supabase 데이터 유지 |
| AC54 | 다른 멤버의 변경 | 실시간 이벤트 후 화면 재조회 |
| AC55 | 개인정보/계정 삭제 | 서버의 정해진 정책에 따라 제거 또는 익명화 |
| AC56 | 서비스 role 키 번들 검색 | 클라이언트에 노출 없음 |
| AC57 | Ordinary member adds a candidate song | Saved in the member's band; cross-band request denied |
| AC58 | Ordinary member creates or edits difficulty on another member's song | Actor, timestamp, and incremented version stored |
| AC59 | Two members submit the same old difficulty version | Stale write rejected; confirmed plan snapshot unchanged |
| AC60 | Member opens another band candidate or attempts leader-only action | Cross-band denied; member management/final confirmation stay leader-only |

**테스트 전제:** 실제 시간을 고정할 수 있도록 날짜 변환/추천 계산에 `today`(기준 날짜)를 주입. 자동 테스트는 Vitest 등 선택한 러너로 구현하고, 중요 API/RLS 검증은 별도 DB 통합 테스트를 제공한다. 통합 DB가 없을 땐 실행하지 못한 테스트를 건너뛰었다고 명확히 보고한다.

## 13. 범위 밖

- React Native/Expo, App Store/Google Play 앱 등록, 채팅, 합주실 예약, 비용 정산, 음원 업로드·스트리밍, AI 난이도 분석, 실력 상호평가, 공연 일정, 푸시 알림, 다중 밴드 전환 UI, 확정 계획 이력 목록, 자유로운 합주 시간 설정.
- 범위 밖 기능을 임의로 추가해 핵심 기능 완성을 늦추지 않는다.

## 14. 구현 완료의 정의

- 필수 화면과 사용자 흐름이 코드로 연결되어 있고, DB 마이그레이션·RLS·서버 함수가 구현되어 있다.
- `lint`, TypeScript typecheck, unit test, Next.js build 중 실행 가능한 항목을 실제 실행해 결과 기록.
- AC01~AC60 각각 `PASS`/`FAIL`/`BLOCKED`로 분류한 검증표 작성; 코드를 작성한 것과 실제 검증한 것을 구분.
- 계정/환경 변수 없이 검증이 불가능한 부분은 실행 설명 및 Blocker를 남긴다. 웹서비스 배포를 임의로 성공했다고 주장하지 않는다.
- `PROGRESS.md`, `README.md`, `DEPLOYMENT.md`, `.env.example` 업데이트.

## 15. Codex 지시 우선순위

1. 이 `SPEC.md`의 요구사항/보안/알고리즘/완료 기준.
2. `AGENTS.md`의 구현 규칙.
3. `CODEX_TASK.md`의 수행 순서와 보고 방식.
4. 일반적인 프레임워크 권장 패턴.

서로 충돌하면 보안·데이터 일관성과 이 명세서의 사용자 기능 정책을 우선한다. 사소한 미정 사항은 합리적으로 결정해 `PROGRESS.md`에 이유를 기록하고 구현을 계속한다. 민감하거나 파괴적인 외부 작업(실서비스 DB 변경·실제 배포·유료 리소스 생성·실계정 삭제)은 사용자 승인과 권한이 필요하다.

## 16. v3.2 인증 정책 우선 적용 및 인수 기준

이번 절과 1.1의 코드/PIN 정책은 기존 이메일 중심 온보딩 설명을 대체한다. 기존 이메일 경로와 일회용 초대는 이관을 위해 유지한다. 권한 판정은 private.actor_id()로 PIN 검증된 원래 멤버 ID 또는 기존 이메일 계정 ID를 해석한다. 기기 세션의 raw auth.uid()나 클라이언트가 보낸 role/user_id를 멤버 ID로 신뢰하지 않는다.

- 코드/공용 비밀번호 실패 시 멤버 목록이나 밴드 데이터가 노출되지 않는다.
- 공용 비밀번호만 아는 사용자는 기존 멤버의 일정/투표를 변경할 수 없다.
- 내 PIN으로 로그인하면 다른 기기에서도 같은 멤버/회차 참여자 ID를 사용한다.
- 일반 멤버는 관리자 PIN을 알고 있어도 관리자 권한을 얻지 못한다.
- 코드로 로그인한 밴드장도 관리자 PIN 검증 전에는 관리/최종 확정이 차단된다.
- 로그아웃·PIN 변경·공용 비밀번호 변경 후 폐기된 매핑은 즉시 접근이 차단된다.
- 신규 멤버는 기존 회차 명단에 자동 추가되지 않고 다음 회차부터 참여한다.
- 기존 이메일 계정의 PIN 설정과 코드 접속 전환은 기존 데이터와 확정 계획을 보존한다.
- 실행 결과는 PROGRESS.md에 기록한다. SQL 테스트 파일 작성만으로 RLS 통합 검증을 PASS 처리하지 않는다.

## v3.2 코드 방식 초대 연결 보완

코드 접속이 활성화된 밴드의 기본 초대 링크는 /login?code=밴드코드이며, 공용 비밀번호·개인 PIN·관리자 PIN을 URL에 포함하지 않는다. 접속자는 공용 비밀번호 확인 후 기존 프로필+PIN 또는 신규 닉네임·파트·PIN으로 참여한다. 링크는 여러 멤버가 재사용할 수 있고, 일회용 토큰이나 7일 만료를 약속하지 않는다. 링크 생성 UI/서버는 현재 밴드의 관리자 권한을 해제한 밴드장만 허용한다. 기존 /join/토큰 링크는 이전 이메일 초대이며 기본 화면에서 코드 접속을 안내하고 이메일 참여는 접힌 선택지로 유지한다. 코드 접속이 없는 밴드의 기존 이메일 초대는 서버의 1회 사용·7일 만료 정책을 유지한다.

## 로그인 후 홈 및 실력 표시 보완

로그인된 사용자는 기본 주소와 일반 로그인 주소에서 대시보드로 이동한다. 조회 오류는 미가입으로 간주하지 않고 오류/재시도를 표시한다. 가입 당시 실력 기본값은 3/5이며 UI에 안내한다. 밴드장은 관리자 인증 후 자기 자신을 포함한 모든 멤버의 실력을 직접 설정할 수 있다. 일반 멤버의 실력 수정 권한과 기존 점수 공식은 변경하지 않는다.

## 메뉴 전환 성능과 인증 캐시

동일 서버 렌더 요청에서만 인증·밴드 중복 조회를 공유한다. 사용자별 데이터를 서버 전역 캐시에 공유하지 않는다. 독립 조회를 병렬 실행하고 보호 화면에 로딩 경계를 제공한다. 실시간 다중 행 변경은 짧은 고정 시간 창으로 새로고침을 묶고, 탭 복귀 시 재조회한다. 저장·최종 확정의 서버 권한/최신 버전 검사와 RLS는 유지한다. 실제 운영 지연 시간은 별도 측정 후 보고한다.


## v3.3 밴드장 양도 및 일정·화면 이동 보완
- 관리자 권한을 해제한 현재 밴드장만 같은 밴드의 활성 일반 멤버에게 권한을 양도한다. 대상과 양도 결과를 표시하고 명시적 확인을 받는다.
- 코드 접속 밴드는 대상 개인 PIN 설정이 필요하다. 양도 시 대상 개인 PIN과 다른 새 6자리 관리자 PIN을 설정하고 모든 관리자 잠금을 해제 상태에서 잠금 상태로 되돌린다. 새 밴드장은 전달받은 관리자 PIN으로 관리 기능을 연다. 기존 밴드장은 일반 멤버가 된다.
- 소유자/역할 변경은 한 트랜잭션으로 처리한다. 멤버 관리·최종 확정은 양도와 같은 밴드 잠금 아래 권한을 재검증한다. 공용 비밀번호·개인 로그인·확정 계획 스냅샷을 보존한다. 코드 미사용 이메일 밴드는 관리자 PIN 입력 없이 양도 가능하다.
- 빠른 날짜·일반 날짜는 같은 원자적 저장 함수를 사용한다. 동일 날짜·사유는 중복 제거하고 충돌 사유/잘못된 날짜는 전체 요청을 거절한다. PL/pgSQL 변수와 SQL 별칭을 구분한다.
- 내부 화면에서 홈과 상위 화면으로 복귀 가능해야 한다. 인증 조회 대기와 화면 데이터 대기 모두 로딩 경계를 제공한다. 멤버 조회 공유는 서버 요청 안으로 한정한다.
