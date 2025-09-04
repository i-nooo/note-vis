import { createRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { rootRoute } from './root'
import type { GraphData } from '@/types'
import SearchBar from '@/components/SearchBar'
import NetworkGraph from '@/components/NetworkGraph'
import TagFilter from '@/components/TagFilter'
import DateFilter from '@/components/DateFilter'
import RecentNotes from '@/components/RecentNotes'
import sample from '@/data/notes.json'

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexPage,
})

function IndexPage() {
  const [query, setQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [dateFilter, setDateFilter] = useState<{
    start?: string
    end?: string
  }>({})

  const data = sample as GraphData

  // 모든 태그 추출 (최대 20개)
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    data.nodes.forEach((node) => {
      if (node.tags) {
        node.tags.forEach((tag) => tagSet.add(tag))
      }
    })
    return Array.from(tagSet).sort().slice(0, 20)
  }, [data])

  // 태그 + 날짜 필터링된 데이터
  const filteredData = useMemo(() => {
    let filteredNodes = data.nodes

    // 태그 필터링
    if (selectedTags.size > 0) {
      const filteredNodeIds = new Set<string>()

      // 선택된 태그를 가진 노드들 찾기
      data.nodes.forEach((node) => {
        if (node.tags && node.tags.some((tag) => selectedTags.has(tag))) {
          filteredNodeIds.add(node.id)
        }
      })

      // 태그 노드도 포함
      data.nodes.forEach((node) => {
        if (node.id.startsWith('tag:')) {
          const tagName = node.id.replace('tag:', '')
          if (selectedTags.has(tagName)) {
            filteredNodeIds.add(node.id)
          }
        }
      })

      filteredNodes = data.nodes.filter((n) => filteredNodeIds.has(n.id))
    }

    // 날짜 필터링
    if (dateFilter.start || dateFilter.end) {
      filteredNodes = filteredNodes.filter((node) => {
        if (node.id.startsWith('tag:')) return true // 태그 노드는 날짜 필터링 제외

        const nodeDate = node.dateCreated || node.dateUpdated
        if (!nodeDate) return false

        const date = new Date(nodeDate)

        if (dateFilter.start) {
          const startDate = new Date(dateFilter.start)
          if (date < startDate) return false
        }

        if (dateFilter.end) {
          const endDate = new Date(dateFilter.end)
          if (date > endDate) return false
        }

        return true
      })
    }

    const nodeIds = new Set(filteredNodes.map((n) => n.id))

    return {
      nodes: filteredNodes,
      links: data.links.filter(
        (l) => nodeIds.has(l.source) && nodeIds.has(l.target),
      ),
    }
  }, [data, selectedTags, dateFilter])

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(tag)) {
        newSet.delete(tag)
      } else {
        newSet.add(tag)
      }
      return newSet
    })
  }

  const clearAllTags = () => setSelectedTags(new Set())


  // 최신 글 리스트 (날짜가 있는 노트들만, 태그 노드 제외)
  const recentNotes = useMemo(() => {
    const notesWithDates = data.nodes
      .filter(
        (node) =>
          !node.id.startsWith('tag:') && (node.dateCreated || node.dateUpdated),
      )
      .map((node) => ({
        ...node,
        sortDate: node.dateUpdated || node.dateCreated || '',
      }))
      .sort(
        (a, b) =>
          new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime(),
      )
      .slice(0, 5) // 최근 5개만

    return notesWithDates
  }, [data])

  return (
    <>
      <header className="flex justify-between items-center mb-4">
        <h2>HK Notes</h2>
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="노트 제목, id, 태그 검색"
        />
      </header>

      <div className="flex flex-col gap-4  p-4 rounded-lg">
        <TagFilter
          allTags={allTags}
          selectedTags={selectedTags}
          onToggleTag={toggleTag}
          onClearAll={clearAllTags}
        />
        <DateFilter dateFilter={dateFilter} onDateChange={setDateFilter} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 mt-4">
        <div className="border border-gray-200 rounded-lg">
          <NetworkGraph
            data={filteredData}
            query={query}
            selectedTags={selectedTags}
            height={640}
          />
        </div>

        <RecentNotes notes={recentNotes} />
      </div>
    </>
  )
}
