const MIN_GAP = 20
const HEIGHT = 80

export interface FootnotePosition {
  id: string
  content: string
  refTop: number
  adjustedTop: number
  height: number
}

// 겹침 방지를 위한 위치 조정 함수
export function adjustFootnotePositions(
  positions: Array<FootnotePosition>,
): Array<FootnotePosition> {
  if (positions.length === 0) return positions

  const sorted = [...positions].sort((a, b) => a.refTop - b.refTop)
  const adjusted: Array<FootnotePosition> = []

  for (const current of sorted) {
    current.adjustedTop = current.refTop

    for (const prev of adjusted) {
      const minGap = MIN_GAP
      if (current.adjustedTop < prev.adjustedTop + prev.height + minGap) {
        current.adjustedTop = prev.adjustedTop + prev.height + minGap
      }
    }

    adjusted.push(current)
  }

  return adjusted
}

// 각주 내용 파싱 함수
export function parseFootnoteContent(
  hoveredFootnote: string | null,
  footnotes: string,
): string | null {
  if (!hoveredFootnote || !footnotes) return null

  try {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = footnotes
    const footnoteDef = tempDiv.querySelector(`#footnote-${hoveredFootnote}`)
    if (footnoteDef) {
      const backref = footnoteDef.querySelector('.footnote-backref')
      if (backref) backref.remove()
      return footnoteDef.innerHTML
    }
  } catch (error) {
    console.error('Error parsing footnote content:', error)
  }

  return null
}

// 각주 위치 정보 수집 함수
export function collectFootnotePositions(
  footnotes: string,
): Array<FootnotePosition> {
  const allSupElements = document.querySelectorAll('sup')
  const positions: Array<FootnotePosition> = []
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = footnotes
  const footnoteDefs = tempDiv.querySelectorAll('.footnote-def')

  allSupElements.forEach((sup) => {
    const link = sup.querySelector('a[href^="#footnote-"]')
    if (link) {
      const footnoteId = (link as HTMLAnchorElement)
        .getAttribute('href')
        ?.replace('#footnote-', '')
      if (footnoteId) {
        const footnoteDef = Array.from(footnoteDefs).find(
          (def) => def.id === `footnote-${footnoteId}`,
        )
        if (footnoteDef) {
          const rect = sup.getBoundingClientRect()
          const contentElement = document.querySelector('.markdown-content')

          if (contentElement) {
            const contentRect = contentElement.getBoundingClientRect()
            const relativeTop = rect.top - contentRect.top

            positions.push({
              id: footnoteId,
              content: footnoteDef.innerHTML,
              refTop: Math.max(0, relativeTop),
              adjustedTop: 0,
              height: HEIGHT,
            })
          }
        }
      }
    }
  })

  return adjustFootnotePositions(positions)
}
