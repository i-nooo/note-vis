import { useRef, useState } from "react";
import NetworkGraph from "./NetworkGraph";
import TableOfContents from "./TableOfContents";
import type { GraphData } from "@/types";
import type { HeadingItem } from "@/utils/markdown/types";

interface Props {
  subgraph: GraphData;
  headings: Array<HeadingItem>;
}

export default function FloatingSidebar({ subgraph, headings }: Props) {
  const [isNetworkExpanded, setIsNetworkExpanded] = useState<boolean>(false);
  const [isTocExpanded, setIsTocExpanded] = useState<boolean>(true);
  const tocContainerRef = useRef<HTMLDivElement>(null);

  const isExpanded = isNetworkExpanded || isTocExpanded;

  return (
    <aside
      className={`fixed bottom-5 right-5 max-h-[calc(100vh-40px)] bg-white border border-gray-200 rounded-xl shadow-gray-50 z-50 flex flex-col overflow-hidden transition-all duration-200 ${isExpanded ? "w-64" : "w-48"}`}
    >
      {/* floating sidebar 목차 */}
      {headings.length > 0 && (
        <section className="border-b border-gray-200">
          <button
            onClick={() => setIsTocExpanded(!isTocExpanded)}
            className="w-full px-4 py-3 text-left text-gray-800 text-sm hover:bg-gray-50 flex items-center justify-between"
          >
            목차
            <span className="text-gray-400">{isTocExpanded ? "−" : "+"}</span>
          </button>
          <div
            ref={tocContainerRef}
            className={`overflow-y-auto transition-all duration-200 ${isTocExpanded ? "max-h-64" : "max-h-0"}`}
          >
            <TableOfContents
              headings={headings}
              containerRef={tocContainerRef}
            />
          </div>
        </section>
      )}

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
