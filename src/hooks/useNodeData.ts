import { useMemo } from "react";
import type { GraphData } from "@/types";

export function useNodeData(baseData: GraphData, id: string) {
  // 3뎁스 서브그래프
  const subgraph = useMemo<GraphData>(() => {
    const ids = new Set<string>([id]);

    for (let depth = 0; depth < 3; depth++) {
      const currentIds = Array.from(ids);
      baseData.links.forEach((l) => {
        if (currentIds.includes(l.source)) ids.add(l.target);
        if (currentIds.includes(l.target)) ids.add(l.source);
      });
    }

    return {
      nodes: baseData.nodes.filter((n) => ids.has(n.id)),
      links: baseData.links.filter(
        (l) => ids.has(l.source) && ids.has(l.target),
      ),
    };
  }, [baseData, id]);

  return {
    subgraph,
  };
}
