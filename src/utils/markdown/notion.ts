/**
 * Notion-Flavored Markdown (NFM) 전처리 레이어.
 *
 * `notion.pages.retrieveMarkdown()`는 표준 GFM이 아니라 XML 유사 커스텀 태그를
 * 섞은 노션 방언을 내보낸다. `marked`가 이해할 수 있도록 표준 마크다운 또는
 * 기존 커스텀 확장(wikilink)으로 정규화한다.
 *
 * 변환은 모두 펜스 코드블록(```...```) 바깥에서만 수행한다. 코드 예제 안에
 * `<empty-block/>`, 탭 들여쓰기, `[^1]` 등이 그대로 들어 있을 수 있기 때문이다.
 */

// <mention-page url="https://app.notion.com/p/ID">제목</mention-page>
const MENTION_WITH_TEXT =
  /<mention-page\s+url="https:\/\/app\.notion\.com\/p\/([a-z0-9]+)"\s*>([\s\S]*?)<\/mention-page>/gi;

// <mention-page url="https://app.notion.com/p/ID"/>
const MENTION_SELF_CLOSING =
  /<mention-page\s+url="https:\/\/app\.notion\.com\/p\/([a-z0-9]+)"\s*\/>/gi;

// 노션이 내보낸 빈 블록(빈 문단). 한 줄 전체를 차지한다.
const EMPTY_BLOCK = /^[ \t]*<empty-block\s*\/>[ \t]*$/gim;

// 이스케이프된 각주 마커  \[\^1\] → [^1]  (참조와 정의 양쪽 모두)
const ESCAPED_FOOTNOTE = /\\\[\\\^([^\]\\]+)\\\]/g;

// 줄 앞 탭 들여쓰기 (노션 중첩 리스트는 레벨당 탭 1개를 쓴다)
const LEADING_TABS = /^\t+/gm;

/**
 * 노션 page ID를 위키링크로 변환한다. 제목을 알면 `[[ID|제목]]`,
 * 모르면 `[[ID]]`. 제목은 wikilink 토크나이저를 깨뜨리는 `[`, `]`, `|`를 제거한다.
 */
function toWikiLink(id: string, title?: string): string {
  const clean = (title ?? "").replace(/[[\]|]/g, "").trim();
  return clean ? `[[${id}|${clean}]]` : `[[${id}]]`;
}

/**
 * 펜스 코드블록을 보존하면서 바깥 텍스트에만 `fn`을 적용한다.
 * split 캡처 그룹 덕에 홀수 인덱스가 코드블록, 짝수 인덱스가 일반 텍스트다.
 */
function transformOutsideCode(md: string, fn: (text: string) => string): string {
  return md
    .split(/(```[\s\S]*?```)/g)
    .map((part, i) => (i % 2 === 1 ? part : fn(part)))
    .join("");
}

export function preprocessNotion(
  markdown: string,
  mentionTitles?: Map<string, string>,
): string {
  return transformOutsideCode(markdown, (text) =>
    text
      .replace(MENTION_WITH_TEXT, (_m, id: string, inner: string) =>
        toWikiLink(id, inner),
      )
      .replace(MENTION_SELF_CLOSING, (_m, id: string) =>
        toWikiLink(id, mentionTitles?.get(id)),
      )
      .replace(EMPTY_BLOCK, "")
      .replace(ESCAPED_FOOTNOTE, "[^$1]")
      .replace(LEADING_TABS, (tabs) => "  ".repeat(tabs.length)),
  );
}
