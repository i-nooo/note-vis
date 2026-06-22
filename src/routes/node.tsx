import { createRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore } from "@tanstack/react-store";
import { rootRoute } from "./root";
import type { GraphData } from "@/types";
import NodeHeader from "@/components/NodeHeader";
import NodeContent from "@/components/NodeContent";
import FloatingSidebar from "@/components/FloatingSidebar";
import { useNodeData } from "@/hooks/useNodeData";
import { store } from "@/store";
import sample from "@/data/notes.json";
import { renderMarkdown } from "@/utils/markdown";

export const nodeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/node/$id",
  component: NodePage,
});

function NodePage() {
  const { id } = useParams({ from: nodeRoute.id });
  const navigate = useNavigate();

  const baseData = sample as GraphData;
  const footnoteVisible = useStore(store, (state) => state.footnoteVisible);
  const { subgraph } = useNodeData(baseData, id);

  const current = subgraph.nodes.find((n) => n.id === id);
  const goNode = (nid: string) =>
    navigate({ to: "/node/$id", params: { id: nid } });

  // 노션 page mention(<mention-page url=.../p/ID/>)을 제목 있는 위키링크로
  // 렌더링하기 위한 id→title 맵. 전체 그래프 기준으로 조회한다.
  const mentionTitles = useMemo(
    () => new Map(baseData.nodes.map((n) => [n.id, n.title])),
    [baseData],
  );

  const renderResult = useMemo(() => {
    if (!current?.contents) return null;
    const brokenLinks = new Set(
      subgraph.links
        .filter((link) => link.broken && link.source === current.id)
        .map((link) => link.target),
    );
    return renderMarkdown(current.contents, brokenLinks, mentionTitles);
  }, [current, subgraph.links, mentionTitles]);

  return (
    <div
      className={`min-h-screen bg-gray-50 ${!footnoteVisible ? "footnote-off" : ""}`}
    >
      {/* pb: 하단 고정 FloatingSidebar가 본문 맨 끝(참고 링크 등)을 덮어
          클릭을 가로채지 않도록 스크롤 여유 공간을 확보한다. */}
      <div
        className={`mx-auto pb-112 ${footnoteVisible ? "max-w-4xl" : "max-w-3xl"}`}
      >
        <NodeHeader />

        <NodeContent
          current={current}
          subgraph={subgraph}
          currentId={id}
          onNodeClick={goNode}
          renderResult={renderResult}
        />

        <FloatingSidebar
          subgraph={subgraph}
          headings={renderResult?.headings ?? []}
        />
      </div>
    </div>
  );
}
