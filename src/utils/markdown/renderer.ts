import { escapeHtml, slugifyHeading } from './helpers'
import type { HeadingItem } from './types'

let headingsCollector: Array<HeadingItem> = []

export function resetHeadingsCollector(): void {
  headingsCollector = []
}

export function getCollectedHeadings(): Array<HeadingItem> {
  return headingsCollector
}

export function createRendererWithLinkPolicy() {
  const renderer = {
    link(
      this: { parser: { parseInline(tokens: Array<unknown>): string } },
      token: {
        href: string
        title?: string | null
        tokens: Array<unknown>
      },
    ): string {
      const { href, title } = token
      // token.text는 파싱 전 원문이라 [**굵게**](url) 같은 인라인 마크다운이
      // 그대로 남는다. 내부 토큰을 파싱해야 <strong> 등이 올바로 렌더링된다.
      const text = this.parser.parseInline(token.tokens)
      const cleanTitle = title ? ` title="${title}"` : ''

      if (!href) return `<a${cleanTitle}>${text}</a>`

      const isExternal = /^https?:\/\//i.test(href)
      const target = isExternal
        ? ' target="_blank" rel="noopener noreferrer"'
        : ''

      return `<a href="${href}"${cleanTitle}${target}>${text}</a>`
    },

    // 코드는 원문 그대로(verbatim) 이스케이프만 해서 출력한다.
    code({ text: code, lang }: { text: string; lang?: string }) {
      const className = lang ? ` class="language-${lang}"` : ''
      return `<pre><code${className}>${escapeHtml(code)}</code></pre>`
    },

    // 구분선 렌더러
    hr(): string {
      return '<hr class="markdown-hr" />'
    },

    // 헤딩 렌더러 (목차용 ID 부여)
    heading({
      text,
      depth,
    }: {
      text: string
      depth: number
    }): string {
      const id = slugifyHeading(text)
      headingsCollector.push({ id, text, level: depth })
      return `<h${depth} id="${id}">${text}</h${depth}>`
    },
  }

  return renderer
}
