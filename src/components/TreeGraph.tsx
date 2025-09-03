import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { TreeNode } from '@/types'

interface Props {
  roots: Array<TreeNode> // 포레스트(여러 루트) 허용
  width?: number
  height?: number
  currentId?: string // 현재 선택 노드 강조
  onNavigate?: (id: string) => void
}

type HNode = d3.HierarchyPointNode<TreeNode>

export default function TreeGraph({
  roots,
  width = 520,
  height = 640,
  currentId,
  onNavigate,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null)

  // 접기/펼치기 상태
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  // currentId가 변경될 때 collapsed 상태 초기화
  useEffect(() => {
    setCollapsed(new Set())
  }, [currentId])

  // 포레스트를 세로로 배열하는 레이아웃
  const layoutData = useMemo(() => {
    if (roots.length === 0) return null

    // 각 루트 트리를 개별적으로 레이아웃
    const trees = roots.map((rootNode) => {
      const root = d3.hierarchy<TreeNode>(rootNode, (d) => {
        if (!d.children) return null
        if (collapsed.has(d.id)) return []
        return d.children
      })

      const tree = d3.tree<TreeNode>().nodeSize([80, 200])
      const positioned = tree(root)

      return positioned
    })

    // 모든 트리의 노드와 링크를 합침
    const allNodes = trees.flatMap((tree) => tree.descendants())
    const allLinks = trees.flatMap((tree) => tree.links())

    return { allNodes, allLinks }
  }, [roots, collapsed])

  useEffect(() => {
    if (!svgRef.current || !layoutData) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // 레이아웃 데이터에서 노드와 링크 추출
    const nodes: Array<HNode> = layoutData.allNodes as any
    const links = layoutData.allLinks

    // 뷰박스 계산
    const xExtent = d3.extent(nodes, (n) => n.x) as [number, number]
    const yExtent = d3.extent(nodes, (n) => n.y) as [number, number]

    const pad = 40
    const W = width,
      H = height
    const viewBox = `${(xExtent[0] ?? 0) - pad} ${(yExtent[0] ?? 0) - pad} ${(xExtent[1] - xExtent[0] || W) + pad * 2} ${(yExtent[1] - yExtent[0] || H) + pad * 2}`

    const g = svg
      .attr('viewBox', viewBox)
      .attr('width', W)
      .attr('height', H)
      .append('g')

    // 링크
    g.append('g')
      .attr('fill', 'none')
      .attr('stroke', '#c0c0c0')
      .attr('stroke-width', 1.5)
      .selectAll('path')
      .data(links)
      .join('path')
      .attr(
        'd',
        d3
          .linkHorizontal<any, any>()
          .x((d: any) => d.x)
          .y((d: any) => d.y),
      )

    // 노드
    const node = g
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .attr('cursor', 'pointer')

    node
      .append('circle')
      .attr('r', 6)
      .attr('fill', (d) => (d.data.id === currentId ? '#1f77b4' : '#6baed6'))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .on('click', (_, d) => {
        // 토글: 자식이 있으면 접기/펼치기, 그리고 라우팅
        if (d.children || (d.data.children && d.data.children.length)) {
          setCollapsed((prev) => {
            const next = new Set(prev)
            if (next.has(d.data.id)) next.delete(d.data.id)
            else next.add(d.data.id)
            return next
          })
        }
        onNavigate?.(d.data.id)
      })

    node
      .append('text')
      .attr('x', 10)
      .attr('y', 4)
      .attr('font-size', 12)
      .attr('fill', (d) => (d.data.id === currentId ? '#1f77b4' : '#333'))
      .text((d) => d.data.title ?? d.data.id)

    if (nodes.length === 0) {
      svg
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('width', width)
        .attr('height', height)
      svg
        .append('text')
        .attr('x', 16)
        .attr('y', 24)
        .attr('font-size', 12)
        .attr('fill', '#666')
        .text('표시할 트리 데이터가 없습니다')
      return
    }

    // 현재 노드 1-hop 강조(형제/부모/자식)
    if (currentId) {
      const nbr = new Set<string>()
      nodes.forEach((n) => {
        if (n.data.id === currentId) {
          if (n.parent) nbr.add(n.parent.data.id)
          n.children?.forEach((c) => nbr.add(c.data.id))
          n.parent?.children?.forEach((sib) => nbr.add(sib.data.id))
        }
      })
      node.attr('opacity', (d) =>
        d.data.id === currentId || nbr.has(d.data.id) ? 1 : 0.3,
      )
      g.selectAll<SVGPathElement, any>('path').attr('opacity', (l) =>
        l.source.data.id === currentId || l.target.data.id === currentId
          ? 1
          : 0.3,
      )
    }
  }, [layoutData, width, height, currentId, onNavigate])

  return <svg ref={svgRef} style={{ width: '100%', height }} />
}
