import { useMemo } from 'react'
import type { GraphData, NoteNode } from '@/types'

export function useNodeData(baseData: GraphData, id: string) {
  // 3뎁스 서브그래프
  const subgraph = useMemo<GraphData>(() => {
    const ids = new Set<string>([id])

    for (let depth = 0; depth < 3; depth++) {
      const currentIds = Array.from(ids)
      baseData.links.forEach((l) => {
        if (currentIds.includes(l.source)) ids.add(l.target)
        if (currentIds.includes(l.target)) ids.add(l.source)
      })
    }

    return {
      nodes: baseData.nodes.filter((n) => ids.has(n.id)),
      links: baseData.links.filter(
        (l) => ids.has(l.source) && ids.has(l.target),
      ),
    }
  }, [baseData, id])

  // Breadcrumb 경로 (prerequisites도 고려)
  const breadcrumbPath = useMemo<Array<NoteNode>>(() => {
    const path: Array<NoteNode> = []
    let currentNode = baseData.nodes.find(
      (n) => n.id === id && !n.id.startsWith('tag:'),
    )

    while (currentNode) {
      path.unshift(currentNode)

      // prerequisites의 첫 번째 항목을 parent로 사용
      let parentId = null
      if (currentNode.prerequisites && currentNode.prerequisites.length > 0) {
        parentId = currentNode.prerequisites[0]
      }

      if (!parentId) break
      currentNode = baseData.nodes.find((n) => n.id === parentId)
    }

    return path
  }, [baseData, id])

  return {
    subgraph,
    breadcrumbPath,
  }
}
