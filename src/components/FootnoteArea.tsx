import type { ReactNode } from 'react'
import { useFootnotes } from '@/hooks/useFootnotes'

interface Props {
  footnotes: string
  children: (isVisible: boolean) => ReactNode
}

export default function FootnoteArea({ footnotes, children }: Props) {
  const {
    isVisible,
    positionedFootnotes,
    hoveredFootnote,
    hoveredFootnoteContent,
    tooltipPosition,
    toggleVisibility,
  } = useFootnotes(footnotes)

  if (!footnotes) {
    return <>{children(false)}</>
  }

  return (
    <>
      {/* 토글 버튼 */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={toggleVisibility}
          className="text-xs px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
        >
          각주 {isVisible ? 'OFF' : 'ON'}
        </button>
      </div>

      {/* 콘텐츠와 각주를 포함한 컨테이너 */}
      <div className={isVisible ? 'flex gap-3' : ''}>
        <div className={isVisible ? 'flex-1' : 'flex-none'}>
          {children(isVisible)}
        </div>

        {/* 사이드바 형태의 각주 영역 */}
        {isVisible && footnotes && (
          <aside
            className="footnote-area flex-shrink-0"
            style={{ width: '170px' }}
          >
            <div className="relative" style={{ minHeight: '500px' }}>
              {positionedFootnotes.map((footnote) => (
                <div
                  key={footnote.id}
                  className="footnote-positioned absolute w-full my-2 px-3 text-sm"
                  style={{ top: `${footnote.adjustedTop}px` }}
                  dangerouslySetInnerHTML={{ __html: footnote.content }}
                />
              ))}
            </div>
          </aside>
        )}
      </div>
      {/* 실제 툴팁 */}
      {!isVisible && hoveredFootnote && hoveredFootnoteContent && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-sm shadow-sm p-3 max-w-xs text-sm"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
          }}
        >
          <div>
            {hoveredFootnote}
            {hoveredFootnoteContent.replace(/<[^>]*>/g, '')}
          </div>
        </div>
      )}
    </>
  )
}
