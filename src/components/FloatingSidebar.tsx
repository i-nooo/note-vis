import { useState } from 'react'
import NetworkGraph from './NetworkGraph'
import TreeGraph from './TreeGraph'
import type { GraphData, TreeNode } from '@/types'

interface Position {
  top: string
  right: string
  bottom: string
  left: string
}

interface Props {
  subgraph: GraphData
  familyTree: TreeNode | null
  currentId: string
  onNavigate: (id: string) => void
  position?: Position
}

export default function FloatingSidebar({
  subgraph,
  familyTree,
  currentId,
  onNavigate,
  position = { top: '80px', right: '5', bottom: '0px', left: '0px' },
}: Props) {
  const [isNetworkExpanded, setIsNetworkExpanded] = useState<boolean>(false)
  const [isTreeExpanded, setIsTreeExpanded] = useState<boolean>(false)

  const isAnyExpanded = isNetworkExpanded || isTreeExpanded

  return (
    <aside
      className={`fixed top-[80px] right-5 max-h-[calc(100vh-40px)] bg-white border border-gray-200 rounded-xl shadow-gray-50 z-50 flex flex-col overflow-hidden transition-all duration-200 ${isAnyExpanded ? 'w-80' : 'w-48'}`}
    >
      {/* Network */}
      <section className="border-b border-gray-200">
        <button
          onClick={() => setIsNetworkExpanded(!isNetworkExpanded)}
          className="w-full px-4 py-3 text-left text-gray-800 text-sm hover:bg-gray-50 flex items-center justify-between"
        >
          Network Graph
          <span className="text-gray-400">{isNetworkExpanded ? '−' : '+'}</span>
        </button>
        <div
          className={`overflow-hidden transition-all duration-200 ${isNetworkExpanded ? 'h-64' : 'h-0'}`}
        >
          <NetworkGraph
            data={subgraph}
            query=""
            selectedTags={new Set()}
            height={250}
            routeMode="tanstack"
          />
        </div>
      </section>

      {/* Tree  */}
      <section className="flex-1 flex flex-col min-h-0">
        <button
          onClick={() => setIsTreeExpanded(!isTreeExpanded)}
          className="w-full px-4 py-3 text-left text-gray-800 text-sm hover:bg-gray-50 flex items-center justify-between border-b border-gray-200"
        >
          Concept Tree
          <span className="text-gray-400">{isTreeExpanded ? '−' : '+'}</span>
        </button>
        <div
          className={`overflow-hidden transition-all duration-200 ${isTreeExpanded ? 'h-[500px]' : 'h-0'}`}
        >
          <div className="flex-1 p-4 overflow-auto">
            {familyTree ? (
              <TreeGraph
                roots={[familyTree]}
                height={400}
                currentId={currentId}
                onNavigate={onNavigate}
              />
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-500 text-sm text-center">
                현재 노드의 개념 트리를 찾을 수 없습니다
              </div>
            )}
          </div>
        </div>
      </section>
    </aside>
  )
}
