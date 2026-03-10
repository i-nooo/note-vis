import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

let headers

// 로컬 환경에서 .env 파일 로드
function loadEnv() {
  if (process.env.NOTION_API_KEY) return
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const envContent = readFileSync(resolve(__dirname, '../.env'), 'utf8')
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const [key, ...rest] = trimmed.split('=')
      if (key && rest.length > 0) {
        process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '')
      }
    }
  } catch {}
}

function init() {
  loadEnv()
  const NOTION_API_KEY = process.env.NOTION_API_KEY
  const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID

  if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
    throw new Error('NOTION_API_KEY와 NOTION_DATABASE_ID 환경변수가 필요합니다.')
  }

  headers = {
    Authorization: `Bearer ${NOTION_API_KEY}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  }

  return { NOTION_API_KEY, NOTION_DATABASE_ID }
}

async function notionFetch(url, options = {}) {
  const res = await fetch(url, { ...options, headers })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Notion API error ${res.status}: ${body}`)
  }
  return res.json()
}

async function queryDatabase(databaseId) {
  const pages = []
  let cursor = undefined

  while (true) {
    const body = cursor ? { start_cursor: cursor } : {}
    const data = await notionFetch(
      `${NOTION_API_BASE}/databases/${databaseId}/query`,
      { method: 'POST', body: JSON.stringify(body) },
    )
    pages.push(...data.results)
    if (!data.has_more) break
    cursor = data.next_cursor
  }

  return pages
}

async function getPageBlocks(pageId) {
  const blocks = []
  let cursor = undefined

  while (true) {
    const url = new URL(`${NOTION_API_BASE}/blocks/${pageId}/children`)
    if (cursor) url.searchParams.set('start_cursor', cursor)
    const data = await notionFetch(url.toString())
    blocks.push(...data.results)
    if (!data.has_more) break
    cursor = data.next_cursor
  }

  for (const block of blocks) {
    if (block.has_children) {
      block.children = await getPageBlocks(block.id)
    }
  }

  return blocks
}

// --- Rich Text → Markdown ---

let pageIdToSlug = new Map()

function richTextToMarkdown(richTexts, mentionedPageIds) {
  if (!richTexts) return ''

  return richTexts
    .map((rt) => {
      if (rt.type === 'mention' && rt.mention?.type === 'page') {
        const mentionedId = rt.mention.page.id
        const slug = pageIdToSlug.get(mentionedId)
        if (slug) {
          mentionedPageIds?.add(mentionedId)
          return `[[${slug}]]`
        }
        return rt.plain_text
      }

      let text = rt.plain_text || ''
      if (!text) return ''

      const ann = rt.annotations || {}
      if (ann.code) text = `\`${text}\``
      if (ann.bold) text = `**${text}**`
      if (ann.italic) text = `*${text}*`
      if (ann.strikethrough) text = `~~${text}~~`
      if (rt.href) text = `[${text}](${rt.href})`

      return text
    })
    .join('')
}

function blocksToMarkdown(blocks, mentionedPageIds, indent = '', inList = false) {
  const lines = []
  let numberedIndex = 0

  for (const block of blocks) {
    const type = block.type
    if (type !== 'numbered_list_item') numberedIndex = 0

    switch (type) {
      case 'paragraph': {
        const text = richTextToMarkdown(block.paragraph.rich_text, mentionedPageIds)
        lines.push(`${indent}${text}`)
        if (!inList) lines.push('')
        if (block.children) lines.push(...blocksToMarkdown(block.children, mentionedPageIds, indent, inList))
        break
      }
      case 'heading_1': {
        const text = richTextToMarkdown(block.heading_1.rich_text, mentionedPageIds)
        lines.push(`${indent}# ${text}`)
        if (!inList) lines.push('')
        if (block.children) lines.push(...blocksToMarkdown(block.children, mentionedPageIds, indent, inList))
        break
      }
      case 'heading_2': {
        const text = richTextToMarkdown(block.heading_2.rich_text, mentionedPageIds)
        lines.push(`${indent}## ${text}`)
        if (!inList) lines.push('')
        if (block.children) lines.push(...blocksToMarkdown(block.children, mentionedPageIds, indent, inList))
        break
      }
      case 'heading_3': {
        const text = richTextToMarkdown(block.heading_3.rich_text, mentionedPageIds)
        lines.push(`${indent}### ${text}`)
        if (!inList) lines.push('')
        if (block.children) lines.push(...blocksToMarkdown(block.children, mentionedPageIds, indent, inList))
        break
      }
      case 'bulleted_list_item': {
        const text = richTextToMarkdown(block.bulleted_list_item.rich_text, mentionedPageIds)
        lines.push(`${indent}- ${text}`)
        if (block.children) lines.push(...blocksToMarkdown(block.children, mentionedPageIds, indent + '  ', true))
        break
      }
      case 'numbered_list_item': {
        numberedIndex++
        const text = richTextToMarkdown(block.numbered_list_item.rich_text, mentionedPageIds)
        lines.push(`${indent}${numberedIndex}. ${text}`)
        if (block.children) lines.push(...blocksToMarkdown(block.children, mentionedPageIds, indent + '   ', true))
        break
      }
      case 'to_do': {
        const checked = block.to_do.checked ? 'x' : ' '
        const text = richTextToMarkdown(block.to_do.rich_text, mentionedPageIds)
        lines.push(`${indent}- [${checked}] ${text}`)
        if (block.children) lines.push(...blocksToMarkdown(block.children, mentionedPageIds, indent + '  ', true))
        break
      }
      case 'toggle': {
        const text = richTextToMarkdown(block.toggle.rich_text, mentionedPageIds)
        lines.push(`${indent}<details>`, `${indent}<summary>${text}</summary>`, '')
        if (block.children) lines.push(...blocksToMarkdown(block.children, mentionedPageIds, indent))
        lines.push(`${indent}</details>`, '')
        break
      }
      case 'code': {
        const lang = block.code.language || ''
        const notionLang = lang === 'plain text' ? '' : lang
        const text = richTextToMarkdown(block.code.rich_text, mentionedPageIds)
        lines.push(`${indent}\`\`\`${notionLang}`, text, `${indent}\`\`\``, '')
        break
      }
      case 'quote': {
        const text = richTextToMarkdown(block.quote.rich_text, mentionedPageIds)
        text.split('\n').forEach((line) => lines.push(`${indent}> ${line}`))
        if (block.children) {
          blocksToMarkdown(block.children, mentionedPageIds, '').forEach((line) => lines.push(`${indent}> ${line}`))
        }
        lines.push('')
        break
      }
      case 'callout': {
        const text = richTextToMarkdown(block.callout.rich_text, mentionedPageIds)
        const icon = block.callout.icon?.emoji || ''
        lines.push(`${indent}> [!NOTE] ${icon}`, `${indent}> ${text}`)
        if (block.children) {
          blocksToMarkdown(block.children, mentionedPageIds, '').forEach((line) => lines.push(`${indent}> ${line}`))
        }
        lines.push('')
        break
      }
      case 'divider':
        lines.push(`${indent}---`, '')
        break
      case 'image': {
        const url = block.image.type === 'external' ? block.image.external.url : block.image.file.url
        const caption = block.image.caption ? richTextToMarkdown(block.image.caption, mentionedPageIds) : ''
        lines.push(`${indent}![${caption}](${url})`, '')
        break
      }
      case 'bookmark': {
        const url = block.bookmark.url || ''
        const caption = block.bookmark.caption ? richTextToMarkdown(block.bookmark.caption, mentionedPageIds) : url
        lines.push(`${indent}[${caption}](${url})`, '')
        break
      }
      case 'table': {
        if (block.children) {
          block.children.forEach((row, rowIdx) => {
            if (row.type !== 'table_row') return
            const cells = row.table_row.cells.map((cell) => richTextToMarkdown(cell, mentionedPageIds))
            lines.push(`${indent}| ${cells.join(' | ')} |`)
            if (rowIdx === 0) lines.push(`${indent}| ${cells.map(() => '---').join(' | ')} |`)
          })
          lines.push('')
        }
        break
      }
      case 'equation': {
        const expr = block.equation.expression || ''
        lines.push(`${indent}$$`, `${indent}${expr}`, `${indent}$$`, '')
        break
      }
    }
  }

  return lines
}

function getPageTitle(page) {
  const titleProp = Object.values(page.properties).find((p) => p.type === 'title')
  if (!titleProp?.title?.length) return 'Untitled'
  return titleProp.title.map((t) => t.plain_text).join('')
}

function getPageTags(page) {
  const tagsProp = Object.values(page.properties).find((p) => p.type === 'multi_select' && p.multi_select)
  if (!tagsProp) return []
  return tagsProp.multi_select.map((t) => t.name)
}

function titleToSlug(title) {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { NOTION_DATABASE_ID } = init()
    pageIdToSlug = new Map()

    const pages = await queryDatabase(NOTION_DATABASE_ID)

    // slug 매핑 생성
    const slugCount = new Map()
    for (const page of pages) {
      const title = getPageTitle(page)
      let slug = titleToSlug(title)
      if (slugCount.has(slug)) {
        const count = slugCount.get(slug) + 1
        slugCount.set(slug, count)
        slug = `${slug}-${count}`
      } else {
        slugCount.set(slug, 1)
      }
      pageIdToSlug.set(page.id, slug)
    }

    // 페이지 변환
    const nodes = []
    const links = []
    const tagSet = new Set()
    const linkSet = new Set()

    for (const page of pages) {
      const pageId = page.id
      const slug = pageIdToSlug.get(pageId)
      const title = getPageTitle(page)
      const tags = getPageTags(page)
      const dateCreated = page.created_time?.split('T')[0] || null
      const dateUpdated = page.last_edited_time?.split('T')[0] || null

      const blocks = await getPageBlocks(pageId)
      const mentionedPageIds = new Set()
      const markdownLines = blocksToMarkdown(blocks, mentionedPageIds)
      const content = markdownLines.join('\n').trim()

      nodes.push({
        id: slug,
        title,
        tags,
        content,
        ...(dateCreated && { dateCreated }),
        ...(dateUpdated && { dateUpdated }),
      })

      for (const mentionedId of mentionedPageIds) {
        const targetSlug = pageIdToSlug.get(mentionedId)
        if (!targetSlug) continue
        const linkKey = `${slug}:${targetSlug}:mention`
        if (!linkSet.has(linkKey)) {
          linkSet.add(linkKey)
          links.push({ source: slug, target: targetSlug, type: 'mention' })
        }
      }

      for (const tagName of tags) {
        const tagId = `tag:${tagName}`
        tagSet.add(tagName)
        const linkKey = `${slug}:${tagId}:tag`
        if (!linkSet.has(linkKey)) {
          linkSet.add(linkKey)
          links.push({ source: slug, target: tagId, type: 'tag' })
        }
      }
    }

    for (const tagName of tagSet) {
      nodes.push({ id: `tag:${tagName}`, title: `#${tagName}` })
    }

    const nodeIds = new Set(nodes.map((n) => n.id))
    const processedLinks = links.map((link) => {
      const isSourceValid = nodeIds.has(link.source)
      const isTargetValid = nodeIds.has(link.target)
      if (!isSourceValid || !isTargetValid) return { ...link, broken: true }
      return link
    })

    return res.status(200).json({ nodes, links: processedLinks })
  } catch (err) {
    console.error('Notion sync error:', err)
    return res.status(500).json({ error: err.message })
  }
}
