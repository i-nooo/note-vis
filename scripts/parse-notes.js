import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const notesDir = path.join(__dirname, '../notes')
const outputFile = path.join(__dirname, '../src/data/notes.json')

function parseNotes() {
  // notes 디렉토리 존재 확인
  if (!fs.existsSync(notesDir)) {
    console.error(`>>> ${notesDir} 디렉토리를 찾을 수 없습니다.`)
    return
  }

  const files = fs.readdirSync(notesDir).filter((file) => file.endsWith('.md'))
  const nodes = []
  const links = []
  const tagSet = new Set()

  console.log(`>>> ${files.length}개의 마크다운 파일을 파싱합니다...`)

  files.forEach((file) => {
    const filePath = path.join(notesDir, file)
    const content = fs.readFileSync(filePath, 'utf8')
    const id = path.basename(file, '.md')

    // frontmatter 파싱 (선택적)
    let title = id
    let tags = []
    let prerequisites = []
    let dateCreated = null
    let dateUpdated = null

    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1]
      const titleMatch = frontmatter.match(/title:\s*["']?([^"'\n]+)["']?/)
      const tagsMatch = frontmatter.match(/tags:\s*\[(.*?)\]/)
      const prerequisitesMatch = frontmatter.match(/prerequisites:\s*\[(.*?)\]/)
      const dateMatch = frontmatter.match(/date:\s*["']?([^"'\n]+)["']?/)
      const createdMatch = frontmatter.match(/created:\s*["']?([^"'\n]+)["']?/)
      const updatedMatch = frontmatter.match(/updated:\s*["']?([^"'\n]+)["']?/)

      if (titleMatch) title = titleMatch[1].trim()
      if (tagsMatch)
        tags = tagsMatch[1].split(',').map((t) => t.trim().replace(/["']/g, ''))
      // 날짜 필드 처리 (date > created 순서로 우선순위)
      if (dateMatch) {
        dateCreated = dateMatch[1].trim()
      } else if (createdMatch) {
        dateCreated = createdMatch[1].trim()
      }

      if (updatedMatch) {
        dateUpdated = updatedMatch[1].trim()
      }

      // prerequisites 필드 처리 (여러 선행 개념)
      if (prerequisitesMatch) {
        prerequisites = prerequisitesMatch[1]
          .split(',')
          .map((t) => t.trim().replace(/["']/g, ''))
      }
    }

    // 첫 번째 # 제목을 title로 사용 (frontmatter가 없는 경우)
    if (title === id) {
      const titleMatch = content.match(/^#\s+(.+)$/m)
      if (titleMatch) title = titleMatch[1].trim()
    }

    // frontmatter 제거한 순수 컨텐츠 추출
    let contentBody = content
    if (frontmatterMatch) {
      contentBody = content.replace(/^---\n[\s\S]*?\n---\n?/, '').trim()
    }

    nodes.push({
      id,
      title,
      tags,
      content: contentBody,
      ...(prerequisites.length > 0 && { prerequisites }),
      ...(dateCreated && { dateCreated }),
      ...(dateUpdated && { dateUpdated }),
    })

    // [[link]] 패턴 추출
    const wikiLinks = content.match(/\[\[([^\]]+)\]\]/g) || []
    wikiLinks.forEach((link) => {
      let target = link.replace(/\[\[|\]\]/g, '').trim()
      // 파이프 링크 처리: [[target|display]] -> target
      target = target.split('|')[0].trim()
      // .md 확장자 제거
      if (target.endsWith('.md')) {
        target = target.slice(0, -3)
      }

      links.push({
        source: id,
        target: target,
        type: 'mention',
      })
    })

    // frontmatter tags 처리
    tags.forEach((tagName) => {
      const tagId = `tag:${tagName}`
      tagSet.add(tagName)

      links.push({
        source: id,
        target: tagId,
        type: 'tag',
      })
    })

    // #태그 패턴 추출 (본문에서)
    const hashTags = content.match(/#[a-zA-Z가-힣0-9_-]+/g) || []
    hashTags.forEach((tag) => {
      const tagName = tag.substring(1) // # 제거
      const tagId = `tag:${tagName}`
      tagSet.add(tagName)

      links.push({
        source: id,
        target: tagId,
        type: 'tag',
      })
    })

    console.log(
      `>>> ${file}: ${wikiLinks.length}개 링크, ${hashTags.length}개 태그`,
    )
  })

  // 태그 노드 추가
  tagSet.forEach((tagName) => {
    nodes.push({
      id: `tag:${tagName}`,
      title: `#${tagName}`,
    })
  })

  // prerequisites 관계를 links에 추가 (NetworkGraph용)
  nodes.forEach((node) => {
    // prerequisites 관계를 links에 추가
    if (node.prerequisites) {
      node.prerequisites.forEach((prereqId) => {
        links.push({
          source: prereqId,
          target: node.id,
          type: 'prerequisite',
        })
      })
    }
  })

  // 존재하지 않는 링크 필터링 (선택적)
  const nodeIds = new Set(nodes.map((n) => n.id))
  const validLinks = links.filter(
    (link) => nodeIds.has(link.source) && nodeIds.has(link.target),
  )

  const invalidLinks = links.length - validLinks.length
  if (invalidLinks > 0) {
    console.log(`>>> !! ${invalidLinks}개의 깨진 링크를 제거했습니다.`)
  }

  const result = { nodes, links: validLinks }

  // 출력 디렉토리 생성
  const outputDir = path.dirname(outputFile)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // JSON 파일 생성
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), 'utf8')

  console.log(`>>> 파싱 완료!`)
  console.log(`   노드: ${nodes.length}개 (태그: ${tagSet.size}개)`)
  console.log(`   링크: ${validLinks.length}개`)
  console.log(`   출력: ${outputFile}`)
}

// ES 모듈에서 main 체크
if (import.meta.url === `file://${process.argv[1]}`) {
  parseNotes()
}

export { parseNotes }
