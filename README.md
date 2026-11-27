# 푸루무스스튜디오 오피스맵

푸루무스스튜디오의 오피스맵(푸루무 빌딩)입니다. 비밀번호로 잠겨 있어, 비밀번호를 아는 사람만 열 수 있습니다.

## 파일

| 파일 | 내용 |
| --- | --- |
| `index.html` | 잠금 페이지. 안에 화면(app.html)이 암호화되어 들어 있어요. |
| `data.enc` | 할 일·제작 발주 데이터. 같은 비밀번호로 암호화돼요. 우이가 6시간마다 갱신해요. |
| `tools/lock.mjs` | 잠그는 도구 (Node 18 이상). |
| `tools/lock-template.html` | 잠금 페이지 틀. |

**원본(`app.html`, `data.json`)은 절대 커밋하지 마세요.** 공개 저장소라 누구나 볼 수 있어요. `.gitignore`에 넣어 두었어요.

## 6시간마다 데이터 갱신 (우이)

1. 노션 DB "푸루무 할 일"과 "푸루무 제작 발주"를 읽어 `data.json`을 만들어요 (형식은 아래).
2. `FURUMOO_PW=<비밀번호> node tools/lock.mjs data data.json` → `data.enc`가 새로 생겨요.
3. `data.enc`만 커밋·푸시하면 끝. 사이트는 다음에 열 때 새 데이터를 보여줘요.

## 화면을 바꿀 때

1. Claude가 준 새 `app.html`로 `FURUMOO_PW=<비밀번호> node tools/lock.mjs page app.html` → `index.html`
2. 이어서 `node tools/lock.mjs data data.json`도 다시 실행 (page를 잠그면 SALT가 바뀌어서요).
3. `index.html`, `data.enc` 커밋·푸시.

## data.json 형식

```json
{
  "version": 1,
  "updatedAt": "2026-11-28T05:00:00+09:00",
  "updatedBy": "wooi",
  "tasks": {
    "smartstore-cs": [
      { "id": "d1", "text": "할 일 내용", "due": "2026-11-29", "owner": "wooi", "done": false, "nstatus": "대기", "memo": "" }
    ]
  },
  "orders": [
    { "id": "o1", "product": "제품", "factory": "공장", "qty": 1000, "price": null, "stage": "생산", "due": "2026-12-02", "memo": "", "done": false }
  ]
}
```

- `tasks`의 키는 방 id예요. 노션 "키" 칸이 `방id/할일id` 형식이에요 (예: `smartstore-cs/d1`).
- 방 id: `calendar-2027` `calendar-2028` `diary-2028` (3F) · `emo-studio` `sns-studio` `marketing` (2F) · `kakao-emoticons` `sns` `store` (1F) · `wekeep` `factory` `smartstore-cs` `expenditure` (B1) · `wooi-desk` `claude-desk` (B2)
- `owner`: 노션 담당 `나`→`me`, `우이`→`wooi`, `클로드`→`claude`
- `done`: 노션 상태가 `완료`면 true (화면에선 숨겨요). `nstatus`는 노션 상태 그대로(대기/진행 중/확인 필요/완료), `memo`는 "결과 메모".
- `updatedAt`이 바뀌어야 브라우저가 새 데이터로 덮어써요.

made by 우이 · 푸루무 빌딩 화면 by Claude
