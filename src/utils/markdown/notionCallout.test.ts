import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./index";

describe("notion callout 렌더링", () => {
  it("<callout> 블록을 단순 박스로 렌더링하고 내부 마크다운을 파싱한다", () => {
    const md = [
      '<callout color="gray_bg">',
      "\t저는 **소프트웨어 개발**을 합니다.",
      "</callout>",
    ].join("\n");

    const { content } = renderMarkdown(md);

    // 콜아웃 박스로 감싸지고 색상 클래스가 붙는다
    expect(content).toContain('class="callout notion-callout callout-gray_bg"');
    // 내부 마크다운(**...**)이 실제로 파싱된다 (리터럴 ** 가 남지 않음)
    expect(content).toContain("<strong>소프트웨어 개발</strong>");
    expect(content).not.toContain("**소프트웨어 개발**");
    // 접기/펼치기(details)나 원본 <callout> 태그가 남지 않는다
    expect(content).not.toContain("<details");
    expect(content).not.toContain("<callout");
  });
});
