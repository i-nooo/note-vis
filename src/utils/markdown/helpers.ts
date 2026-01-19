export function slugifyNode(name: string): string {
  return encodeURIComponent(name.replace(/\s+/g, ' ').trim())
}

const slugCountMap = new Map<string, number>()

export function resetSlugCounter(): void {
  slugCountMap.clear()
}

export function slugifyHeading(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  const count = slugCountMap.get(base) || 0
  slugCountMap.set(base, count + 1)

  return count === 0 ? base : `${base}-${count}`
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function formatCode(code: string): string {
  const lines = code.split('\n')
  let indentLevel = 0
  const indentSize = 2

  const formattedLines = lines.map((line) => {
    const trimmed = line.trim()
    if (!trimmed) return ''

    if (
      trimmed.startsWith('}') ||
      trimmed.startsWith(']') ||
      trimmed.startsWith(')')
    ) {
      indentLevel = Math.max(0, indentLevel - 1)
    }

    const indentedLine = ' '.repeat(indentLevel * indentSize) + trimmed

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
