import { createRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { rootRoute } from "./root";
import type { GraphData } from "@/types";
import SearchBar from "@/components/SearchBar";
import NetworkGraph from "@/components/NetworkGraph";
import TagFilter from "@/components/TagFilter";
import DateFilter from "@/components/DateFilter";
import RecentNotes from "@/components/RecentNotes";
import sample from "@/data/notes.json";

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexPage,
});

function IndexPage() {
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState<{
    start?: string;
    end?: string;
  }>({});

  const data = sample as GraphData;

  // 모든 태그 추출 (언급량 순으로 정렬)
  const allTags = useMemo(() => {
    const tagCount = new Map<string, number>();
    data.nodes.forEach((node) => {
      if (node.tags) {
        node.tags.forEach((tag) => {
          tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
        });
      }
    });
    return Array.from(tagCount.entries())
      .sort(([, countA], [, countB]) => countB - countA) // 언급량 내림차순
      .map(([tag]) => tag);
  }, [data]);

  // 태그 + 날짜 필터링된 데이터
  const filteredData = useMemo(() => {
    // 1. 노트 노드만 필터링 (태그 노드 제외)
    let filteredNoteNodes = data.nodes.filter(
      (node) => !node.id.startsWith("tag:"),
    );

    // 태그 필터링
    if (selectedTags.size > 0) {
      filteredNoteNodes = filteredNoteNodes.filter(
        (node) => node.tags && node.tags.some((tag) => selectedTags.has(tag)),
      );
    }

    // 날짜 필터링
    if (dateFilter.start || dateFilter.end) {
      filteredNoteNodes = filteredNoteNodes.filter((node) => {
        const nodeDate = node.dateUpdated || node.dateCreated;
        if (!nodeDate) return false;

        const date = new Date(nodeDate);

        if (dateFilter.start) {
          const startDate = new Date(dateFilter.start);
          if (date < startDate) return false;
        }

        if (dateFilter.end) {
          const endDate = new Date(dateFilter.end);
          if (date > endDate) return false;
        }

        return true;
      });
    }

    // 2. 필터링된 노트들이 가진 태그만 추출
    const connectedTags = new Set<string>();
    filteredNoteNodes.forEach((node) => {
      node.tags?.forEach((tag) => connectedTags.add(tag));
    });

    // 3. 연결된 태그 노드만 포함
    const tagNodes = data.nodes.filter(
      (node) =>
        node.id.startsWith("tag:") &&
        connectedTags.has(node.id.replace("tag:", "")),
    );

    const allFilteredNodes = [...filteredNoteNodes, ...tagNodes];
    const nodeIds = new Set(allFilteredNodes.map((n) => n.id));

    return {
      nodes: allFilteredNodes,
      links: data.links.filter(
        (l) => nodeIds.has(l.source) && nodeIds.has(l.target),
      ),
    };
  }, [data, selectedTags, dateFilter]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
  };

  const clearAllTags = () => setSelectedTags(new Set());

  // 날짜 범위 계산 (range slider용)
  const dateRange = useMemo(() => {
    const dates = data.nodes
      .filter((node) => !node.id.startsWith("tag:"))
      .map((node) => node.dateUpdated || node.dateCreated)
      .filter((date): date is string => !!date)
      .sort();

    return {
      min: dates[0] || new Date().toISOString().split("T")[0],
      max: dates[dates.length - 1] || new Date().toISOString().split("T")[0],
    };
  }, [data]);

  // 최신 글 리스트 (날짜가 있는 노트들만, 태그 노드 제외)
  const recentNotes = useMemo(() => {
    const notesWithDates = data.nodes
      .filter(
        (node) =>
          !node.id.startsWith("tag:") && (node.dateUpdated || node.dateCreated),
      )
      .map((node) => ({
        ...node,
        sortDate: node.dateUpdated || node.dateCreated || "",
      }))
      .sort(
        (a, b) =>
          new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime(),
      )
      .slice(0, 5); // 최근 5개만

    return notesWithDates;
  }, [data]);

  return (
    <div className="relative h-screen w-screen overflow-hidden -m-4">
      {/* 전체 화면 네트워크 그래프 */}
      <div className="absolute inset-0">
        <NetworkGraph
          data={filteredData}
          query={query}
          selectedTags={selectedTags}
        />
      </div>

      {/* 상단 UI */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-4">
        <header className="flex justify-between items-center">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="노트 제목, 태그 검색"
          />
        </header>

        <div className="flex flex-col gap-4">
          <TagFilter
            allTags={allTags}
            selectedTags={selectedTags}
            onToggleTag={toggleTag}
            onClearAll={clearAllTags}
          />
          <DateFilter
            dateFilter={dateFilter}
            onDateChange={setDateFilter}
            dateRange={dateRange}
            filteredCount={
              filteredData.nodes.filter((n) => !n.id.startsWith("tag:")).length
            }
          />
        </div>
      </div>

      {/* 우측 하단 최근 노트 */}
      <div className="absolute bottom-4 right-4 z-10">
        <RecentNotes notes={recentNotes} />
      </div>
    </div>
  );
}
