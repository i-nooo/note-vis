---
title: "HTML preview"
tags: ["note-vis"]
created date: "2025-01-19"
edited date: "2025-01-19"
---

본 프로젝트 내 마크다운 파일에서 HTML, CSS, JavaScript 코드를 작성하고 실시간으로 렌더링할 수 있다.

## 사용 방법

코드 블록에 `html-preview` 또는 `html-live` 언어를 지정한다.

````markdown
```html-preview
<p>Hello World</p>
```
````

---

## 예제 1: 기본 HTML + CSS

```html-preview
<style>
  .card {
    padding: 20px;
    border-radius: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-family: system-ui, sans-serif;
    text-align: center;
  }
  .card h2 {
    margin: 0 0 8px 0;
  }
  .card p {
    margin: 0;
    opacity: 0.9;
  }
</style>

<div class="card">
  <h2>카드 제목</h2>
  <p>CSS 스타일이 적용된 카드 컴포넌트</p>
</div>
```

---

## 예제 2: CSS 애니메이션

```html-preview
<style>
  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 20px auto;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>

<div class="spinner"></div>
```

---

## 예제 3: JavaScript 인터랙션

```html-preview
<style>
  .counter {
    font-family: system-ui, sans-serif;
    text-align: center;
    padding: 20px;
  }
  .count {
    font-size: 48px;
    font-weight: bold;
    color: #333;
  }
  .buttons {
    margin-top: 16px;
    display: flex;
    gap: 8px;
    justify-content: center;
  }
  button {
    padding: 8px 16px;
    font-size: 18px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    background: #4f46e5;
    color: white;
  }
  button:hover {
    background: #4338ca;
  }
</style>

<div class="counter">
  <div class="count" id="count">0</div>
  <div class="buttons">
    <button onclick="decrement()">-</button>
    <button onclick="increment()">+</button>
  </div>
</div>

<script>
  let count = 0;
  const countEl = document.getElementById('count');

  function increment() {
    count++;
    countEl.textContent = count;
  }

  function decrement() {
    count--;
    countEl.textContent = count;
  }
</script>
```

---

## 예제 4: Flexbox 레이아웃

```html-preview
<style>
  .flex-container {
    display: flex;
    gap: 10px;
    padding: 20px;
    background: #f5f5f5;
  }
  .box {
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: white;
    border-radius: 8px;
  }
  .box:nth-child(1) { background: #ef4444; }
  .box:nth-child(2) { background: #f59e0b; }
  .box:nth-child(3) { background: #10b981; }
  .box:nth-child(4) { background: #3b82f6; }
</style>

<div class="flex-container">
  <div class="box">1</div>
  <div class="box">2</div>
  <div class="box">3</div>
  <div class="box">4</div>
</div>
```

---

## 보안

iframe의 `sandbox="allow-scripts"` 속성으로 격리되어 있어 메인 페이지에 영향을 주지 않는다.

- 부모 페이지 DOM 접근 불가
- 쿠키, localStorage 접근 불가
- 폼 제출 불가

---

## 구현 상세

### 아키텍처 개요

```
마크다운 → marked 파서 → 커스텀 렌더러 → DOMPurify → 화면 출력
                              ↓
                    html-preview 감지
                              ↓
                    sandbox iframe 생성
```

### 1. 커스텀 코드 블록 렌더러

`src/utils/markdown/renderer.ts`에서 코드 블록을 처리할 때 언어가 `html-preview` 또는 `html-live`인 경우를 감지한다.

```ts
code({ text: code, lang }: { text: string; lang?: string }) {
  // HTML 프리뷰 처리
  if (lang === 'html-preview' || lang === 'html-live') {
    return createHtmlPreview(code)
  }
  // ... 일반 코드 블록 처리
}
```

### 2. iframe 생성 함수

`createHtmlPreview` 함수가 sandbox iframe을 포함한 HTML 구조를 생성한다.

```ts
function createHtmlPreview(code: string): string {
  const id = `html-preview-${previewIdCounter++}`

  return `<div class="html-preview-container">
    <div class="html-preview-header">
      <span class="html-preview-label">HTML Preview</span>
      <button class="html-preview-toggle"
        onclick="this.closest('.html-preview-container').classList.toggle('show-code')">
        코드 보기
      </button>
    </div>
    <iframe
      id="${id}"
      class="html-preview-frame"
      sandbox="allow-scripts"
      srcdoc="${escapeHtml(code)}"
    ></iframe>
    <pre class="html-preview-source">
      <code class="language-html">${escapeHtml(code)}</code>
    </pre>
  </div>`
}
```

**핵심 포인트:**

| 속성 | 설명 |
|------|------|
| `sandbox="allow-scripts"` | JS 실행은 허용하되 부모 페이지 접근 차단 |
| `srcdoc` | iframe 내용을 인라인으로 지정 (별도 URL 불필요) |
| `escapeHtml()` | XSS 방지를 위해 HTML 특수문자 이스케이프 |

### 3. DOMPurify 설정

`src/utils/markdown/constants.ts`에서 iframe 관련 태그와 속성을 허용 목록에 추가한다.

```ts
export const SANITIZE_OPTIONS = {
  ADD_ATTR: [
    // 기존 속성들...
    "sandbox",   // iframe 보안 정책
    "srcdoc",    // iframe 인라인 콘텐츠
    "onclick",   // 토글 버튼용
  ],
  ADD_TAGS: [
    // 기존 태그들...
    "iframe",    // 프리뷰 컨테이너
    "button",    // 코드 보기 토글
  ],
}
```

### 4. CSS 스타일링

`src/styles/markdown.css`에서 프리뷰 컨테이너 스타일을 정의한다.

```css
/* 컨테이너 */
.html-preview-container {
  margin: 20px 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

/* 헤더 (라벨 + 토글 버튼) */
.html-preview-header {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: var(--muted);
}

/* iframe */
.html-preview-frame {
  width: 100%;
  min-height: 150px;
  border: none;
  background: white;
}

/* 소스 코드 (기본 숨김) */
.html-preview-source {
  display: none;
}

/* 토글 시 소스 코드 표시 */
.html-preview-container.show-code .html-preview-source {
  display: block;
}
```

### 5. sandbox 속성 상세

iframe의 `sandbox` 속성은 보안 정책을 세밀하게 제어한다.

| 값 | 허용 | 차단 |
|----|------|------|
| `allow-scripts` | JavaScript 실행 | - |
| (미지정) | - | 부모 DOM 접근 |
| (미지정) | - | 쿠키/스토리지 |
| (미지정) | - | 폼 제출 |
| (미지정) | - | 팝업/모달 |

`allow-same-origin`을 추가하면 부모 페이지 접근이 가능해지므로 **절대 추가하지 않는다**.

### 파일 구조

```
src/utils/markdown/
├── index.ts          # renderMarkdown 진입점
├── renderer.ts       # 커스텀 렌더러 (html-preview 처리)
├── constants.ts      # DOMPurify 설정
├── helpers.ts        # escapeHtml 등 유틸
└── extensions/       # 콜아웃, 위키링크 등

src/styles/
└── markdown.css      # html-preview 스타일
```
