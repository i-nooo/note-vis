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

// 라벨 충돌 감지 및 위치 계산 - 각 노드별 고유 키 사용
function calculateLabelPositions(
  nodes: Array<HNode>,
): Map<HNode, { x: number; y: number; width: number; height: number }> {
  const positions = new Map<
    HNode,
    { x: number; y: number; width: number; height: number }
  >()

  // 모든 노드에 대해 기본 위치부터 시작 (각 노드 객체를 키로 사용)
  nodes.forEach((node) => {
    const text = node.data.title ?? node.data.id
    // 텍스트 크기 계산
    const koreanChar = /[가-힣]/g
    const koreanCount = (text.match(koreanChar) || []).length
    const englishCount = text.length - koreanCount
    const width = Math.max(koreanCount * 12 + englishCount * 7, 30)
    const height = 16

    // 가능한 위치들 (우선순위 순)
    const candidatePositions = [
      { x: node.x + 12, y: node.y - 8 }, // 오른쪽 (기본)
      { x: node.x + 12, y: node.y - 24 }, // 오른쪽 위
      { x: node.x + 12, y: node.y + 8 }, // 오른쪽 아래
      { x: node.x - width - 8, y: node.y - 8 }, // 왼쪽
      { x: node.x - width - 8, y: node.y - 24 }, // 왼쪽 위
      { x: node.x - width - 8, y: node.y + 8 }, // 왼쪽 아래
      { x: node.x - width / 2, y: node.y - 30 }, // 위 중앙
      { x: node.x - width / 2, y: node.y + 18 }, // 아래 중앙
    ]

    let finalPosition = candidatePositions[0] // 기본값으로 첫 번째 위치 사용

    // 각 후보 위치를 확인하여 충돌이 가장 적은 곳 선택
    for (const candidate of candidatePositions) {
      let hasCollision = false

      // 기존 라벨들과 충돌 검사
      for (const [, existing] of positions) {
        const margin = 6 // 여백
        if (
          candidate.x < existing.x + existing.width + margin &&
          candidate.x + width > existing.x - margin &&
          candidate.y < existing.y + existing.height + margin &&
          candidate.y + height > existing.y - margin
        ) {
          hasCollision = true
          break
        }
      }

      // 충돌이 없으면 이 위치 사용
      if (!hasCollision) {
        finalPosition = candidate
        break
      }
    }

    // 위치 저장 - 노드 객체를 키로 사용하여 중복 이름이라도 각각 저장
    positions.set(node, {
      x: finalPosition.x,
      y: finalPosition.y,
      width: width,
      height: height,
    })
  })

  return positions
}

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

    // 줌 기능 추가
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => g.attr('transform', event.transform))
    svg.call(zoom as any)

    // 라벨 위치 계산
    const labelPositions = calculateLabelPositions(nodes)

    // 링크
    const linkGroup = g
      .append('g')
      .attr('fill', 'none')
      .attr('stroke', '#c0c0c0')
      .attr('stroke-width', 1.5)

    const link = linkGroup
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('class', 'tree-link')
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

    // 라벨 위치에 시각적 가이드라인 추가 (개발용, 나중에 제거 가능)
    const showLabelBounds = false // 디버깅용 플래그 - 충돌 영역 표시

    if (showLabelBounds) {
      labelPositions.forEach((pos, nodeObj) => {
        g.append('rect')
          .attr('x', pos.x)
          .attr('y', pos.y)
          .attr('width', pos.width)
          .attr('height', pos.height)
          .attr('fill', 'none')
          .attr('stroke', 'red')
          .attr('stroke-width', 0.5)
          .attr('opacity', 0.3)
      })
    }

    node
      .append('circle')
      .attr('r', 6)
      .attr('fill', (d) => (d.data.id === currentId ? '#1f77b4' : '#6baed6'))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('cursor', 'pointer')
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
      .attr('x', (d) => {
        const pos = labelPositions.get(d)
        return pos ? pos.x - d.x : 12
      })
      .attr('y', (d) => {
        const pos = labelPositions.get(d)
        return pos ? pos.y - d.y + 12 : 4
      })
      .attr('font-size', 12)
      .attr('font-family', 'system-ui, sans-serif')
      .attr('font-weight', 500)
      .attr('fill', (d) => (d.data.id === currentId ? '#1f77b4' : '#333'))
      .attr('stroke', 'white')
      .attr('stroke-width', 0.5)
      .attr('stroke-linejoin', 'round')
      .attr('paint-order', 'stroke fill')
      .attr('cursor', 'pointer')
      .text((d) => {
        // 텍스트가 비어있지 않도록 보장
        const text = d.data.title || d.data.id || 'Untitled'
        return text
      })
      .style('pointer-events', 'all') // 클릭 이벤트가 확실히 작동하도록
      .on('click', (_, d) => {
        // 텍스트 클릭도 같은 동작
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

    // 현재 노드 하이라이트 (호버가 아닐 때만 적용)
    if (currentId) {
      const nbr = new Set<string>()
      nodes.forEach((n) => {
        if (n.data.id === currentId) {
          if (n.parent) nbr.add(n.parent.data.id)
          n.children?.forEach((c) => nbr.add(c.data.id))
          n.parent?.children?.forEach((sib) => nbr.add(sib.data.id))
        }
      })

      // 초기 상태에서만 currentId 기반 하이라이트 적용
      node.attr('opacity', (d) =>
        d.data.id === currentId || nbr.has(d.data.id) ? 1 : 0.6,
      )
      link.attr('opacity', (l: any) =>
        l.source.data.id === currentId || l.target.data.id === currentId
          ? 1
          : 0.6,
      )
    }
  }, [layoutData, width, height, currentId, onNavigate])

  return <svg ref={svgRef} style={{ width: '100%', height }} />
}
