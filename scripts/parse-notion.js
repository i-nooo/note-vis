import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outputFile = path.join(__dirname, '../src/data/notes.json')

const NOTION_API_KEY = process.env.NOTION_API_KEY
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID

if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
  console.error('>>> NOTION_API_KEY와 NOTION_DATABASE_ID 환경변수가 필요합니다.')
  process.exit(1)
}

const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

const headers = {
  Authorization: `Bearer ${NOTION_API_KEY}`,
  'Notion-Version': NOTION_VERSION,
  'Content-Type': 'application/json',
}

// --- Notion API 호출 ---

async function notionFetch(url, options = {}) {
  const res = await fetch(url, { ...options, headers })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Notion API error ${res.status}: ${body}`)
  }
  return res.json()
}

async function queryDatabase() {
  const pages = []
  let cursor = undefined

  while (true) {
    const body = cursor ? { start_cursor: cursor } : {}
    const data = await notionFetch(
      `${NOTION_API_BASE}/databases/${NOTION_DATABASE_ID}/query`,
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

  // 자식 블록이 있는 경우 재귀적으로 가져오기
  for (const block of blocks) {
    if (block.has_children) {
      block.children = await getPageBlocks(block.id)
    }
  }

  return blocks
}

// --- Rich Text → Markdown 변환 ---

// 페이지 ID → slug 매핑 (mention 변환에 사용)
let pageIdToSlug = new Map()

function richTextToMarkdown(richTexts, mentionedPageIds) {
  if (!richTexts) return ''

  return richTexts
    .map((rt) => {
      // page mention 처리
      if (rt.type === 'mention' && rt.mention?.type === 'page') {
        const mentionedId = rt.mention.page.id
        const slug = pageIdToSlug.get(mentionedId)
        if (slug) {
          mentionedPageIds?.add(mentionedId)
          return `[[${slug}]]`
        }
        // 알 수 없는 페이지 mention은 텍스트로 표시
        return rt.plain_text
      }

      // 일반 텍스트
      let text = rt.plain_text || ''
      if (!text) return ''

      const ann = rt.annotations || {}

      // 순서 중요: 안쪽 서식부터 적용
      if (ann.code) text = `\`${text}\``
      if (ann.bold) text = `**${text}**`
      if (ann.italic) text = `*${text}*`
      if (ann.strikethrough) text = `~~${text}~~`

      // 링크 처리
      if (rt.href) {
        text = `[${text}](${rt.href})`
      }

      return text
    })
    .join('')
}

// --- Block → Markdown 변환 ---

function blocksToMarkdown(blocks, mentionedPageIds, indent = '') {
  const lines = []
  let numberedIndex = 0

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const type = block.type

    // numbered_list_item이 아니면 카운터 리셋
    if (type !== 'numbered_list_item') {
      numberedIndex = 0
    }

    switch (type) {
      case 'paragraph': {
        const text = richTextToMarkdown(
          block.paragraph.rich_text,
          mentionedPageIds,
        )
        lines.push(`${indent}${text}`)
        lines.push('')
        break
      }

      case 'heading_1': {
        const text = richTextToMarkdown(
          block.heading_1.rich_text,
          mentionedPageIds,
        )
        lines.push(`${indent}# ${text}`)
        lines.push('')
        break
      }

      case 'heading_2': {
        const text = richTextToMarkdown(
          block.heading_2.rich_text,
          mentionedPageIds,
        )
        lines.push(`${indent}## ${text}`)
        lines.push('')
        break
      }

      case 'heading_3': {
        const text = richTextToMarkdown(
          block.heading_3.rich_text,
          mentionedPageIds,
        )
        lines.push(`${indent}### ${text}`)
        lines.push('')
        break
      }

      case 'bulleted_list_item': {
        const text = richTextToMarkdown(
          block.bulleted_list_item.rich_text,
          mentionedPageIds,
        )
        lines.push(`${indent}- ${text}`)
        if (block.children) {
          lines.push(
            ...blocksToMarkdown(
              block.children,
              mentionedPageIds,
              indent + '  ',
            ),
          )
        }
        break
      }

      case 'numbered_list_item': {
        numberedIndex++
        const text = richTextToMarkdown(
          block.numbered_list_item.rich_text,
          mentionedPageIds,
        )
        lines.push(`${indent}${numberedIndex}. ${text}`)
        if (block.children) {
          lines.push(
            ...blocksToMarkdown(
              block.children,
              mentionedPageIds,
              indent + '   ',
            ),
          )
        }
        break
      }

      case 'to_do': {
        const checked = block.to_do.checked ? 'x' : ' '
        const text = richTextToMarkdown(
          block.to_do.rich_text,
          mentionedPageIds,
        )
        lines.push(`${indent}- [${checked}] ${text}`)
        break
      }

      case 'toggle': {
        const text = richTextToMarkdown(
          block.toggle.rich_text,
          mentionedPageIds,
        )
        lines.push(`${indent}<details>`)
        lines.push(`${indent}<summary>${text}</summary>`)
        lines.push('')
        if (block.children) {
          lines.push(
            ...blocksToMarkdown(block.children, mentionedPageIds, indent),
          )
        }
        lines.push(`${indent}</details>`)
        lines.push('')
        break
      }

      case 'code': {
        const lang = block.code.language || ''
        const notionLang = lang === 'plain text' ? '' : lang
        const text = richTextToMarkdown(block.code.rich_text, mentionedPageIds)
        lines.push(`${indent}\`\`\`${notionLang}`)
        lines.push(text)
        lines.push(`${indent}\`\`\``)
        lines.push('')
        break
      }

      case 'quote': {
        const text = richTextToMarkdown(
          block.quote.rich_text,
          mentionedPageIds,
        )
        text.split('\n').forEach((line) => {
          lines.push(`${indent}> ${line}`)
        })
        if (block.children) {
          const childLines = blocksToMarkdown(
            block.children,
            mentionedPageIds,
            '',
          )
          childLines.forEach((line) => {
            lines.push(`${indent}> ${line}`)
          })
        }
        lines.push('')
        break
      }

      case 'callout': {
        const text = richTextToMarkdown(
          block.callout.rich_text,
          mentionedPageIds,
        )
        const icon = block.callout.icon?.emoji || ''
        lines.push(`${indent}> [!NOTE] ${icon}`)
        lines.push(`${indent}> ${text}`)
        if (block.children) {
          const childLines = blocksToMarkdown(
            block.children,
            mentionedPageIds,
            '',
          )
          childLines.forEach((line) => {
            lines.push(`${indent}> ${line}`)
          })
        }
        lines.push('')
        break
      }

      case 'divider': {
        lines.push(`${indent}---`)
        lines.push('')
        break
      }

      case 'image': {
        const url =
          block.image.type === 'external'
            ? block.image.external.url
            : block.image.file.url
        const caption = block.image.caption
          ? richTextToMarkdown(block.image.caption, mentionedPageIds)
          : ''
        lines.push(`${indent}![${caption}](${url})`)
        lines.push('')
        break
      }

      case 'bookmark': {
        const url = block.bookmark.url || ''
        const caption = block.bookmark.caption
          ? richTextToMarkdown(block.bookmark.caption, mentionedPageIds)
          : url
        lines.push(`${indent}[${caption}](${url})`)
        lines.push('')
        break
      }

      case 'table': {
        if (block.children) {
          block.children.forEach((row, rowIdx) => {
            if (row.type !== 'table_row') return
            const cells = row.table_row.cells.map((cell) =>
              richTextToMarkdown(cell, mentionedPageIds),
            )
            lines.push(`${indent}| ${cells.join(' | ')} |`)
            if (rowIdx === 0) {
              lines.push(
                `${indent}| ${cells.map(() => '---').join(' | ')} |`,
              )
            }
          })
          lines.push('')
        }
        break
      }

      case 'equation': {
        const expr = block.equation.expression || ''
        lines.push(`${indent}$$`)
        lines.push(`${indent}${expr}`)
        lines.push(`${indent}$$`)
        lines.push('')
        break
      }

      default:
        // 지원하지 않는 블록 타입은 무시
        break
    }
  }

  return lines
}

// --- 페이지 속성 추출 ---

function getPageTitle(page) {
  const titleProp = Object.values(page.properties).find(
    (p) => p.type === 'title',
  )
  if (!titleProp?.title?.length) return 'Untitled'
  return titleProp.title.map((t) => t.plain_text).join('')
}

function getPageTags(page) {
  const tagsProp = Object.values(page.properties).find(
    (p) => p.type === 'multi_select' && p.multi_select,
  )
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

// --- 메인 ---

async function parseNotion() {
  console.log('>>> Notion 데이터베이스에서 페이지를 가져옵니다...')

  const pages = await queryDatabase()
  console.log(`>>> ${pages.length}개의 페이지를 찾았습니다.`)

  // 1단계: 페이지 ID → slug 매핑 생성 (mention 변환에 필요)
  const slugCount = new Map()
  for (const page of pages) {
    const title = getPageTitle(page)
    let slug = titleToSlug(title)

    // 중복 slug 처리
    if (slugCount.has(slug)) {
      const count = slugCount.get(slug) + 1
      slugCount.set(slug, count)
      slug = `${slug}-${count}`
    } else {
      slugCount.set(slug, 1)
    }

    pageIdToSlug.set(page.id, slug)
  }

  // 2단계: 각 페이지의 블록 가져오기 및 변환
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

    console.log(`   - ${title} (${slug})`)

    // 블록 가져오기
    const blocks = await getPageBlocks(pageId)

    // mention된 페이지 ID 추적
    const mentionedPageIds = new Set()

    // 블록 → 마크다운 변환
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

    // mention 기반 링크 생성
    for (const mentionedId of mentionedPageIds) {
      const targetSlug = pageIdToSlug.get(mentionedId)
      if (!targetSlug) continue

      const linkKey = `${slug}:${targetSlug}:mention`
      if (!linkSet.has(linkKey)) {
        linkSet.add(linkKey)
        links.push({
          source: slug,
          target: targetSlug,
          type: 'mention',
        })
      }
    }

    // 태그 링크 생성
    for (const tagName of tags) {
      const tagId = `tag:${tagName}`
      tagSet.add(tagName)

      const linkKey = `${slug}:${tagId}:tag`
      if (!linkSet.has(linkKey)) {
        linkSet.add(linkKey)
        links.push({
          source: slug,
          target: tagId,
          type: 'tag',
        })
      }
    }
  }

  // 태그 노드 추가
  for (const tagName of tagSet) {
    nodes.push({
      id: `tag:${tagName}`,
      title: `#${tagName}`,
    })
  }

  // 깨진 링크 표시
  const nodeIds = new Set(nodes.map((n) => n.id))
  const processedLinks = links.map((link) => {
    const isSourceValid = nodeIds.has(link.source)
    const isTargetValid = nodeIds.has(link.target)
    if (!isSourceValid || !isTargetValid) {
      return { ...link, broken: true }
    }
    return link
  })

  const brokenLinks = processedLinks.filter((l) => l.broken).length
  if (brokenLinks > 0) {
    console.log(`>>> ${brokenLinks}개의 깨진 링크를 표시합니다.`)
  }

  const result = { nodes, links: processedLinks }

  // 출력 디렉토리 생성
  const outputDir = path.dirname(outputFile)
  try {
    await fs.access(outputDir)
  } catch {
    await fs.mkdir(outputDir, { recursive: true })
  }

  await fs.writeFile(outputFile, JSON.stringify(result, null, 2), 'utf8')

  console.log(`>>> 파싱 완료!`)
  console.log(`   노드: ${nodes.length}개 (태그: ${tagSet.size}개)`)
  console.log(`   링크: ${processedLinks.length}개`)
  console.log(`   출력: ${outputFile}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  parseNotion()
}

export { parseNotion }
