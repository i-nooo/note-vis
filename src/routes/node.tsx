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

  // URL이 포함된 서브그래프 데이터
  const repoBase = "https://github.com/i-nooo/note-vis/blob/main/notes/";
  const withUrls = useMemo(
    () => ({
      ...subgraph,
      nodes: subgraph.nodes.map((n) =>
        n.id.startsWith("tag:") ? n : { ...n, url: `${repoBase}${n.id}.md` },
      ),
    }),
    [subgraph],
  );

  const current = withUrls.nodes.find((n) => n.id === id);
  const goNode = (nid: string) =>
    navigate({ to: "/node/$id", params: { id: nid } });

  const renderResult = useMemo(() => {
    if (!current?.content) return null;
    const brokenLinks = new Set(
      withUrls.links
        .filter((link) => link.broken && link.source === current.id)
        .map((link) => link.target),
    );
    return renderMarkdown(current.content, brokenLinks);
  }, [current, withUrls.links]);

  return (
    <div
      className={`min-h-screen bg-gray-50 ${!footnoteVisible ? "footnote-off" : ""}`}
    >
      <div className={`mx-auto ${footnoteVisible ? "max-w-4xl" : "max-w-3xl"}`}>
        <NodeHeader />

        <NodeContent
          current={current}
          subgraph={withUrls}
          currentId={id}
          onNodeClick={goNode}
          renderResult={renderResult}
        />

        <FloatingSidebar
          subgraph={withUrls}
          headings={renderResult?.headings ?? []}
        />
      </div>
    </div>
  );
}
