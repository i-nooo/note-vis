import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const notesDir = path.join(__dirname, '../notes')
const outputFile = path.join(__dirname, '../src/data/notes.json')

const REGEX = {
  frontmatter: /^---\n([\s\S]*?)\n---/,
  title: /title:\s*["']?([^"'\n]+)["']?/,
  tags: /tags:\s*\[(.*?)\]/,
  related: /related:\s*\[(.*?)\]/,
  created: /created(?:\s+date)?:\s*["']?([^"'\n]+)["']?/,
  updated: /(?:updated|edited)(?:\s+date)?:\s*["']?([^"'\n]+)["']?/,
  wikiLink: /\[\[([^\]]+)\]\]/g,
  frontmatterRemove: /^---\n[\s\S]*?\n---\n?/,
  quotes: /^["']|["']$/g,
}

// 배열 파싱 헬퍼
function parseArrayField(match) {
  if (!match) return []
  return match[1]
    .split(',')
    .map((t) => t.trim().replace(REGEX.quotes, ''))
    .filter((t) => t && t.length > 0)
}

async function parseNotes() {
  // notes 디렉토리 존재 확인
  try {
    await fs.access(notesDir)
  } catch {
    console.error(`>>> ${notesDir} 디렉토리를 찾을 수 없습니다.`)
    return
  }

  const allFiles = await fs.readdir(notesDir)
  const files = allFiles.filter((file) => file.endsWith('.md'))

  console.log(`>>> ${files.length}개의 마크다운 파일을 파싱합니다...`)

  // 파일들을 병렬로 읽기
  const fileContents = await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(notesDir, file)
      const content = await fs.readFile(filePath, 'utf8')
      return { file, content }
    }),
  )

  const nodes = []
  const links = []
  const tagSet = new Set()
  const linkSet = new Set() // 중복 링크 방지용

  fileContents.forEach(({ file, content }) => {
    const id = path.basename(file, '.md')

    // frontmatter 파싱 (선택적)
    let title = id
    let tags = []
    let related = []
    let dateCreated = null
    let dateUpdated = null

    const frontmatterMatch = content.match(REGEX.frontmatter)
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1]
      const titleMatch = frontmatter.match(REGEX.title)
      const tagsMatch = frontmatter.match(REGEX.tags)
      const relatedMatch = frontmatter.match(REGEX.related)
      const createdMatch = frontmatter.match(REGEX.created)
      const updatedMatch = frontmatter.match(REGEX.updated)

      if (titleMatch) title = titleMatch[1].trim()
      tags = parseArrayField(tagsMatch)
      related = parseArrayField(relatedMatch)

      if (createdMatch) {
        dateCreated = createdMatch[1].trim()
      }
      if (updatedMatch) {
        dateUpdated = updatedMatch[1].trim()
      }
    }

    // frontmatter 제거한 순수 컨텐츠 추출
    let contentBody = content
    if (frontmatterMatch) {
      contentBody = content.replace(REGEX.frontmatterRemove, '').trim()
    }

    nodes.push({
      id,
      title,
      tags,
      content: contentBody,
      ...(related.length > 0 && { related }),
      ...(dateCreated && { dateCreated }),
      ...(dateUpdated && { dateUpdated }),
    })

    // [[link]] 패턴 추출 (중복 제거)
    const wikiLinks = content.match(REGEX.wikiLink) || []
    wikiLinks.forEach((link) => {
      let target = link.replace(/\[\[|\]\]/g, '').trim()
      // 파이프 링크 처리: [[target|display]] -> target
      target = target.split('|')[0].trim()
      // .md 확장자 제거
      if (target.endsWith('.md')) {
        target = target.slice(0, -3)
      }

      const linkKey = `${id}:${target}:mention`
      if (!linkSet.has(linkKey)) {
        linkSet.add(linkKey)
        links.push({
          source: id,
          target: target,
          type: 'mention',
        })
      }
    })

    // frontmatter tags 처리
    tags.forEach((tagName) => {
      const tagId = `tag:${tagName}`
      tagSet.add(tagName)

      const linkKey = `${id}:${tagId}:tag`
      if (!linkSet.has(linkKey)) {
        linkSet.add(linkKey)
        links.push({
          source: id,
          target: tagId,
          type: 'tag',
        })
      }
    })

    console.log(`   - ${file}: ${wikiLinks.length}개 링크`)
  })

  // 태그 노드 추가
  tagSet.forEach((tagName) => {
    // 태그명이 실제 파일명과 일치하는지 확인
    const hasCorrespondingFile = files.some(
      (file) => path.basename(file, '.md') === tagName,
    )

    nodes.push({
      id: `tag:${tagName}`,
      title: `#${tagName}`,
      ...(hasCorrespondingFile && { hasFile: true }),
    })
  })

  // 깨진 링크 표시를 위해 broken 플래그 추가
  const nodeIds = new Set(nodes.map((n) => n.id))
  const processedLinks = links.map((link) => {
    const isSourceValid = nodeIds.has(link.source)
    const isTargetValid = nodeIds.has(link.target)

    if (!isSourceValid || !isTargetValid) {
      return {
        ...link,
        broken: true,
      }
    }

    return link
  })

  const brokenLinks = processedLinks.filter((link) => link.broken).length
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

  // JSON 파일 생성
  await fs.writeFile(outputFile, JSON.stringify(result, null, 2), 'utf8')

  console.log(`>>> 파싱 완료!`)
  console.log(`   노드: ${nodes.length}개 (태그: ${tagSet.size}개)`)
  console.log(`   링크: ${processedLinks.length}개`)
  console.log(`   출력: ${outputFile}`)
}

// ES 모듈에서 main 체크
if (import.meta.url === `file://${process.argv[1]}`) {
  parseNotes()
}

export { parseNotes }
