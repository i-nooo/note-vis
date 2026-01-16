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

  const { subgraph, breadcrumbPath } = useNodeData(baseData, id);

  // URL이 포함된 서브그래프 데이터
  const repoBase = "https://github.com/<org>/<repo>/blob/main/notes/";
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

  return (
    <div
      className={`min-h-screen bg-gray-50 ${!footnoteVisible ? "footnote-off" : ""}`}
    >
      <div className={`mx-auto ${footnoteVisible ? "max-w-4xl" : "max-w-3xl"}`}>
        <NodeHeader breadcrumbPath={breadcrumbPath} onNodeClick={goNode} />

        <NodeContent
          current={current}
          subgraph={withUrls}
          currentId={id}
          onNodeClick={goNode}
        />

        <FloatingSidebar subgraph={withUrls} />
      </div>
    </div>
  );
}
