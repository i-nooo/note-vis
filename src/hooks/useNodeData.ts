import { useMemo } from 'react'
import type { GraphData, NoteNode, TreeNode } from '@/types'

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

  // 개념 트리 (parent + prerequisites + children 관계)
  const familyTree = useMemo<TreeNode | null>(() => {
    const map = new Map<string, TreeNode>()
    const repoBase = 'https://github.com/<org>/<repo>/blob/main/notes/'

    // TreeNode 맵 생성 (태그 제외)
    baseData.nodes.forEach((n) => {
      if (n.id.startsWith('tag:')) return
      map.set(n.id, {
        id: n.id,
        title: n.title,
        url: `${repoBase}${n.id}.md`,
        children: [],
      })
    })

    // prerequisites 관계 구축 (여러 선행 개념)
    baseData.nodes.forEach((n) => {
      if (!n.prerequisites) return
      n.prerequisites.forEach((prereqId) => {
        // 깨진 노드를 위한 가상 노드 생성
        if (!map.has(prereqId)) {
          map.set(prereqId, {
            id: prereqId,
            title: prereqId,
            url: `${repoBase}${prereqId}.md`,
            children: [],
            broken: true,
          })
        }

        const prereq = map.get(prereqId)!
        const child = map.get(n.id)!
        const alreadyConnected = prereq.children?.some((c) => c.id === child.id)
        if (!alreadyConnected) {
          prereq.children!.push(child)
        }
      })
    })

    const current = map.get(id)
    if (!current) return null

    // 현재 노드의 모든 prerequisites를 형제 노드로 표시
    const currentNodeData = baseData.nodes.find((n) => n.id === id)
    if (
      currentNodeData?.prerequisites &&
      currentNodeData.prerequisites.length > 0
    ) {
      // 가상의 루트 노드 생성
      const rootNode: TreeNode = {
        id: `root-of-${id}`,
        title: `${current.title} 관련`,
        children: [],
        broken: false,
        virtual: true,
      }

      // 모든 prerequisites를 children으로 추가 (빈 문자열 제외, 깨진 노드 포함)
      currentNodeData.prerequisites
        .filter((prereqId) => prereqId && prereqId.trim() !== '') // 빈 문자열 필터링
        .forEach((prereqId) => {
          if (map.has(prereqId)) {
            const prereqNode = map.get(prereqId)!
            // prerequisites의 children을 비우고 추가 (중복 방지)
            rootNode.children!.push({
              ...prereqNode,
              children: [], // 중복 연결 방지
            })
          }
        })

      // 현재 노드도 children으로 추가
      rootNode.children!.push({
        ...current,
        children: current.children || [],
      })

      return rootNode
    }

    // prerequisites가 없으면 기존 로직 사용
    let ancestor = current
    while (true) {
      const currentNodeData = baseData.nodes.find((n) => n.id === ancestor.id)
      // prerequisites의 첫 번째 항목을 parent로 사용
      let parentId = null
      if (
        currentNodeData?.prerequisites &&
        currentNodeData.prerequisites.length > 0
      ) {
        parentId = currentNodeData.prerequisites[0]
      }

      if (!parentId || !map.has(parentId)) break
      ancestor = map.get(parentId)!
    }

    // 4뎁스까지 필터링
    const filterDepth = (node: TreeNode, currentDepth: number): TreeNode => {
      return {
        ...node,
        children:
          currentDepth < 4
            ? node.children?.map((child) =>
                filterDepth(child, currentDepth + 1),
              ) || []
            : [],
      }
    }

    return filterDepth(ancestor, 0)
  }, [baseData, id])

  return {
    subgraph,
    breadcrumbPath,
    familyTree,
  }
}
