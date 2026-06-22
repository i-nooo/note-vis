import { describe, expect, it } from "vitest";
import { preprocessNotion } from "./notion";

describe("preprocessNotion", () => {
  it("self-closing mention을 제목 있는 위키링크로 변환한다", () => {
    const titles = new Map([["abc123", "내 노트"]]);
    const out = preprocessNotion(
      '<mention-page url="https://app.notion.com/p/abc123"/>',
      titles,
    );
    expect(out).toBe("[[abc123|내 노트]]");
  });

  it("제목을 모르면 ID만으로 위키링크를 만든다", () => {
    const out = preprocessNotion(
      '<mention-page url="https://app.notion.com/p/abc123"/>',
    );
    expect(out).toBe("[[abc123]]");
  });

  it("inner text가 있는 mention은 그 텍스트를 alias로 쓴다", () => {
    const out = preprocessNotion(
      '<mention-page url="https://app.notion.com/p/abc123">페이지 제목</mention-page>',
    );
    expect(out).toBe("[[abc123|페이지 제목]]");
  });

  it("위키링크를 깨뜨리는 문자([ ] |)를 제목에서 제거한다", () => {
    const titles = new Map([["abc123", "a|b]c["]]);
    const out = preprocessNotion(
      '<mention-page url="https://app.notion.com/p/abc123"/>',
      titles,
    );
    expect(out).toBe("[[abc123|abc]]");
  });

  it("<empty-block/> 줄을 제거한다", () => {
    const out = preprocessNotion("첫 줄\n<empty-block/>\n둘째 줄");
    expect(out).toBe("첫 줄\n\n둘째 줄");
  });

  it("이스케이프된 각주 마커를 표준 형태로 되돌린다", () => {
    const out = preprocessNotion("본문\\[\\^1\\]\n\\[\\^1\\]: 각주 내용");
    expect(out).toBe("본문[^1]\n[^1]: 각주 내용");
  });

  it("줄 앞 탭 들여쓰기를 2칸 공백으로 정규화한다", () => {
    const out = preprocessNotion("- a\n\t- b\n\t\t- c");
    expect(out).toBe("- a\n  - b\n    - c");
  });

  it("펜스 코드블록 안의 내용은 변환하지 않는다", () => {
    const input = [
      "본문 <empty-block/>",
      "```ts",
      "const x = '<empty-block/>'",
      "\tconst y = 1",
      "```",
      "<empty-block/>",
    ].join("\n");
    const out = preprocessNotion(input);
    expect(out).toContain("const x = '<empty-block/>'");
    expect(out).toContain("\tconst y = 1");
    // 코드블록 바깥 첫 줄의 빈 블록은 제거된다
    expect(out.startsWith("본문 ")).toBe(true);
    // 마지막 줄의 빈 블록은 제거된다
    expect(out.endsWith("\n")).toBe(true);
  });
});
