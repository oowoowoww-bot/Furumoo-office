# 푸루무스스튜디오 오피스맵 (무무무빌딩)

푸루무스튜디오의 오피스맵입니다. 비밀번호로 잠겨 있어, 비밀번호를 아는 사람만 열 수 있습니다.

## 파일

| 파일 | 내용 |
| --- | --- |
| `index.html` | 잠금 페이지. 안에 화면(app.html)이 암호화되어 들어 있어요. |
| `data.enc` | 할 일·발주·방별 현황·섹션·공통 원본 데이터. 같은 비밀번호로 암호화돼요. |
| `worker.js` | Cloudflare Worker 중계서버 (노션 ↔ 사이트). 아래 "중계서버" 참고 |
| `tools/lock.mjs` | 잠그는 도구 (Node 18 이상). |
| `tools/lock-template.html` | 잠금 페이지 틀. |

**원본(`app.html`, `data.json`)은 절대 커밋하지 마세요.** 공개 저장소라 누구나 볼 수 있어요. `.gitignore`에 넣어 두었어요.

## 데이터 구조 (2026-11-28 v2 — 노션 한곳 통합)

```
{
  "version": 2,
  "updatedAt": "2026-11-28T10:30:00+09:00",
  "tasks":    { "<방id>": [ { id, text, due, owner, done, nstatus, memo } ] },     ← 노션 "푸루무 할 일"
  "orders":   [ { id, product, factory, qty, price, stage, due, memo, done } ],    ← 노션 "푸루무 제작 발주"
  "shared":   { "projects": {...}, "metrics": {...}, "owner": {...} },             ← 공통 원본 (한 번만 저장)
  "rooms":    { "<방id>": { tag, status, kpis, boxes, report, updatedAt } },        ← 방별 현황
  "sections": { store, logi, emoshop, insta, marketing, expenditure, library }      ← 표·그래프·달력·세금계산서·레시피
}
```

### 중복을 두지 않는 규칙 (중요)

같은 숫자를 방마다 복사하지 않습니다. 값은 **한 곳에만** 저장하고, 글 안에서는 참조로 불러 써요.

| 표기 | 원본 |
| --- | --- |
| `{{p:calendar-2027.preorder}}` | `shared.projects` (프로젝트 수치 — 예약건수·마감일·입고일·배송지 변경 등) |
| `{{o:2027 탁상 캘린더.qty}}` | 노션 **푸루무 제작 발주** DB (수량·공장·진행 메모·입고 예정일) |
| `{{i:성원애드피아.amount}}` | `sections.expenditure.invoices` (세금계산서) |
| `{{m:unanswered}}` | `shared.metrics` (미답변·CS 고객 수) |

- `|md` → `11/30`, `|date` → `2026-11-30` 처럼 날짜 모양을 바꿔요. 마케팅 달력 일정은 `dateRef` 로 날짜를 참조합니다.
- **원본 소유**: 발주 = 제작·발주실(발주 DB) · 세금계산서 = 세무팀 · CS = CS팀 · 레시피 = 4층 라이브러리 · 일정 = 마케팅 달력 · 프로젝트 수치 = `shared.projects`.
- 레시피의 `journal`·`retro` 는 그날의 기록(아카이브)이라 숫자를 그대로 남깁니다.

## 중계서버 (`worker.js`, Cloudflare Workers)

- 주소: `https://moomoomoo-sync.euuuhyy.workers.dev`
- 환경변수: `NOTION_TOKEN`(노션 통합 시크릿), `APP_SECRET`(사이트 비밀번호)
- 노션 데이터 페이지: **무무무빌딩 통합 데이터** `426607c6-aaac-8115-9ed8-e26ff6759c7b` (worker.js 상수 `DATA_PAGE_ID`)

| 엔드포인트 | 하는 일 |
| --- | --- |
| `GET /state` | `{ ok, updatedAt, tasks, orders, rooms, sections, shared }` 한 번에 |
| `POST /task` · `POST /order` | 할 일·발주 추가/수정/삭제 (기존과 같음) |
| `POST /room` | `{ roomId, data }` 방 하나 저장 |
| `POST /section` | `{ section, data }` 섹션 하나 저장 |
| `POST /sync-bundle` | `{ shared, rooms, sections, updatedAt }` 바뀐 것만 한 번에 저장 (자동 업데이트용) |
| `GET /health` | 살아있는지 확인 |

`/sync-bundle` 은 모르는 방·섹션 키를 `ignored` 로 돌려주고, 공통 원본에 없는 `{{p:…}}`·`{{m:…}}` 참조는 `warnings.unknownRefs` 로 알려줘요.

## 화면을 바꿀 때

1. 새 `app.html` 로 `FURUMOO_PW=<비밀번호> node tools/lock.mjs page app.html` → `index.html`
2. 이어서 `FURUMOO_PW=<비밀번호> node tools/lock.mjs data data.json` (page를 잠그면 SALT가 바뀌어서요)
3. `index.html`, `data.enc` 커밋·푸시

## 데이터만 갱신할 때

`FURUMOO_PW=<비밀번호> node tools/lock.mjs data data.json` → `data.enc` 만 커밋.

> 2026-11-28부터 방별 현황·섹션·공통 원본은 노션 "무무무빌딩 통합 데이터" 페이지가 원본이에요.
> 사이트는 열 때 `GET /state` 로 노션 값을 먼저 받고, 못 받으면 `data.enc` 로 계속 동작합니다.
