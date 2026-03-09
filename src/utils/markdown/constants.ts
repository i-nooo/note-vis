import type { CalloutConfig, CalloutKind } from "./types";

export const CALLOUTS: Record<CalloutKind, CalloutConfig> = {
  NOTE: {
    className: "callout-note",
    defaultTitle: "✏️",
    ariaLabel: "Note",
  },
  INFO: {
    className: "callout-info",
    defaultTitle: "ℹ️",
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
    "del",
  ],
  ALLOWED_URI_REGEXP:
    /^(?:(?:https?|mailto|tel|data:image\/(?:png|gif|jpeg|webp));|\/|#)/i,
};
