import { useState } from "react";
import NetworkGraph from "./NetworkGraph";
import type { GraphData } from "@/types";

interface Props {
  subgraph: GraphData;
}

export default function FloatingSidebar({ subgraph }: Props) {
  const [isNetworkExpanded, setIsNetworkExpanded] = useState<boolean>(false);

  const isExpanded = isNetworkExpanded;

  return (
    <aside
      className={`fixed bottom-5 right-5 max-h-[calc(100vh-40px)] bg-white border border-gray-200 rounded-xl shadow-gray-50 z-50 flex flex-col overflow-hidden transition-all duration-200 ${isExpanded ? "w-80" : "w-48"}`}
    >
      {/* Network */}
      <section className="border-b border-gray-200">
        <button
          onClick={() => setIsNetworkExpanded(!isNetworkExpanded)}
          className="w-full px-4 py-3 text-left text-gray-800 text-sm hover:bg-gray-50 flex items-center justify-between"
        >
          Network Graph
          <span className="text-gray-400">{isNetworkExpanded ? "−" : "+"}</span>
        </button>
        <div
          className={`overflow-hidden transition-all duration-200 ${isNetworkExpanded ? "h-64" : "h-0"}`}
        >
          <NetworkGraph
            data={subgraph}
            query=""
            selectedTags={new Set()}
            height={250}
            initialScale={2}
            routeMode="tanstack"
          />
        </div>
      </section>
    </aside>
  );
}
