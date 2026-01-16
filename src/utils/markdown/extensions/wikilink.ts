import { getBrokenLinks } from '../types'
import { escapeHtml, slugifyNode } from '../helpers'
import type { RendererExtension, TokenizerExtension, Tokens } from 'marked'
import type { WikiLinkToken } from '../types'

export const wikiLinkTokenizer: TokenizerExtension = {
  name: 'wikilink',
  level: 'inline',
  start(src: string) {
    const i = src.indexOf('[[')
    return i === -1 ? undefined : i
  },
  tokenizer(src): WikiLinkToken | undefined {
    const match = /^\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/.exec(src)
    if (!match) return undefined
    const [, rawName, alias] = match
    const text = alias ? alias.trim() : rawName.trim()
    const href = `/node/${slugifyNode(rawName)}`
    const token: WikiLinkToken = {
      type: 'wikilink',
      raw: match[0],
      href,
      text,
    }
    return token
  },
}

export const wikiLinkRenderer: RendererExtension = {
  name: 'wikilink',
  renderer(token: Tokens.Generic) {
    const wikiToken = token as WikiLinkToken
    const brokenLinks = getBrokenLinks()
    const targetId = wikiToken.href.replace('/node/', '').replace(/%20/g, ' ')
    const isBroken = brokenLinks.has(decodeURIComponent(targetId))
    const className = isBroken ? ' class="broken-link"' : ''
    const href = isBroken ? '#' : wikiToken.href
    return `<a href="${href}"${className}>${escapeHtml(wikiToken.text)}</a>`
  },
}
