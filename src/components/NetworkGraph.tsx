import { useEffect, useMemo, useRef } from 'react'
import * as d3 from 'd3'
import { useNavigate } from '@tanstack/react-router'
import type { GraphData, GraphLink, NoteNode } from '../types'

interface Props {
  data: GraphData
  width?: number
  height?: number
  query?: string
  selectedTags?: Set<string>
  onNavigate?: (node: NoteNode) => void
  routeMode?: 'tanstack' | 'none'
}

type SimNode = d3.SimulationNodeDatum & NoteNode & { x: number; y: number }
type SimLink = d3.SimulationLinkDatum<SimNode> & GraphLink

export default function NetworkGraph({
  data,
  width = 960,
  height = 640,
  query = '',
  selectedTags = new Set(),
  onNavigate,
  routeMode = 'none',
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const navigate = useNavigate({ from: '/' })

  // 검색 축소 로직
  const { nodes, links } = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data
    const match = (n: NoteNode) =>
      n.id.toLowerCase().includes(q) ||
      n.title.toLowerCase().includes(q) ||
      (n.tags ?? []).some((t) => t.toLowerCase().includes(q))
    const keepIds = new Set<string>()
    data.nodes.forEach((n) => {
      if (match(n)) keepIds.add(n.id)
    })
    data.links.forEach((l) => {
      if (keepIds.has(l.source) || keepIds.has(l.target)) {
        keepIds.add(l.source)
        keepIds.add(l.target)
      }
    })
    return {
      nodes: data.nodes.filter((n) => keepIds.has(n.id)),
      links: data.links.filter(
        (l) => keepIds.has(l.source) && keepIds.has(l.target),
      ),
    }
  }, [data, query])

  // 인접 리스트(1-hop) 생성
  const neighbors = useMemo(() => {
    const map = new Map<string, Set<string>>()
    nodes.forEach((n) => map.set(n.id, new Set()))
    links.forEach((l) => {
      map.get(l.source)?.add(l.target)
      map.get(l.target)?.add(l.source)
    })
    return map
  }, [nodes, links])

  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const W = width,
      H = height
    const g = svg
      .attr('viewBox', [0, 0, W, H].toString())
      .attr('width', W)
      .attr('height', H)
      .append('g')

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => g.attr('transform', event.transform))
    svg.call(zoom as any)

    const isTag = (n: NoteNode) => n.id.startsWith('tag:')

    // 검색 매칭 함수
    const matchesQuery = (n: NoteNode) => {
      const q = query.trim().toLowerCase()
      if (!q) return false
      return (
        n.id.toLowerCase().includes(q) ||
        n.title.toLowerCase().includes(q) ||
        (n.tags ?? []).some((t) => t.toLowerCase().includes(q))
      )
    }

    // 선택된 태그와 관련 있는지 확인
    const matchesSelectedTags = (n: NoteNode) => {
      if (selectedTags.size === 0) return false
      if (isTag(n)) {
        const tagName = n.id.replace('tag:', '')
        return selectedTags.has(tagName)
      }
      return n.tags && n.tags.some((tag) => selectedTags.has(tag))
    }

    const color = (n: NoteNode & { broken?: boolean; hasFile?: boolean }) => {
      if (n.broken) {
        return '#dc2626' // 깨진 노드: 빨간색
      }
      const isHighlighted = matchesQuery(n) || matchesSelectedTags(n)
      if (isTag(n)) {
        // 태그인데 파일이 없으면 빨간색
        if (!n.hasFile) {
          return '#dc2626'
        }
        return isHighlighted ? '#ff6b35' : '#969696' // 하이라이트: 주황색
      } else {
        return isHighlighted ? '#1f77b4' : '#6baed6' // 하이라이트: 진한 파란색
      }
    }

    const linkStroke = (l: GraphLink) => (l.type === 'tag' ? '#bbb' : '#999')
    const linkDash = (l: GraphLink) => (l.type === 'tag' ? '3,3' : null)

    // 노드 ID 세트 생성
    const nodeIds = new Set(nodes.map((n) => n.id))

    // 깨진 링크를 위한 가상 노드 생성
    const brokenNodeIds = new Set<string>()
    links.forEach((link) => {
      if (!nodeIds.has(link.source)) {
        brokenNodeIds.add(link.source)
      }
      if (!nodeIds.has(link.target)) {
        brokenNodeIds.add(link.target)
      }
    })

    const brokenNodes = Array.from(brokenNodeIds).map((id) => ({
      id,
      title: id,
      broken: true,
    }))

    const allNodes = [...nodes, ...brokenNodes]

    const simNodes: Array<SimNode> = allNodes.map((n) => ({
      ...n,
      x: Math.random() * W,
      y: Math.random() * H,
    }))
    const simLinks: Array<SimLink> = links.map((l) => ({ ...l })) as any

    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance((l) => (l.type === 'tag' ? 20 : 30))
          .strength((l) => (l.type === 'tag' ? 0.8 : 1.5)),
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(W / 2, H / 2).strength(1.5))
      .force('radial', d3.forceRadial(100, W / 2, H / 2).strength(0.3))
      .force(
        'collide',
        d3
          .forceCollide<SimNode>()
          .radius((d) => (isTag(d) ? 8 : 12))
          .strength(1.2),
      )

    const link = g
      .append('g')
      .attr('stroke-opacity', 0.7)
      .selectAll('line')
      .data(simLinks)
      .join('line')
      .attr('stroke', linkStroke)
      .attr('stroke-width', 1.8)
      .attr('stroke-dasharray', (l) => linkDash(l) ?? null)
      .attr('data-source', (d) => d.source.id)
      .attr('data-target', (d) => d.target.id)

    const node = g
      .append('g')
      .selectAll('g.node')
      .data(simNodes)
      .join('g')
      .attr('class', 'node')
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          }),
      )

    node
      .append('circle')
      .attr('r', (d) => (isTag(d) ? 6 : 10))
      .attr('fill', (d) => color(d))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .style('cursor', (d) => {
        if (d.id.startsWith('tag:') || (d as any).broken) {
          return 'default'
        }
        return 'pointer'
      })
      .on('click', (_, d) => {
        // if (routeMode === 'tanstack' && !d.id.startsWith('tag:')) {
        //   navigate({ to: '/node/$id', params: { id: d.id } })
        //   return
        // }
        // onNavigate?.(d)
        // 태그 노드가 아니고 깨진 노드가 아닌 경우만 라우팅
        if (!d.id.startsWith('tag:') && !(d as any).broken) {
          navigate({ to: '/node/$id', params: { id: d.id } })
        }
      })
      .on('mouseover', (_, d) => highlight(d.id))
      .on('mouseout', () => clearHighlight())

    node.append('title').text((d) => d.title || d.id)

    node
      .append('text')
      .text((d) => d.title ?? d.id)
      .attr('x', 12)
      .attr('y', 4)
      .attr('font-size', 12)
      .attr('fill', '#333')

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y)
      node.attr('transform', (d) => `translate(${d.x},${d.y})`)
    })

    // 하이라이트 로직: hovered 노드와 1-hop 이웃만 1.0, 나머지는 0.15
    const highlight = (centerId: string) => {
      const neigh = neighbors.get(centerId) ?? new Set<string>()
      const isKeep = (id: string) => id === centerId || neigh.has(id)

      node
        .selectAll<SVGGElement, SimNode>('g.node, :scope')
        .attr('opacity', (d) => (isKeep(d.id) ? 1 : 0.15))

      link.attr('opacity', (d) => {
        const s = d.source.id
        const t = d.target.id
        return s === centerId ||
          t === centerId ||
          (neighbors.get(centerId)?.has(s) && neighbors.get(centerId)?.has(t))
          ? 1
          : 0.15
      })
    }

    const clearHighlight = () => {
      node.attr('opacity', 1)
      link.attr('opacity', 1)
    }

    return () => simulation.stop()
  }, [nodes, links, width, height, onNavigate, neighbors, navigate, routeMode])

  return <svg ref={svgRef} className={`w-full h-[${height}] bg-white`} />
}
