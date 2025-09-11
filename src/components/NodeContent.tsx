import FootnoteArea from './FootnoteArea'
import type { GraphData, GraphLink, NoteNode } from '@/types'
import { renderMarkdown } from '@/utils/markdown'

interface Props {
  current: NoteNode | undefined
  subgraph: GraphData
  currentId: string
  onNodeClick: (id: string) => void
}

export default function NodeContent({
  current,
  subgraph,
  currentId,
  onNodeClick,
}: Props) {
  if (!current) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        노드를 찾을 수 없습니다.
      </div>
    )
  }

  return (
    <article className="max-w-none my-16">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {current.title}
        </h1>

        {/* 태그 표시 */}
        {current.tags && current.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {current.tags.map((tag) => (
              <span
                key={tag}
                className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-md border"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 관련 개념 표시 */}
        {current.relatedConcepts && current.relatedConcepts.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-xs text-gray-500 mr-1">관련 개념:</span>
            {current.relatedConcepts.map((concept) => (
              <span
                key={concept}
                className="inline-block bg-gray-50 text-gray-600 text-xs px-2 py-1 rounded-md border"
              >
                #{concept}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end gap-4">
          {(current.dateCreated || current.dateUpdated) && (
            <div className="mt-1 bg-gray-50 rounded-lg text-xs text-gray-600">
              {current.dateCreated && (
                <div className="flex items-center gap-1">
                  <span>생성일: {current.dateCreated}</span>
                </div>
              )}
              {current.dateUpdated && (
                <div className="flex items-center gap-1">
                  <span>수정일: {current.dateUpdated}</span>
                </div>
              )}
            </div>
          )}
          {!current.id.startsWith('tag:') && current.url && (
            <a
              href={current.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <img
                src="/image/icon-github.png"
                alt="GitHub Icon"
                className="size-4"
              />
            </a>
          )}
        </div>
      </header>

      {current.content &&
        (() => {
          const { content, footnotes } = renderMarkdown(
            current.content,
            new Set(
              subgraph.links
                .filter((link) => link.broken && link.source === current.id)
                .map((link) => link.target),
            ),
          )

          return (
            <div className="my-20">
              <FootnoteArea footnotes={footnotes}>
                {(isFootnoteVisible: boolean) => (
                  <section>
                    <div
                      className="markdown-content prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: content }}
                    />
                  </section>
                )}
              </FootnoteArea>
            </div>
          )
        })()}

      <section className="border-t border-gray-200 pt-12">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">관련 문서</h2>
        <div className="space-y-6">
          {Object.entries(
            subgraph.links
              .filter((l) => l.source === currentId || l.target === currentId)
              .reduce(
                (groups, link) => {
                  const nid =
                    link.source === currentId ? link.target : link.source
                  const node = subgraph.nodes.find((n) => n.id === nid)

                  // 태그 링크는 제외 (이미 상단에 표시됨)
                  if (link.type === 'tag') {
                    return groups
                  }

                  // 링크 방향에 따라 올바른 관계 분류
                  let relationshipKey = link.type
                  if (link.type === 'prerequisite') {
                    if (link.target === currentId) {
                      // A→B: 현재 노드(B)가 target이면, source(A)는 선행 문서
                      relationshipKey = 'preceding'
                    } else {
                      // A→B: 현재 노드(A)가 source이면, target(B)는 후행 문서
                      relationshipKey = 'following'
                    }
                  }

                  groups[relationshipKey] = groups[relationshipKey] || []
                  groups[relationshipKey].push({ link, node, targetId: nid })

                  return groups
                },
                {} as Record<
                  string,
                  Array<{
                    link: GraphLink
                    node: NoteNode | undefined
                    targetId: string
                  }>
                >,
              ),
          )
            // 중복 제거 처리
            .map(([linkType, items]) => {
              // targetId 기준으로 중복 제거
              const uniqueItems = items.filter(
                (item, index, array) =>
                  array.findIndex(
                    (other) => other.targetId === item.targetId,
                  ) === index,
              )

              return [linkType, uniqueItems]
            })
            .map(([linkType, items]) => {
              // 관계 타입에 대한 한국어 표시명
              const relationshipLabels: Record<string, string> = {
                preceding: '선행',
                following: '후행',
                mention: '언급',
              }

              return (
                <div key={linkType as string} className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-600 border-b border-gray-100 pb-1">
                    {relationshipLabels[linkType as string] ||
                      (linkType as string)}
                  </h3>
                  <div className="grid grid-cols-1">
                    {items.map(({ node, link }, i) => {
                      const isBroken = !node || link.broken === true
                      // 깨진 prerequisite 링크의 경우 source를 표시
                      const displayTitle =
                        node?.title ||
                        (link.type === 'prerequisite' &&
                        link.target === currentId
                          ? link.source
                          : link.target)
                      return (
                        <div
                          key={i}
                          className=" hover:bg-gray-50 transition-colors"
                        >
                          {node && node.id.startsWith('tag:') ? (
                            <span
                              className={`text-sm ${node.hasFile ? 'text-gray-600' : 'text-red-600 opacity-70'}`}
                            >
                              {node.title}
                            </span>
                          ) : isBroken ? (
                            <span className="text-red-600 text-sm cursor-not-allowed opacity-70">
                              {displayTitle}
                            </span>
                          ) : (
                            <button
                              className="text-blue-600 text-sm hover:text-blue-800 text-left w-full"
                              onClick={() => onNodeClick(node!.id)}
                            >
                              {displayTitle}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
        </div>
      </section>
    </article>
  )
}
