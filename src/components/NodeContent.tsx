import { useCallback } from "react";
import FootnoteArea from "./FootnoteArea";
import type { GraphData, GraphLink, NoteNode } from "@/types";
import type { RenderResult } from "@/utils/markdown/types";

interface Props {
  current: NoteNode | undefined;
  subgraph: GraphData;
  currentId: string;
  onNodeClick: (id: string) => void;
  renderResult: RenderResult | null;
}

export default function NodeContent({
  current,
  subgraph,
  currentId,
  onNodeClick,
  renderResult,
}: Props) {
  const handleContentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // 위키링크 (내부 링크): SPA 네비게이션 사용
      const nodeMatch = href.match(/\/node\/(.+)$/);
      if (nodeMatch) {
        e.preventDefault();
        onNodeClick(decodeURIComponent(nodeMatch[1]));
      }
    },
    [onNodeClick],
  );

  if (!current) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        노드를 찾을 수 없습니다.
      </div>
    );
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
                className="inline-block bg-blue-50 text-blue-700 text-xs px-1 py-0.5 rounded-md border-[0.5px] border-blue-200"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end gap-4">
          {(current.createdTime || current.lastEditedTime) && (
            <div className="mt-1 bg-gray-50 rounded-lg text-xs text-gray-600">
              {current.createdTime && (
                <div className="flex items-center gap-1">
                  <span>생성일: {current.createdTime}</span>
                </div>
              )}
              {current.lastEditedTime && (
                <div className="flex items-center gap-1">
                  <span>수정일: {current.lastEditedTime}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {renderResult && (
        <div>
          <FootnoteArea footnotes={renderResult.footnotes}>
            {(_isFootnoteVisible: boolean) => (
              <section>
                <div
                  className="markdown-content prose prose-sm max-w-none my-14"
                  dangerouslySetInnerHTML={{ __html: renderResult.content }}
                  onClick={handleContentClick}
                />
              </section>
            )}
          </FootnoteArea>
        </div>
      )}

      <section className="border-t border-gray-200 pt-12">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">관련 문서</h2>
        <div className="space-y-6">
          {Object.entries(
            subgraph.links
              .filter((l) => l.source === currentId || l.target === currentId)
              .reduce(
                (groups, link) => {
                  // 태그 링크는 제외 (이미 상단에 표시됨)
                  if (link.type === "tag") {
                    return groups;
                  }
                  const targetId =
                    link.source === currentId ? link.target : link.source;
                  const linkType = link.type || "mention";
                  if (!groups[linkType]) groups[linkType] = [];
                  groups[linkType].push({
                    link,
                    node: subgraph.nodes.find((n) => n.id === targetId),
                    targetId,
                  });
                  return groups;
                },
                {} as Record<
                  string,
                  Array<{
                    link: GraphLink;
                    node: NoteNode | undefined;
                    targetId: string;
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
              );

              return [linkType, uniqueItems] as const;
            })
            .map(([linkType, items]) => {
              return (
                <div key={linkType} className="space-y-2">
                  <div className="grid grid-cols-1">
                    {items.map(({ node, link }, i) => {
                      const isBroken = !node || link.broken === true;
                      return (
                        <div
                          key={i}
                          className=" hover:bg-gray-50 transition-colors"
                        >
                          {isBroken ? (
                            <span className="text-red-600 text-sm cursor-not-allowed opacity-70">
                              {node?.title}
                            </span>
                          ) : (
                            <button
                              className="text-blue-600 text-sm hover:text-blue-800 text-left w-full"
                              onClick={() => onNodeClick(node.id)}
                            >
                              {node?.title}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      </section>
    </article>
  );
}
