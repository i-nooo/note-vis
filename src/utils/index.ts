import fs from 'node:fs'
import path from 'node:path'
// @ts-expect-error: 타입 선언이 없으므로 무시
import matter from 'gray-matter'

// 매우 단순한 규칙: frontmatter의 tags, mentions, title을 사용
// mentions는 다른 노트 id 배열로 가정
// 예시 frontmatter:
// ---
// title: "Graph Theory"
// tags: ["math", "network"]
// mentions: ["mathematics"]
// ---
type FM = {
  title?: string
  tags?: Array<string>
  mentions?: Array<string>
  parent?: string
}

const NOTES_DIR = path.resolve('notes')
const OUT_FILE = path.resolve('src/data/notes.json')

// 노트 id는 파일명(확장자 제외)
const files = fs.readdirSync(NOTES_DIR).filter((f) => f.endsWith('.md'))

const nodes: Array<{
  id: string
  title: string
  tags?: Array<string>
  parent?: string
}> = []
const tagNodeIds = new Set<string>()
const links: Array<{
  source: string
  target: string
  type: 'tag' | 'mention'
}> = []

for (const file of files) {
  const filepath = path.join(NOTES_DIR, file)
  const id = path.basename(file, '.md')
  const raw = fs.readFileSync(filepath, 'utf-8')
  const { data } = matter(raw)
  const fm = (data ?? {}) as FM
  const title = fm.title ?? id

  nodes.push({ id, title, tags: fm.tags, parent: fm.parent })

  if (Array.isArray(fm.tags)) {
    for (const t of fm.tags) {
      const tagId = `tag:${t}`
      if (!tagNodeIds.has(tagId)) {
        tagNodeIds.add(tagId)
      }
      links.push({ source: id, target: tagId, type: 'tag' })
    }
  }
  if (Array.isArray(fm.mentions)) {
    for (const m of fm.mentions) {
      links.push({ source: id, target: m, type: 'mention' })
    }
  }
}

// 태그 노드 추가
for (const tagId of tagNodeIds) {
  nodes.push({ id: tagId, title: `#${tagId.split(':')[1]}` })
}

const out = { nodes, links }
fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2))
console.log(`wrote ${OUT_FILE} (${nodes.length} nodes, ${links.length} links)`)
