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

      {current.content && (
        <section className="my-20 bg-gray-50 rounded-lg">
          <div
            className="markdown-content prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(current.content),
            }}
          />
        </section>
      )}

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
                  const node = subgraph.nodes.find((n) => n.id === nid)!

                  groups[link.type] = groups[link.type] || []
                  groups[link.type].push({ link, node })
                  return groups
                },
                {} as Record<
                  string,
                  Array<{ link: GraphLink; node: NoteNode }>
                >,
              ),
          ).map(([linkType, items]) => (
            <div key={linkType} className="space-y-2">
              <h3 className="text-sm font-medium text-gray-600 capitalize border-b border-gray-100 pb-1">
                {linkType}
              </h3>
              <div className="grid grid-cols-1">
                {items.map(({ node }, i) => (
                  <div key={i} className=" hover:bg-gray-50 transition-colors">
                    {node.id.startsWith('tag:') ? (
                      <span className="text-gray-600 text-sm border-b border-gray-200 px-2 py-1 bg-gray-200 rounded-lg">
                        {node.title}
                      </span>
                    ) : (
                      <button
                        className="text-blue-600 text-sm hover:text-blue-800 text-left w-full"
                        onClick={() => onNodeClick(node.id)}
                      >
                        {node.title}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </article>
  )
}
