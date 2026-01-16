export function slugifyNode(name: string): string {
  return encodeURIComponent(name.replace(/\s+/g, ' ').trim())
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
