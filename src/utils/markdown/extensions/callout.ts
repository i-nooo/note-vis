import { CALLOUTS } from '../constants'
import type { RendererExtension, TokenizerExtension, Tokens } from 'marked'
import type { CalloutKind, CalloutToken } from '../types'

export const calloutTokenizer: TokenizerExtension = {
  name: 'callout',
  level: 'block',
  start(src: string) {
    const i = src.indexOf('> [!')
    return i === -1 ? undefined : i
  },
  tokenizer(src): CalloutToken | undefined {
    const cap = /^(?:> ?(.*)\n?)+/.exec(src)
    if (!cap) return undefined

    const full = cap[0]
    const lines = full
      .trimEnd()
      .split('\n')
      .map((l) => l.replace(/^>\s?/, ''))

    const head = lines[0]
    const headMatch = /^\[!(NOTE|INFO)\]([+-])?(?:\s+(.*))?$/i.exec(head)
    if (!headMatch) return undefined

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

export const calloutRenderer: RendererExtension = {
  name: 'callout',
  renderer(token: Tokens.Generic) {
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
      <span class="callout-title">${title}</span>
    </summary>
    <div class="callout-content">
${inner}
    </div>
  </details>
</aside>`.trim()
  },
}
