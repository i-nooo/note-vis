import type { CalloutConfig, CalloutKind } from "./types";

export const CALLOUTS: Record<CalloutKind, CalloutConfig> = {
  NOTE: {
    className: "callout-note",
    defaultTitle: "노트",
    ariaLabel: "Note",
  },
  INFO: {
    className: "callout-info",
    defaultTitle: "정보",
    ariaLabel: "Info",
  },
};

export const SANITIZE_OPTIONS = {
  ADD_ATTR: ["target", "rel", "open", "class", "href", "id", "style"],
  ADD_TAGS: [
    "span",
    "sup",
    "a",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "hr",
    "div",
  ],
  ALLOWED_URI_REGEXP:
    /^(?:(?:https?|mailto|tel|data:image\/(?:png|gif|jpeg|webp));|\/|#)/i,
};
