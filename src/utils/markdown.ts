import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { RendererExtension, TokenizerExtension, Tokens } from 'marked'

type CalloutKind = 'NOTE' | 'INFO'

interface CalloutToken extends Tokens.Generic {
  type: 'callout'
  calloutType: CalloutKind
  title?: string
  collapsed?: boolean
  tokens: Array<Tokens.Generic>
}

interface FootnoteRefToken extends Tokens.Generic {
  type: 'footnoteRef'
  label: string
}

interface FootnoteDefToken extends Tokens.Generic {
  type: 'footnoteDef'
  label: string
  tokens: Array<Tokens.Generic>
}

const CALLOUTS: Record<
  CalloutKind,
  { className: string; defaultTitle: string; ariaLabel: string }
> = {
  NOTE: {
    className: 'callout-note',
    defaultTitle: '노트',
    ariaLabel: 'Note',
  },
  INFO: {
    className: 'callout-info',
    defaultTitle: '정보',
    ariaLabel: 'Info',
  },
}

function slugifyNode(name: string): string {
  return encodeURIComponent(name.replace(/\s+/g, ' ').trim())
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// 간단한 자동 포맷팅 함수
function formatCode(code: string): string {
  const lines = code.split('\n')
  let indentLevel = 0
  const indentSize = 2

  const formattedLines = lines.map((line) => {
    const trimmed = line.trim()
    if (!trimmed) return ''

    // 닫는 브래킷이나 브레이스면 들여쓰기 감소
    if (
      trimmed.startsWith('}') ||
      trimmed.startsWith(']') ||
      trimmed.startsWith(')')
    ) {
      indentLevel = Math.max(0, indentLevel - 1)
    }

    const indentedLine = ' '.repeat(indentLevel * indentSize) + trimmed

    // 여는 브래킷이나 브레이스면 들여쓰기 증가
    if (
      trimmed.endsWith('{') ||
      trimmed.endsWith('[') ||
      trimmed.endsWith('(')
    ) {
      indentLevel++
    }

    return indentedLine
  })

  return formattedLines.join('\n')
}

const wikiLinkTokenizer: TokenizerExtension = {
  name: 'wikilink',
  level: 'inline',
  start(src: string) {
    const i = src.indexOf('[[')
    return i === -1 ? undefined : i
  },
  tokenizer(src) {
    const match = /^\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/.exec(src)
    if (!match) return
    const [, rawName, alias] = match
    const text = alias ? alias.trim() : rawName.trim()
    const href = `/node/${slugifyNode(rawName)}`
    const token: Tokens.Generic = {
      type: 'wikilink',
      raw: match[0],
      href,
      text,
    } as any
    return token
  },
}

const wikiLinkRenderer: RendererExtension = {
  name: 'wikilink',
  renderer(token: any) {
    const brokenLinks = (globalThis as any).__brokenLinks as Set<string>
    const targetId = token.href.replace('/node/', '').replace(/%20/g, ' ')
    const isBroken =
      brokenLinks && brokenLinks.has(decodeURIComponent(targetId))
    const className = isBroken ? ' class="broken-link"' : ''
    const href = isBroken ? '#' : token.href
    const clickable = isBroken ? ' onclick="return false;"' : ''
    return `<a href="${href}"${className}${clickable}>${escapeHtml(token.text)}</a>`
  },
}

const calloutTokenizer: TokenizerExtension = {
  name: 'callout',
  level: 'block',
  start(src: string) {
    const i = src.indexOf('> [!')
    return i === -1 ? undefined : i
  },
  tokenizer(src) {
    const cap = /^(?:> ?(.*)\n?)+/.exec(src)
    if (!cap) return

    const full = cap[0]
    const lines = full
      .trimEnd()
      .split('\n')
      .map((l) => l.replace(/^>\s?/, ''))

    const head = lines[0]
    const headMatch = /^\[!(NOTE|INFO)\]([+-])?(?:\s+(.*))?$/i.exec(head)
    if (!headMatch) return

    const [, typeRaw, collapseFlag, customTitle] = headMatch
    const calloutType = typeRaw.toUpperCase() as CalloutKind
    const collapsed =
      collapseFlag === '-' ? true : collapseFlag === '+' ? false : undefined
    const body = lines.slice(1).join('\n')

    const bodyTokens = this.lexer.blockTokens(body, [])

    const token: CalloutToken = {
      type: 'callout',
      raw: full,
      calloutType,
      title: customTitle ? customTitle.trim() : undefined,
      collapsed,
      tokens: bodyTokens,
    }

    return token
  },
}

const calloutRenderer: RendererExtension = {
  name: 'callout',
  renderer(token: any) {
    const calloutToken = token as CalloutToken
    const cfg = CALLOUTS[calloutToken.calloutType]
    const title = calloutToken.title || cfg.defaultTitle
    const aria = cfg.ariaLabel
    const detailsOpen =
      calloutToken.collapsed === undefined
        ? ' open'
        : calloutToken.collapsed
          ? ''
          : ' open'

    const inner = this.parser.parse(calloutToken.tokens)

    return `
<aside class="callout ${cfg.className}" role="note" aria-label="${aria}">
  <details class="callout-details"${detailsOpen}>
    <summary class="callout-header">
      <span class="callout-title"></span>
    </summary>
    <div class="callout-content">
${inner}
    </div>
  </details>
</aside>`.trim()
  },
}

const footnoteRefTokenizer: TokenizerExtension = {
  name: 'footnoteRef',
  level: 'inline',
  start(src: string) {
    const i = src.indexOf('[^')
    return i === -1 ? undefined : i
  },
  tokenizer(src) {
    const match = /^\[\^([^\]]+)\]/.exec(src)
    if (!match) return
    const [, label] = match
    const token: FootnoteRefToken = {
      type: 'footnoteRef',
      raw: match[0],
      label: label.trim(),
    }
    return token
  },
}

const footnoteDefTokenizer: TokenizerExtension = {
  name: 'footnoteDef',
  level: 'block',
  start(src: string) {
    const i = src.indexOf('[^')
    return i === -1 ? undefined : i
  },
  tokenizer(src) {
    const match = /^\[\^([^\]]+)\]:\s*(.*)$/gm.exec(src)
    if (!match) return
    const [full, label, content] = match

    const contentTokens = this.lexer.inlineTokens(content.trim(), [])

    const token: FootnoteDefToken = {
      type: 'footnoteDef',
      raw: full,
      label: label.trim(),
      tokens: contentTokens,
    }
    return token
  },
}

const footnoteRefRenderer: RendererExtension = {
  name: 'footnoteRef',
  renderer(token: any) {
    const footnoteToken = token as FootnoteRefToken
    return `<sup class="footnote-ref"><a href="#footnote-${footnoteToken.label}" id="footnote-ref-${footnoteToken.label}" class="footnote-link">${footnoteToken.label}</a></sup>`
  },
}

const footnoteDefRenderer: RendererExtension = {
  name: 'footnoteDef',
  renderer(token: any) {
    const footnoteToken = token as FootnoteDefToken
    const content = this.parser.parseInline(footnoteToken.tokens)
    return `<div class="footnote-def" id="footnote-${footnoteToken.label}">
      <a href="#footnote-ref-${footnoteToken.label}" class="footnote-backref">${footnoteToken.label}</a>: ${content}
    </div>`
  },
}

function createRendererWithLinkPolicy() {
  const renderer = {
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens)
      const cleanTitle = title ? ` title="${title}"` : ''

      if (!href) return `<a${cleanTitle}>${text}</a>`

      const isExternal = /^https?:\/\//i.test(href)
      const target = isExternal
        ? ' target="_blank" rel="noopener noreferrer"'
        : ''

      return `<a href="${href}"${cleanTitle}${target}>${text}</a>`
    },
  }

  // 코드 블록 렌더러 추가
  renderer.code = ({ text: code, lang }) => {
    // 1. 먼저 코드 포맷팅 (들여쓰기)
    const formatted = formatCode(code)

    // 2. HTML 이스케이프
    let highlighted = escapeHtml(formatted)

    // 3. 내용 기반 언어 감지
    const isJSLike =
      code.includes('import') ||
      code.includes('export') ||
      code.includes('const') ||
      code.includes('function') ||
      code.includes('React') ||
      code.includes('createRouter')
    const isJSON =
      code.trim().startsWith('{') &&
      code.includes('"') &&
      (code.includes('rewrites') || code.includes('source'))

    // 4. Syntax highlighting 적용 (순서가 중요)
    if (
      isJSLike ||
      lang === 'ts' ||
      lang === 'js' ||
      lang === 'javascript' ||
      lang === 'typescript' ||
      lang === 'jsx' ||
      lang === 'tsx'
    ) {
      // 임시 플래시홀더를 사용해서 중첩 방지
      const placeholders = new Map<string, string>()
      let placeholderIndex = 0

      // 1. 문자열 먼저 처리 (가장 우선)
      highlighted = highlighted.replace(/(["'`])([^"'`]*?)\1/g, (match) => {
        const placeholder = `__STRING_${placeholderIndex++}__`
        placeholders.set(
          placeholder,
          `<span class="token string">${match}</span>`,
        )
        return placeholder
      })

      // 2. 주석 처리
      highlighted = highlighted.replace(/\/\/.*$/gm, (match) => {
        const placeholder = `__COMMENT_${placeholderIndex++}__`
        placeholders.set(
          placeholder,
          `<span class="token comment">${match}</span>`,
        )
        return placeholder
      })

      // 3. 키워드 처리 (문자열과 주석이 이미 placeholder로 대체됨)
      highlighted = highlighted.replace(
        /\b(const|let|var|function|import|export|from|default|createRouter|defineConfig)\b/g,
        '<span class="token keyword">$1</span>',
      )

      // 4. 숫자 처리
      highlighted = highlighted.replace(
        /\b(\d+)\b/g,
        '<span class="token number">$1</span>',
      )

      // 5. placeholder 복원
      placeholders.forEach((replacement, placeholder) => {
        highlighted = highlighted.replace(placeholder, replacement)
      })
    }
    // JSON 하이라이팅
    else if (isJSON || lang === 'json') {
      highlighted = highlighted
        // JSON 키
        .replace(/"([^"]+)":/g, '<span class="token string">"$1"</span>:')
        // JSON 값 문자열
        .replace(/:\s*"([^"]*)"/g, ': <span class="token string">"$1"</span>')
        // true/false/null
        .replace(
          /\b(true|false|null)\b/g,
          '<span class="token keyword">$1</span>',
        )
    }

    return `<pre><code class="${lang ? `language-${lang}` : ''}">${highlighted}</code></pre>`
  }

  return renderer
}

function setupMarked() {
  const renderer = createRendererWithLinkPolicy()
  marked.use({ renderer })
  marked.use({
    extensions: [
      wikiLinkTokenizer,
      wikiLinkRenderer,
      calloutTokenizer,
      calloutRenderer,
      footnoteRefTokenizer,
      footnoteRefRenderer,
      footnoteDefTokenizer,
      footnoteDefRenderer,
    ],
  })
  marked.setOptions({
    gfm: true,
    breaks: true,
  })
}

setupMarked()

export function renderMarkdown(
  markdown: string,
  brokenLinks?: Set<string>,
): { content: string; footnotes: string } {
  console.log('renderMarkdown called with:', markdown.substring(0, 100))
  if (!markdown) {
    console.log('No markdown content provided')
    return { content: '', footnotes: '' }
  }

  // 임시로 전역 변수에 brokenLinks 저장 (향후 더 나은 방법으로 개선 가능)
  ;(globalThis as any).__brokenLinks = brokenLinks || new Set()

  // 각주 정의를 별도로 추출
  const footnotes: Array<{ label: string; content: string }> = []

  // 더 간단한 방법으로 각주 정의 추출
  const footnoteMatches = markdown.match(/^\[\^([^\]]+)\]:\s*(.*)$/gm)
  console.log('Found footnote matches:', footnoteMatches?.length || 0)

  if (footnoteMatches) {
    footnoteMatches.forEach((matchStr) => {
      const parts = matchStr.match(/^\[\^([^\]]+)\]:\s*(.*)$/)
      if (parts) {
        footnotes.push({
          label: parts[1].trim(),
          content: parts[2].trim(),
        })
      }
    })
  }

  // 각주 정의를 본문에서 제거
  let contentWithoutFootnoteDefs = markdown
    .replace(/^\[\^([^\]]+)\]:\s*.*$/gm, '')
    .trim()

  console.log(
    'Content after footnote def removal:',
    contentWithoutFootnoteDefs.length,
  )

  // 각주 참조를 직접 HTML로 변환 (각주가 실제로 있는 경우만)
  if (footnotes.length > 0) {
    contentWithoutFootnoteDefs = contentWithoutFootnoteDefs.replace(
      /\[\^([^\]]+)\]/g,
      '<sup class="footnote-ref"><a href="#footnote-$1" id="footnote-ref-$1" class="footnote-link">$1</a></sup>',
    )
  }

  console.log(
    'Final content before marked.parse:',
    contentWithoutFootnoteDefs.length,
  )

  const html = marked.parse(contentWithoutFootnoteDefs) as string

  // 각주 영역 HTML 생성
  const footnotesHtml =
    footnotes.length > 0
      ? footnotes
          .map(
            (fn) =>
              `<div class="footnote-def" id="footnote-${fn.label}">
          <a href="#footnote-ref-${fn.label}" class="footnote-backref">${fn.label}</a>: ${marked.parseInline(fn.content)}
        </div>`,
          )
          .join('')
      : ''

  // 개발 환경에서는 DOMPurify 건너뜀 (syntax highlighting 보존)
  if (import.meta.env.DEV) {
    console.log('Returning DEV result:', {
      contentLength: html.length,
      footnotesLength: footnotesHtml.length,
    })
    return { content: html, footnotes: footnotesHtml }
  }

  const sanitizeOptions = {
    ADD_ATTR: ['target', 'rel', 'open', 'onclick', 'class', 'href', 'id'],
    ADD_TAGS: ['span', 'sup', 'a'], // syntax highlighting과 각주를 위한 태그들 허용
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto|tel|data:image\/(?:png|gif|jpeg|webp));|\/|#)/i,
  }

  const sanitizedContent = DOMPurify.sanitize(html, sanitizeOptions)
  const sanitizedFootnotes = DOMPurify.sanitize(footnotesHtml, sanitizeOptions)

  return { content: sanitizedContent, footnotes: sanitizedFootnotes }
}
