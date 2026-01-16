import DOMPurify from "dompurify";
import { marked } from "marked";

import { SANITIZE_OPTIONS } from "./constants";
import {
  calloutRenderer,
  calloutTokenizer,
  wikiLinkRenderer,
  wikiLinkTokenizer,
} from "./extensions";
import { createRendererWithLinkPolicy } from "./renderer";
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
  const footnoteMatches = markdown.match(/^\[\^([^\]]+)\]:\s*(.*)$/gm);

  if (footnoteMatches) {
    footnoteMatches.forEach((matchStr) => {
      const parts = matchStr.match(/^\[\^([^\]]+)\]:\s*(.*)$/);
      if (parts) {
        footnotes.push({
          label: parts[1].trim(),
          content: parts[2].trim(),
        });
      }
    });
  }

  return footnotes;
}

function removeFootnoteDefinitions(markdown: string): string {
  return markdown.replace(/^\[\^([^\]]+)\]:\s*.*$/gm, "").trim();
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
    .map(
      (fn) =>
        `<div class="footnote-def" id="footnote-${fn.label}">
          <a href="#footnote-ref-${fn.label}" class="footnote-backref">${fn.label}</a>: ${marked.parseInline(fn.content)}
        </div>`,
    )
    .join("");
}

export function renderMarkdown(
  markdown: string,
  brokenLinks?: Set<string>,
): RenderResult {
  if (!markdown) {
    return { content: "", footnotes: "" };
  }

  setBrokenLinks(brokenLinks || new Set());

  const footnotes = extractFootnotes(markdown);
  let contentWithoutFootnoteDefs = removeFootnoteDefinitions(markdown);

  if (footnotes.length > 0) {
    contentWithoutFootnoteDefs = replaceFootnoteReferences(
      contentWithoutFootnoteDefs,
    );
  }

  const html = marked.parse(contentWithoutFootnoteDefs) as string;
  const footnotesHtml = renderFootnotesHtml(footnotes);

  if (import.meta.env.DEV) {
    return { content: html, footnotes: footnotesHtml };
  }

  const sanitizedContent = DOMPurify.sanitize(html, SANITIZE_OPTIONS);
  const sanitizedFootnotes = DOMPurify.sanitize(
    footnotesHtml,
    SANITIZE_OPTIONS,
  );

  return { content: sanitizedContent, footnotes: sanitizedFootnotes };
}
