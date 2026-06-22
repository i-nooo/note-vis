import DOMPurify from "dompurify";
import { marked } from "marked";

import { SANITIZE_OPTIONS } from "./constants";
import {
  calloutRenderer,
  calloutTokenizer,
  notionCalloutRenderer,
  notionCalloutTokenizer,
  wikiLinkRenderer,
  wikiLinkTokenizer,
} from "./extensions";
import { resetSlugCounter } from "./helpers";
import { preprocessNotion } from "./notion";
import {
  createRendererWithLinkPolicy,
  getCollectedHeadings,
  resetHeadingsCollector,
} from "./renderer";
import { setBrokenLinks } from "./types";
import type { Footnote, RenderResult } from "./types";

function setupMarked(): void {
  const renderer = createRendererWithLinkPolicy();
  marked.use({ renderer });
  marked.use({
    extensions: [
      wikiLinkTokenizer,
      wikiLinkRenderer,
      calloutTokenizer,
      calloutRenderer,
      notionCalloutTokenizer,
      notionCalloutRenderer,
    ],
  });
  marked.setOptions({
    gfm: true,
    breaks: true,
  });
}

setupMarked();

function extractFootnotes(markdown: string): Array<Footnote> {
  const footnotes: Array<Footnote> = [];
  const lines = markdown.split("\n");
  let currentFootnote: Footnote | null = null;

  for (const line of lines) {
    const footnoteDef = line.match(/^\[\^([^\]]+)\]:\s*(.*)$/);
    if (footnoteDef) {
      if (currentFootnote) {
        footnotes.push(currentFootnote);
      }
      currentFootnote = {
        label: footnoteDef[1].trim(),
        content: footnoteDef[2].trim(),
      };
    } else if (currentFootnote && line.startsWith("  ")) {
      currentFootnote.content += "\n" + line.trim();
    } else if (currentFootnote) {
      footnotes.push(currentFootnote);
      currentFootnote = null;
    }
  }

  if (currentFootnote) {
    footnotes.push(currentFootnote);
  }

  return footnotes;
}

function removeFootnoteDefinitions(markdown: string): string {
  const lines = markdown.split("\n");
  const result: Array<string> = [];
  let inFootnote = false;

  for (const line of lines) {
    if (/^\[\^([^\]]+)\]:/.test(line)) {
      inFootnote = true;
    } else if (inFootnote && line.startsWith("  ")) {
      continue;
    } else {
      inFootnote = false;
      result.push(line);
    }
  }

  return result.join("\n").trim();
}

function replaceFootnoteReferences(content: string): string {
  return content.replace(
    /\[\^([^\]]+)\]/g,
    '<sup class="footnote-ref"><a href="#footnote-$1" id="footnote-ref-$1" class="footnote-link">$1</a></sup>',
  );
}

function renderFootnotesHtml(footnotes: Array<Footnote>): string {
  if (footnotes.length === 0) return "";

  return footnotes
    .map((fn) => {
      const contentWithBreaks = fn.content.replace(/\n/g, "<br>");
      return `<div class="footnote-def" id="footnote-${fn.label}">
          <a href="#footnote-ref-${fn.label}" class="footnote-backref">${fn.label}</a>: ${marked.parseInline(contentWithBreaks)}
        </div>`;
    })
    .join("");
}

export function renderMarkdown(
  markdown: string,
  brokenLinks?: Set<string>,
  mentionTitles?: Map<string, string>,
): RenderResult {
  if (!markdown) {
    return { content: "", footnotes: "", headings: [] };
  }

  setBrokenLinks(brokenLinks || new Set());
  resetSlugCounter();
  resetHeadingsCollector();

  // 노션 방언(NFM) → 표준 마크다운/위키링크. 각주 추출보다 먼저 실행해야
  // 이스케이프된 각주 마커가 정상 인식된다.
  const normalized = preprocessNotion(markdown, mentionTitles);

  const footnotes = extractFootnotes(normalized);
  let contentWithoutFootnoteDefs = removeFootnoteDefinitions(normalized);

  if (footnotes.length > 0) {
    contentWithoutFootnoteDefs = replaceFootnoteReferences(
      contentWithoutFootnoteDefs,
    );
  }

  const html = marked.parse(contentWithoutFootnoteDefs) as string;
  const footnotesHtml = renderFootnotesHtml(footnotes);
  const headings = getCollectedHeadings();

  if (import.meta.env.DEV) {
    return { content: html, footnotes: footnotesHtml, headings };
  }

  const sanitizedContent = DOMPurify.sanitize(html, SANITIZE_OPTIONS);
  const sanitizedFootnotes = DOMPurify.sanitize(
    footnotesHtml,
    SANITIZE_OPTIONS,
  );

  return { content: sanitizedContent, footnotes: sanitizedFootnotes, headings };
}
