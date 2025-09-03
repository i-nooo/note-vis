import { marked } from 'marked'

export function renderMarkdown(markdown: string): string {
  if (!markdown) return ''
  
  try {
    // Wiki 링크 [[노드명]]를 먼저 처리
    let processedMarkdown = markdown.replace(/\[\[([^\]]+)\]\]/g, (match, nodeName) => {
      const cleanName = nodeName.trim()
      return `[${cleanName}](/node/${cleanName})`
    })
    
    // marked로 기본 마크다운 렌더링
    const html = marked.parse(processedMarkdown, {
      gfm: true,
      breaks: true
    }) as string
    
    // 외부 링크는 새 창에서 열기
    return html.replace(/<a href="http/g, '<a target="_blank" rel="noopener noreferrer" href="http')
    
  } catch (error) {
    console.error('Markdown parsing error:', error)
    return markdown // 에러 시 원본 텍스트 반환
  }
}