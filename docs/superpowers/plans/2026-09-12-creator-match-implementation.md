# Creator Match 구현 계획

> **제출본 안내:** 초기 구현 작업을 위한 과거 계획입니다. 이후 사용자 검토로 달라진 최종 동작과 검증 방법은 [README](../../../README.md), [PRD](../../../PRD.md), [flowchart](../../../flowchart.md)에 정리되어 있습니다.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 설계 문서(D1~D30)대로, 광고주가 예산·카테고리·규모를 입력하면 크리에이터 200명 CSV에서 후보를 매칭 점수 순으로 근거와 함께 보여주고, 운영자가 비중을 조절할 수 있는 정적 웹 프로토타입을 만들어 GitHub Pages에 배포한다.

**Architecture:** `src/domain/`에 React를 모르는 순수 로직(정제·파생값·백분위·점수·필터·정렬·0명 진단·추천 근거·비중 저장)을 두고 Vitest로 증명한다. `src/app/`(해시 라우팅·세션·데이터 로드·페이지)과 `src/components/`(입력 패널·결과 표·펼침 행·0명 블록·비중 카드·로그인 폼)는 domain 결과를 그리기만 한다. 광고주 화면과 운영자 화면은 같은 `MatchingWorkspace`를 쓰고 비중(weights)만 다르게 넘긴다.

**Tech Stack:** Vite 8 + React 18 + TypeScript 5.9, Vitest 5 + jsdom + @testing-library/react, PapaParse, 단일 전역 CSS + CSS 변수, GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-12-creator-match-design.md` (결정 과정: `docs/decision-log.md`). 이 계획은 설계 문서를 근거로 하며, 실행자는 두 문서를 함께 읽는다.

## Global Constraints

- 스택: React **18** (`react@^18.3.1`), TypeScript **5.x**, Vite 8, Vitest 5. Tailwind 등 UI 라이브러리 추가 금지. 아이콘은 문자(▸ ▾ ⓘ) 또는 인라인 SVG (설계 §6.6, §7)
- `data/dummy_creators.csv`는 바이트 하나도 바꾸지 않는다. SHA-256 `6f139b1a8cac4a7aa0d8034bde2df16ae7c06896ee820eec16ddafbcf2738b8c` (설계 §3.1)
- `src/domain/*`는 `react`를 import하지 않는다 (설계 §7)
- 화면 문구는 설계 §4 표의 문장을 글자 그대로 쓴다. 광고주 화면 말투는 "~입니다" 정중체. "~이에요" 금지
- 색 토큰(설계 §6.6): primary `#2563EB`, primary-deep `#1E3A8A`, primary-soft `#DBEAFE`, background `#F4F7FF`, card `#FFFFFF`, text `#0F172A`, text-muted `#64748B`, border `#E3E9F6`, positive 배경 `#DCFCE7`/글자 `#166534`, warning 배경 `#FFEDD5`/글자 `#9A3412`, destructive `#DC2626`
- 글꼴 Noto Sans KR (Google Fonts) → 실패 시 system-ui. 본문 14~15px, 행간 1.5. 카드 모서리 22~24px, 칩 999px, 입력 14~16px
- 브라우저 저장소 키: 비중 `creator-match.weights`, 세션 `creator-match.admin-session`. 읽기·쓰기 모두 try/catch (설계 §7)
- 운영자 계정 `admin` / `demo1234` (설계 §6.3)
- `vite.config.ts`의 `base: '/creator-match/'`. 라우팅은 해시(`#/`, `#/login`, `#/admin`), 라이브러리 없이 `window.location.hash` (설계 §7, §9)
- 커밋(설계 §10): 스쿼시·리베이스 금지. 작업 단위마다 커밋. 메시지는 한국어, 첫 줄 `type: 요약`(feat/fix/docs/test/chore/refactor), 본문에 `배경:`(설계 §·D번호)과 `AI 활용:`(Claude Code가 한 일, 사용자가 지시·수정한 점) 두 줄. 마지막 줄 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`
- 각 Task 커밋 후 `git push origin main` (저장소는 이미 공개 상태)
- 저장소에 넣지 않는 것: 과제 안내문, 채용 메일 캡처, `node_modules`, `dist`

---

## 0. 사용자 확인용 요약 (화면에서 보이는 결과 기준)

| 순서 | Task | 끝나면 무엇이 보이나 |
|---|---|---|
| 1 | 프로젝트 골격 | `npm run dev`로 빈 페이지에 "Creator Match" 제목이 뜬다. `npm test` 통과 |
| 2~3 | 규모 구간·CSV 정제 | (화면 없음) 200명이 정확히 읽히고 27명이 "이력 없음"으로 분류됨을 테스트로 증명 |
| 4~6 | 백분위·비중·점수 | (화면 없음) 민준브이로그180의 매칭 점수 66 등 계산값을 테스트로 증명 |
| 7 | 숫자 표시 | (화면 없음) "150만 원", "9.7만", "예상 4.4" 같은 표기 규칙 증명 |
| 8~9 | 필터·정렬·0명 진단 | (화면 없음) 뷰티+패션/마이크로/150만 → 18명, 뷰티/매크로/50만 → 0명 진단 문구·완화 버튼·근접 후보 3명 증명 |
| 10 | 추천 근거 | (화면 없음) 강점 칩 3개·유의점·항목 막대 문구 증명 |
| 11 | 앱 뼈대 | 헤더(로고·이름·부제·운영자 로그인 링크), 안내 문구, 푸터 데이터 상태 줄이 실제 색·글꼴로 보인다 |
| 12 | 입력 패널 | 예산 입력(콤마 자동, "→ 150만 원"), 카테고리 칩 10개, 규모 카드 3개, 검증 안내, 찾기 버튼 |
| 13 | 결과 표 | 검색하면 9열 표. 열 제목 클릭 정렬, 플랫폼·이력 필터, ▸ 눌러 "왜 추천하나요?" 펼침 |
| 14 | 후보 0명·희소 | 0명이면 진단 한 줄 + 완화 버튼(인원수) + 근접 후보 3명 표. 1~2명이면 표 아래 완화 버튼 |
| 15 | 로그인·운영자 | `#/login` 목업 로그인 → `#/admin` 슬라이더 5개, 합계 표시, 저장·기본값, 아래 결과 실시간 반영 |
| 16 | 반응형·마무리 | 3열/1열/가로 스크롤 전환, 포커스 링, 애니메이션 축소 존중 |
| 17 | 배포 | `https://rlaskadls35-boop.github.io/creator-match/`에서 동작 |

## 0.1 설계 문서와 다른 점·판단 사항 (승인 시 함께 확정)

설계 §12 "열린 항목"이 예고한 갱신 두 건과, 구현하며 정해야 했던 작은 판단들이다. 승인되면 Task 0에서 decision-log에 L21로 기록하고 설계 문서를 고친다.

1. **§5.4·§8.5 검증 숫자 갱신 (예고된 갱신)**: 평점 보정 없이 재계산한 민준브이로그180 항목 점수는 참여율 59.0 / 평균 조회수 53.1 / 광고주 평점 **74.9**(문서 79.4) / 조회 1회당 비용 71.1 / 캠페인 건수 93.7 → 매칭 점수 **65.99 → 표시 66**(문서 66.9 → 67). 테스트 기대값은 이 숫자다.
2. **§8.7 "마이크로 0명(비활성, 최저 단가 510,000)"**: §5.7 규칙("그 tier·카테고리의 최저 rate")대로 계산하면 뷰티·마이크로 최저 단가는 **540,000**이다. 510,000은 마이크로 전체 최저(게임)다. 규칙을 따르고 숫자를 540,000으로 고친다.
3. **운영자 미리보기에서 슬라이더 합이 100이 아닐 때** (문서에 없음, 화면 결과가 달라지므로 확인 필요): 슬라이더 하나를 움직이면 합이 즉시 100을 벗어나는데, 이때도 아래 결과가 바로 바뀌어야 한다(§6.4). 제안: **합이 100이 아닌 동안은 각 비중을 합으로 나눠 비율로 환산해 계산**하고, **저장은 정확히 100일 때만** 가능. 대안은 "합이 100일 때만 결과 갱신"인데 슬라이더를 두 개 맞춰야 결과가 바뀌어 미리보기의 의미가 약해진다.
4. 평점순 정렬에서 방향을 뒤집어도(낮은 순) 이력 없음은 맨 아래에 둔다. 예상값이라 실제 평점과 섞어 순위를 매기지 않는다는 §5.10 취지를 따른다.
5. 후보는 있는데 플랫폼·이력 필터로 0명이 되면(§5.7의 "후보 0명"이 아님) 표 자리에 한 줄만: "선택한 필터에 맞는 크리에이터가 없습니다. 필터를 풀어 보세요."
6. 조회 1회당 평균 비용은 정수 원으로 표시한다 ("85원"). §5.4 예시의 84.6원은 소수까지 있지만 표·칩에서는 반올림한다.
7. 후보가 1~2명일 때의 "예산 올리기" 제안 금액 = 예산을 넘는 사람 중 최저 단가 (다음 한 명이 들어오는 금액). §5.7은 0명일 때만 정의했으므로 자연스러운 확장이다. 넘는 사람이 없으면 이 버튼은 생략.
8. 예상 평점은 표 셀에 "예상 4.4 ⓘ"(소수 첫째 자리), 툴팁 안에는 계산에 쓴 값 "4.42점"을 그대로 적는다 (§3.4 "소수 둘째 자리").
9. 입력 검증의 빨간 안내는 사용자가 한 번 건드린 입력에만 보인다 (첫 진입에 빈 폼이 빨갛게 보이지 않게). 버튼 비활성은 항상 적용. 규모는 기본 선택 없음.
10. 스택 버전: 설계의 React 18을 유지하고, Vite는 현재 최신 8, Vitest 5, TypeScript는 새 엔진인 7 대신 안정 버전 5.9를 쓴다.

## 0.2 파일 구조

```
creator-match/
  package.json  vite.config.ts  tsconfig.json  index.html
  .github/workflows/pages.yml                   # Task 17
  data/dummy_creators.csv                       # 원본 (무수정)
  src/
    main.tsx                                    # 진입점
    vite-env.d.ts
    test/setup.ts                               # jest-dom 매처
    styles/global.css                           # 토큰·기본·모든 컴포넌트 스타일 (Task별로 섹션 추가)
    domain/
      types.ts          # Creator, ScoredCreator, RankedCreator, Weights, DatasetStats, 상수 배열
      tiers.ts          # tierOf, TIER_INFO                                (§5.2)
      parseCreators.ts  # parseCreators(csvText) → Dataset                (§3.3, §3.4)
      percentile.ts     # percentileRanks, displayTopPercent               (§5.4)
      weights.ts        # DEFAULT_WEIGHTS, METRIC_LABEL, validate/normalize/load/save (§5.5, §6.4)
      scoring.ts        # scoreCreators, matchScore, rankCreators, compareByMatch (§5.3~5.5)
      format.ts         # formatWon, formatCompact, formatPercent, formatRating, formatCostPerView
      recommend.ts      # filterCandidates, sortCandidates, applyResultFilters, diagnoseZeroResult, buildRelaxations, nearCandidates (§5.1, §5.7, §5.10)
      explain.ts        # strengthChips, cautions, metricBars               (§5.8)
      searchForm.ts     # 입력 폼 상태 ↔ SearchInput 변환·검증
      *.test.ts         # 각 모듈 테스트
    app/
      App.tsx           # 데이터 로드 + 라우팅
      router.ts         # parseHash, useHashRoute, navigate
      session.ts        # 목업 로그인 세션
      dataset.ts        # CSV ?raw import → parse → score
      AdvertiserPage.tsx  LoginPage.tsx  AdminPage.tsx
      App.test.tsx      # 스모크 1개
    components/
      Header.tsx  DataStatusFooter.tsx  Tooltip.tsx
      SearchPanel.tsx  MatchingWorkspace.tsx
      ResultsToolbar.tsx  ResultsTable.tsx  ExplainRow.tsx
      ZeroResults.tsx  RelaxationList.tsx  NearCandidatesTable.tsx
      WeightsCard.tsx  LoginForm.tsx
```

## 0.3 공통 절차 (모든 Task)

- 테스트 실행: `npm test` (= `vitest run`). 특정 파일만: `npx vitest run src/domain/tiers.test.ts`
- 타입 검사 + 빌드: `npm run build`
- 화면 확인이 있는 Task는 `npm run dev`를 띄우고 브라우저(1280px 너비)에서 확인한 뒤 스크린샷을 남긴다
- 커밋 예시:

```bash
git add -A
git commit -m "feat: 규모 구간 판정 tierOf 추가

배경: 설계 §5.2 (D5). 나노 <1만 / 마이크로 1만~10만 미만 / 매크로 10만 이상
AI 활용: Claude Code가 구현 계획 Task 2대로 테스트 먼저 작성 후 구현. 사용자 지시·수정: 없음

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin main
```

---

### Task 0: 계획 승인 기록 (메인 세션이 직접)

**Files:**
- Modify: `docs/decision-log.md` (끝에 L21 추가)
- Modify: `docs/superpowers/specs/2026-09-12-creator-match-design.md` §5.4 검증 예시, §8.5, §8.7, §12 표
- Create: `docs/superpowers/plans/2026-09-12-creator-match-implementation.md` (이 문서)

- [ ] **Step 1: decision-log에 L21 추가** — 제목 "구현 계획 승인과 판단 사항". 내용은 §0.1의 10개 항목을 "AI 제안 / 사용자 판단 / 결과" 형식으로. 사용자가 3번(미리보기 비율 환산)에 다른 답을 주면 그 답을 기록
- [ ] **Step 2: 설계 문서 갱신** — §5.4 예시를 "광고주 평점 74.9 → 매칭 점수 65.99 → 표시 66"으로, 괄호 문구를 "(2026-09-12 구현 세션에서 보정 없이 재계산한 값. L21)"로. §8.5도 같은 숫자. §8.7 "최저 단가 510,000" → "540,000". §12 "5.4 검증 예시 숫자" 행의 상태를 "갱신 완료(L21)"로
- [ ] **Step 3: 커밋** — `docs: 구현 계획 추가, 설계 문서 검증 숫자 갱신 (L21)`

---

### Task 1: 프로젝트 골격 (Vite + React 18 + TS + Vitest) + 해시 라우터 함수

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/vite-env.d.ts`, `src/test/setup.ts`, `src/styles/global.css`(빈 토큰만), `src/app/App.tsx`(임시), `src/app/router.ts`
- Test: `src/app/router.test.ts`

**Interfaces:**
- Produces: `parseHash(hash: string): Route` (`Route = 'home' | 'login' | 'admin'`), `useHashRoute(): Route`, `navigate(path: '/' | '/login' | '/admin'): void`

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "creator-match",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "papaparse": "^5.5.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^7.0.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/papaparse": "^5.3.16",
    "@types/react": "^18.3.20",
    "@types/react-dom": "^18.3.7",
    "@vitejs/plugin-react": "^6.0.0",
    "jsdom": "^30.0.0",
    "typescript": "^5.9.0",
    "vite": "^8.0.0",
    "vitest": "^5.0.0"
  }
}
```

- [ ] **Step 2: 설정 파일 3개**

`vite.config.ts`
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/creator-match/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

`tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

`index.html`
```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Creator Match · 광고주를 위한 크리에이터 추천</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: 소스 뼈대**

`src/vite-env.d.ts`
```ts
/// <reference types="vite/client" />
```

`src/test/setup.ts`
```ts
import '@testing-library/jest-dom/vitest';
```

`src/styles/global.css` (Task 11에서 채움. 지금은 토큰만)
```css
:root {
  --primary: #2563EB;
  --primary-deep: #1E3A8A;
  --primary-soft: #DBEAFE;
  --background: #F4F7FF;
  --card: #FFFFFF;
  --text: #0F172A;
  --text-muted: #64748B;
  --border: #E3E9F6;
  --positive-bg: #DCFCE7;
  --positive-fg: #166534;
  --warning-bg: #FFEDD5;
  --warning-fg: #9A3412;
  --destructive: #DC2626;
  --shadow: 0 8px 24px rgba(37, 99, 235, 0.08);
  --radius-card: 22px;
  --radius-input: 14px;
  --font: 'Noto Sans KR', system-ui, -apple-system, 'Apple SD Gothic Neo', sans-serif;
}
body { margin: 0; font-family: var(--font); background: var(--background); color: var(--text); font-size: 15px; line-height: 1.5; }
```

`src/main.tsx`
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

`src/app/App.tsx` (임시. Task 11에서 교체)
```tsx
export default function App() {
  return <h1>Creator Match</h1>;
}
```

- [ ] **Step 4: 라우터 테스트 작성** — `src/app/router.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { parseHash } from './router';

describe('parseHash', () => {
  it('빈 해시와 #/ 는 home', () => {
    expect(parseHash('')).toBe('home');
    expect(parseHash('#')).toBe('home');
    expect(parseHash('#/')).toBe('home');
  });
  it('#/login → login, #/admin → admin', () => {
    expect(parseHash('#/login')).toBe('login');
    expect(parseHash('#/admin')).toBe('admin');
  });
  it('모르는 경로는 home', () => {
    expect(parseHash('#/foo')).toBe('home');
  });
});
```

- [ ] **Step 5: `npm install` 후 테스트가 실패하는지 확인** — Run: `npm install && npx vitest run src/app/router.test.ts` → Expected: FAIL (router 모듈 없음)

- [ ] **Step 6: 라우터 구현** — `src/app/router.ts`

```ts
import { useEffect, useState } from 'react';

export type Route = 'home' | 'login' | 'admin';
export type RoutePath = '/' | '/login' | '/admin';

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '');
  if (path.startsWith('/admin')) return 'admin';
  if (path.startsWith('/login')) return 'login';
  return 'home';
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(path: RoutePath): void {
  window.location.hash = path;
}
```

- [ ] **Step 7: 테스트·빌드 확인** — Run: `npm test && npm run build` → Expected: 테스트 3개 PASS, `dist/` 생성. `npm run dev`로 브라우저에 "Creator Match" 제목 확인
- [ ] **Step 8: 커밋** — `chore: Vite + React 18 + TypeScript + Vitest 프로젝트 골격, 해시 라우터 함수` (배경: 설계 §7, D28. `.gitignore`는 이미 node_modules·dist 제외)

---

### Task 2: 타입과 규모 구간 (`types.ts`, `tiers.ts`)

**Files:**
- Create: `src/domain/types.ts`, `src/domain/tiers.ts`
- Test: `src/domain/tiers.test.ts`

**Interfaces:**
- Produces: 아래 `types.ts` 전체와 `tierOf(followers: number): Tier`, `TIER_INFO: Record<Tier, { range: string; trait: string; rateRange: string }>`

- [ ] **Step 1: 실패 테스트** — `src/domain/tiers.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { tierOf, TIER_INFO } from './tiers';

describe('tierOf (설계 §5.2)', () => {
  it('9,999 → 나노, 10,000 → 마이크로, 99,999 → 마이크로, 100,000 → 매크로', () => {
    expect(tierOf(9_999)).toBe('나노');
    expect(tierOf(10_000)).toBe('마이크로');
    expect(tierOf(99_999)).toBe('마이크로');
    expect(tierOf(100_000)).toBe('매크로');
  });
  it('0과 매우 큰 값도 판정된다', () => {
    expect(tierOf(0)).toBe('나노');
    expect(tierOf(5_000_000)).toBe('매크로');
  });
  it('규모 카드 문구(§4)가 세 구간 모두 있다', () => {
    expect(TIER_INFO['나노'].range).toBe('1만 미만');
    expect(TIER_INFO['마이크로'].rateRange).toBe('단가 51만~200만 원대');
    expect(TIER_INFO['매크로'].trait).toBe('넓은 도달');
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/domain/tiers.test.ts` → FAIL
- [ ] **Step 3: 구현**

`src/domain/types.ts`
```ts
export const CATEGORIES = ['뷰티', '식품', '패션', '피트니스', '여행', '아웃도어', '라이프스타일', '테크', '게임', '교육'] as const;
export type Category = (typeof CATEGORIES)[number];

export const PLATFORMS = ['유튜브', '인스타그램'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const TIERS = ['나노', '마이크로', '매크로'] as const;
export type Tier = (typeof TIERS)[number];

/** 점수 항목 5개. 순서는 화면 표시 순서(설계 §5.3 표) */
export const METRIC_KEYS = ['engagement', 'views', 'rating', 'costPerView', 'campaigns'] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

export interface Creator {
  id: string;
  name: string;
  category: Category;
  platform: Platform;
  followers: number;
  avgViewCount: number;
  engagementRate: number;
  totalCampaignCount: number;
  totalCampaignBudgetKrw: number;
  avgCampaignBudgetKrw: number;
  advertiserRating: number | null;
  // 파생 필드 (설계 §3.4)
  tier: Tier;
  hasHistory: boolean;
  rate: number;
  rateIsEstimated: boolean;
  rating: number;
  ratingIsEstimated: boolean;
  costPerView: number;
}

export interface MetricScore {
  key: MetricKey;
  /** 항목 점수 0~100, 소수 첫째 자리까지 */
  score: number;
  /** 상위 % (반올림 전 원값) */
  topPercent: number;
  /** 집단 안 등수, 1부터 */
  rank: number;
  groupSize: number;
  /** '나노' | '마이크로' | '매크로' | '전체' */
  groupLabel: string;
}

export interface ScoredCreator extends Creator {
  metrics: Record<MetricKey, MetricScore>;
}

export interface RankedCreator extends ScoredCreator {
  /** 매칭 점수 0~100 (반올림 전) */
  matchScore: number;
}

export type Weights = Record<MetricKey, number>;

export interface DatasetStats {
  total: number;
  noHistoryCount: number;
  ratedCount: number;
  ratingAverage: number;
  medianRateByTier: Record<Tier, number>;
  skippedRows: number;
}

export interface Dataset {
  creators: Creator[];
  stats: DatasetStats;
}
```

`src/domain/tiers.ts`
```ts
import type { Tier } from './types';

export const TIER_BOUNDS = { micro: 10_000, macro: 100_000 } as const;

export function tierOf(followers: number): Tier {
  if (followers < TIER_BOUNDS.micro) return '나노';
  if (followers < TIER_BOUNDS.macro) return '마이크로';
  return '매크로';
}

/** 규모 카드 문구 (설계 §4 "규모 선택지") */
export const TIER_INFO: Record<Tier, { range: string; trait: string; rateRange: string }> = {
  나노: { range: '1만 미만', trait: '팬과 가까운 채널', rateRange: '단가 21만~50만 원대' },
  마이크로: { range: '1만~10만', trait: '반응과 도달의 균형', rateRange: '단가 51만~200만 원대' },
  매크로: { range: '10만 이상', trait: '넓은 도달', rateRange: '단가 224만 원 이상' },
};
```

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run src/domain/tiers.test.ts` → PASS
- [ ] **Step 5: 커밋** — `feat: 도메인 타입과 규모 구간 판정(tierOf) 추가` (배경: 설계 §3.4, §5.2, D5)

---

### Task 3: CSV 정제와 파생 필드 (`parseCreators.ts`)

**Files:**
- Create: `src/domain/parseCreators.ts`
- Test: `src/domain/parseCreators.test.ts`

**Interfaces:**
- Consumes: `tierOf`, `types.ts`
- Produces: `parseCreators(csvText: string): Dataset`, `class CsvHeaderError extends Error`, `EXPECTED_HEADERS`

- [ ] **Step 1: 실패 테스트** — `src/domain/parseCreators.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import csvText from '../../data/dummy_creators.csv?raw';
import { parseCreators, CsvHeaderError } from './parseCreators';

const HEADER =
  'creator_id,creator_name,category,platform,followers,avg_view_count,engagement_rate,total_campaign_count,total_campaign_budget_krw,avg_campaign_budget_krw,advertiser_rating';

function row(over: Partial<Record<string, string>> = {}): string {
  const base: Record<string, string> = {
    creator_id: 'T001', creator_name: '테스트1', category: '뷰티', platform: '유튜브',
    followers: '50000', avg_view_count: '8000', engagement_rate: '7.0', total_campaign_count: '3',
    total_campaign_budget_krw: '3000000', avg_campaign_budget_krw: '1000000', advertiser_rating: '4.5',
  };
  return Object.values({ ...base, ...over }).join(',');
}

describe('parseCreators (설계 §3.3, §3.4)', () => {
  it('BOM이 있어도 첫 컬럼이 creator_id로 읽힌다', () => {
    const ds = parseCreators('﻿' + HEADER + '\r\n' + row() + '\r\n');
    expect(ds.creators).toHaveLength(1);
    expect(ds.creators[0].id).toBe('T001');
  });

  it('CRLF와 LF를 모두 처리한다', () => {
    const crlf = parseCreators(HEADER + '\r\n' + row() + '\r\n' + row({ creator_id: 'T002', creator_name: '테스트2' }) + '\r\n');
    const lf = parseCreators(HEADER + '\n' + row() + '\n' + row({ creator_id: 'T002', creator_name: '테스트2' }) + '\n');
    expect(crlf.creators.map((c) => c.id)).toEqual(['T001', 'T002']);
    expect(lf.creators.map((c) => c.id)).toEqual(['T001', 'T002']);
  });

  it('헤더가 다르면 CsvHeaderError', () => {
    expect(() => parseCreators('id,name\n1,2\n')).toThrow(CsvHeaderError);
  });

  it('숫자 칸에 문자가 있는 행은 건너뛰고 카운트된다', () => {
    const ds = parseCreators(HEADER + '\n' + row() + '\n' + row({ creator_id: 'T002', followers: 'abc' }) + '\n');
    expect(ds.creators).toHaveLength(1);
    expect(ds.stats.skippedRows).toBe(1);
  });

  it('카테고리·플랫폼이 목록 밖이거나 평점이 0~5 밖이면 건너뛴다', () => {
    const ds = parseCreators(
      HEADER + '\n' + row() + '\n' +
      row({ creator_id: 'T002', category: '요리' }) + '\n' +
      row({ creator_id: 'T003', platform: '틱톡' }) + '\n' +
      row({ creator_id: 'T004', advertiser_rating: '7' }) + '\n',
    );
    expect(ds.creators).toHaveLength(1);
    expect(ds.stats.skippedRows).toBe(3);
  });

  it('평점 공란은 null이 되고 예상 평점·예상 단가가 채워진다', () => {
    const ds = parseCreators(
      HEADER + '\n' +
      row({ advertiser_rating: '4.0', avg_campaign_budget_krw: '1000000' }) + '\n' +
      row({ creator_id: 'T002', advertiser_rating: '5.0', avg_campaign_budget_krw: '1400000' }) + '\n' +
      row({ creator_id: 'T003', total_campaign_count: '0', total_campaign_budget_krw: '0', avg_campaign_budget_krw: '0', advertiser_rating: '' }) + '\n',
    );
    const fresh = ds.creators.find((c) => c.id === 'T003')!;
    expect(fresh.advertiserRating).toBeNull();
    expect(fresh.hasHistory).toBe(false);
    expect(fresh.ratingIsEstimated).toBe(true);
    expect(fresh.rating).toBe(4.5); // (4.0 + 5.0) / 2
    expect(fresh.rateIsEstimated).toBe(true);
    expect(fresh.rate).toBe(1_200_000); // 마이크로 이력 있는 두 명의 중앙값
    expect(fresh.costPerView).toBeCloseTo(1_200_000 / 8000, 6);
  });
});

describe('parseCreators 실제 데이터', () => {
  const ds = parseCreators(csvText);

  it('200명 로드, 건너뛴 행 0', () => {
    expect(ds.creators).toHaveLength(200);
    expect(ds.stats.total).toBe(200);
    expect(ds.stats.skippedRows).toBe(0);
  });

  it('평점 공란 27명 = 캠페인 0건 27명 = 이력 없음 27명', () => {
    const nullRating = ds.creators.filter((c) => c.advertiserRating === null);
    const zeroCount = ds.creators.filter((c) => c.totalCampaignCount === 0);
    expect(nullRating).toHaveLength(27);
    expect(zeroCount).toHaveLength(27);
    expect(new Set(nullRating.map((c) => c.id))).toEqual(new Set(zeroCount.map((c) => c.id)));
    expect(ds.stats.noHistoryCount).toBe(27);
    expect(ds.stats.ratedCount).toBe(173);
  });

  it('규모 구간 인원 44 / 129 / 27', () => {
    const count = (t: string) => ds.creators.filter((c) => c.tier === t).length;
    expect(count('나노')).toBe(44);
    expect(count('마이크로')).toBe(129);
    expect(count('매크로')).toBe(27);
  });

  it('예상 단가 = tier 중앙값 365,000 / 1,320,000 / 4,725,000, 예상 평점 = 4.42', () => {
    expect(ds.stats.medianRateByTier).toEqual({ 나노: 365_000, 마이크로: 1_320_000, 매크로: 4_725_000 });
    expect(ds.stats.ratingAverage).toBeCloseTo(4.42, 2);
    const fresh = ds.creators.find((c) => c.id === 'C0036')!; // 지수챌린지36, 마이크로, 이력 없음
    expect(fresh.rate).toBe(1_320_000);
    expect(fresh.rating).toBeCloseTo(4.42, 2);
  });

  it('costPerView = rate ÷ avg_view_count (민준브이로그180: 700,000 ÷ 8,279)', () => {
    const c = ds.creators.find((x) => x.id === 'C0180')!;
    expect(c.rate).toBe(700_000);
    expect(c.avgViewCount).toBe(8_279);
    expect(c.costPerView).toBeCloseTo(700_000 / 8_279, 6);
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/domain/parseCreators.test.ts` → FAIL
- [ ] **Step 3: 구현** — `src/domain/parseCreators.ts`

```ts
import Papa from 'papaparse';
import { CATEGORIES, PLATFORMS, TIERS } from './types';
import type { Category, Creator, Dataset, Platform, Tier } from './types';
import { tierOf } from './tiers';

export const EXPECTED_HEADERS = [
  'creator_id', 'creator_name', 'category', 'platform', 'followers', 'avg_view_count',
  'engagement_rate', 'total_campaign_count', 'total_campaign_budget_krw', 'avg_campaign_budget_krw', 'advertiser_rating',
] as const;

export class CsvHeaderError extends Error {
  constructor(message = 'CSV 컬럼 구성이 예상과 다릅니다.') {
    super(message);
    this.name = 'CsvHeaderError';
  }
}

type RawRow = Record<string, string | undefined>;

interface BaseRow {
  id: string;
  name: string;
  category: Category;
  platform: Platform;
  followers: number;
  avgViewCount: number;
  engagementRate: number;
  totalCampaignCount: number;
  totalCampaignBudgetKrw: number;
  avgCampaignBudgetKrw: number;
  advertiserRating: number | null;
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** 비어 있거나 숫자가 아니거나 음수면 null */
function parseNonNegative(value: string | undefined): number | null {
  if (value === undefined) return null;
  const t = value.trim();
  if (t === '' || !/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function toBaseRow(r: RawRow): BaseRow | null {
  const id = r.creator_id?.trim();
  const name = r.creator_name?.trim();
  const category = r.category?.trim();
  const platform = r.platform?.trim();
  if (!id || !name || !category || !platform) return null;
  if (!(CATEGORIES as readonly string[]).includes(category)) return null;
  if (!(PLATFORMS as readonly string[]).includes(platform)) return null;

  const followers = parseNonNegative(r.followers);
  const avgViewCount = parseNonNegative(r.avg_view_count);
  const engagementRate = parseNonNegative(r.engagement_rate);
  const totalCampaignCount = parseNonNegative(r.total_campaign_count);
  const totalCampaignBudgetKrw = parseNonNegative(r.total_campaign_budget_krw);
  const avgCampaignBudgetKrw = parseNonNegative(r.avg_campaign_budget_krw);
  if (
    followers === null || avgViewCount === null || engagementRate === null ||
    totalCampaignCount === null || totalCampaignBudgetKrw === null || avgCampaignBudgetKrw === null
  ) return null;

  const ratingText = (r.advertiser_rating ?? '').trim();
  let advertiserRating: number | null = null;
  if (ratingText !== '') {
    const n = parseNonNegative(ratingText);
    if (n === null || n > 5) return null;
    advertiserRating = n;
  }

  return {
    id, name, category: category as Category, platform: platform as Platform,
    followers, avgViewCount, engagementRate, totalCampaignCount, totalCampaignBudgetKrw, avgCampaignBudgetKrw, advertiserRating,
  };
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function parseCreators(csvText: string): Dataset {
  const parsed = Papa.parse<RawRow>(stripBom(csvText), { header: true, skipEmptyLines: true });
  const headers = (parsed.meta.fields ?? []).map((h) => h.trim());
  const expected = EXPECTED_HEADERS as readonly string[];
  if (headers.length !== expected.length || expected.some((h, i) => headers[i] !== h)) {
    throw new CsvHeaderError();
  }

  const base: BaseRow[] = [];
  let skipped = 0;
  for (const raw of parsed.data) {
    const row = toBaseRow(raw);
    if (row) base.push(row);
    else skipped += 1;
  }

  // 통계는 상수로 박지 않고 데이터에서 계산한다 (설계 §3.4)
  const withHistory = base.filter((b) => b.totalCampaignCount > 0);
  const rated = base.filter((b) => b.advertiserRating !== null);
  const ratingAverage = rated.length
    ? Math.round((rated.reduce((s, b) => s + (b.advertiserRating as number), 0) / rated.length) * 100) / 100
    : 0;
  const medianRateByTier = {} as Record<Tier, number>;
  for (const t of TIERS) {
    const rates = withHistory.filter((b) => tierOf(b.followers) === t).map((b) => b.avgCampaignBudgetKrw);
    medianRateByTier[t] = rates.length ? median(rates) : 0;
  }

  const creators: Creator[] = base.map((b) => {
    const tier = tierOf(b.followers);
    const hasHistory = b.totalCampaignCount > 0;
    const rate = hasHistory ? b.avgCampaignBudgetKrw : medianRateByTier[tier];
    const rating = b.advertiserRating ?? ratingAverage;
    return {
      ...b,
      tier,
      hasHistory,
      rate,
      rateIsEstimated: !hasHistory,
      rating,
      ratingIsEstimated: b.advertiserRating === null,
      costPerView: b.avgViewCount > 0 ? rate / b.avgViewCount : Number.POSITIVE_INFINITY,
    };
  });

  return {
    creators,
    stats: {
      total: creators.length,
      noHistoryCount: creators.filter((c) => !c.hasHistory).length,
      ratedCount: rated.length,
      ratingAverage,
      medianRateByTier,
      skippedRows: skipped,
    },
  };
}
```

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run src/domain/parseCreators.test.ts` → PASS (11개)
- [ ] **Step 5: 커밋** — `feat: CSV 정제(BOM·CRLF·이상 행)와 파생 필드(규모·예상 단가·예상 평점) 계산` (배경: 설계 §3.3, §3.4, D11, D12, D15)

---

### Task 4: 백분위 (`percentile.ts`)

**Files:**
- Create: `src/domain/percentile.ts`
- Test: `src/domain/percentile.test.ts`

**Interfaces:**
- Produces: `percentileRanks(values: number[], higherIsBetter: boolean): PercentileResult[]` (`PercentileResult = { score: number; topPercent: number; rank: number; groupSize: number }`, 입력 순서 유지), `displayTopPercent(topPercent: number): number`

- [ ] **Step 1: 실패 테스트** — `src/domain/percentile.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { percentileRanks, displayTopPercent } from './percentile';

describe('percentileRanks (설계 §5.4)', () => {
  it('1등 100점, 꼴등 0점, 가운데 50점', () => {
    const r = percentileRanks([10, 30, 20], true);
    expect(r.map((x) => x.score)).toEqual([0, 100, 50]);
    expect(r.map((x) => x.topPercent)).toEqual([100, 0, 50]);
    expect(r.map((x) => x.rank)).toEqual([3, 1, 2]);
    expect(r[0].groupSize).toBe(3);
  });
  it('동점자는 절반 규칙: [10,20,20,30]에서 20은 (1 + 1/2) / 3 = 50%', () => {
    const r = percentileRanks([10, 20, 20, 30], true);
    expect(r[1].topPercent).toBe(50);
    expect(r[1].score).toBe(50);
    expect(r[2].score).toBe(50);
    expect(r[1].rank).toBe(2);
    expect(r[2].rank).toBe(2);
  });
  it('집단이 1명이면 50점', () => {
    const [r] = percentileRanks([42], true);
    expect(r.score).toBe(50);
    expect(r.topPercent).toBe(50);
    expect(r.rank).toBe(1);
  });
  it('낮을수록 좋음(비용)은 방향이 뒤집힌다', () => {
    const r = percentileRanks([10, 20, 30], false);
    expect(r.map((x) => x.score)).toEqual([100, 50, 0]);
  });
  it('점수는 소수 첫째 자리까지', () => {
    const r = percentileRanks([1, 2, 3, 4, 5, 6, 7], true);
    expect(r[5].score).toBe(83.3); // 상위 16.67% → 100 − 16.67 = 83.3
  });
});

describe('displayTopPercent', () => {
  it('반올림하되 최소 1', () => {
    expect(displayTopPercent(0)).toBe(1);
    expect(displayTopPercent(0.4)).toBe(1);
    expect(displayTopPercent(12.4)).toBe(12);
    expect(displayTopPercent(12.5)).toBe(13);
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/domain/percentile.test.ts` → FAIL
- [ ] **Step 3: 구현** — `src/domain/percentile.ts`

```ts
export interface PercentileResult {
  score: number;
  topPercent: number;
  rank: number;
  groupSize: number;
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

/**
 * 상위 % = (나보다 좋은 사람 수 + 동점자 수 ÷ 2) ÷ (집단 인원 − 1) × 100
 * 항목 점수 = 100 − 상위 %   (집단 1명이면 50)
 * 등수 = 나보다 좋은 사람 수 + 1
 */
export function percentileRanks(values: number[], higherIsBetter: boolean): PercentileResult[] {
  const n = values.length;
  return values.map((v) => {
    let better = 0;
    let ties = -1; // 자기 자신 제외
    for (const o of values) {
      if (o === v) ties += 1;
      else if (higherIsBetter ? o > v : o < v) better += 1;
    }
    const topPercent = n <= 1 ? 50 : ((better + ties / 2) / (n - 1)) * 100;
    return { score: round1(100 - topPercent), topPercent, rank: better + 1, groupSize: n };
  });
}

/** 화면 표시용 "상위 N%": 반올림, 최소 1 */
export function displayTopPercent(topPercent: number): number {
  return Math.max(1, Math.round(topPercent));
}
```

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run src/domain/percentile.test.ts` → PASS
- [ ] **Step 5: 커밋** — `feat: 항목 점수용 백분위 계산(동점 절반 규칙, 1명이면 50)` (배경: 설계 §5.4, D7)

---

### Task 5: 비중 (`weights.ts`)

**Files:**
- Create: `src/domain/weights.ts`
- Test: `src/domain/weights.test.ts`

**Interfaces:**
- Produces: `DEFAULT_WEIGHTS`, `METRIC_LABEL`, `WEIGHTS_STORAGE_KEY`, `sumWeights(w)`, `validateWeights(value: unknown): value is Weights` (정수 0~100, 합 100), `weightsSumIs100(w)` (실수 허용, 오차 1e-6), `normalizeWeights(w): Weights` (합으로 나눠 100으로), `loadWeights(storage?)`, `saveWeights(w, storage?): boolean`

- [ ] **Step 1: 실패 테스트** — `src/domain/weights.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_WEIGHTS, WEIGHTS_STORAGE_KEY, sumWeights, validateWeights, normalizeWeights,
  weightsSumIs100, loadWeights, saveWeights,
} from './weights';

describe('weights (설계 §5.5, §6.4)', () => {
  beforeEach(() => localStorage.clear());

  it('기본 비중은 30/25/20/15/10, 합 100', () => {
    expect(DEFAULT_WEIGHTS).toEqual({ engagement: 30, views: 25, rating: 20, costPerView: 15, campaigns: 10 });
    expect(sumWeights(DEFAULT_WEIGHTS)).toBe(100);
    expect(validateWeights(DEFAULT_WEIGHTS)).toBe(true);
  });

  it('합이 100이 아니거나 정수가 아니거나 범위 밖이면 무효', () => {
    expect(validateWeights({ ...DEFAULT_WEIGHTS, engagement: 40 })).toBe(false);
    expect(validateWeights({ ...DEFAULT_WEIGHTS, engagement: 30.5, views: 24.5 })).toBe(false);
    expect(validateWeights({ ...DEFAULT_WEIGHTS, engagement: -10, views: 65 })).toBe(false);
    expect(validateWeights(null)).toBe(false);
    expect(validateWeights({ engagement: 100 })).toBe(false);
  });

  it('normalizeWeights는 비율을 유지하며 합을 100으로 맞춘다', () => {
    const n = normalizeWeights({ ...DEFAULT_WEIGHTS, engagement: 40 }); // 합 110
    expect(weightsSumIs100(n)).toBe(true);
    expect(n.engagement).toBeCloseTo((40 / 110) * 100, 6);
    expect(normalizeWeights({ engagement: 0, views: 0, rating: 0, costPerView: 0, campaigns: 0 })).toEqual(DEFAULT_WEIGHTS);
  });

  it('저장 → 읽기 왕복', () => {
    const w = { engagement: 50, views: 20, rating: 10, costPerView: 10, campaigns: 10 };
    expect(saveWeights(w)).toBe(true);
    expect(loadWeights()).toEqual(w);
  });

  it('저장된 값이 없거나 손상됐으면 기본값', () => {
    expect(loadWeights()).toEqual(DEFAULT_WEIGHTS);
    localStorage.setItem(WEIGHTS_STORAGE_KEY, '{not json');
    expect(loadWeights()).toEqual(DEFAULT_WEIGHTS);
    localStorage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify({ engagement: 90 }));
    expect(loadWeights()).toEqual(DEFAULT_WEIGHTS);
  });

  it('합이 100이 아닌 비중은 저장을 거절한다', () => {
    expect(saveWeights({ ...DEFAULT_WEIGHTS, engagement: 31 })).toBe(false);
    expect(localStorage.getItem(WEIGHTS_STORAGE_KEY)).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/domain/weights.test.ts` → FAIL
- [ ] **Step 3: 구현** — `src/domain/weights.ts`

```ts
import { METRIC_KEYS } from './types';
import type { MetricKey, Weights } from './types';

export const WEIGHTS_STORAGE_KEY = 'creator-match.weights';

/** 기본 비중(임시, 설계 D9). 운영자 화면 실험 후 확정값으로 바꾼다 */
export const DEFAULT_WEIGHTS: Weights = { engagement: 30, views: 25, rating: 20, costPerView: 15, campaigns: 10 };

export const METRIC_LABEL: Record<MetricKey, string> = {
  engagement: '참여율',
  views: '평균 조회수',
  rating: '광고주 평점',
  costPerView: '조회 1회당 평균 비용',
  campaigns: '캠페인 건수',
};

export function sumWeights(w: Weights): number {
  return METRIC_KEYS.reduce((s, k) => s + w[k], 0);
}

/** 저장용 검증: 다섯 항목 모두 0~100 정수이고 합이 정확히 100 */
export function validateWeights(value: unknown): value is Weights {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  if (Object.keys(obj).length !== METRIC_KEYS.length) return false;
  for (const k of METRIC_KEYS) {
    const v = obj[k];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 100) return false;
  }
  return sumWeights(obj as Weights) === 100;
}

/** 계산용 검증: 실수 허용, 음수 없음, 합 100 (부동소수 오차 허용) */
export function weightsSumIs100(w: Weights): boolean {
  return METRIC_KEYS.every((k) => w[k] >= 0) && Math.abs(sumWeights(w) - 100) < 1e-6;
}

/** 합이 100이 아닌 비중을 비율로 환산 (운영자 미리보기용, L21). 합이 0이면 기본값 */
export function normalizeWeights(w: Weights): Weights {
  const s = sumWeights(w);
  if (s <= 0) return { ...DEFAULT_WEIGHTS };
  const out = {} as Weights;
  for (const k of METRIC_KEYS) out[k] = (w[k] / s) * 100;
  return out;
}

function defaultStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadWeights(storage: Storage | null = defaultStorage()): Weights {
  if (!storage) return { ...DEFAULT_WEIGHTS };
  try {
    const raw = storage.getItem(WEIGHTS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_WEIGHTS };
    const parsed: unknown = JSON.parse(raw);
    return validateWeights(parsed) ? { ...parsed } : { ...DEFAULT_WEIGHTS };
  } catch {
    return { ...DEFAULT_WEIGHTS };
  }
}

export function saveWeights(w: Weights, storage: Storage | null = defaultStorage()): boolean {
  if (!storage || !validateWeights(w)) return false;
  try {
    storage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify(w));
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run src/domain/weights.test.ts` → PASS
- [ ] **Step 5: 커밋** — `feat: 매칭 점수 비중 기본값·검증·비율 환산·브라우저 저장소 읽기/쓰기` (배경: 설계 §5.5, §6.4, D9, D23. 비율 환산은 L21)

---

### Task 6: 항목 점수와 매칭 점수 (`scoring.ts`)

**Files:**
- Create: `src/domain/scoring.ts`
- Test: `src/domain/scoring.test.ts`

**Interfaces:**
- Consumes: `percentileRanks`, `weightsSumIs100`, `types.ts`
- Produces: `scoreCreators(creators: Creator[]): ScoredCreator[]`, `matchScore(c: ScoredCreator, w: Weights): number`, `compareByMatch(a: RankedCreator, b: RankedCreator): number`, `rankCreators(list: ScoredCreator[], w: Weights): RankedCreator[]` (합 100 아니면 throw), `METRIC_DEFS`

- [ ] **Step 1: 실패 테스트** — `src/domain/scoring.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import csvText from '../../data/dummy_creators.csv?raw';
import { parseCreators } from './parseCreators';
import { scoreCreators, matchScore, rankCreators } from './scoring';
import { DEFAULT_WEIGHTS } from './weights';

const scored = scoreCreators(parseCreators(csvText).creators);
const byId = (id: string) => scored.find((c) => c.id === id)!;

describe('scoreCreators (설계 §5.3, §5.4)', () => {
  it('민준브이로그180(C0180)의 항목 점수 = 59.0 / 53.1 / 74.9 / 71.1 / 93.7', () => {
    const m = byId('C0180').metrics;
    expect(m.engagement.score).toBe(59.0);
    expect(m.views.score).toBe(53.1);
    expect(m.rating.score).toBe(74.9);
    expect(m.costPerView.score).toBe(71.1);
    expect(m.campaigns.score).toBe(93.7);
  });

  it('비교 집단: 참여율·조회수·비용은 같은 tier(129명), 평점·건수는 전체(200명)', () => {
    const m = byId('C0180').metrics;
    expect(m.engagement.groupLabel).toBe('마이크로');
    expect(m.engagement.groupSize).toBe(129);
    expect(m.engagement.rank).toBe(53);
    expect(m.rating.groupLabel).toBe('전체');
    expect(m.rating.groupSize).toBe(200);
    expect(m.campaigns.rank).toBe(10);
  });

  it('정은매거진77(C0077)은 평점 전체 1등, 비용 마이크로 2등', () => {
    const m = byId('C0077').metrics;
    expect(m.rating.rank).toBe(1);
    expect(m.rating.score).toBe(95.7); // 5.0 동점자가 많아 100이 아니다
    expect(m.costPerView.rank).toBe(2);
    expect(m.costPerView.score).toBe(99.2);
  });
});

describe('matchScore / rankCreators (설계 §5.5)', () => {
  it('기본 비중에서 민준브이로그180 = 65.99 → 표시 66', () => {
    const s = matchScore(byId('C0180'), DEFAULT_WEIGHTS);
    expect(s).toBeCloseTo(65.99, 2);
    expect(Math.round(s)).toBe(66);
  });

  it('비중 합이 100이 아니면 오류', () => {
    expect(() => rankCreators(scored, { ...DEFAULT_WEIGHTS, engagement: 40 })).toThrow();
  });

  it('비중을 바꾸면 순위가 바뀐다', () => {
    const base = rankCreators(scored, DEFAULT_WEIGHTS);
    const campaignsOnly = rankCreators(scored, { engagement: 0, views: 0, rating: 0, costPerView: 0, campaigns: 100 });
    expect(base[0].id).not.toBe(campaignsOnly[0].id);
    expect(campaignsOnly[0].metrics.campaigns.score).toBe(100);
  });

  it('정렬은 매칭 점수 → 참여율 → creator_id 순, 매칭 점수는 소수 그대로', () => {
    const ranked = rankCreators(scored, DEFAULT_WEIGHTS);
    for (let i = 1; i < ranked.length; i++) {
      const a = ranked[i - 1], b = ranked[i];
      const ok = a.matchScore > b.matchScore ||
        (a.matchScore === b.matchScore && (a.engagementRate > b.engagementRate ||
          (a.engagementRate === b.engagementRate && a.id < b.id)));
      expect(ok).toBe(true);
    }
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/domain/scoring.test.ts` → FAIL
- [ ] **Step 3: 구현** — `src/domain/scoring.ts`

```ts
import { METRIC_KEYS, TIERS } from './types';
import type { Creator, MetricKey, MetricScore, RankedCreator, ScoredCreator, Weights } from './types';
import { percentileRanks } from './percentile';
import { weightsSumIs100 } from './weights';

interface MetricDef {
  key: MetricKey;
  value: (c: Creator) => number;
  higherIsBetter: boolean;
  scope: 'tier' | 'all';
}

/** 설계 §5.3 표 */
export const METRIC_DEFS: MetricDef[] = [
  { key: 'engagement', value: (c) => c.engagementRate, higherIsBetter: true, scope: 'tier' },
  { key: 'views', value: (c) => c.avgViewCount, higherIsBetter: true, scope: 'tier' },
  { key: 'rating', value: (c) => c.rating, higherIsBetter: true, scope: 'all' },
  { key: 'costPerView', value: (c) => c.costPerView, higherIsBetter: false, scope: 'tier' },
  { key: 'campaigns', value: (c) => c.totalCampaignCount, higherIsBetter: true, scope: 'all' },
];

/** 로드 시 전원에 대해 1회 계산. 검색과 무관 (설계 §5.4) */
export function scoreCreators(creators: Creator[]): ScoredCreator[] {
  const metricsById = new Map<string, Partial<Record<MetricKey, MetricScore>>>();
  const put = (group: Creator[], def: MetricDef, groupLabel: string) => {
    const results = percentileRanks(group.map(def.value), def.higherIsBetter);
    group.forEach((c, i) => {
      const m = metricsById.get(c.id) ?? {};
      m[def.key] = { key: def.key, groupLabel, ...results[i] };
      metricsById.set(c.id, m);
    });
  };
  for (const def of METRIC_DEFS) {
    if (def.scope === 'all') put(creators, def, '전체');
    else for (const t of TIERS) put(creators.filter((c) => c.tier === t), def, t);
  }
  return creators.map((c) => ({ ...c, metrics: metricsById.get(c.id) as Record<MetricKey, MetricScore> }));
}

/** 매칭 점수 = Σ 항목 점수 × 비중 ÷ 100 (반올림은 표시할 때만) */
export function matchScore(c: ScoredCreator, weights: Weights): number {
  return METRIC_KEYS.reduce((sum, k) => sum + (c.metrics[k].score * weights[k]) / 100, 0);
}

/** 동점 정렬: 매칭 점수 desc → 참여율 desc → creator_id asc (설계 §5.5) */
export function compareByMatch(a: RankedCreator, b: RankedCreator): number {
  if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
  if (b.engagementRate !== a.engagementRate) return b.engagementRate - a.engagementRate;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function rankCreators(list: ScoredCreator[], weights: Weights): RankedCreator[] {
  if (!weightsSumIs100(weights)) throw new Error('비중 합이 100이어야 합니다.');
  return list.map((c) => ({ ...c, matchScore: matchScore(c, weights) })).sort(compareByMatch);
}
```

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run src/domain/scoring.test.ts` → PASS
- [ ] **Step 5: 커밋** — `feat: 항목 점수(백분위, 비교 집단) 및 매칭 점수·동점 정렬` (배경: 설계 §5.3~5.5, D6~D9. 검증 숫자는 L21에서 갱신된 74.9 / 65.99)

---

### Task 7: 숫자 표시 (`format.ts`)

**Files:**
- Create: `src/domain/format.ts`
- Test: `src/domain/format.test.ts`

**Interfaces:**
- Produces: `formatWon(n)` ("150만 원", "472만 5,000원", "8,000원"), `formatCompact(n)` ("9.7만", "10만", "8,279" — 팔로워·조회수·단가 셀 공용), `formatPercent(n)` ("6.5%"), `formatRating(n)` ("4.4", "5.0"), `formatCostPerView(n)` ("85원"), `formatInt(n)` ("1,234")

- [ ] **Step 1: 실패 테스트** — `src/domain/format.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { formatWon, formatCompact, formatPercent, formatRating, formatCostPerView, formatInt } from './format';

describe('format (설계 §4, §6.1)', () => {
  it('formatWon: 만 단위 + 원', () => {
    expect(formatWon(1_500_000)).toBe('150만 원');
    expect(formatWon(500_000)).toBe('50만 원');
    expect(formatWon(3_010_000)).toBe('301만 원');
    expect(formatWon(4_725_000)).toBe('472만 5,000원');
    expect(formatWon(12_345_678)).toBe('1,234만 5,678원');
    expect(formatWon(8_000)).toBe('8,000원');
    expect(formatWon(0)).toBe('0원');
  });
  it('formatCompact: 1만 이상은 소수 첫째 자리 만 단위, 미만은 콤마', () => {
    expect(formatCompact(97_242)).toBe('9.7만');
    expect(formatCompact(100_000)).toBe('10만');
    expect(formatCompact(123_861)).toBe('12.4만');
    expect(formatCompact(780_000)).toBe('78만');
    expect(formatCompact(1_320_000)).toBe('132만');
    expect(formatCompact(4_725_000)).toBe('472.5만');
    expect(formatCompact(8_279)).toBe('8,279');
    expect(formatCompact(918)).toBe('918');
  });
  it('formatPercent / formatRating / formatCostPerView / formatInt', () => {
    expect(formatPercent(6.5)).toBe('6.5%');
    expect(formatPercent(7)).toBe('7.0%');
    expect(formatRating(4.42)).toBe('4.4');
    expect(formatRating(5)).toBe('5.0');
    expect(formatCostPerView(84.55)).toBe('85원');
    expect(formatCostPerView(22.18)).toBe('22원');
    expect(formatCostPerView(1234.6)).toBe('1,235원');
    expect(formatInt(1234567)).toBe('1,234,567');
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/domain/format.test.ts` → FAIL
- [ ] **Step 3: 구현** — `src/domain/format.ts`

```ts
const MAN = 10_000;

export function formatInt(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}

/** 예산·단가 전체 표기: 1,500,000 → "150만 원", 4,725,000 → "472만 5,000원", 8,000 → "8,000원" */
export function formatWon(n: number): string {
  const v = Math.round(n);
  if (v < MAN) return `${formatInt(v)}원`;
  const man = Math.floor(v / MAN);
  const rest = v % MAN;
  return rest === 0 ? `${formatInt(man)}만 원` : `${formatInt(man)}만 ${formatInt(rest)}원`;
}

/** 표 셀용 축약: 97,242 → "9.7만", 100,000 → "10만", 8,279 → "8,279" */
export function formatCompact(n: number): string {
  if (n < MAN) return formatInt(n);
  const man = n / MAN;
  const text = (Math.round(man * 10) / 10).toFixed(1).replace(/\.0$/, '');
  return `${Number(text).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만`;
}

export function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function formatRating(n: number): string {
  return n.toFixed(1);
}

/** 조회 1회당 평균 비용은 정수 원으로 (L21) */
export function formatCostPerView(n: number): string {
  return `${formatInt(n)}원`;
}
```

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run src/domain/format.test.ts` → PASS
- [ ] **Step 5: 커밋** — `feat: 금액·인원·비율 표시 변환(150만 원, 9.7만, 예상 4.4 등)` (배경: 설계 §4 "예산 표시", §6.1 표 열)

---

### Task 8: 필터·정렬·결과 필터 (`recommend.ts` 1부)

**Files:**
- Create: `src/domain/recommend.ts`
- Test: `src/domain/recommend.test.ts`

**Interfaces:**
- Consumes: `compareByMatch`, `rankCreators`, `types.ts`
- Produces:
  - `interface SearchInput { budget: number; categories: Category[]; tier: Tier }`
  - `filterCandidates<T extends Creator>(all: T[], input: SearchInput): T[]`
  - `type SortKey = 'match' | 'engagement' | 'views' | 'rating' | 'campaigns' | 'rate'`, `type SortDirection = 'asc' | 'desc'`, `interface SortState { key: SortKey; direction: SortDirection }`, `DEFAULT_SORT`, `SORT_DEFAULT_DIRECTION`, `SORT_LABEL`
  - `sortCandidates(list: RankedCreator[], sort: SortState): RankedCreator[]`
  - `interface ResultFilters { platform: 'all' | Platform; historyOnly: boolean }`, `DEFAULT_FILTERS`, `applyResultFilters<T extends Creator>(list: T[], f: ResultFilters): T[]`

- [ ] **Step 1: 실패 테스트** — `src/domain/recommend.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import csvText from '../../data/dummy_creators.csv?raw';
import { parseCreators } from './parseCreators';
import { scoreCreators, rankCreators } from './scoring';
import { DEFAULT_WEIGHTS } from './weights';
import { filterCandidates, sortCandidates, applyResultFilters } from './recommend';
import type { SearchInput } from './recommend';

const ranked = rankCreators(scoreCreators(parseCreators(csvText).creators), DEFAULT_WEIGHTS);
const Q: SearchInput = { budget: 1_500_000, categories: ['뷰티', '패션'], tier: '마이크로' };

describe('filterCandidates (설계 §5.1)', () => {
  it('뷰티+패션 / 마이크로 / 150만 → 18명, 1위 정은매거진77, 2위 민준브이로그180', () => {
    const c = filterCandidates(ranked, Q);
    expect(c).toHaveLength(18);
    expect(c[0].id).toBe('C0077');
    expect(c[1].id).toBe('C0180');
  });
  it('예산 경계: 단가 == 예산은 포함 (민석스토리37, 테크·마이크로 1,500,000)', () => {
    const at = filterCandidates(ranked, { budget: 1_500_000, categories: ['테크'], tier: '마이크로' });
    const below = filterCandidates(ranked, { budget: 1_499_999, categories: ['테크'], tier: '마이크로' });
    expect(at.some((c) => c.id === 'C0037')).toBe(true);
    expect(below.some((c) => c.id === 'C0037')).toBe(false);
  });
  it('이력 없는 사람은 예상 단가로 판정된다 (C0036 예상 132만 → 150만 예산에 포함, 130만엔 제외)', () => {
    expect(filterCandidates(ranked, Q).some((c) => c.id === 'C0036')).toBe(true);
    expect(filterCandidates(ranked, { ...Q, budget: 1_300_000 }).some((c) => c.id === 'C0036')).toBe(false);
  });
});

describe('sortCandidates (설계 §5.10)', () => {
  const cands = filterCandidates(ranked, Q);

  it('기본(매칭 점수 desc)은 rankCreators 순서와 같다', () => {
    const s = sortCandidates(cands, { key: 'match', direction: 'desc' });
    expect(s.map((c) => c.id)).toEqual(cands.map((c) => c.id));
  });
  it('평점순: 이력 없음 3명(C0036, C0109, C0145)이 맨 아래, 나머지는 평점 desc', () => {
    const s = sortCandidates(cands, { key: 'rating', direction: 'desc' });
    expect(s.slice(-3).map((c) => c.hasHistory)).toEqual([false, false, false]);
    expect(new Set(s.slice(-3).map((c) => c.id))).toEqual(new Set(['C0036', 'C0109', 'C0145']));
    expect(s[0].rating).toBe(5.0);
    expect(s[0].id).toBe('C0077'); // 5.0 동점(C0077, C0078) → 매칭 점수 높은 순
  });
  it('평점 낮은 순(asc)에서도 이력 없음은 맨 아래 (L21)', () => {
    const s = sortCandidates(cands, { key: 'rating', direction: 'asc' });
    expect(s.slice(-3).every((c) => !c.hasHistory)).toBe(true);
    expect(s[0].rating).toBe(4.0);
  });
  it('단가 낮은 순: 예상 단가(132만)가 실제 단가 사이에 섞여 정렬된다', () => {
    const s = sortCandidates(cands, { key: 'rate', direction: 'asc' });
    expect(s[0].id).toBe('C0177'); // 540,000
    const rates = s.map((c) => c.rate);
    expect([...rates].sort((a, b) => a - b)).toEqual(rates);
    const idx = s.findIndex((c) => c.id === 'C0036');
    expect(s[idx - 1].rate).toBeLessThanOrEqual(1_320_000);
    expect(s[idx + 3].rate).toBeGreaterThanOrEqual(1_320_000);
  });
  it('참여율 동점(8.1: C0036, C0066, C0177)은 매칭 점수 순으로', () => {
    const s = sortCandidates(cands, { key: 'engagement', direction: 'desc' });
    expect(s.slice(0, 3).map((c) => c.id)).toEqual(['C0036', 'C0066', 'C0177']);
  });
  it('원본 배열을 바꾸지 않는다', () => {
    const before = cands.map((c) => c.id);
    sortCandidates(cands, { key: 'rate', direction: 'asc' });
    expect(cands.map((c) => c.id)).toEqual(before);
  });
});

describe('applyResultFilters (설계 §5.10 필터)', () => {
  const cands = filterCandidates(ranked, Q);
  it('유튜브만 → 7명, 이력 있는 사람만 → 15명, 둘 다 → 5명', () => {
    expect(applyResultFilters(cands, { platform: '유튜브', historyOnly: false })).toHaveLength(7);
    expect(applyResultFilters(cands, { platform: 'all', historyOnly: true })).toHaveLength(15);
    expect(applyResultFilters(cands, { platform: '유튜브', historyOnly: true })).toHaveLength(5);
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/domain/recommend.test.ts` → FAIL
- [ ] **Step 3: 구현** — `src/domain/recommend.ts` (Task 9에서 같은 파일에 0명 진단을 덧붙인다)

```ts
import type { Category, Creator, Platform, RankedCreator, Tier } from './types';
import { compareByMatch } from './scoring';

// ───────────── 1단계 필터 (설계 §5.1) ─────────────

export interface SearchInput {
  budget: number;
  categories: Category[];
  tier: Tier;
}

export function filterCandidates<T extends Creator>(all: T[], input: SearchInput): T[] {
  return all.filter(
    (c) => input.categories.includes(c.category) && c.tier === input.tier && c.rate <= input.budget,
  );
}

// ───────────── 정렬 (설계 §5.10) ─────────────

export type SortKey = 'match' | 'engagement' | 'views' | 'rating' | 'campaigns' | 'rate';
export type SortDirection = 'asc' | 'desc';
export interface SortState {
  key: SortKey;
  direction: SortDirection;
}

export const DEFAULT_SORT: SortState = { key: 'match', direction: 'desc' };

export const SORT_DEFAULT_DIRECTION: Record<SortKey, SortDirection> = {
  match: 'desc', engagement: 'desc', views: 'desc', rating: 'desc', campaigns: 'desc', rate: 'asc',
};

export const SORT_LABEL: Record<SortKey, string> = {
  match: '매칭 점수', engagement: '참여율', views: '평균 조회수', rating: '광고주 평점', campaigns: '캠페인 건수', rate: '단가',
};

const SORT_VALUE: Record<SortKey, (c: RankedCreator) => number> = {
  match: (c) => c.matchScore,
  engagement: (c) => c.engagementRate,
  views: (c) => c.avgViewCount,
  rating: (c) => c.rating,
  campaigns: (c) => c.totalCampaignCount,
  rate: (c) => c.rate,
};

/** 순서만 바꾼다. 매칭 점수는 그대로. 평점순에서는 이력 없음(예상 평점)이 방향과 무관하게 맨 아래 */
export function sortCandidates(list: RankedCreator[], sort: SortState): RankedCreator[] {
  const sign = sort.direction === 'asc' ? 1 : -1;
  const value = SORT_VALUE[sort.key];
  return [...list].sort((a, b) => {
    if (sort.key === 'rating' && a.hasHistory !== b.hasHistory) return a.hasHistory ? -1 : 1;
    const d = value(a) - value(b);
    if (d !== 0) return d * sign;
    return compareByMatch(a, b);
  });
}

// ───────────── 결과 화면 필터 (설계 §5.1 마지막 단락, §5.10) ─────────────

export interface ResultFilters {
  platform: 'all' | Platform;
  historyOnly: boolean;
}

export const DEFAULT_FILTERS: ResultFilters = { platform: 'all', historyOnly: false };

export function applyResultFilters<T extends Creator>(list: T[], f: ResultFilters): T[] {
  return list.filter(
    (c) => (f.platform === 'all' || c.platform === f.platform) && (!f.historyOnly || c.hasHistory),
  );
}
```

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run src/domain/recommend.test.ts` → PASS
- [ ] **Step 5: 커밋** — `feat: 후보 필터(카테고리·규모·예산), 6기준 정렬, 플랫폼·이력 결과 필터` (배경: 설계 §5.1, §5.10, D1, D3, D4, D18~D20)

---

### Task 9: 후보 0명 진단·완화·근접 후보 (`recommend.ts` 2부)

**Files:**
- Modify: `src/domain/recommend.ts` (끝에 추가)
- Test: `src/domain/recommend.zero.test.ts`

**Interfaces:**
- Consumes: `formatWon`, `CATEGORIES`, `TIERS`, `compareByMatch`, `filterCandidates`
- Produces:
  - `interface Relaxation { id: string; kind: 'budget' | 'tier' | 'category'; label: string; count: number; enabled: boolean; nextInput: SearchInput; note: string | null }`
  - `interface NearCandidate { creator: RankedCreator; change: string }`
  - `interface ZeroResultInfo { diagnosis: string; extraNote: string | null; relaxations: Relaxation[]; nearCandidates: NearCandidate[] }`
  - `buildRelaxations(all: RankedCreator[], input: SearchInput): Relaxation[]`
  - `nearCandidates(all: RankedCreator[], input: SearchInput, limit?: number): NearCandidate[]`
  - `diagnoseZeroResult(all: RankedCreator[], input: SearchInput): ZeroResultInfo`
  - `FEW_RESULTS_THRESHOLD = 3` (후보가 이 값 미만이면 "후보가 적습니다")

- [ ] **Step 1: 실패 테스트** — `src/domain/recommend.zero.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import csvText from '../../data/dummy_creators.csv?raw';
import { parseCreators } from './parseCreators';
import { scoreCreators, rankCreators } from './scoring';
import { DEFAULT_WEIGHTS } from './weights';
import { diagnoseZeroResult, buildRelaxations, nearCandidates, filterCandidates, FEW_RESULTS_THRESHOLD } from './recommend';
import type { SearchInput } from './recommend';

const ranked = rankCreators(scoreCreators(parseCreators(csvText).creators), DEFAULT_WEIGHTS);
const Q: SearchInput = { budget: 500_000, categories: ['뷰티'], tier: '매크로' };

describe('diagnoseZeroResult: 뷰티 / 매크로 / 50만 (설계 §5.7, §8.7)', () => {
  const info = diagnoseZeroResult(ranked, Q);

  it('후보가 정말 0명이다', () => {
    expect(filterCandidates(ranked, Q)).toHaveLength(0);
  });

  it('진단 문구: 4명 있지만 모두 예산 초과, 최저 단가 301만 원', () => {
    expect(info.diagnosis).toBe(
      '뷰티 카테고리의 매크로 크리에이터는 4명 있지만, 모두 단가가 예산 50만 원을 넘습니다. 가장 낮은 단가는 301만 원입니다.',
    );
    expect(info.extraNote).toBeNull(); // 50만으로 살 수 있는 사람이 다른 규모엔 있다
  });

  it('완화 버튼: 예산 301만 원 → 1명 / 나노 3명 / 마이크로 0명(비활성, 최저 단가 54만 원) / 카테고리 넓히기 0명(최저 224만 원)', () => {
    const byId = Object.fromEntries(info.relaxations.map((r) => [r.id, r]));
    expect(byId.budget.label).toBe('예산을 301만 원으로 올리면');
    expect(byId.budget.count).toBe(1);
    expect(byId.budget.enabled).toBe(true);
    expect(byId.budget.nextInput).toEqual({ ...Q, budget: 3_010_000 });

    expect(byId['tier-나노'].count).toBe(3);
    expect(byId['tier-나노'].enabled).toBe(true);
    expect(byId['tier-나노'].nextInput.tier).toBe('나노');

    expect(byId['tier-마이크로'].count).toBe(0);
    expect(byId['tier-마이크로'].enabled).toBe(false);
    expect(byId['tier-마이크로'].note).toBe('최저 단가 54만 원');

    expect(byId.category.count).toBe(0);
    expect(byId.category.enabled).toBe(false);
    expect(byId.category.note).toBe('최저 단가 224만 원');
    expect(byId.category.nextInput.categories).toHaveLength(10);
  });

  it('근접 후보 3명: 준그램40(예산), 라이프뷰티181(예산·예상 단가), 유나매거진115(규모)', () => {
    expect(info.nearCandidates).toHaveLength(3);
    expect(info.nearCandidates.map((n) => n.creator.id)).toEqual(['C0040', 'C0181', 'C0115']);
    expect(info.nearCandidates[0].change).toBe('예산을 658만 원 이상으로');
    expect(info.nearCandidates[1].change).toBe('예산을 472만 5,000원 이상으로');
    expect(info.nearCandidates[2].change).toBe('규모를 나노로');
  });
});

describe('diagnoseZeroResult: 그 밖의 경우', () => {
  it('극단 예산 5만 원: 전체 최저 단가 문구가 붙는다', () => {
    const info = diagnoseZeroResult(ranked, { ...Q, budget: 50_000 });
    expect(info.extraNote).toBe('전체 크리에이터의 최저 단가는 21만 원입니다.');
    expect(info.relaxations.find((r) => r.id === 'category')!.note).toBe('최저 단가 224만 원');
  });

  it('카테고리에 해당 규모가 없으면 문구가 달라지고 예산 버튼은 없다 (합성 데이터)', () => {
    const HEADER =
      'creator_id,creator_name,category,platform,followers,avg_view_count,engagement_rate,total_campaign_count,total_campaign_budget_krw,avg_campaign_budget_krw,advertiser_rating';
    const rows = [
      'S1,나노뷰티,뷰티,유튜브,5000,1000,7.0,2,600000,300000,4.5',
      'S2,마이크로뷰티,뷰티,유튜브,50000,9000,6.0,5,5000000,1000000,4.0',
      'S3,매크로게임,게임,유튜브,200000,80000,5.0,10,40000000,4000000,4.8',
    ];
    const small = rankCreators(scoreCreators(parseCreators(HEADER + '\n' + rows.join('\n') + '\n').creators), DEFAULT_WEIGHTS);
    const info = diagnoseZeroResult(small, { budget: 5_000_000, categories: ['뷰티'], tier: '매크로' });
    expect(info.diagnosis).toBe('선택한 카테고리에는 매크로 크리에이터가 없습니다.');
    expect(info.relaxations.find((r) => r.id === 'budget')).toBeUndefined();
    expect(info.relaxations.find((r) => r.id === 'category')!.count).toBe(1); // 매크로게임
    expect(info.nearCandidates.map((n) => n.change)).toEqual(['카테고리에 게임 추가', '규모를 마이크로로', '규모를 나노로']);
  });

  it('근접 후보가 없으면 빈 배열 (조건 두 개 이상 어긋난 사람만 있을 때)', () => {
    const near = nearCandidates(ranked, { budget: 50_000, categories: ['뷰티'], tier: '매크로' });
    // 예산 5만 원은 아무도 못 맞추므로, 예산만 어긋난 사람 = 뷰티·매크로 4명
    expect(near.every((n) => n.change.startsWith('예산을'))).toBe(true);
    expect(near).toHaveLength(3);
  });
});

describe('buildRelaxations: 후보 1~2명 (설계 §5.7 마지막)', () => {
  it('뷰티 / 매크로 / 310만 → 후보 1명, 예산 제안은 다음 사람 472만 5,000원 → 2명', () => {
    const q: SearchInput = { budget: 3_100_000, categories: ['뷰티'], tier: '매크로' };
    const cands = filterCandidates(ranked, q);
    expect(cands).toHaveLength(1);
    expect(cands.length).toBeLessThan(FEW_RESULTS_THRESHOLD);
    const budget = buildRelaxations(ranked, q).find((r) => r.id === 'budget')!;
    expect(budget.label).toBe('예산을 472만 5,000원으로 올리면');
    expect(budget.count).toBe(2);
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/domain/recommend.zero.test.ts` → FAIL
- [ ] **Step 3: 구현** — `src/domain/recommend.ts` 끝에 추가 (import 줄도 보강)

파일 맨 위 import를 다음으로 바꾼다:
```ts
import { CATEGORIES, TIERS } from './types';
import type { Category, Creator, Platform, RankedCreator, Tier } from './types';
import { compareByMatch } from './scoring';
import { formatWon } from './format';
```

파일 끝에 추가:
```ts
// ───────────── 후보가 없거나 적을 때 (설계 §5.7) ─────────────

/** 후보가 이 값 미만이면 표 아래에 완화 버튼을 작게 붙인다 */
export const FEW_RESULTS_THRESHOLD = 3;

export interface Relaxation {
  id: string;
  kind: 'budget' | 'tier' | 'category';
  /** 버튼 앞부분 문구. 화면에서 "{label} → {count}명"으로 그린다 */
  label: string;
  count: number;
  enabled: boolean;
  nextInput: SearchInput;
  /** 비활성일 때 곁에 적는 말: "최저 단가 54만 원" 또는 "해당 크리에이터 없음" */
  note: string | null;
}

export interface NearCandidate {
  creator: RankedCreator;
  /** "이렇게 바꾸면 섭외 가능" 열 문구 */
  change: string;
}

export interface ZeroResultInfo {
  diagnosis: string;
  extraNote: string | null;
  relaxations: Relaxation[];
  nearCandidates: NearCandidate[];
}

function minRate(list: { rate: number }[]): number | null {
  return list.length ? Math.min(...list.map((c) => c.rate)) : null;
}

/** 조건 완화 버튼. 0명일 때와 1~2명일 때 공용 */
export function buildRelaxations(all: RankedCreator[], input: SearchInput): Relaxation[] {
  const out: Relaxation[] = [];

  // 예산 올리기: 카테고리·규모는 맞는데 예산을 넘는 사람 중 최저 단가로
  const A = all.filter((c) => input.categories.includes(c.category) && c.tier === input.tier);
  const proposal = minRate(A.filter((c) => c.rate > input.budget));
  if (proposal !== null) {
    const count = A.filter((c) => c.rate <= proposal).length;
    out.push({
      id: 'budget', kind: 'budget',
      label: `예산을 ${formatWon(proposal)}으로 올리면`,
      count, enabled: count > 0,
      nextInput: { ...input, budget: proposal }, note: null,
    });
  }

  // 규모 바꾸기: 다른 두 tier 각각
  for (const t of TIERS) {
    if (t === input.tier) continue;
    const pool = all.filter((c) => input.categories.includes(c.category) && c.tier === t);
    const count = pool.filter((c) => c.rate <= input.budget).length;
    const min = minRate(pool);
    out.push({
      id: `tier-${t}`, kind: 'tier',
      label: `규모를 ${t}로 바꾸면`,
      count, enabled: count > 0,
      nextInput: { ...input, tier: t },
      note: count > 0 ? null : min === null ? '해당 크리에이터 없음' : `최저 단가 ${formatWon(min)}`,
    });
  }

  // 카테고리 넓히기: 같은 규모 전체
  const pool = all.filter((c) => c.tier === input.tier);
  const count = pool.filter((c) => c.rate <= input.budget).length;
  const min = minRate(pool);
  out.push({
    id: 'category', kind: 'category',
    label: `카테고리를 넓히면 (${input.tier} 전체)`,
    count, enabled: count > 0,
    nextInput: { ...input, categories: [...CATEGORIES] },
    note: count > 0 ? null : min === null ? '해당 크리에이터 없음' : `최저 단가 ${formatWon(min)}`,
  });

  return out;
}

/** 세 조건 중 정확히 하나만 어긋나는 사람들 → 매칭 점수 상위 limit명 */
export function nearCandidates(all: RankedCreator[], input: SearchInput, limit = 3): NearCandidate[] {
  const out: NearCandidate[] = [];
  for (const c of all) {
    const categoryOk = input.categories.includes(c.category);
    const tierOk = c.tier === input.tier;
    const budgetOk = c.rate <= input.budget;
    const missed = [categoryOk, tierOk, budgetOk].filter((ok) => !ok).length;
    if (missed !== 1) continue;
    const change = !budgetOk
      ? `예산을 ${formatWon(c.rate)} 이상으로`
      : !tierOk
        ? `규모를 ${c.tier}로`
        : `카테고리에 ${c.category} 추가`;
    out.push({ creator: c, change });
  }
  return out.sort((a, b) => compareByMatch(a.creator, b.creator)).slice(0, limit);
}

export function diagnoseZeroResult(all: RankedCreator[], input: SearchInput): ZeroResultInfo {
  const A = all.filter((c) => input.categories.includes(c.category) && c.tier === input.tier);
  const diagnosis =
    A.length === 0
      ? `선택한 카테고리에는 ${input.tier} 크리에이터가 없습니다.`
      : `${input.categories.join('·')} 카테고리의 ${input.tier} 크리에이터는 ${A.length}명 있지만, 모두 단가가 예산 ${formatWon(input.budget)}을 넘습니다. 가장 낮은 단가는 ${formatWon(minRate(A) as number)}입니다.`;
  const anyAffordable = all.some((c) => c.rate <= input.budget);
  const extraNote = anyAffordable ? null : `전체 크리에이터의 최저 단가는 ${formatWon(minRate(all) as number)}입니다.`;
  return { diagnosis, extraNote, relaxations: buildRelaxations(all, input), nearCandidates: nearCandidates(all, input) };
}
```

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run src/domain/recommend.zero.test.ts src/domain/recommend.test.ts` → PASS
- [ ] **Step 5: 커밋** — `feat: 후보 0명 진단 문구, 조건 완화 버튼 계산, 근접 후보 3명` (배경: 설계 §5.7, D16. 마이크로 최저 단가 540,000과 1~2명 예산 제안 규칙은 L21)

---

### Task 10: 추천 근거 (`explain.ts`)

**Files:**
- Create: `src/domain/explain.ts`
- Test: `src/domain/explain.test.ts`

**Interfaces:**
- Consumes: `displayTopPercent`, `METRIC_LABEL`, format 함수들
- Produces: `interface Chip { key: MetricKey; text: string }`, `interface Caution { key: MetricKey; text: string }` (text에 "유의점: " 접두는 없음, 화면에서 붙임), `interface MetricBar { key: MetricKey; label: string; score: number; rankText: string }`, `strengthChips(c: ScoredCreator, limit?: number): Chip[]`, `cautions(c: ScoredCreator): Caution[]`, `metricBars(c: ScoredCreator): MetricBar[]`, `CAUTION_THRESHOLD = 25`

- [ ] **Step 1: 실패 테스트** — `src/domain/explain.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import csvText from '../../data/dummy_creators.csv?raw';
import { parseCreators } from './parseCreators';
import { scoreCreators } from './scoring';
import { strengthChips, cautions, metricBars, CAUTION_THRESHOLD } from './explain';

const scored = scoreCreators(parseCreators(csvText).creators);
const byId = (id: string) => scored.find((c) => c.id === id)!;

describe('strengthChips (설계 §5.8)', () => {
  it('정은매거진77: 항목 점수 상위 3개 = 비용(99.2), 조회수(97.7), 평점(95.7)', () => {
    const chips = strengthChips(byId('C0077'));
    expect(chips.map((c) => c.key)).toEqual(['costPerView', 'views', 'rating']);
    expect(chips[0].text).toBe('조회 1회당 22원, 마이크로 상위 1%');
    expect(chips[1].text).toBe('평균 조회수 상위 2% (마이크로 기준)');
    expect(chips[2].text).toBe('광고주 평점 5.0, 전체 상위 4%');
  });
  it('이력 없음(지수챌린지36)은 평점·건수 칩을 뽑지 않는다', () => {
    const chips = strengthChips(byId('C0036'));
    expect(chips).toHaveLength(3);
    expect(chips.map((c) => c.key).sort()).toEqual(['costPerView', 'engagement', 'views']);
    expect(chips[0].text).toBe('평균 조회수 상위 20% (마이크로 기준)'); // 80.5 > 78.1 > 77.0
  });
  it('캠페인 건수 칩 문구(민준브이로그180)', () => {
    const chips = strengthChips(byId('C0180'));
    expect(chips[0].text).toBe('캠페인 경험 28건, 전체 상위 6%');
  });
  it('상위 % 표시는 최소 1 (라이프뷰티181은 매크로 조회수 1등, 상위 0%)', () => {
    const chips = strengthChips(byId('C0181'));
    expect(chips[0].text).toBe('평균 조회수 상위 1% (매크로 기준)');
  });
});

describe('cautions (설계 §5.8)', () => {
  it(`항목 점수 ${CAUTION_THRESHOLD} 미만이면 유의점`, () => {
    expect(cautions(byId('C0077'))).toEqual([{ key: 'engagement', text: '참여율은 마이크로 중 하위권입니다 (6.5%)' }]);
  });
  it('여러 개면 모두, 항목 순서대로 (태호채널116: 조회수·평점·건수)', () => {
    const c = cautions(byId('C0116'));
    expect(c.map((x) => x.key)).toEqual(['views', 'rating', 'campaigns']);
    expect(c[0].text).toBe('평균 조회수는 마이크로 중 하위권입니다 (2,254)');
    expect(c[1].text).toBe('광고주 평점은 전체 중 하위권입니다 (4.0)');
    expect(c[2].text).toBe('캠페인 건수는 전체 중 하위권입니다 (1건)');
  });
  it('이력 없음은 건수 유의점을 넣지 않는다 (배지가 말함)', () => {
    expect(cautions(byId('C0036'))).toEqual([]);
    expect(cautions(byId('C0181')).map((x) => x.key)).toEqual([]); // 참여율 25.0은 미만이 아님
  });
});

describe('metricBars (설계 §5.8)', () => {
  it('5개, 항목 순서, 정수 점수, "{집단} {인원}명 중 {등수}등"', () => {
    const bars = metricBars(byId('C0180'));
    expect(bars.map((b) => b.key)).toEqual(['engagement', 'views', 'rating', 'costPerView', 'campaigns']);
    expect(bars[0]).toEqual({ key: 'engagement', label: '참여율', score: 59, rankText: '마이크로 129명 중 53등' });
    expect(bars[2]).toEqual({ key: 'rating', label: '광고주 평점', score: 75, rankText: '전체 200명 중 46등' });
    expect(bars[4].rankText).toBe('전체 200명 중 10등');
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/domain/explain.test.ts` → FAIL
- [ ] **Step 3: 구현** — `src/domain/explain.ts`

```ts
import { METRIC_KEYS } from './types';
import type { MetricKey, ScoredCreator } from './types';
import { METRIC_LABEL } from './weights';
import { displayTopPercent } from './percentile';
import { formatCompact, formatCostPerView, formatPercent, formatRating } from './format';

/** 항목 점수가 이 값 미만이면 유의점 */
export const CAUTION_THRESHOLD = 25;

export interface Chip { key: MetricKey; text: string }
export interface Caution { key: MetricKey; text: string }
export interface MetricBar { key: MetricKey; label: string; score: number; rankText: string }

/** 이력 없는 사람에게는 뽑지 않는 항목 (예상 평점·건수 0) */
const HISTORY_ONLY_KEYS: MetricKey[] = ['rating', 'campaigns'];

function chipText(c: ScoredCreator, key: MetricKey): string {
  const top = displayTopPercent(c.metrics[key].topPercent);
  switch (key) {
    case 'engagement': return `참여율 상위 ${top}% (${c.tier} 기준)`;
    case 'views': return `평균 조회수 상위 ${top}% (${c.tier} 기준)`;
    case 'rating': return `광고주 평점 ${formatRating(c.rating)}, 전체 상위 ${top}%`;
    case 'campaigns': return `캠페인 경험 ${c.totalCampaignCount}건, 전체 상위 ${top}%`;
    case 'costPerView': return `조회 1회당 ${formatCostPerView(c.costPerView)}, ${c.tier} 상위 ${top}%`;
  }
}

/** 강점 칩: 항목 점수 높은 순 최대 limit개 */
export function strengthChips(c: ScoredCreator, limit = 3): Chip[] {
  const keys = c.hasHistory ? [...METRIC_KEYS] : METRIC_KEYS.filter((k) => !HISTORY_ONLY_KEYS.includes(k));
  return keys
    .map((key) => ({ key, score: c.metrics[key].score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ key }) => ({ key, text: chipText(c, key) }));
}

const SUBJECT: Record<MetricKey, string> = {
  engagement: '참여율은',
  views: '평균 조회수는',
  rating: '광고주 평점은',
  costPerView: '조회 1회당 평균 비용은',
  campaigns: '캠페인 건수는',
};

const RAW_VALUE: Record<MetricKey, (c: ScoredCreator) => string> = {
  engagement: (c) => formatPercent(c.engagementRate),
  views: (c) => formatCompact(c.avgViewCount),
  rating: (c) => formatRating(c.rating),
  costPerView: (c) => formatCostPerView(c.costPerView),
  campaigns: (c) => `${c.totalCampaignCount}건`,
};

/** 유의점: 항목 점수 25 미만인 항목마다 한 줄. 이력 없음은 건수 제외 */
export function cautions(c: ScoredCreator): Caution[] {
  const keys = c.hasHistory ? [...METRIC_KEYS] : METRIC_KEYS.filter((k) => k !== 'campaigns');
  return keys
    .filter((k) => c.metrics[k].score < CAUTION_THRESHOLD)
    .map((k) => ({ key: k, text: `${SUBJECT[k]} ${c.metrics[k].groupLabel} 중 하위권입니다 (${RAW_VALUE[k](c)})` }));
}

/** 항목 점수 막대 5개. 비중은 넣지 않는다 (설계 D10, D25) */
export function metricBars(c: ScoredCreator): MetricBar[] {
  return METRIC_KEYS.map((k) => {
    const m = c.metrics[k];
    return { key: k, label: METRIC_LABEL[k], score: Math.round(m.score), rankText: `${m.groupLabel} ${m.groupSize}명 중 ${m.rank}등` };
  });
}
```

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run src/domain/explain.test.ts` → PASS. 이어서 `npm test`로 전체 PASS 확인
- [ ] **Step 5: 커밋** — `feat: 추천 근거(강점 칩 3개, 유의점, 항목 점수 막대) 계산` (배경: 설계 §5.8, D17, D25)

---

### Task 11: 앱 뼈대 (데이터 로드, 라우팅, 세션, 헤더·푸터·툴팁, 전역 스타일 기본)

**Files:**
- Create: `src/app/dataset.ts`, `src/app/session.ts`, `src/app/AdvertiserPage.tsx`, `src/app/LoginPage.tsx`(임시), `src/app/AdminPage.tsx`(임시), `src/components/Header.tsx`, `src/components/DataStatusFooter.tsx`, `src/components/Tooltip.tsx`
- Modify: `src/app/App.tsx`(교체), `src/styles/global.css`(기본·레이아웃·헤더·푸터·버튼·툴팁 추가)
- Test: `src/app/session.test.ts`, `src/app/dataset.test.ts`

**Interfaces:**
- Consumes: `parseCreators`, `scoreCreators`, `useHashRoute`, `navigate`
- Produces: `type LoadedData = { ok: true; creators: ScoredCreator[]; stats: DatasetStats } | { ok: false; message: string }`, `loadDataset(text?: string): LoadedData`, `SESSION_KEY`, `ADMIN_ACCOUNT = { id: 'admin', password: 'demo1234' }`, `isAdminLoggedIn(): boolean`, `login(id, password): boolean`, `logout(): void`, `<Header variant="advertiser" | "admin" | "login" accountName? onLogout? />`, `<DataStatusFooter stats />`, `<Tooltip text label? />`

- [ ] **Step 1: 실패 테스트**

`src/app/session.test.ts`
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { isAdminLoggedIn, login, logout, SESSION_KEY } from './session';

describe('목업 세션 (설계 §6.3)', () => {
  beforeEach(() => localStorage.clear());
  it('admin / demo1234 로 로그인되고 플래그가 저장된다', () => {
    expect(isAdminLoggedIn()).toBe(false);
    expect(login('admin', 'demo1234')).toBe(true);
    expect(isAdminLoggedIn()).toBe(true);
    expect(localStorage.getItem(SESSION_KEY)).toBe('1');
  });
  it('틀린 계정은 실패', () => {
    expect(login('admin', 'wrong')).toBe(false);
    expect(login('root', 'demo1234')).toBe(false);
    expect(isAdminLoggedIn()).toBe(false);
  });
  it('로그아웃하면 플래그가 지워진다', () => {
    login('admin', 'demo1234');
    logout();
    expect(isAdminLoggedIn()).toBe(false);
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });
});
```

`src/app/dataset.test.ts`
```ts
import { describe, it, expect } from 'vitest';
import { loadDataset } from './dataset';

describe('loadDataset', () => {
  it('번들된 CSV로 200명을 점수까지 계산해 로드한다', () => {
    const d = loadDataset();
    expect(d.ok).toBe(true);
    if (d.ok) {
      expect(d.creators).toHaveLength(200);
      expect(d.creators[0].metrics.engagement).toBeDefined();
      expect(d.stats.noHistoryCount).toBe(27);
    }
  });
  it('헤더가 다르면 ok=false와 메시지', () => {
    const d = loadDataset('a,b\n1,2\n');
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.message).toContain('데이터 파일을 읽을 수 없습니다');
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/app` → FAIL
- [ ] **Step 3: 구현**

`src/app/dataset.ts`
```ts
import csvText from '../../data/dummy_creators.csv?raw';
import { parseCreators, CsvHeaderError } from '../domain/parseCreators';
import { scoreCreators } from '../domain/scoring';
import type { DatasetStats, ScoredCreator } from '../domain/types';

export type LoadedData =
  | { ok: true; creators: ScoredCreator[]; stats: DatasetStats }
  | { ok: false; message: string };

/** 빌드 시 문자열로 포함된 원본 CSV를 §3.3 규칙으로 정제하고 항목 점수까지 계산한다 */
export function loadDataset(text: string = csvText): LoadedData {
  try {
    const ds = parseCreators(text);
    return { ok: true, creators: scoreCreators(ds.creators), stats: ds.stats };
  } catch (e) {
    const detail = e instanceof CsvHeaderError ? e.message : '알 수 없는 오류입니다.';
    return { ok: false, message: `데이터 파일을 읽을 수 없습니다. ${detail}` };
  }
}
```

`src/app/session.ts`
```ts
export const SESSION_KEY = 'creator-match.admin-session';
/** 프로토타입용 임시 계정. 실제 인증이 아니다 (설계 D24) */
export const ADMIN_ACCOUNT = { id: 'admin', password: 'demo1234' } as const;

export function isAdminLoggedIn(): boolean {
  try {
    return localStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function login(id: string, password: string): boolean {
  if (id !== ADMIN_ACCOUNT.id || password !== ADMIN_ACCOUNT.password) return false;
  try {
    localStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* 저장소 불가 시에도 이 화면 안에서는 로그인으로 취급 */
  }
  return true;
}

export function logout(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* 무시 */
  }
}
```

`src/components/Header.tsx`
```tsx
interface Props {
  variant: 'advertiser' | 'admin' | 'login';
  accountName?: string;
  onLogout?: () => void;
}

export function Header({ variant, accountName, onLogout }: Props) {
  return (
    <header className="header">
      <div className="header__brand">
        <a className="header__logo" href="#/" aria-label="Creator Match 홈">
          <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
            <rect width="36" height="36" rx="11" fill="var(--primary)" />
            <path d="M11 22.5c3.2 0 4.6-3.1 5.7-6.1 1.1-3 2.2-5.9 5.3-5.9 2.5 0 4 1.9 4 4.4" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            <circle cx="24.5" cy="23.5" r="2.3" fill="#fff" />
          </svg>
        </a>
        <div>
          <div className="header__title">{variant === 'admin' ? 'Creator Match 운영자 화면' : 'Creator Match'}</div>
          {variant !== 'admin' && <div className="header__subtitle">광고주를 위한 크리에이터 추천</div>}
        </div>
      </div>
      {variant === 'advertiser' && <a className="header__link" href="#/login">운영자 로그인</a>}
      {variant === 'admin' && (
        <div className="header__account">
          <span className="header__account-name">{accountName}</span>
          <button type="button" className="btn btn--ghost" onClick={onLogout}>로그아웃</button>
        </div>
      )}
    </header>
  );
}
```

`src/components/DataStatusFooter.tsx`
```tsx
import type { DatasetStats } from '../domain/types';

/** 설계 §4 "데이터 상태 줄" */
export function DataStatusFooter({ stats }: { stats: DatasetStats }) {
  const parts = [`크리에이터 ${stats.total}명 로드`, `캠페인 이력 없음 ${stats.noHistoryCount}명`, '데이터: dummy_creators.csv'];
  if (stats.skippedRows > 0) parts.push(`제외된 행 ${stats.skippedRows}개`);
  return <footer className="footer">{parts.join(' · ')}</footer>;
}
```

`src/components/Tooltip.tsx`
```tsx
import { useId } from 'react';

/** ⓘ 버튼에 마우스를 올리거나 포커스하면 설명이 뜬다 */
export function Tooltip({ text, label = '설명 보기' }: { text: string; label?: string }) {
  const id = useId();
  return (
    <span className="tip">
      <button type="button" className="tip__trigger" aria-label={label} aria-describedby={id}>ⓘ</button>
      <span role="tooltip" id={id} className="tip__bubble">{text}</span>
    </span>
  );
}
```

`src/app/AdvertiserPage.tsx` (Task 12에서 자리표시자를 MatchingWorkspace로 교체)
```tsx
import { Header } from '../components/Header';
import { DataStatusFooter } from '../components/DataStatusFooter';
import type { LoadedData } from './dataset';

export function AdvertiserPage({ data }: { data: LoadedData }) {
  return (
    <div className="page">
      <Header variant="advertiser" />
      <main className="main">
        <p className="intro">우리 브랜드에 맞는 크리에이터, 예산 안에서 찾아드립니다.</p>
        {data.ok ? (
          <section className="card card--placeholder">입력 패널은 다음 단계에서 추가됩니다.</section>
        ) : (
          <section className="card error" role="alert">{data.message}</section>
        )}
      </main>
      {data.ok && <DataStatusFooter stats={data.stats} />}
    </div>
  );
}
```

`src/app/LoginPage.tsx` (임시, Task 15에서 교체)
```tsx
import { Header } from '../components/Header';

export function LoginPage() {
  return (
    <div className="page">
      <Header variant="login" />
      <main className="main"><section className="card card--placeholder">로그인 화면은 다음 단계에서 추가됩니다.</section></main>
    </div>
  );
}
```

`src/app/AdminPage.tsx` (임시, Task 15에서 교체)
```tsx
import { Header } from '../components/Header';
import type { LoadedData } from './dataset';

export function AdminPage({ data }: { data: LoadedData }) {
  return (
    <div className="page">
      <Header variant="admin" accountName="admin" />
      <main className="main"><section className="card card--placeholder">{data.ok ? '운영자 화면은 다음 단계에서 추가됩니다.' : data.message}</section></main>
    </div>
  );
}
```

`src/app/App.tsx` (교체)
```tsx
import { useMemo } from 'react';
import { useHashRoute } from './router';
import { loadDataset } from './dataset';
import { AdvertiserPage } from './AdvertiserPage';
import { LoginPage } from './LoginPage';
import { AdminPage } from './AdminPage';

export default function App() {
  const route = useHashRoute();
  const data = useMemo(() => loadDataset(), []);
  if (route === 'login') return <LoginPage />;
  if (route === 'admin') return <AdminPage data={data} />;
  return <AdvertiserPage data={data} />;
}
```

`src/styles/global.css`에 추가 (기존 `:root`, `body` 아래)
```css
/* ── 기본 ── */
* { box-sizing: border-box; }
a { color: var(--primary); }
button { font: inherit; }
:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

/* ── 레이아웃 ── */
.page { min-height: 100vh; display: flex; flex-direction: column; }
.main { width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 24px 48px; flex: 1; }
.main--narrow { max-width: 480px; padding-top: 24px; }
.intro { font-size: 22px; font-weight: 700; margin: 8px 0 20px; }
.card { background: var(--card); border-radius: var(--radius-card); box-shadow: var(--shadow); padding: 24px; }
.card--placeholder { color: var(--text-muted); }
.error { color: var(--destructive); }

/* ── 헤더·푸터 ── */
.header { width: 100%; max-width: 1200px; margin: 0 auto; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.header__brand { display: flex; align-items: center; gap: 12px; }
.header__logo { display: inline-flex; border-radius: 11px; }
.header__title { font-weight: 700; font-size: 20px; color: var(--primary-deep); line-height: 1.2; }
.header__subtitle { font-size: 13px; color: var(--text-muted); }
.header__link { font-size: 14px; color: var(--text-muted); text-decoration: none; }
.header__link:hover { color: var(--primary); text-decoration: underline; }
.header__account { display: flex; align-items: center; gap: 12px; }
.header__account-name { font-size: 14px; color: var(--text-muted); }
.footer { width: 100%; max-width: 1200px; margin: 0 auto; padding: 16px 24px 32px; font-size: 13px; color: var(--text-muted); }

/* ── 버튼 ── */
.btn { border: 1px solid var(--border); background: var(--card); color: var(--text); padding: 10px 16px; border-radius: 12px; cursor: pointer; transition: background .15s ease, border-color .15s ease, color .15s ease; }
.btn:hover { border-color: var(--primary); color: var(--primary); }
.btn--primary { background: var(--primary); border-color: var(--primary); color: #fff; font-weight: 700; }
.btn--primary:hover { background: var(--primary-deep); border-color: var(--primary-deep); color: #fff; }
.btn--ghost { background: transparent; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn:disabled:hover { border-color: var(--border); color: inherit; }
.btn--primary:disabled:hover { background: var(--primary); color: #fff; }

/* ── 툴팁 ── */
.tip { position: relative; display: inline-flex; margin-left: 4px; vertical-align: middle; }
.tip__trigger { border: 0; background: transparent; color: var(--primary); cursor: help; padding: 0 2px; font-size: 14px; line-height: 1; }
.tip__bubble { display: none; position: absolute; z-index: 20; right: 0; bottom: calc(100% + 8px); width: 280px; max-width: 70vw; padding: 10px 12px; background: var(--text); color: #fff; font-size: 12.5px; line-height: 1.5; font-weight: 400; border-radius: 10px; text-align: left; white-space: normal; }
.tip:hover .tip__bubble, .tip:focus-within .tip__bubble { display: block; }
```

- [ ] **Step 4: 확인** — Run: `npm test && npm run build` → 전체 PASS, 빌드 성공. `npm run dev` 후 브라우저 1280px에서 `#/`: 파란 로고·"Creator Match"·부제·오른쪽 "운영자 로그인" 링크·안내 문구·흰 카드·푸터 "크리에이터 200명 로드 · 캠페인 이력 없음 27명 · 데이터: dummy_creators.csv"가 Noto Sans KR로 보인다. `#/login`, `#/admin`에 임시 카드가 보인다. 스크린샷 저장
- [ ] **Step 5: 커밋** — `feat: 앱 뼈대(데이터 로드, 해시 라우팅, 목업 세션, 헤더·푸터·툴팁, 전역 스타일)` (배경: 설계 §6.1 1·2·6, §6.6, §7, D24, D26, D27)

---

### Task 12: 입력 패널 (`searchForm.ts`, `SearchPanel`, `MatchingWorkspace` 1차)

**Files:**
- Create: `src/domain/searchForm.ts`, `src/components/SearchPanel.tsx`, `src/components/MatchingWorkspace.tsx`
- Modify: `src/app/AdvertiserPage.tsx`(자리표시자 → MatchingWorkspace), `src/styles/global.css`(패널·필드·칩·규모 카드 추가)
- Test: `src/domain/searchForm.test.ts`

**Interfaces:**
- Produces: `interface SearchFormState { budgetText: string; categories: Category[]; tier: Tier | null }`, `EMPTY_FORM`, `formatBudgetText(text): string`, `parseBudgetText(text): number | null`, `interface FormErrors { budget?: string; categories?: string; tier?: string }`, `validateForm(form): FormErrors`, `toSearchInput(form): SearchInput | null`, `fromSearchInput(input): SearchFormState`, `<SearchPanel value onChange onSubmit />`, `<MatchingWorkspace creators stats weights />`

- [ ] **Step 1: 실패 테스트** — `src/domain/searchForm.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { EMPTY_FORM, formatBudgetText, parseBudgetText, validateForm, toSearchInput, fromSearchInput } from './searchForm';

describe('searchForm', () => {
  it('formatBudgetText: 숫자만 남기고 천 단위 콤마', () => {
    expect(formatBudgetText('1500000')).toBe('1,500,000');
    expect(formatBudgetText('1,5x00')).toBe('1,500');
    expect(formatBudgetText('abc')).toBe('');
    expect(formatBudgetText('0')).toBe('0');
    expect(formatBudgetText('007')).toBe('7');
  });
  it('parseBudgetText: 콤마 있는 문자열 → 숫자, 비었거나 0이면 null', () => {
    expect(parseBudgetText('1,500,000')).toBe(1_500_000);
    expect(parseBudgetText('')).toBeNull();
    expect(parseBudgetText('0')).toBeNull();
  });
  it('validateForm: 빈 폼은 오류 3개, 채우면 없음', () => {
    const e = validateForm(EMPTY_FORM);
    expect(e.budget).toBe('예산을 입력해 주세요. 0보다 큰 금액이어야 합니다.');
    expect(e.categories).toBe('카테고리를 하나 이상 선택해 주세요.');
    expect(e.tier).toBe('크리에이터 규모를 선택해 주세요.');
    expect(validateForm({ budgetText: '1,500,000', categories: ['뷰티'], tier: '마이크로' })).toEqual({});
  });
  it('toSearchInput ↔ fromSearchInput 왕복', () => {
    const form = { budgetText: '1,500,000', categories: ['뷰티', '패션'] as ('뷰티' | '패션')[], tier: '마이크로' as const };
    const input = toSearchInput(form)!;
    expect(input).toEqual({ budget: 1_500_000, categories: ['뷰티', '패션'], tier: '마이크로' });
    expect(fromSearchInput(input)).toEqual(form);
    expect(toSearchInput(EMPTY_FORM)).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/domain/searchForm.test.ts` → FAIL
- [ ] **Step 3: 구현**

`src/domain/searchForm.ts`
```ts
import type { Category, Tier } from './types';
import type { SearchInput } from './recommend';

export interface SearchFormState {
  budgetText: string;
  categories: Category[];
  tier: Tier | null;
}

export const EMPTY_FORM: SearchFormState = { budgetText: '', categories: [], tier: null };

/** 입력 문자열에서 숫자만 남기고 천 단위 콤마를 넣는다 */
export function formatBudgetText(text: string): string {
  const digits = text.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return digits === '' ? '' : Number(digits).toLocaleString('ko-KR');
}

export function parseBudgetText(text: string): number | null {
  const digits = text.replace(/\D/g, '');
  if (digits === '') return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export interface FormErrors {
  budget?: string;
  categories?: string;
  tier?: string;
}

export function validateForm(form: SearchFormState): FormErrors {
  const errors: FormErrors = {};
  if (parseBudgetText(form.budgetText) === null) errors.budget = '예산을 입력해 주세요. 0보다 큰 금액이어야 합니다.';
  if (form.categories.length === 0) errors.categories = '카테고리를 하나 이상 선택해 주세요.';
  if (form.tier === null) errors.tier = '크리에이터 규모를 선택해 주세요.';
  return errors;
}

export function toSearchInput(form: SearchFormState): SearchInput | null {
  const budget = parseBudgetText(form.budgetText);
  if (budget === null || form.categories.length === 0 || form.tier === null) return null;
  return { budget, categories: [...form.categories], tier: form.tier };
}

/** 완화 버튼으로 조건이 바뀌면 폼에도 반영한다 (설계 §6.2) */
export function fromSearchInput(input: SearchInput): SearchFormState {
  return { budgetText: formatBudgetText(String(input.budget)), categories: [...input.categories], tier: input.tier };
}
```

`src/components/SearchPanel.tsx`
```tsx
import { useState } from 'react';
import { CATEGORIES, TIERS } from '../domain/types';
import type { Category, Tier } from '../domain/types';
import { TIER_INFO } from '../domain/tiers';
import { formatWon } from '../domain/format';
import { formatBudgetText, parseBudgetText, validateForm } from '../domain/searchForm';
import type { SearchFormState } from '../domain/searchForm';

interface Props {
  value: SearchFormState;
  onChange: (next: SearchFormState) => void;
  onSubmit: () => void;
}

export function SearchPanel({ value, onChange, onSubmit }: Props) {
  // 빨간 안내는 한 번 건드린 입력에만 보인다 (L21). 버튼 비활성은 항상 적용
  const [touched, setTouched] = useState({ budget: false, categories: false, tier: false });
  const errors = validateForm(value);
  const budget = parseBudgetText(value.budgetText);
  const canSubmit = !errors.budget && !errors.categories && !errors.tier;

  const toggleCategory = (c: Category) => {
    const has = value.categories.includes(c);
    onChange({ ...value, categories: has ? value.categories.filter((x) => x !== c) : [...value.categories, c] });
    setTouched((t) => ({ ...t, categories: true }));
  };
  const pickTier = (t: Tier) => {
    onChange({ ...value, tier: t });
    setTouched((s) => ({ ...s, tier: true }));
  };

  return (
    <form
      className="card panel"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }}
    >
      <div className="panel__grid">
        <div className="field">
          <label className="field__label" htmlFor="budget">크리에이터 1명당 섭외 예산</label>
          <p className="field__help">한 명에게 쓸 수 있는 최대 금액입니다. 이 금액 이하로 진행 가능한 크리에이터를 찾아드립니다.</p>
          <div className="budget">
            <input
              id="budget"
              className="input"
              inputMode="numeric"
              autoComplete="off"
              placeholder="예: 1,500,000"
              value={value.budgetText}
              onChange={(e) => onChange({ ...value, budgetText: formatBudgetText(e.target.value) })}
              onBlur={() => setTouched((t) => ({ ...t, budget: true }))}
              aria-invalid={touched.budget && !!errors.budget}
              aria-describedby="budget-preview"
            />
            <span className="budget__unit">원</span>
            <span id="budget-preview" className="budget__preview">{budget !== null ? `→ ${formatWon(budget)}` : ''}</span>
          </div>
          {touched.budget && errors.budget && <p className="field__error" role="alert">{errors.budget}</p>}
        </div>

        <div className="field">
          <div className="field__label" id="categories-label">캠페인 카테고리 (여러 개 선택 가능)</div>
          <p className="field__help">광고할 제품이나 서비스와 맞는 분야를 고르세요.</p>
          <div className="chips" role="group" aria-labelledby="categories-label">
            {CATEGORIES.map((c) => {
              const on = value.categories.includes(c);
              return (
                <button key={c} type="button" className={`chip chip--toggle${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => toggleCategory(c)}>
                  {c}
                </button>
              );
            })}
          </div>
          {touched.categories && errors.categories && <p className="field__error" role="alert">{errors.categories}</p>}
        </div>

        <div className="field">
          <div className="field__label" id="tier-label">크리에이터 규모 (구독자·팔로워 수 기준)</div>
          <div className="tiers" role="radiogroup" aria-labelledby="tier-label">
            {TIERS.map((t) => {
              const on = value.tier === t;
              const info = TIER_INFO[t];
              return (
                <button key={t} type="button" role="radio" aria-checked={on} className={`tier-card${on ? ' is-on' : ''}`} onClick={() => pickTier(t)}>
                  <span className="tier-card__name">{t}</span>
                  <span className="tier-card__range">{info.range}</span>
                  <span className="tier-card__trait">{info.trait}</span>
                  <span className="tier-card__rate">{info.rateRange}</span>
                </button>
              );
            })}
          </div>
          {touched.tier && errors.tier && <p className="field__error" role="alert">{errors.tier}</p>}
        </div>
      </div>
      <button type="submit" className="btn btn--primary panel__submit" disabled={!canSubmit}>크리에이터 찾기</button>
    </form>
  );
}
```

`src/components/MatchingWorkspace.tsx` (1차. Task 13·14에서 결과 영역을 채운다. `stats`는 Task 13에서 쓰므로 지금은 구조 분해하지 않는다 — `noUnusedLocals` 때문)
```tsx
import { useMemo, useState } from 'react';
import type { DatasetStats, ScoredCreator, Weights } from '../domain/types';
import { rankCreators } from '../domain/scoring';
import { filterCandidates } from '../domain/recommend';
import type { SearchInput } from '../domain/recommend';
import { EMPTY_FORM, toSearchInput } from '../domain/searchForm';
import type { SearchFormState } from '../domain/searchForm';
import { SearchPanel } from './SearchPanel';

interface Props {
  creators: ScoredCreator[];
  stats: DatasetStats;
  weights: Weights;
}

/** 광고주 화면과 운영자 화면이 공유하는 "입력 패널 + 결과" 블록. 비중만 다르게 받는다 */
export function MatchingWorkspace({ creators, weights }: Props) {
  const ranked = useMemo(() => rankCreators(creators, weights), [creators, weights]);
  const [form, setForm] = useState<SearchFormState>(EMPTY_FORM);
  const [query, setQuery] = useState<SearchInput | null>(null);
  const candidates = useMemo(() => (query ? filterCandidates(ranked, query) : []), [ranked, query]);

  const runSearch = (input: SearchInput) => setQuery(input);
  const handleSubmit = () => {
    const input = toSearchInput(form);
    if (input) runSearch(input);
  };

  return (
    <>
      <SearchPanel value={form} onChange={setForm} onSubmit={handleSubmit} />
      <section className="results">
        {query === null ? (
          <p className="results__empty">조건을 입력하고 크리에이터 찾기를 누르세요</p>
        ) : (
          <h2 className="results__title">섭외 가능한 크리에이터 {candidates.length}명</h2>
        )}
      </section>
    </>
  );
}
```

`src/app/AdvertiserPage.tsx` 교체
```tsx
import { useState } from 'react';
import { Header } from '../components/Header';
import { DataStatusFooter } from '../components/DataStatusFooter';
import { MatchingWorkspace } from '../components/MatchingWorkspace';
import { loadWeights } from '../domain/weights';
import type { LoadedData } from './dataset';

export function AdvertiserPage({ data }: { data: LoadedData }) {
  // 광고주 화면은 저장된 비중만 쓴다 (설계 §6.4). 페이지 진입 시 한 번 읽는다
  const [weights] = useState(() => loadWeights());
  return (
    <div className="page">
      <Header variant="advertiser" />
      <main className="main">
        <p className="intro">우리 브랜드에 맞는 크리에이터, 예산 안에서 찾아드립니다.</p>
        {data.ok ? (
          <MatchingWorkspace creators={data.creators} stats={data.stats} weights={weights} />
        ) : (
          <section className="card error" role="alert">{data.message}</section>
        )}
      </main>
      {data.ok && <DataStatusFooter stats={data.stats} />}
    </div>
  );
}
```

`src/styles/global.css` 추가
```css
/* ── 입력 패널 ── */
.panel { margin-bottom: 20px; }
.panel__grid { display: grid; grid-template-columns: 1.1fr 1.4fr 1.5fr; gap: 28px; }
.panel__submit { width: 100%; margin-top: 24px; padding: 14px; font-size: 16px; border-radius: 14px; }
.field__label { font-weight: 700; font-size: 15px; margin-bottom: 4px; display: block; }
.field__help { margin: 0 0 10px; font-size: 13px; color: var(--text-muted); }
.field__error { margin: 8px 0 0; font-size: 13px; color: var(--destructive); }
.input { width: 100%; border: 1px solid var(--border); border-radius: var(--radius-input); padding: 12px 14px; font-size: 16px; background: #fff; color: var(--text); }
.input:focus { border-color: var(--primary); outline: none; box-shadow: 0 0 0 3px var(--primary-soft); }
.input[aria-invalid="true"] { border-color: var(--destructive); }
.budget { display: grid; grid-template-columns: 1fr auto; gap: 8px 10px; align-items: center; }
.budget__unit { color: var(--text-muted); }
.budget__preview { grid-column: 1 / -1; min-height: 22px; color: var(--primary-deep); font-weight: 700; }

/* ── 칩 ── */
.chips { display: flex; flex-wrap: wrap; gap: 8px; padding: 0; margin: 0; list-style: none; }
.chip { display: inline-flex; align-items: center; padding: 6px 14px; border-radius: 999px; font-size: 14px; border: 1px solid var(--border); background: #fff; color: var(--text); line-height: 1.4; }
.chip--toggle { cursor: pointer; transition: background .15s ease, color .15s ease, border-color .15s ease; }
.chip--toggle:hover { border-color: var(--primary); color: var(--primary); }
.chip--toggle.is-on { background: var(--primary); border-color: var(--primary); color: #fff; font-weight: 700; }

/* ── 규모 카드 ── */
.tiers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.tier-card { display: flex; flex-direction: column; gap: 2px; text-align: left; padding: 14px; border: 1.5px solid var(--border); border-radius: 16px; background: #fff; cursor: pointer; color: var(--text); transition: border-color .15s ease, background .15s ease; }
.tier-card:hover { border-color: var(--primary); }
.tier-card.is-on { border-color: var(--primary); background: var(--primary-soft); }
.tier-card__name { font-weight: 700; font-size: 16px; }
.tier-card__range { font-size: 13px; color: var(--primary-deep); font-weight: 500; }
.tier-card__trait, .tier-card__rate { font-size: 12.5px; color: var(--text-muted); }

/* ── 결과 영역 ── */
.results { margin-top: 8px; }
.results__empty { text-align: center; color: var(--text-muted); padding: 40px 0; margin: 0; }
.results__title { font-size: 18px; margin: 0; }
```

- [ ] **Step 4: 확인** — Run: `npm test && npm run build` → PASS. 브라우저 `#/`: 3열 패널(예산 / 카테고리 칩 10개 / 규모 카드 3개). 예산에 `1500000` 입력 → 칸에 `1,500,000`, 아래 "→ 150만 원". 빈 상태에서 버튼이 흐리게 비활성, 예산 칸을 비우고 포커스를 빼면 빨간 안내. 뷰티·패션 칩 선택(파랑 채움), 마이크로 카드 선택, 버튼 활성 → 누르면 "섭외 가능한 크리에이터 18명". 스크린샷 저장
- [ ] **Step 5: 커밋** — `feat: 광고주 입력 패널(예산·카테고리·규모)과 검증, 검색 상태 연결` (배경: 설계 §6.1 3, §4 라벨·도움말, D2, D3. 안내 노출 시점은 L21)

---

### Task 13: 결과 표, 정렬·필터, 추천 이유 펼침 + 스모크 테스트

**Files:**
- Create: `src/components/ResultsToolbar.tsx`, `src/components/ResultsTable.tsx`, `src/components/ExplainRow.tsx`
- Modify: `src/components/MatchingWorkspace.tsx`(정렬·필터·펼침 상태, 표 렌더), `src/styles/global.css`(툴바·표·배지·막대·펼침 추가)
- Test: `src/app/App.test.tsx` (스모크 1개, 설계 §8 마지막)

**Interfaces:**
- Consumes: `sortCandidates`, `applyResultFilters`, `SORT_DEFAULT_DIRECTION`, `SORT_LABEL`, `strengthChips`, `cautions`, `metricBars`, format 함수, `Tooltip`
- Produces: `<ResultsToolbar count filters onChange />`, `<ResultsTable rows sort onSortChange stats expandedId onToggleExpand />`, `<ExplainRow creator />`, `estimatedRatingTooltip(stats)`, `estimatedRateTooltip(creator, stats)`

- [ ] **Step 1: 실패 스모크 테스트** — `src/app/App.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('광고주 화면 스모크 (설계 §8)', () => {
  it('조건을 입력해 검색하면 결과 표가 보이고 추천 이유를 펼칠 수 있다', async () => {
    window.location.hash = '#/';
    localStorage.clear();
    render(<App />);
    const user = userEvent.setup();

    expect(screen.getByText('조건을 입력하고 크리에이터 찾기를 누르세요')).toBeInTheDocument();

    await user.type(screen.getByLabelText('크리에이터 1명당 섭외 예산'), '1500000');
    expect(screen.getByText('→ 150만 원')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '뷰티' }));
    await user.click(screen.getByRole('button', { name: '패션' }));
    await user.click(screen.getByRole('radio', { name: /마이크로/ }));
    await user.click(screen.getByRole('button', { name: '크리에이터 찾기' }));

    expect(screen.getByText('섭외 가능한 크리에이터 18명')).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('정은매거진77');
    expect(rows[1]).toHaveTextContent('73'); // 매칭 점수 72.6 → 73

    await user.click(screen.getByRole('button', { name: '정은매거진77 추천 이유 보기' }));
    expect(screen.getByText('왜 추천하나요?')).toBeInTheDocument();
    expect(screen.getByText('유의점: 참여율은 마이크로 중 하위권입니다 (6.5%)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^평점/ }));
    const afterSort = screen.getAllByRole('row');
    expect(afterSort[afterSort.length - 1]).toHaveTextContent('캠페인 이력 없음');

    await user.click(screen.getByRole('checkbox', { name: '캠페인 이력 있는 크리에이터만' }));
    expect(screen.getByText('섭외 가능한 크리에이터 15명')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/app/App.test.tsx` → FAIL
- [ ] **Step 3: 구현**

`src/components/ExplainRow.tsx`
```tsx
import type { ScoredCreator } from '../domain/types';
import { strengthChips, cautions, metricBars } from '../domain/explain';

/** 펼침 행: 강점 칩 3개 + 유의점 + 항목 점수 막대 5개. 비중은 표시하지 않는다 (D10) */
export function ExplainRow({ creator }: { creator: ScoredCreator }) {
  const chips = strengthChips(creator);
  const notes = cautions(creator);
  const bars = metricBars(creator);
  return (
    <div className="explain">
      <h3 className="explain__title">왜 추천하나요?</h3>
      <ul className="chips">
        {chips.map((c) => (
          <li key={c.key} className="chip chip--positive">{c.text}</li>
        ))}
      </ul>
      {notes.length > 0 && (
        <ul className="cautions">
          {notes.map((n) => (
            <li key={n.key} className="caution">유의점: {n.text}</li>
          ))}
        </ul>
      )}
      <ul className="bars">
        {bars.map((b) => (
          <li key={b.key} className="bars__item">
            <span className="bars__label">{b.label}</span>
            <span className="bar"><span className="bar__fill" style={{ width: `${b.score}%` }} /></span>
            <span className="bars__score">{b.score}</span>
            <span className="bars__rank">{b.rankText}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

`src/components/ResultsToolbar.tsx`
```tsx
import type { ResultFilters } from '../domain/recommend';
import type { Platform } from '../domain/types';

interface Props {
  count: number;
  filters: ResultFilters;
  onChange: (f: ResultFilters) => void;
}

const PLATFORM_OPTIONS: { value: 'all' | Platform; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: '유튜브', label: '유튜브' },
  { value: '인스타그램', label: '인스타그램' },
];

/** 결과 조작 줄: 인원 제목 + 플랫폼 세그먼트 + 이력 체크 (설계 §6.1 4) */
export function ResultsToolbar({ count, filters, onChange }: Props) {
  return (
    <div className="toolbar">
      <h2 className="results__title">섭외 가능한 크리에이터 {count}명</h2>
      <div className="toolbar__controls">
        <div className="segment" role="group" aria-label="플랫폼">
          {PLATFORM_OPTIONS.map((o) => {
            const on = filters.platform === o.value;
            return (
              <button key={o.value} type="button" className={`segment__item${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => onChange({ ...filters, platform: o.value })}>
                {o.label}
              </button>
            );
          })}
        </div>
        <label className="check">
          <input type="checkbox" checked={filters.historyOnly} onChange={(e) => onChange({ ...filters, historyOnly: e.target.checked })} />
          캠페인 이력 있는 크리에이터만
        </label>
      </div>
    </div>
  );
}
```

`src/components/ResultsTable.tsx`
```tsx
import { Fragment } from 'react';
import type { DatasetStats, RankedCreator } from '../domain/types';
import { SORT_LABEL } from '../domain/recommend';
import type { SortKey, SortState } from '../domain/recommend';
import { formatCompact, formatPercent, formatRating, formatWon } from '../domain/format';
import { Tooltip } from './Tooltip';
import { ExplainRow } from './ExplainRow';

interface Props {
  rows: RankedCreator[];
  sort: SortState;
  onSortChange: (key: SortKey) => void;
  stats: DatasetStats;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
}

const SORTABLE: { key: SortKey; label: string; tooltip?: string }[] = [
  { key: 'match', label: '매칭 점수', tooltip: '광고주 조건에 맞는 크리에이터들을 같은 규모 안에서 비교한 종합 점수입니다. 100점 만점' },
  { key: 'engagement', label: '참여율' },
  { key: 'views', label: '평균 조회수' },
  { key: 'campaigns', label: '캠페인' },
  { key: 'rating', label: '평점' },
  { key: 'rate', label: '단가' },
];

/** 설계 §4 "예상 평점 툴팁" */
export function estimatedRatingTooltip(stats: DatasetStats): string {
  return `캠페인 이력이 없어 실제 평점이 없습니다. 이력이 있는 크리에이터 ${stats.ratedCount}명의 평균 평점 ${stats.ratingAverage}점을 예상 평점으로 적용했습니다. 순위 계산에서는 캠페인 건수 0건이 반영되어 검증된 크리에이터보다 낮게 평가됩니다.`;
}

/** 설계 §4 "예상 단가 툴팁" */
export function estimatedRateTooltip(c: RankedCreator, stats: DatasetStats): string {
  return `캠페인 이력이 없어 실제 단가가 없습니다. 같은 ${c.tier} 규모 크리에이터의 캠페인당 단가 중앙값 ${formatWon(stats.medianRateByTier[c.tier])}을 예상 단가로 적용했습니다.`;
}

export function ResultsTable({ rows, sort, onSortChange, stats, expandedId, onToggleExpand }: Props) {
  const rankHeader = sort.key === 'match' ? '순위' : `순위 (${SORT_LABEL[sort.key]} 기준)`;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">{rankHeader}</th>
            <th scope="col">크리에이터</th>
            {SORTABLE.map((col) => {
              const active = sort.key === col.key;
              const ariaSort = active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none';
              return (
                <th key={col.key} scope="col" aria-sort={ariaSort} className={`table__num${active ? ' is-sorted' : ''}`}>
                  <button type="button" className="sort-btn" onClick={() => onSortChange(col.key)}>
                    {col.label}
                    <span className="sort-btn__arrow" aria-hidden="true">{active ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
                  </button>
                  {col.tooltip && <Tooltip text={col.tooltip} label="매칭 점수 설명" />}
                </th>
              );
            })}
            <th scope="col">추천 이유 보기</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c, i) => {
            const open = expandedId === c.id;
            const score = Math.round(c.matchScore);
            return (
              <Fragment key={c.id}>
                <tr className={`${i === 0 ? 'row--top' : ''}${open ? ' is-open' : ''}`}>
                  <td><span className={`rank${i === 0 ? ' rank--top' : ''}`}>{i + 1}</span></td>
                  <td className="table__creator">
                    <div className="creator__name">
                      <strong>{c.name}</strong>
                      {!c.hasHistory && <span className="badge badge--warning">캠페인 이력 없음</span>}
                    </div>
                    <div className="creator__meta">{c.platform} · {c.category} · 팔로워 {formatCompact(c.followers)}</div>
                  </td>
                  <td className="table__num">
                    <div className="score">
                      <span className="bar bar--score"><span className="bar__fill" style={{ width: `${score}%` }} /></span>
                      <strong>{score}</strong>
                    </div>
                  </td>
                  <td className="table__num">{formatPercent(c.engagementRate)}</td>
                  <td className="table__num">{formatCompact(c.avgViewCount)}</td>
                  <td className="table__num">{c.totalCampaignCount}건</td>
                  <td className="table__num">
                    {c.hasHistory ? formatRating(c.rating) : (
                      <span className="estimate">예상 {formatRating(c.rating)}<Tooltip text={estimatedRatingTooltip(stats)} label="예상 평점 설명" /></span>
                    )}
                  </td>
                  <td className="table__num">
                    {c.hasHistory ? formatCompact(c.rate) : (
                      <span className="estimate">예상 {formatCompact(c.rate)}<Tooltip text={estimatedRateTooltip(c, stats)} label="예상 단가 설명" /></span>
                    )}
                  </td>
                  <td className="table__action">
                    <button type="button" className="expand-btn" aria-expanded={open} aria-label={`${c.name} 추천 이유 ${open ? '접기' : '보기'}`} onClick={() => onToggleExpand(c.id)}>
                      {open ? '▾' : '▸'}
                    </button>
                  </td>
                </tr>
                {open && (
                  <tr className="explain-row">
                    <td colSpan={9}><ExplainRow creator={c} /></td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

`src/components/MatchingWorkspace.tsx` 교체 (정렬·필터·펼침. 0명 자리표시자는 Task 14에서 교체)
```tsx
import { useMemo, useState } from 'react';
import type { DatasetStats, ScoredCreator, Weights } from '../domain/types';
import { rankCreators } from '../domain/scoring';
import { filterCandidates, sortCandidates, applyResultFilters, DEFAULT_SORT, DEFAULT_FILTERS, SORT_DEFAULT_DIRECTION } from '../domain/recommend';
import type { SearchInput, SortKey, SortState, ResultFilters } from '../domain/recommend';
import { EMPTY_FORM, toSearchInput } from '../domain/searchForm';
import type { SearchFormState } from '../domain/searchForm';
import { SearchPanel } from './SearchPanel';
import { ResultsToolbar } from './ResultsToolbar';
import { ResultsTable } from './ResultsTable';

interface Props {
  creators: ScoredCreator[];
  stats: DatasetStats;
  weights: Weights;
}

/** 광고주 화면과 운영자 화면이 공유하는 "입력 패널 + 결과" 블록. 비중만 다르게 받는다 */
export function MatchingWorkspace({ creators, stats, weights }: Props) {
  const ranked = useMemo(() => rankCreators(creators, weights), [creators, weights]);
  const [form, setForm] = useState<SearchFormState>(EMPTY_FORM);
  const [query, setQuery] = useState<SearchInput | null>(null);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [filters, setFilters] = useState<ResultFilters>(DEFAULT_FILTERS);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const candidates = useMemo(() => (query ? filterCandidates(ranked, query) : []), [ranked, query]);
  const visible = useMemo(() => sortCandidates(applyResultFilters(candidates, filters), sort), [candidates, filters, sort]);

  const runSearch = (input: SearchInput) => {
    setQuery(input);
    setSort(DEFAULT_SORT);
    setFilters(DEFAULT_FILTERS);
    setExpandedId(null);
  };
  const handleSubmit = () => {
    const input = toSearchInput(form);
    if (input) runSearch(input);
  };
  const handleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, direction: s.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: SORT_DEFAULT_DIRECTION[key] }));
  const toggleExpand = (id: string) => setExpandedId((cur) => (cur === id ? null : id));

  return (
    <>
      <SearchPanel value={form} onChange={setForm} onSubmit={handleSubmit} />
      <section className="results">
        {query === null ? (
          <p className="results__empty">조건을 입력하고 크리에이터 찾기를 누르세요</p>
        ) : candidates.length === 0 ? (
          <p className="results__empty">조건에 맞는 크리에이터가 없습니다</p>
        ) : (
          <>
            <ResultsToolbar count={visible.length} filters={filters} onChange={setFilters} />
            {visible.length === 0 ? (
              <p className="results__empty">선택한 필터에 맞는 크리에이터가 없습니다. 필터를 풀어 보세요.</p>
            ) : (
              <ResultsTable rows={visible} sort={sort} onSortChange={handleSort} stats={stats} expandedId={expandedId} onToggleExpand={toggleExpand} />
            )}
          </>
        )}
      </section>
    </>
  );
}
```

`src/styles/global.css` 추가
```css
/* ── 결과 조작 줄 ── */
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin: 4px 0 12px; flex-wrap: wrap; }
.toolbar__controls { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.segment { display: inline-flex; border: 1px solid var(--border); border-radius: 999px; background: #fff; padding: 3px; }
.segment__item { border: 0; background: transparent; padding: 6px 14px; border-radius: 999px; cursor: pointer; font-size: 14px; color: var(--text-muted); transition: background .15s ease, color .15s ease; }
.segment__item.is-on { background: var(--primary); color: #fff; font-weight: 700; }
.check { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }
.check input { width: 16px; height: 16px; accent-color: var(--primary); }

/* ── 결과 표 ── */
.table-wrap { overflow-x: auto; background: var(--card); border-radius: var(--radius-card); box-shadow: var(--shadow); }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th { text-align: left; font-size: 13px; color: var(--text-muted); font-weight: 500; padding: 14px 12px; border-bottom: 1px solid var(--border); white-space: nowrap; }
.table td { padding: 14px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.table tbody tr:last-child td { border-bottom: 0; }
.table tbody tr:hover td { background: #FAFBFF; }
.table .table__num { text-align: right; }
.table th.is-sorted { color: var(--primary-deep); font-weight: 700; }
.row--top td { background: var(--primary-soft) !important; }
.sort-btn { border: 0; background: transparent; padding: 0; cursor: pointer; color: inherit; font: inherit; display: inline-flex; align-items: center; gap: 4px; }
.sort-btn:hover { color: var(--primary); }
.sort-btn__arrow { font-size: 11px; opacity: .7; }
.rank { display: inline-flex; width: 28px; height: 28px; border-radius: 50%; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; background: var(--primary-soft); color: var(--primary-deep); }
.rank--top { background: var(--primary); color: #fff; }
.creator__name { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.creator__meta { font-size: 12.5px; color: var(--text-muted); margin-top: 2px; }
.badge { display: inline-flex; padding: 2px 8px; border-radius: 999px; font-size: 11.5px; font-weight: 700; }
.badge--warning { background: var(--warning-bg); color: var(--warning-fg); }
.estimate { color: var(--text-muted); white-space: nowrap; }
.score { display: inline-flex; align-items: center; gap: 8px; }
.bar { display: inline-block; width: 90px; height: 8px; border-radius: 999px; background: var(--primary-soft); overflow: hidden; vertical-align: middle; }
.bar__fill { display: block; height: 100%; background: var(--primary); border-radius: 999px; transition: width .3s ease; }
.expand-btn { border: 1px solid var(--border); background: #fff; width: 32px; height: 32px; border-radius: 10px; cursor: pointer; color: var(--primary-deep); font-size: 14px; }
.expand-btn:hover, .expand-btn[aria-expanded="true"] { border-color: var(--primary); background: var(--primary-soft); }
.table__action { text-align: center; }
.explain-row td { background: #F8FAFF; padding: 18px 20px 22px; }

/* ── 추천 이유 ── */
.explain__title { margin: 0 0 12px; font-size: 15px; font-weight: 700; }
.chip--positive { background: var(--positive-bg); color: var(--positive-fg); border-color: transparent; font-weight: 500; }
.cautions { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.caution { display: inline-flex; align-self: flex-start; padding: 6px 12px; border-radius: 10px; background: var(--warning-bg); color: var(--warning-fg); font-size: 13.5px; }
.bars { list-style: none; margin: 16px 0 0; padding: 0; display: grid; gap: 8px; }
.bars__item { display: grid; grid-template-columns: 150px 1fr 40px auto; gap: 12px; align-items: center; font-size: 13.5px; }
.bars__item .bar { width: 100%; max-width: 320px; }
.bars__label { color: var(--text); }
.bars__score { text-align: right; font-weight: 700; }
.bars__rank { color: var(--text-muted); font-size: 12.5px; }
```

- [ ] **Step 4: 확인** — Run: `npm test && npm run build` → 스모크 포함 전체 PASS. 브라우저: 검색 후 9열 표(1위 행 연한 파랑, 1위 순위 진한 원), 매칭 점수 옆 ⓘ 툴팁, "평점" 열 클릭 → 이력 없음 3명이 맨 아래·순위 열 제목 "순위 (광고주 평점 기준)"·▼ 표시, 다시 클릭 → ▲, 플랫폼 세그먼트·체크로 인원 변화, ▸ 클릭 → 펼침 행(강점 칩 초록 3개, 유의점 주황, 막대 5개에 "마이크로 129명 중 53등"). 스크린샷 저장
- [ ] **Step 5: 커밋** — `feat: 결과 표(9열), 열 제목 정렬, 플랫폼·이력 필터, 추천 이유 펼침 행, 스모크 테스트` (배경: 설계 §5.8, §5.10, §6.1 4·5, D17~D22)

---

### Task 14: 후보 0명 화면과 희소 화면

**Files:**
- Create: `src/components/ZeroResults.tsx`, `src/components/RelaxationList.tsx`, `src/components/NearCandidatesTable.tsx`
- Modify: `src/components/MatchingWorkspace.tsx`(0명 진단·완화 연결, 1~2명 완화 버튼), `src/styles/global.css`
- Test: 화면 확인 (domain은 Task 9에서 이미 증명)

**Interfaces:**
- Consumes: `diagnoseZeroResult`, `buildRelaxations`, `FEW_RESULTS_THRESHOLD`, `fromSearchInput`
- Produces: `<ZeroResults info onRelax />`, `<RelaxationList title items onRelax compact? />`, `<NearCandidatesTable items />`

- [ ] **Step 1: 구현**

`src/components/RelaxationList.tsx`
```tsx
import type { Relaxation, SearchInput } from '../domain/recommend';

interface Props {
  title: string;
  items: Relaxation[];
  onRelax: (next: SearchInput) => void;
  compact?: boolean;
}

/** 조건 완화 버튼 묶음. 누르면 그 조건으로 즉시 재검색. 자동 완화는 절대 없다 (설계 §5.7) */
export function RelaxationList({ title, items, onRelax, compact = false }: Props) {
  return (
    <section className={`relax${compact ? ' relax--compact' : ''}`}>
      <h3 className="relax__title">{title}</h3>
      <ul className="relax__list">
        {items.map((r) => (
          <li key={r.id}>
            <button type="button" className="relax__btn" disabled={!r.enabled} onClick={() => onRelax(r.nextInput)}>
              <span>{r.label} → <strong>{r.count}명</strong></span>
              {r.note && <span className="relax__note">· {r.note}</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

`src/components/NearCandidatesTable.tsx`
```tsx
import type { NearCandidate } from '../domain/recommend';
import { formatCompact, formatPercent } from '../domain/format';

/** 조건에 가장 가까운 크리에이터 표 (설계 §5.7 3, §6.2) */
export function NearCandidatesTable({ items }: { items: NearCandidate[] }) {
  return (
    <section className="near">
      <h3 className="near__title">조건에 가장 가까운 크리에이터</h3>
      <p className="near__desc">세 조건 중 하나만 바꾸면 섭외할 수 있는 크리에이터입니다.</p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">순위</th>
              <th scope="col">크리에이터</th>
              <th scope="col" className="table__num">매칭 점수</th>
              <th scope="col" className="table__num">참여율</th>
              <th scope="col" className="table__num">평균 조회수</th>
              <th scope="col" className="table__num">단가</th>
              <th scope="col">이렇게 바꾸면 섭외 가능</th>
            </tr>
          </thead>
          <tbody>
            {items.map((n, i) => {
              const c = n.creator;
              return (
                <tr key={c.id}>
                  <td><span className="rank">{i + 1}</span></td>
                  <td className="table__creator">
                    <div className="creator__name">
                      <strong>{c.name}</strong>
                      {!c.hasHistory && <span className="badge badge--warning">캠페인 이력 없음</span>}
                    </div>
                    <div className="creator__meta">{c.platform} · {c.category} · {c.tier} · 팔로워 {formatCompact(c.followers)}</div>
                  </td>
                  <td className="table__num"><strong>{Math.round(c.matchScore)}</strong></td>
                  <td className="table__num">{formatPercent(c.engagementRate)}</td>
                  <td className="table__num">{formatCompact(c.avgViewCount)}</td>
                  <td className="table__num">{c.hasHistory ? formatCompact(c.rate) : <span className="estimate">예상 {formatCompact(c.rate)}</span>}</td>
                  <td><span className="chip chip--change">{n.change}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

`src/components/ZeroResults.tsx`
```tsx
import type { SearchInput, ZeroResultInfo } from '../domain/recommend';
import { RelaxationList } from './RelaxationList';
import { NearCandidatesTable } from './NearCandidatesTable';

/** 후보 0명: 원인 진단 → 완화 버튼 → 근접 후보 (설계 §5.7, D16) */
export function ZeroResults({ info, onRelax }: { info: ZeroResultInfo; onRelax: (next: SearchInput) => void }) {
  return (
    <div className="zero">
      <section className="card zero__diagnosis">
        <h2 className="zero__title">조건에 맞는 크리에이터가 없습니다</h2>
        <p className="zero__text">{info.diagnosis}{info.extraNote ? ` ${info.extraNote}` : ''}</p>
      </section>
      <RelaxationList title="조건을 바꿔 보시겠어요?" items={info.relaxations} onRelax={onRelax} />
      {info.nearCandidates.length > 0 && <NearCandidatesTable items={info.nearCandidates} />}
    </div>
  );
}
```

`src/components/MatchingWorkspace.tsx` 수정 — import에 추가:
```tsx
import { diagnoseZeroResult, buildRelaxations, FEW_RESULTS_THRESHOLD } from '../domain/recommend';
import { fromSearchInput } from '../domain/searchForm';
import { ZeroResults } from './ZeroResults';
import { RelaxationList } from './RelaxationList';
```
`visible` 아래에 추가:
```tsx
  // 0명 판정은 결과 필터(플랫폼·이력) 적용 전 인원으로 (설계 §5.1)
  const zeroInfo = useMemo(() => (query && candidates.length === 0 ? diagnoseZeroResult(ranked, query) : null), [ranked, query, candidates]);
  const fewRelaxations = useMemo(
    () => (query && candidates.length > 0 && candidates.length < FEW_RESULTS_THRESHOLD ? buildRelaxations(ranked, query) : null),
    [ranked, query, candidates],
  );
  const handleRelax = (next: SearchInput) => {
    setForm(fromSearchInput(next)); // 폼에도 바뀐 값 반영 (설계 §6.2)
    runSearch(next);
  };
```
렌더의 `candidates.length === 0 ? (<p ...>조건에 맞는 크리에이터가 없습니다</p>)` 분기를 다음으로 교체:
```tsx
        ) : zeroInfo ? (
          <ZeroResults info={zeroInfo} onRelax={handleRelax} />
        ) : (
```
그리고 `<ResultsTable ... />` 렌더 바로 뒤(같은 `<>` 안)에 추가:
```tsx
            {fewRelaxations && (
              <RelaxationList compact title="후보가 적습니다. 조건을 넓히면 더 볼 수 있습니다." items={fewRelaxations} onRelax={handleRelax} />
            )}
```

`src/styles/global.css` 추가
```css
/* ── 후보 0명 / 희소 ── */
.zero { display: grid; gap: 16px; }
.zero__title { margin: 0 0 8px; font-size: 20px; }
.zero__text { margin: 0; color: var(--text); }
.relax { background: var(--card); border-radius: var(--radius-card); box-shadow: var(--shadow); padding: 20px 24px; }
.relax--compact { margin-top: 16px; padding: 16px 20px; }
.relax__title { margin: 0 0 12px; font-size: 16px; }
.relax--compact .relax__title { font-size: 14px; color: var(--text-muted); font-weight: 500; }
.relax__list { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 10px; }
.relax__btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px; border: 1px solid var(--primary); background: #fff; color: var(--primary-deep); cursor: pointer; font-size: 14px; transition: background .15s ease; }
.relax__btn:hover { background: var(--primary-soft); }
.relax__btn:disabled { border-color: var(--border); color: var(--text-muted); background: #F8FAFC; cursor: not-allowed; }
.relax__note { font-size: 12.5px; color: var(--text-muted); }
.near__title { margin: 8px 0 4px; font-size: 16px; }
.near__desc { margin: 0 0 12px; font-size: 13.5px; color: var(--text-muted); }
.chip--change { background: var(--primary-soft); color: var(--primary-deep); border-color: transparent; font-weight: 500; white-space: nowrap; }
```

- [ ] **Step 2: 확인** — Run: `npm test && npm run build` → PASS. 브라우저: `500000` / 뷰티 / 매크로 → "조건에 맞는 크리에이터가 없습니다" 카드에 "뷰티 카테고리의 매크로 크리에이터는 4명 있지만, 모두 단가가 예산 50만 원을 넘습니다. 가장 낮은 단가는 301만 원입니다." / 버튼 4개: "예산을 301만 원으로 올리면 → 1명", "규모를 나노로 바꾸면 → 3명", "규모를 마이크로로 바꾸면 → 0명 · 최저 단가 54만 원"(회색), "카테고리를 넓히면 (매크로 전체) → 0명 · 최저 단가 224만 원"(회색) / 근접 후보 표 3행(준그램40, 라이프뷰티181, 유나매거진115)에 파란 칩 "예산을 658만 원 이상으로" 등. "규모를 나노로 바꾸면" 클릭 → 폼의 규모 카드가 나노로 바뀌고 결과 3명. `3100000` / 뷰티 / 매크로 → 표 1행 아래 "후보가 적습니다…" 작은 카드에 "예산을 472만 5,000원으로 올리면 → 2명". 스크린샷 저장
- [ ] **Step 3: 커밋** — `feat: 후보 0명 화면(진단·완화 버튼·근접 후보)과 후보 1~2명 완화 제안` (배경: 설계 §5.7, §6.2, D16)

---

### Task 15: 목업 로그인과 운영자 화면

**Files:**
- Create: `src/components/LoginForm.tsx`, `src/components/WeightsCard.tsx`
- Modify: `src/app/LoginPage.tsx`(교체), `src/app/AdminPage.tsx`(교체), `src/styles/global.css`
- Test: 화면 확인 (세션·비중 저장은 Task 5·11에서 증명)

**Interfaces:**
- Consumes: `login`, `logout`, `isAdminLoggedIn`, `ADMIN_ACCOUNT`, `navigate`, `loadWeights`, `saveWeights`, `normalizeWeights`, `DEFAULT_WEIGHTS`, `sumWeights`, `METRIC_LABEL`, `MatchingWorkspace`
- Produces: `<LoginForm onLogin />`, `<WeightsCard draft onChange onSave onReset message />`

- [ ] **Step 1: 구현**

`src/components/LoginForm.tsx`
```tsx
import { useState } from 'react';

interface Props {
  /** true면 성공 */
  onLogin: (id: string, password: string) => boolean;
}

export function LoginForm({ onLogin }: Props) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="card login"
      onSubmit={(e) => {
        e.preventDefault();
        if (!onLogin(id.trim(), password)) setError('아이디 또는 비밀번호가 맞지 않습니다.');
      }}
    >
      <h1 className="login__title">운영자 로그인</h1>
      <p className="login__notice">프로토타입용 임시 계정입니다. 실제 인증 기능은 아닙니다.</p>
      <label className="field__label" htmlFor="login-id">아이디</label>
      <input id="login-id" className="input" autoComplete="username" value={id} onChange={(e) => setId(e.target.value)} />
      <label className="field__label login__label" htmlFor="login-pw">비밀번호</label>
      <input id="login-pw" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="field__error" role="alert">{error}</p>}
      <button type="submit" className="btn btn--primary login__submit">로그인</button>
      <p className="login__hint">임시 계정: admin / demo1234</p>
      <a className="login__back" href="#/">← 광고주 화면으로</a>
    </form>
  );
}
```

`src/components/WeightsCard.tsx`
```tsx
import { METRIC_KEYS } from '../domain/types';
import type { Weights } from '../domain/types';
import { METRIC_LABEL, sumWeights } from '../domain/weights';

interface Props {
  draft: Weights;
  onChange: (w: Weights) => void;
  onSave: () => void;
  onReset: () => void;
  message: string | null;
}

/** 비중 조절 카드 (설계 §6.4 2, D23) */
export function WeightsCard({ draft, onChange, onSave, onReset, message }: Props) {
  const sum = sumWeights(draft);
  const ok = sum === 100;
  return (
    <section className="card weights">
      <div className="weights__head">
        <div>
          <h2 className="weights__title">매칭 점수 비중 조절</h2>
          <p className="weights__desc">슬라이더를 움직이면 아래 결과가 바로 바뀝니다. 저장하면 광고주 화면에 적용됩니다.</p>
        </div>
        <div className={`weights__sum${ok ? ' is-ok' : ' is-bad'}`} aria-live="polite">
          합계 {sum} {ok ? '✓' : '✕'}
          {!ok && <span className="weights__sum-help">합계가 100이어야 저장할 수 있습니다</span>}
        </div>
      </div>
      <div className="weights__grid">
        {METRIC_KEYS.map((k) => (
          <label key={k} className="slider">
            <span className="slider__label">{METRIC_LABEL[k]}</span>
            <input type="range" min={0} max={100} step={1} value={draft[k]} onChange={(e) => onChange({ ...draft, [k]: Number(e.target.value) })} />
            <span className="slider__value">{draft[k]}</span>
          </label>
        ))}
      </div>
      <p className="weights__warning">한 항목에 60 이상을 몰면 추천 이유와 순위가 어긋날 수 있습니다.</p>
      <div className="weights__actions">
        <button type="button" className="btn btn--primary" disabled={!ok} onClick={onSave}>저장</button>
        <button type="button" className="btn" onClick={onReset}>기본값으로 되돌리기</button>
        {message && <span className="weights__message" role="status">{message}</span>}
      </div>
    </section>
  );
}
```

`src/app/LoginPage.tsx` 교체
```tsx
import { useEffect } from 'react';
import { Header } from '../components/Header';
import { LoginForm } from '../components/LoginForm';
import { isAdminLoggedIn, login } from './session';
import { navigate } from './router';

export function LoginPage() {
  useEffect(() => {
    if (isAdminLoggedIn()) navigate('/admin');
  }, []);
  return (
    <div className="page">
      <Header variant="login" />
      <main className="main main--narrow">
        <LoginForm
          onLogin={(id, pw) => {
            const ok = login(id, pw);
            if (ok) navigate('/admin');
            return ok;
          }}
        />
      </main>
    </div>
  );
}
```

`src/app/AdminPage.tsx` 교체
```tsx
import { useEffect, useMemo, useState } from 'react';
import type { LoadedData } from './dataset';
import { isAdminLoggedIn, logout, ADMIN_ACCOUNT } from './session';
import { navigate } from './router';
import { Header } from '../components/Header';
import { DataStatusFooter } from '../components/DataStatusFooter';
import { WeightsCard } from '../components/WeightsCard';
import { MatchingWorkspace } from '../components/MatchingWorkspace';
import { DEFAULT_WEIGHTS, loadWeights, normalizeWeights, saveWeights } from '../domain/weights';
import type { Weights } from '../domain/types';

export function AdminPage({ data }: { data: LoadedData }) {
  const loggedIn = isAdminLoggedIn();
  const [draft, setDraft] = useState<Weights>(() => loadWeights());
  const [message, setMessage] = useState<string | null>(null);
  // 저장 전이라도 이 화면의 결과에는 실시간 반영. 합이 100이 아니면 비율로 환산 (L21)
  const previewWeights = useMemo(() => normalizeWeights(draft), [draft]);

  useEffect(() => {
    if (!loggedIn) navigate('/login');
  }, [loggedIn]);
  if (!loggedIn) return null;

  const handleSave = () =>
    setMessage(saveWeights(draft) ? '저장했습니다. 광고주 화면에 적용됩니다.' : '저장에 실패했습니다. 브라우저 저장소를 사용할 수 없습니다.');
  const handleReset = () => {
    setDraft({ ...DEFAULT_WEIGHTS });
    setMessage(null);
  };
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="page">
      <Header variant="admin" accountName={ADMIN_ACCOUNT.id} onLogout={handleLogout} />
      <main className="main">
        {data.ok ? (
          <>
            <WeightsCard
              draft={draft}
              onChange={(w) => {
                setDraft(w);
                setMessage(null);
              }}
              onSave={handleSave}
              onReset={handleReset}
              message={message}
            />
            <MatchingWorkspace creators={data.creators} stats={data.stats} weights={previewWeights} />
          </>
        ) : (
          <section className="card error" role="alert">{data.message}</section>
        )}
      </main>
      {data.ok && <DataStatusFooter stats={data.stats} />}
    </div>
  );
}
```

`src/styles/global.css` 추가
```css
/* ── 로그인 ── */
.login { display: flex; flex-direction: column; }
.login__title { margin: 0 0 6px; font-size: 22px; }
.login__notice { margin: 0 0 20px; font-size: 13.5px; color: var(--warning-fg); background: var(--warning-bg); padding: 8px 12px; border-radius: 10px; }
.login__label { margin-top: 14px; }
.login__submit { margin-top: 20px; padding: 12px; }
.login__hint { margin: 14px 0 0; font-size: 13px; color: var(--text-muted); text-align: center; }
.login__back { margin-top: 8px; font-size: 13px; text-align: center; }

/* ── 운영자 비중 카드 ── */
.weights { margin-bottom: 20px; }
.weights__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.weights__title { margin: 0 0 4px; font-size: 20px; }
.weights__desc { margin: 0; font-size: 13.5px; color: var(--text-muted); }
.weights__sum { font-weight: 700; padding: 8px 14px; border-radius: 12px; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.weights__sum.is-ok { background: var(--positive-bg); color: var(--positive-fg); }
.weights__sum.is-bad { background: #FEE2E2; color: var(--destructive); }
.weights__sum-help { font-size: 12px; font-weight: 500; }
.weights__grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin: 20px 0 12px; }
.slider { display: flex; flex-direction: column; gap: 6px; font-size: 13.5px; }
.slider input[type="range"] { width: 100%; accent-color: var(--primary); }
.slider__label { font-weight: 500; }
.slider__value { font-weight: 700; font-size: 18px; color: var(--primary-deep); }
.weights__warning { margin: 0 0 14px; font-size: 13px; color: var(--warning-fg); }
.weights__actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.weights__message { font-size: 13.5px; color: var(--positive-fg); }
```

- [ ] **Step 2: 확인** — Run: `npm test && npm run build` → PASS. 브라우저: `#/admin` 직접 진입 → `#/login`으로 이동. 틀린 비밀번호 → "아이디 또는 비밀번호가 맞지 않습니다." `admin` / `demo1234` → `#/admin`: 헤더 "Creator Match 운영자 화면 · admin · 로그아웃", 비중 카드(슬라이더 5개, "합계 100 ✓"), 아래 동일 입력 패널. 뷰티+패션/마이크로/150만 검색 후 "캠페인 건수" 슬라이더를 60으로 → "합계 150 ✕"와 안내, 저장 비활성, 그런데 표 순위는 즉시 바뀐다. 다른 슬라이더를 내려 합 100 → 저장 → "저장했습니다. 광고주 화면에 적용됩니다." `#/`로 가서 같은 검색 → 저장한 비중의 순위. 로그아웃 → `#/`, `#/admin` 재진입 시 로그인으로. 스크린샷 저장
- [ ] **Step 3: 커밋** — `feat: 목업 로그인과 운영자 비중 조절 화면(실시간 미리보기·저장·기본값)` (배경: 설계 §6.3, §6.4, D23, D24. 미리보기 비율 환산은 L21)

---

### Task 16: 반응형·접근성·마무리

**Files:**
- Modify: `src/styles/global.css`(미디어 쿼리, reduced-motion), 필요 시 소소한 수정

- [ ] **Step 1: CSS 추가**

```css
/* ── 반응형 (설계 §6.5) ── */
html, body { overflow-x: hidden; }
@media (max-width: 1100px) {
  .panel__grid { grid-template-columns: 1fr; gap: 20px; }
  .weights__grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 767px) {
  .main, .header, .footer { padding-left: 16px; padding-right: 16px; }
  .intro { font-size: 18px; }
  .tiers { grid-template-columns: 1fr; }
  .table { min-width: 860px; }
  .weights__grid { grid-template-columns: 1fr 1fr; }
  .bars__item { grid-template-columns: 110px 1fr 36px; }
  .bars__rank { grid-column: 2 / -1; }
}

/* ── 동작 축소 존중 ── */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition: none !important; animation: none !important; }
}
```

- [ ] **Step 2: 확인** — 브라우저 너비 1280 / 900 / 375에서 `#/` 검색 결과 화면: 1280은 패널 3열·표 전체 폭, 900은 패널 1열, 375는 표만 컨테이너 안에서 가로 스크롤(페이지는 가로 스크롤 없음: `document.documentElement.scrollWidth <= window.innerWidth`). Tab 키로 칩·카드·정렬 버튼·▸·ⓘ에 포커스 링이 보이고 ⓘ 포커스 시 툴팁이 뜬다. 스크린샷 3장 저장. `npm test && npm run build` PASS
- [ ] **Step 3: 커밋** — `feat: 반응형 3단계 레이아웃과 접근성 마무리(포커스 링, 동작 축소)` (배경: 설계 §6.5, §6.6)

---

### Task 17: GitHub Pages 배포

**Files:**
- Create: `.github/workflows/pages.yml`

- [ ] **Step 1: 워크플로 작성**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: 저장소 Pages 설정을 "GitHub Actions"로** (외부 서비스 설정 변경. 이 계획의 승인으로 진행)

```bash
gh api -X POST repos/rlaskadls35-boop/creator-match/pages -f build_type=workflows 2>/dev/null || gh api -X PUT repos/rlaskadls35-boop/creator-match/pages -f build_type=workflows
```

- [ ] **Step 3: 커밋·푸시** — `chore: GitHub Actions로 GitHub Pages 자동 배포` (배경: 설계 §9) → `git push origin main`
- [ ] **Step 4: 배포 확인** — `gh run watch` 또는 `gh run list --limit 1`로 성공 확인 후:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://rlaskadls35-boop.github.io/creator-match/
```
→ `200`. 브라우저에서 데모 URL 열어 검색 → 결과 표, `#/login` → `#/admin` 동작 확인. 스크린샷 저장

---

## 자체 점검 (Self-Review)

**설계 대비 누락 점검**
- §3.3 읽기·정제 7항목 → Task 3 (BOM, CRLF, 헤더 검증, 행 검증, 평점 null, 건너뛴 행 수, 원본 무수정)
- §3.4 파생 필드 → Task 3
- §4 문구 표 전부 → Task 2(규모 카드), 11(헤더·부제·안내·푸터·운영자 링크), 12(라벨·도움말·버튼), 13(결과 제목·툴팁·배지·예상 표시·추천 이유 열·펼침 제목·유의점 접두), 14(0명 제목·완화 제목·근접 제목·설명·마지막 열), 15(로그인 안내·운영자 제목·안내·경고)
- §5.1~5.10 → Task 8·9·10·6·4·5
- §6.1~6.6 → Task 11~16
- §7 폴더 → §0.2 (설계에 없던 `searchForm.ts`, `pages` 대신 `app/*Page.tsx`는 설계 §7 "app/ 라우팅, 세션"의 자연스러운 확장)
- §8 테스트 10항목 + 스모크 1개 → Task 3(1·2·3), 4(4), 6(5), 8(6·9), 9(7), 10(8), 5(10), 13(스모크)
- §9 배포 → Task 17. §10 커밋 규칙 → Global Constraints
- §11 제출 문서 4종은 이 계획의 범위 밖 (사용자 승인 절차가 별도. 구현 완료 후 진행)
- §12 열린 항목: 최종 기본 비중 확정은 운영자 화면 완성 후 사용자가 실험 → 이 계획 밖

**자리표시자 점검**: "TBD/TODO/나중에/적절히" 없음. 모든 코드 단계에 실제 코드 있음.

**타입 일관성 점검**: `SearchInput`·`SortState`·`ResultFilters`·`Relaxation`·`NearCandidate`·`ZeroResultInfo`는 Task 8·9 정의를 Task 12~14가 그대로 사용. `MetricScore.groupLabel`은 `'전체'` 또는 tier 이름(Task 6 → Task 10 문구). `LoadedData`는 Task 11 정의를 12·15가 사용. `Header variant`는 `'advertiser' | 'admin' | 'login'`으로 통일.
