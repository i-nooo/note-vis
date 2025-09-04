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
    return `<a href="${token.href}">${escapeHtml(token.text)}</a>`
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
      <span class="callout-title">${escapeHtml(title)}</span>
    </summary>
    <div class="callout-content">
${inner}
    </div>
  </details>
</aside>`.trim()
  },
}

function createRendererWithLinkPolicy() {
  const renderer = new marked.Renderer()
  const origLink = renderer.link.bind(renderer)
  renderer.link = (token) => {
    const html = origLink(token)
    if (!token.href) return html
    const isExternal = /^https?:\/\//i.test(token.href)
    if (!isExternal) return html

    return html.replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" ')
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
    ],
  })
  marked.setOptions({
    gfm: true,
    breaks: true,
  })
}

setupMarked()

export function renderMarkdown(markdown: string): string {
  if (!markdown) return ''
  const html = marked.parse(markdown) as string

  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['target', 'rel', 'open'],
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto|tel|data:image\/(?:png|gif|jpeg|webp));|\/|#)/i,
  })
}
