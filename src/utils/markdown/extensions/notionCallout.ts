import type { RendererExtension, TokenizerExtension, Tokens } from 'marked'
import type { NotionCalloutToken } from '../types'

// <callout color="gray_bg"> ... </callout>
// 노션 마크다운 export는 콜아웃을 표준 GFM이 아닌 XML 유사 태그로 내보낸다.
// 본문은 marked가 다시 블록 파싱하도록 토큰화한다.
const CALLOUT_RE =
  /^<callout(?:\s+color="([^"]*)")?\s*>\n?([\s\S]*?)\n?<\/callout>/

// 노션 색상 이름(gray_bg 등)을 CSS 클래스에 안전하게 쓰도록 정리한다.
function colorClass(color?: string): string {
  if (!color) return ''
  const safe = color.replace(/[^a-z0-9_-]/gi, '')
  return safe ? ` callout-${safe}` : ''
}

export const notionCalloutTokenizer: TokenizerExtension = {
  name: 'notionCallout',
  level: 'block',
  start(src: string) {
    const i = src.indexOf('<callout')
    return i === -1 ? undefined : i
  },
  tokenizer(src): NotionCalloutToken | undefined {
    const cap = CALLOUT_RE.exec(src)
    if (!cap) return undefined

    const [raw, color, body] = cap
    // preprocessNotion이 탭 들여쓰기를 공백 2칸으로 바꾸므로 한 단계 내어쓴다.
    const dedented = body.replace(/^ {2}/gm, '')
    const tokens = this.lexer.blockTokens(dedented, [])

    return {
      type: 'notionCallout',
      raw,
      color: color || undefined,
      tokens,
    }
  },
}

export const notionCalloutRenderer: RendererExtension = {
  name: 'notionCallout',
  renderer(token: Tokens.Generic) {
    const calloutToken = token as NotionCalloutToken
    const inner = this.parser.parse(calloutToken.tokens)

    return `
<aside class="callout notion-callout${colorClass(calloutToken.color)}" role="note">
  <div class="callout-content">
${inner}  </div>
</aside>`.trim()
  },
}
