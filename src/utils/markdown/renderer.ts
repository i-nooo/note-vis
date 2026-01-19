import { escapeHtml, formatCode, slugifyHeading } from './helpers'
import type { HeadingItem } from './types'

let previewIdCounter = 0
let headingsCollector: Array<HeadingItem> = []

export function resetHeadingsCollector(): void {
  headingsCollector = []
}

export function getCollectedHeadings(): Array<HeadingItem> {
  return headingsCollector
}

function createHtmlPreview(code: string): string {
  const id = `html-preview-${previewIdCounter++}`

  return `<div class="html-preview-container">
    <div class="html-preview-header">
      <span class="html-preview-label">HTML Preview</span>
      <button class="html-preview-toggle" onclick="this.closest('.html-preview-container').classList.toggle('show-code')">
        코드 보기
      </button>
    </div>
    <iframe
      id="${id}"
      class="html-preview-frame"
      sandbox="allow-scripts"
      srcdoc="${escapeHtml(code)}"
      loading="lazy"
    ></iframe>
    <pre class="html-preview-source"><code class="language-html">${escapeHtml(code)}</code></pre>
  </div>`
}

function highlightJavaScript(code: string): string {
  let highlighted = escapeHtml(formatCode(code))
  const placeholders = new Map<string, string>()
  let placeholderIndex = 0

  highlighted = highlighted.replace(/(["'`])([^"'`]*?)\1/g, (match) => {
    const placeholder = `__STRING_${placeholderIndex++}__`
    placeholders.set(
      placeholder,
      `<span class="token string">${match}</span>`,
    )
    return placeholder
  })

  highlighted = highlighted.replace(/\/\/.*$/gm, (match) => {
    const placeholder = `__COMMENT_${placeholderIndex++}__`
    placeholders.set(
      placeholder,
      `<span class="token comment">${match}</span>`,
    )
    return placeholder
  })

  highlighted = highlighted.replace(
    /\b(const|let|var|function|import|export|from|default|createRouter|defineConfig)\b/g,
    '<span class="token keyword">$1</span>',
  )

  highlighted = highlighted.replace(
    /\b(\d+)\b/g,
    '<span class="token number">$1</span>',
  )

  placeholders.forEach((replacement, placeholder) => {
    highlighted = highlighted.replace(placeholder, replacement)
  })

  return highlighted
}

function highlightJSON(code: string): string {
  let highlighted = escapeHtml(formatCode(code))

  highlighted = highlighted
    .replace(/"([^"]+)":/g, '<span class="token string">"$1"</span>:')
    .replace(/:\s*"([^"]*)"/g, ': <span class="token string">"$1"</span>')
    .replace(
      /\b(true|false|null)\b/g,
      '<span class="token keyword">$1</span>',
    )

  return highlighted
}

function isJavaScriptLike(code: string): boolean {
  return (
    code.includes('import') ||
    code.includes('export') ||
    code.includes('const') ||
    code.includes('function') ||
    code.includes('React') ||
    code.includes('createRouter')
  )
}

function isJSONLike(code: string): boolean {
  return (
    code.trim().startsWith('{') &&
    code.includes('"') &&
    (code.includes('rewrites') || code.includes('source'))
  )
}

export function createRendererWithLinkPolicy() {
  const renderer = {
    link({
      href,
      title,
      text,
    }: {
      href: string
      title?: string | null
      text: string
    }): string {
      const cleanTitle = title ? ` title="${title}"` : ''

      if (!href) return `<a${cleanTitle}>${text}</a>`

      const isExternal = /^https?:\/\//i.test(href)
      const target = isExternal
        ? ' target="_blank" rel="noopener noreferrer"'
        : ''

      return `<a href="${href}"${cleanTitle}${target}>${text}</a>`
    },

    code({ text: code, lang }: { text: string; lang?: string }) {
      // HTML 프리뷰 처리
      if (lang === 'html-preview' || lang === 'html-live') {
        return createHtmlPreview(code)
      }

      let highlighted: string

      const jsLangs = ['ts', 'js', 'javascript', 'typescript', 'jsx', 'tsx']
      if (isJavaScriptLike(code) || (lang && jsLangs.includes(lang))) {
        highlighted = highlightJavaScript(code)
      } else if (isJSONLike(code) || lang === 'json') {
        highlighted = highlightJSON(code)
      } else {
        highlighted = escapeHtml(formatCode(code))
      }

      return `<pre><code class="${lang ? `language-${lang}` : ''}">${highlighted}</code></pre>`
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
