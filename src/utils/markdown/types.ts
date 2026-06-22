import type { Tokens } from 'marked'

export type CalloutKind = 'NOTE' | 'INFO'

export interface CalloutToken extends Tokens.Generic {
  type: 'callout'
  calloutType: CalloutKind
  title?: string
  collapsed?: boolean
  tokens: Array<Tokens.Generic>
}

// 노션이 내보내는 <callout color="..."> 블록. GFM `> [!NOTE]` 콜아웃과 달리
// 접기/펼치기나 제목 아이콘이 없는 단순 박스다.
export interface NotionCalloutToken extends Tokens.Generic {
  type: 'notionCallout'
  color?: string
  tokens: Array<Tokens.Generic>
}

export interface WikiLinkToken extends Tokens.Generic {
  type: 'wikilink'
  href: string
  text: string
}

export interface CalloutConfig {
  className: string
  defaultTitle: string
  ariaLabel: string
}

export interface Footnote {
  label: string
  content: string
}

export interface HeadingItem {
  id: string
  text: string
  level: number
}

export interface RenderResult {
  content: string
  footnotes: string
  headings: Array<HeadingItem>
}

export interface BrokenLinksContext {
  brokenLinks: Set<string>
}

const _brokenLinksContext: BrokenLinksContext = { brokenLinks: new Set() }

export function setBrokenLinks(links: Set<string>): void {
  _brokenLinksContext.brokenLinks = links
}

export function getBrokenLinks(): Set<string> {
  return _brokenLinksContext.brokenLinks
}
